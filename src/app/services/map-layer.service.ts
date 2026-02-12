import { Injectable } from '@angular/core';
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";


@Injectable({ providedIn: 'root' })
export class MapLayerService {
    private osmLayer?: TileLayer;
    private countiesLayer?: VectorLayer;

    setLayers(osm: TileLayer, counties: VectorLayer) {
        this.osmLayer = osm;
        this.countiesLayer = counties;
    }

    setOsmVisible(visible: boolean) {
        this.osmLayer?.setVisible(visible);
    }

    setCountiesVisible(visible: boolean) {
        this.countiesLayer?.setVisible(visible);
    }
}
