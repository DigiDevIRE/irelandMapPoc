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
}
