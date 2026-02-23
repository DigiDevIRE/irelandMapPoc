import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import Map from 'ol/Map';
import Layer from 'ol/layer/Layer';
import GroupLayer from 'ol/layer/Group';
import VectorLayer from 'ol/layer/Vector';
import { Feature } from 'ol';
import Point from 'ol/geom/Point';
import { Style, Fill, Stroke, Icon, Circle as CircleStyle } from 'ol/style';

import { MapService } from './map.service';
import { MapLayerService, LayerStateItem } from './map-layer-service';

export type PageSize = 'A4' | 'A3';

interface LegendItem {
    name: string;
    iconDataUrl?: string; // vector swatch
}

@Injectable({ providedIn: 'root' })
export class PrintService {
    constructor(
        private mapService: MapService,
        private mapLayerService: MapLayerService
    ) {}

    // Landscape dimensions in mm
    private readonly pageDimensions: Record<PageSize, [number, number]> = {
        A4: [297, 210],
        A3: [420, 297]
    };

    private readonly formatMap: Record<PageSize, 'a4' | 'a3'> = {
        A4: 'a4',
        A3: 'a3'
    };

    async exportPdfToNewTab(options: {
        pageSize: PageSize;
        dpi: number;
        scale: number;
        title?: string; // default: Roundwood Forecast
    }): Promise<void> {
        const title = options.title ?? 'Roundwood Forecast';

        const map = this.mapService.getMap();
        const view = map.getView();

        const [pageWmm, pageHmm] = this.pageDimensions[options.pageSize];
        const widthPx = Math.round((pageWmm * options.dpi) / 25.4);
        const heightPx = Math.round((pageHmm * options.dpi) / 25.4);

        // OL print resolution from scale: resolution = scale / (dpi * 39.37)
        const printResolution = options.scale / (options.dpi * 39.37);

        const originalSize = map.getSize()!;
        const originalResolution = view.getResolution();

        // Resize + set resolution for print render
        map.setSize([widthPx, heightPx]);
        view.setResolution(printResolution);

        await new Promise<void>((resolve) => {
            map.once('rendercomplete', async () => {
                try {
                    const mapImage = this.mergeOlCanvasesToDataUrl(widthPx, heightPx);

                    const legendItems = await this.buildLegendFromLayerState(map);

                    const pdf = new jsPDF({
                        orientation: 'landscape',
                        unit: 'mm',
                        // Using explicit format mapping avoids TS overload errors
                        format: this.formatMap[options.pageSize]
                    });

                    // Header band (optional nice touch)
                    pdf.setFillColor(245, 246, 248);
                    pdf.rect(0, 0, pageWmm, 22, 'F');

                    pdf.setFontSize(18);
                    pdf.text(title, 12, 14);

                    // Map placement
                    const margin = 10;
                    const headerH = 22;
                    const footerH = 18;

                    const mapX = margin;
                    const mapY = headerH + 3;
                    const mapW = pageWmm - margin * 2;
                    const mapH = pageHmm - headerH - footerH - 6;

                    pdf.addImage(mapImage, 'PNG', mapX, mapY, mapW, mapH);

                    // Bottom-left: scale text + scale bar
                    pdf.setFontSize(9);
                    pdf.text(`Scale 1 : ${options.scale.toLocaleString()}`, margin, pageHmm - 12);

                    this.drawScaleBar(pdf, margin, pageHmm - 20, options.scale, 60, 5, 4);

                    // Bottom-right: legend
                    this.drawLegend(pdf, pageWmm, pageHmm, legendItems);

                    // Open in new tab (no forced download)
                    const blob = pdf.output('blob');
                    const url = URL.createObjectURL(blob);
                    const tab = window.open(url, '_blank');
                    if (tab) {
                        tab.onload = () => URL.revokeObjectURL(url);
                    }

                } finally {
                    // Restore map
                    map.setSize(originalSize);
                    view.setResolution(originalResolution!);
                    resolve();
                }
            });

            map.renderSync();
        });
    }

    // ----------------------------
    // Map image capture
    // ----------------------------
    private mergeOlCanvasesToDataUrl(widthPx: number, heightPx: number): string {
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create canvas context for print.');

        // NOTE: if you hit "tainted canvas", it’s CORS from any raster layer/icon.
        // That must be fixed by crossOrigin + server CORS headers.
        const layerCanvases = Array.from(document.querySelectorAll<HTMLCanvasElement>('.ol-layer canvas'));

        layerCanvases.forEach((c) => {
            if (!c.width || !c.height) return;

            const opacity = c.parentElement?.style.opacity;
            ctx.globalAlpha = opacity ? Number(opacity) : 1;

            // Some OL versions use CSS transforms for the layer canvas
            const transform = c.style.transform;
            const match = transform?.match(/^matrix\((.+)\)$/);
            if (match) {
                const m = match[1].split(',').map(Number);
                if (m.length === 6) ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
            } else {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }

            ctx.drawImage(c, 0, 0);
        });

        // reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;

        return canvas.toDataURL('image/png');
    }

    // ----------------------------
    // Legend generation from MapLayerService state
    // ----------------------------
    private async buildLegendFromLayerState(map: Map): Promise<LegendItem[]> {
        const state = this.mapLayerService.getStateSnapshot();

        const flatLayers: Layer[] = [];
        this.collectLayers(map.getLayers().getArray(), flatLayers);

        const byId = new Map<string, Layer>();
        for (const l of flatLayers) {
            const id = l.get('id');
            if (typeof id === 'string') byId.set(id, l);
        }

        const items: LegendItem[] = [];

        for (const s of state) {
            if (!s.active) continue;
            const layer = byId.get(s.id);
            if (!layer) continue;

            const swatch = this.tryBuildVectorSwatch(layer);
            // If swatch is undefined, we still include name (optional), or skip:
            // For now: include name + a simple empty box fallback in PDF
            items.push({ name: s.name, iconDataUrl: swatch });
        }

        return items;
    }

    private collectLayers(input: any[], out: Layer[]): void {
        for (const l of input) {
            if (l instanceof GroupLayer) {
                this.collectLayers(l.getLayers().getArray(), out);
            } else {
                out.push(l);
            }
        }
    }

    private tryBuildVectorSwatch(layer: Layer): string | undefined {
        if (!(layer instanceof VectorLayer)) return undefined;

        const legendStyle = layer.get('legendStyle');
        if (legendStyle instanceof Style) return this.renderStyleSwatch(legendStyle);

        const styleLike = layer.getStyle();
        if (!styleLike) return undefined;

        const style = this.resolveStyle(styleLike);
        if (!style) return undefined;

        return this.renderStyleSwatch(style);
    }

    private resolveStyle(styleLike: any): Style | undefined {
        if (styleLike instanceof Style) return styleLike;
        if (Array.isArray(styleLike) && styleLike[0] instanceof Style) return styleLike[0];

        if (typeof styleLike === 'function') {
            const dummy = new Feature(new Point([0, 0]));
            const res = styleLike(dummy, 1);
            if (res instanceof Style) return res;
            if (Array.isArray(res) && res[0] instanceof Style) return res[0];
        }
        return undefined;
    }

    private renderStyleSwatch(style: Style): string | undefined {
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 18;

        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const fill = style.getFill();
        const stroke = style.getStroke();
        const image = style.getImage();

        // Icon style (may require CORS if icon is remote)
        if (image instanceof Icon) {
            const img = (image as Icon).getImage(1) as any;
            if (img?.width) {
                ctx.drawImage(img, 2, 2, 14, 14);
                return canvas.toDataURL('image/png');
            }
        }

        // Circle symbol
        if (image instanceof CircleStyle) {
            const cf = image.getFill();
            const cs = image.getStroke();

            ctx.beginPath();
            ctx.arc(9, 9, 6, 0, Math.PI * 2);

            if (cf) {
                ctx.fillStyle = this.colorToCss(cf.getColor());
                ctx.fill();
            }
            if (cs) {
                ctx.strokeStyle = this.colorToCss(cs.getColor());
                ctx.lineWidth = cs.getWidth() ?? 2;
                ctx.stroke();
            }
            return canvas.toDataURL('image/png');
        }

        // Fill/stroke box
        if (fill) {
            ctx.fillStyle = this.colorToCss(fill.getColor());
            ctx.fillRect(2, 3, 20, 12);
        }
        if (stroke) {
            ctx.strokeStyle = this.colorToCss(stroke.getColor());
            ctx.lineWidth = stroke.getWidth() ?? 2;
            ctx.strokeRect(2, 3, 20, 12);
        }

        if (!fill && !stroke) return undefined;
        return canvas.toDataURL('image/png');
    }

    private colorToCss(c: any): string {
        if (Array.isArray(c)) return `rgba(${c[0]},${c[1]},${c[2]},${c[3] ?? 1})`;
        return c ?? '#000';
    }

    // ----------------------------
    // PDF Legend drawing
    // ----------------------------
    private drawLegend(pdf: jsPDF, pageWmm: number, pageHmm: number, items: LegendItem[]): void {
        const boxW = 70;
        const x = pageWmm - boxW - 10;
        let y = pageHmm - 40;

        pdf.setFontSize(11);
        pdf.text('Legend', x, y);
        y += 6;

        pdf.setFontSize(9);

        for (const item of items) {
            if (y > pageHmm - 10) break;

            if (item.iconDataUrl) {
                pdf.addImage(item.iconDataUrl, 'PNG', x, y - 4, 8, 8);
            } else {
                pdf.rect(x, y - 4, 8, 8);
            }
            pdf.text(item.name, x + 10, y + 2);
            y += 8;
        }
    }

    // ----------------------------
    // Scale bar drawing (real graphic)
    // ----------------------------
    private metersPerMm(scale: number): number {
        return scale / 1000; // 1mm on paper = scale mm in real world = scale/1000 meters
    }

    private niceMeters(targetMeters: number): number {
        const pow10 = Math.pow(10, Math.floor(Math.log10(targetMeters)));
        const n = targetMeters / pow10;
        const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
        return nice * pow10;
    }

    private drawScaleBar(
        pdf: jsPDF,
        xMm: number,
        yMm: number,
        scale: number,
        maxWidthMm = 60,
        heightMm = 5,
        segments = 4
    ): void {
        const metersPerMm = this.metersPerMm(scale);
        const targetMeters = maxWidthMm * metersPerMm;

        const barMeters = this.niceMeters(targetMeters);
        const barWidthMm = barMeters / metersPerMm;
        const segWidthMm = barWidthMm / segments;

        const useKm = barMeters >= 1000;
        const fmt = (m: number) => (useKm ? `${(m / 1000).toLocaleString()} km` : `${m.toLocaleString()} m`);

        pdf.setFontSize(8);
        pdf.text('Scale bar', xMm, yMm - 2);

        pdf.setDrawColor(0);
        pdf.rect(xMm, yMm, barWidthMm, heightMm);

        for (let i = 0; i < segments; i++) {
            const sx = xMm + i * segWidthMm;
            if (i % 2 === 0) pdf.setFillColor(0, 0, 0);
            else pdf.setFillColor(255, 255, 255);
            pdf.rect(sx, yMm, segWidthMm, heightMm, 'F');
        }

        pdf.setTextColor(0);
        pdf.setFontSize(8);

        pdf.text('0', xMm, yMm + heightMm + 4);
        pdf.text(fmt(barMeters / 2), xMm + barWidthMm / 2, yMm + heightMm + 4, { align: 'center' });
        pdf.text(fmt(barMeters), xMm + barWidthMm, yMm + heightMm + 4, { align: 'right' });
    }

    getCurrentScale(dpi = 96): number {
        const map = this.mapService.getMap();
        const view = map.getView();

        const resolution = view.getResolution();
        if (!resolution) return 0;

        const projection = view.getProjection();
        const center = view.getCenter();

        if (!center) return 0;

        // Convert resolution to metres per pixel at map center
        const metersPerPixel = getPointResolution(
            projection,
            resolution,
            center,
            'm'
        );

        const inchesPerMeter = 39.37;

        const scale = metersPerPixel * dpi * inchesPerMeter;

        return Math.round(scale);
    }
}
