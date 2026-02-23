import { AfterViewInit, Component } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
// import layers/sources as you already do...
import { MapService } from '../services/map.service';

@Component({
  selector: 'app-forestry-map',
  templateUrl: './forestry-map.component.html',
  styleUrls: ['./forestry-map.component.scss']
})
export class ForestryMapComponent implements AfterViewInit {
  private map!: Map;

  constructor(private mapService: MapService) {}

  ngAfterViewInit(): void {
    // Your existing map creation
    this.map = new Map({
      target: 'map',
      layers: [
        // IMPORTANT: ensure each layer has an id matching MapLayerService state
        // e.g. baseLayer.set('id', 'osm');
        // forecastLayer.set('id', 'forecast');
      ],
      view: new View({
        // your existing settings
        center: [0, 0],
        zoom: 7
      })
    });

    this.mapService.setMap(this.map);
  }
}
