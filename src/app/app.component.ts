import { Component } from '@angular/core';
import {MapClickService} from "./services/map-click.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  modalOpen = false;
  lat: number | null = null;
  lon: number | null = null;

  reportData: any[] | null = null;
  showReportModal = false;

  constructor(private mapClickService: MapClickService) {}

  openModal() {
    this.modalOpen = true;

    // Start listening to map clicks
    this.mapClickService.enableClick()
        .subscribe(coords => {
          this.lat = coords.lat;
          this.lon = coords.lon;
        });
  }

  closeModal() {
    this.modalOpen = false;
    this.mapClickService.disableClick();
    this.lat = null;
    this.lon = null;
  }

  submit() {
    if (this.lat == null || this.lon == null) return;

    const payload = {
      latitude: this.lat,
      longitude: this.lon,
      radiusMeters: this.radius
    };

    this.apiService.submitSelection(payload).subscribe({
      next: (response) => {
        this.reportData = response;   // ← backend pivot data
        this.mapClickService.disableClick();
      },
      error: (err) => console.error(err)
    });
  }

  counties: string[] = [];
  filteredCounties: string[] = [];
  searchText = '';

  private loadCountyNames() {
    const source = this.countiesLayer?.getSource();
    if (!source) return;

    const features = source.getFeatures();

    // Wait until GeoJSON loads
    if (!features.length) {
      source.once('change', () => this.loadCountyNames());
      return;
    }

    this.counties = features
        .map(f => f.get('name'))
        .filter(Boolean)
        .sort();

    this.filteredCounties = [...this.counties];
  }

  onSearchChange(value: string) {
    this.searchText = value;

    const v = value.toLowerCase();

    this.filteredCounties = this.counties.filter(c =>
        c.toLowerCase().includes(v)
    );
  }

  selectCounty(name: string) {
    this.searchText = name;
    this.filteredCounties = [];

    this.searchCounty(name); // existing highlight + zoom logic
  }

  clearSearch() {
    this.searchText = '';
    this.filteredCounties = [...this.counties];
    this.highlightLayer?.getSource()?.clear();
  }



  //new stuff
  import { Component, Input, Output, EventEmitter } from '@angular/core';
import Map from 'ol/Map';
import { getWidth } from 'ol/extent';
import View from 'ol/View';

@Component({
  selector: 'app-print-modal',
  templateUrl: './print-modal.component.html',
  styleUrls: ['./print-modal.component.scss']
})
export class PrintModalComponent {

  @Input() map!: Map;
  @Output() close = new EventEmitter<void>();

  pageSize: 'A4' | 'A3' = 'A4';
  dpi = 150;
  scale = 10000;

  scales = [500, 1000, 2500, 5000, 10000, 25000, 50000];

  private pageDimensions = {
    A4: [297, 210], // mm landscape
    A3: [420, 297]
  };

  print(): void {
    const view = this.map.getView();

    const [widthMm, heightMm] = this.pageDimensions[this.pageSize];

    const widthPx = Math.round((widthMm * this.dpi) / 25.4);
    const heightPx = Math.round((heightMm * this.dpi) / 25.4);

    const resolution = this.scale / (this.dpi * 39.37); // OL scale → resolution

    const size = this.map.getSize()!;
    const originalResolution = view.getResolution();

    // Resize map for print render
    this.map.setSize([widthPx, heightPx]);
    view.setResolution(resolution);

    this.map.once('rendercomplete', () => {
      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;

      const context = canvas.getContext('2d')!;

      document
          .querySelectorAll<HTMLCanvasElement>('.ol-layer canvas')
          .forEach((layerCanvas) => {
            if (layerCanvas.width > 0) {
              const opacity =
                  layerCanvas.parentElement!.style.opacity || '1';
              context.globalAlpha = Number(opacity);

              const transform = layerCanvas.style.transform;

              const matrix = transform
                  .match(/^matrix\(([^\(]*)\)$/)?.[1]
                  .split(',')
                  .map(Number);

              if (matrix) {
                context.setTransform(
                    matrix[0],
                    matrix[1],
                    matrix[2],
                    matrix[3],
                    matrix[4],
                    matrix[5]
                );
              }

              context.drawImage(layerCanvas, 0, 0);
            }
          });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'map-print.png';
      link.click();

      // Restore map
      this.map.setSize(size);
      view.setResolution(originalResolution!);
      this.close.emit();
    });

    this.map.renderSync();
  }


}
