import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';
import { Fill, Stroke, Style } from 'ol/style';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private map!: Map;

  ngAfterViewInit(): void {
    const osmLayer = new TileLayer({
      source: new OSM()
    });

    const countiesLayer = new VectorLayer({
      source: new VectorSource({
        url: 'assets/ireland-counties.geojson',
        format: new GeoJSON()
      }),
      style: new Style({
        stroke: new Stroke({
          color: '#005eff',
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(0, 94, 255, 0.15)'
        })
      })
    });

    this.map = new Map({
      target: 'map',
      layers: [osmLayer, countiesLayer],
      view: new View({
        center: fromLonLat([-8, 53]),
        zoom: 6
      })
    });
    let zoomTimeout: any;
    const view = this.map.getView();
    view.on('change:resolution', () => {
      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        console.log('Zoom level:', view.getZoom());
      }, 150);
    });
  }

  ngOnDestroy(): void {
    this.map.setTarget(undefined);
  }
}
