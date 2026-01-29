import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Map } from 'ol';
import { toLonLat } from 'ol/proj';

@Injectable({
    providedIn: 'root'
})
export class MapClickService {
    private map!: Map;
    private clickSubject = new Subject<{lat: number, lon: number}>();
    private listener: any;

    /** Set the map reference from the map component */
    setMap(map: Map) {
        this.map = map;
    }

    enableClick(): Observable<{lat: number, lon: number}> {
        if (!this.map) return new Observable();

        this.listener = this.map.on('click', evt => {
            const [lon, lat] = toLonLat(evt.coordinate);
            this.clickSubject.next({ lat, lon });
        });

        return this.clickSubject.asObservable();
    }

    disableClick() {
        if (this.listener) {
            this.map.un('click', this.listener);
            this.listener = null;
        }
    }
}
