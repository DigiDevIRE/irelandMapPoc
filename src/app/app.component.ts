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
    alert(`Submitting: Lat=${this.lat}, Lon=${this.lon}`);
    this.closeModal();
  }
}
