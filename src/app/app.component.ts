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
  import jsPDF from 'jspdf';
  import Map from 'ol/Map';

  @Injectable({ providedIn: 'root' })
  export class PrintService {

  constructor(private mapService: MapService) {}

  async exportPdf(
      pageSize: 'A4' | 'A3',
      dpi: number,
      scale: number,
      legendItems: string[]
  ): Promise<void> {

    const map = this.mapService.getMap();
    const view = map.getView();

    const pageDimensions = {
      A4: [297, 210],
      A3: [420, 297]
    };

    const [widthMm, heightMm] = pageDimensions[pageSize];

    const widthPx = Math.round((widthMm * dpi) / 25.4);
    const heightPx = Math.round((heightMm * dpi) / 25.4);

    const resolution = scale / (dpi * 39.37);

    const originalSize = map.getSize()!;
    const originalResolution = view.getResolution();

    map.setSize([widthPx, heightPx]);
    view.setResolution(resolution);

    await new Promise<void>((resolve) => {
      map.once('rendercomplete', () => {

        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;

        const context = canvas.getContext('2d')!;

        document.querySelectorAll<HTMLCanvasElement>('.ol-layer canvas')
            .forEach(layerCanvas => {
              if (!layerCanvas.width) return;

              context.drawImage(layerCanvas, 0, 0);
            });

        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: pageSize
        });

        // ------------------------
        // HEADER
        // ------------------------
        pdf.setFontSize(18);
        pdf.text('Roundwood Forecast', 15, 15);

        // ------------------------
        // MAP IMAGE
        // ------------------------
        pdf.addImage(
            imgData,
            'PNG',
            10,
            25,
            widthMm - 20,
            heightMm - 50
        );

        // ------------------------
        // SCALE (bottom left)
        // ------------------------
        pdf.setFontSize(10);
        pdf.text(
            `Scale 1 : ${scale.toLocaleString()}`,
            15,
            heightMm - 10
        );

        // ------------------------
        // LEGEND (bottom right)
        // ------------------------
        let legendY = heightMm - 20;

        pdf.setFontSize(11);
        pdf.text('Legend', widthMm - 60, legendY);

        pdf.setFontSize(9);
        legendItems.forEach((item, index) => {
          pdf.text(
              item,
              widthMm - 60,
              legendY + 5 + (index * 5)
          );
        });

        pdf.save('roundwood-forecast.pdf');

        // restore map
        map.setSize(originalSize);
        view.setResolution(originalResolution!);

        resolve();
      });

      map.renderSync();
    });
  }
}

}
