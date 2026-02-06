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
}
