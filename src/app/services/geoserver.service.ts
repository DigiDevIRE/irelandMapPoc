import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class GeoServerService {
    constructor(private http: HttpClient) {}

    /** Fetch polygons from API as GeoJSON */
    getPolygons(): Observable<any> {
        return this.http.get('https://your-api.com/polygons'); // replace with your endpoint
    }
}
