# irelandMapPoc

import {
  AfterViewInit,
  Component,
  OnDestroy
} from '@angular/core';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Stroke, Style } from 'ol/style';
import { fromLonLat, transformExtent } from 'ol/proj';

import { Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

import { MapZoomService } from '../services/map-zoom.service';
import { PolygonApiService } from '../services/polygon-api.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private map!: Map;

  // Vector source + layer for API polygons
  private polygonSource = new VectorSource();
  private polygonLayer = new VectorLayer({
    source: this.polygonSource,
    style: new Style({
      stroke: new Stroke({
        color: '#0066cc',
        width: 2
      }),
      fill: new Fill({
        color: 'rgba(0, 102, 204, 0.2)'
      })
    })
  });

  private viewStateSub!: Subscription;

  constructor(
    private zoomService: MapZoomService,
    private polygonApi: PolygonApiService
  ) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.listenToMapInteractions();
    this.listenForPolygonUpdates();
  }

  private initMap(): void {
    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        this.polygonLayer
      ],
      view: new View({
        center: fromLonLat([-8, 53]), // Ireland
        zoom: 6,
        minZoom: 5,
        maxZoom: 12
      })
    });
  }

  /**
   * Emit bbox + zoom only when pan or zoom ENDS
   */
  private listenToMapInteractions(): void {
    const view = this.map.getView();
    let interactionTimeout: any;

    const emitViewState = () => {
      const zoom = view.getZoom();
      const size = this.map.getSize();
      if (!size || zoom === undefined) {
        return;
      }

      // Current extent in map projection (EPSG:3857)
      const extent = view.calculateExtent(size);

      // Convert to lon/lat bbox (EPSG:4326)
      const bbox = transformExtent(
        extent,
        view.getProjection(),
        'EPSG:4326'
      );

      // Emit to Angular service
      this.zoomService.emitViewState(zoom, bbox);
    };

    // Zoom end
    view.on('change:resolution', () => {
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(emitViewState, 200);
    });

    // Pan end
    view.on('change:center', () => {
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(emitViewState, 200);
    });
  }

  /**
   * Listen for bbox + zoom changes and load polygons from API
   */
  private listenForPolygonUpdates(): void {
    this.viewStateSub = this.zoomService.viewState$
      .pipe(
        filter(
          (state): state is { zoom: number; bbox: number[] } =>
            state !== null
        ),
        switchMap(state =>
          this.polygonApi.getPolygons(state.bbox, state.zoom)
        )
      )
      .subscribe(geojson => {
        // Replace polygons
        this.polygonSource.clear();

        const features = new GeoJSON().readFeatures(geojson, {
          featureProjection: this.map.getView().getProjection()
        });

        this.polygonSource.addFeatures(features);
      });
  }

  ngOnDestroy(): void {
    this.viewStateSub?.unsubscribe();
    this.map.setTarget(undefined);
  }
}
