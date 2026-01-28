# irelandMapPoc

import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import TileGrid from 'ol/tilegrid/TileGrid';
import { MapZoomService } from '../services/map-zoom.service';

@Component({
  selector: 'app-map',
  template: `<div id="map" class="map"></div>`,
  styles: [`
    .map {
      width: 100%;
      height: 100%;
    }
  `]
})
export class MapComponent implements AfterViewInit, OnDestroy {

  private map!: Map;
  private wmsSource!: TileWMS;

  constructor(private zoomService: MapZoomService) {}

  ngAfterViewInit(): void {

    // Define tile grid for EPSG:4326
    const tileGrid = new TileGrid({
      origin: [-180, 90],           // top-left corner
      resolutions: [
        0.703125, 0.3515625, 0.17578125, 0.087890625,
        0.0439453125, 0.02197265625, 0.010986328125, 0.0054931640625
      ], // adjust for zoom levels
      tileSize: 256
    });

    // WMS layer
    this.wmsSource = new TileWMS({
      url: 'https://your-wms-server.com/geoserver/wms', // replace with your WMS
      params: {
        LAYERS: 'workspace:layername', // replace with your layer
        CRS: 'EPSG:4326',
        FORMAT: 'image/png',
        TILED: true
      },
      serverType: 'geoserver',
      tileGrid
    });

    const wmsLayer = new TileLayer({
      source: this.wmsSource,
      preload: 2
    });

    // Map view in EPSG:4326
    const view = new View({
      projection: 'EPSG:4326',
      center: [-8, 53],   // lon, lat
      zoom: 3,
      minZoom: 2,
      maxZoom: 7
    });

    // Initialize map
    this.map = new Map({
      target: 'map',
      layers: [wmsLayer],
      view
    });

    // Debounced zoom events and WMS refresh
    let zoomTimeout: any;
    view.on('change:resolution', () => {
      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        const zoom = view.getZoom();
        if (zoom !== undefined) {
          this.zoomService.emitZoom(zoom);
          this.wmsSource.refresh();
        }
      }, 150);
    });

    // Ensure map resizes correctly
    window.addEventListener('resize', () => {
      this.map.updateSize();
    });
  }

  ngOnDestroy(): void {
    this.map.setTarget(undefined);
  }
}

