import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Draw from 'ol/interaction/Draw';
import Overlay from 'ol/Overlay';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { getArea, getLength } from 'ol/sphere';

import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Text from 'ol/style/Text';

export type MeasureType = 'area' | 'length';

export class MeasurementTool {
    private map: Map;

    private draw?: Draw;
    private source = new VectorSource();
    private layer = new VectorLayer({ source: this.source });

    private helpTooltip?: Overlay;
    private helpTooltipElement?: HTMLElement;

    private sketchFeature: Feature | null = null;

    constructor(map: Map) {
        this.map = map;

        this.map.addLayer(this.layer);
        this.createTooltip();
        this.disableContextMenu();
        this.registerPointerMove();
    }

    // ---------------------------
    // PUBLIC API
    // ---------------------------

    start(type: MeasureType) {
        this.stop();

        const geometryType = type === 'area' ? 'Polygon' : 'LineString';

        this.draw = new Draw({
            source: this.source,
            type: geometryType,
            style: this.getMeasureStyle(),
            finishCondition: (event) => this.finishCondition(event)
        });

        this.map.addInteraction(this.draw);

        this.draw.on('drawstart', (evt) => {
            this.sketchFeature = evt.feature;
        });

        this.draw.on('drawend', (evt) => {
            this.sketchFeature = null;

            const geom = evt.feature.getGeometry();
            const text = this.formatMeasurement(geom);

            this.addFinalLabel(geom, text);
        });
    }

    stop() {
        if (this.draw) {
            this.map.removeInteraction(this.draw);
            this.draw = undefined;
        }
        this.sketchFeature = null;
    }

    clear() {
        this.source.clear();
    }

    // ---------------------------
    // TOOLTIP
    // ---------------------------

    private createTooltip() {
        this.helpTooltipElement = document.createElement('div');
        this.helpTooltipElement.className = 'measure-tooltip';

        this.helpTooltip = new Overlay({
            element: this.helpTooltipElement,
            offset: [15, 0],
            positioning: 'center-left'
        });

        this.map.addOverlay(this.helpTooltip);
    }

    private registerPointerMove() {
        this.map.on('pointermove', () => {
            if (!this.sketchFeature || !this.helpTooltipElement) return;

            const geom = this.sketchFeature.getGeometry();
            const text = this.formatMeasurement(geom);

            this.helpTooltipElement.innerHTML = text;

            if (geom instanceof Polygon) {
                this.helpTooltip!.setPosition(
                    geom.getInteriorPoint().getCoordinates()
                );
            }

            if (geom instanceof LineString) {
                this.helpTooltip!.setPosition(
                    geom.getLastCoordinate()
                );
            }
        });
    }

    // ---------------------------
    // FINISH CONDITIONS
    // ---------------------------

    private finishCondition(event: any): boolean {
        const e = event.originalEvent as MouseEvent;

        // Right click → always finish
        if (e.button === 2) return true;

        if (e.button !== 0) return false;

        if (!this.sketchFeature) return false;

        const geom = this.sketchFeature.getGeometry();

        // ---------- LINE ----------
        if (geom instanceof LineString) {
            const coords = geom.getCoordinates();
            if (coords.length < 2) return false;

            const last = coords[coords.length - 1];
            const prev = coords[coords.length - 2];

            const dx = last[0] - prev[0];
            const dy = last[1] - prev[1];
            const dist = Math.sqrt(dx * dx + dy * dy);

            const tolerance = this.map.getView().getResolution()! * 10;

            return dist < tolerance;
        }

        // ---------- POLYGON ----------
        if (geom instanceof Polygon) {
            const coords = geom.getCoordinates()[0];
            if (coords.length < 3) return false;

            const start = coords[0];
            const last = coords[coords.length - 1];

            const dx = start[0] - last[0];
            const dy = start[1] - last[1];
            const dist = Math.sqrt(dx * dx + dy * dy);

            const tolerance = this.map.getView().getResolution()! * 10;

            return dist < tolerance;
        }

        return false;
    }

    // ---------------------------
    // MEASUREMENT FORMATTING
    // ---------------------------

    private formatMeasurement(geom: any): string {
        if (geom instanceof Polygon) {
            const area = getArea(geom);
            return area > 10000
                ? (area / 10000).toFixed(2) + ' ha'
                : area.toFixed(0) + ' m²';
        }

        if (geom instanceof LineString) {
            const length = getLength(geom);
            return length > 1000
                ? (length / 1000).toFixed(2) + ' km'
                : length.toFixed(0) + ' m';
        }

        return '';
    }

    // ---------------------------
    // FINAL LABEL
    // ---------------------------

    private addFinalLabel(geom: any, text: string) {
        const point =
            geom instanceof Polygon
                ? geom.getInteriorPoint().getCoordinates()
                : geom.getLastCoordinate();

        const feature = new Feature(new Point(point));

        feature.setStyle(
            new Style({
                text: new Text({
                    text,
                    font: '14px sans-serif',
                    fill: new Fill({ color: '#000' }),
                    backgroundFill: new Fill({ color: '#fff' }),
                    padding: [4, 4, 4, 4]
                })
            })
        );

        this.source.addFeature(feature);
    }

    // ---------------------------
    // STYLE
    // ---------------------------

    private getMeasureStyle(): Style {
        return new Style({
            stroke: new Stroke({
                color: '#2b7cff',
                width: 2
            }),
            fill: new Fill({
                color: 'rgba(43, 124, 255, 0.2)'
            })
        });
    }

    // ---------------------------
    // UTIL
    // ---------------------------

    private disableContextMenu() {
        this.map.getViewport().addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
}
