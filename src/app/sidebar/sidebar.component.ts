import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MapZoomService } from '../services/map-zoom.service';

@Component({
  selector: 'app-sidebar',
  template: `<p>Zoom level: {{ zoom }}</p>`,
  standalone: false
})
export class SidebarComponent implements OnInit, OnDestroy {
  zoom: number | null = null;
  private sub!: Subscription;

  constructor(private zoomService: MapZoomService) {}

  ngOnInit(): void {
    this.sub = this.zoomService.zoom$.subscribe(zoom => {
      this.zoom = zoom;
      console.log('Received zoom from service:', zoom);
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
