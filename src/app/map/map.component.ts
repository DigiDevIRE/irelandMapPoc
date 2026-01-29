import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {fromLonLat, toLonLat} from 'ol/proj';
import { Fill, Stroke, Style } from 'ol/style';
import { MapZoomService } from '../services/map-zoom.service';
import { GeoServerService} from "../services/geoserver.service";
import {MapClickService} from "../services/map-click.service";

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private map!: Map;



  private osmLayer = new TileLayer({
    source: new OSM(),
  })

  private osmHumLayer = new TileLayer({
    source: new OSM({
      url: 'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
    }),
    visible: false
  })




  constructor(private mapClickService: MapClickService) {}

  ngAfterViewInit(): void {

    this.map = new Map({
      target: 'map',
      layers: [this.osmLayer, this.osmHumLayer],
      view: new View({
        center: fromLonLat([-8, 53]),
        zoom: 6,
        projection:'EPSG:3857'
      })
    });

    this.map.on('singleclick', (event) => {
      const[lat,lon] = toLonLat(event.coordinate);
      console.log('lat: ' + lat);
    });

    this.mapClickService.setMap(this.map);
  }

  ngOnDestroy(): void {
    this.map.setTarget(undefined);
  }

  // Called from dropdown change
  switchBaseMap(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const mapType = select.value;
    this.osmLayer.setVisible(mapType === 'standard');
    this.osmHumLayer.setVisible(mapType === 'humanitarian');
  }
}
