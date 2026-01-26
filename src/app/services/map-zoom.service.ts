import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapZoomService {
  private zoomSubject = new BehaviorSubject<number | null>(null);

  /** Observable for components to subscribe to */
  zoom$: Observable<number | null> = this.zoomSubject.asObservable();

  /** Emit zoom changes */
  emitZoom(zoom: number): void {
    this.zoomSubject.next(zoom);
  }
}
