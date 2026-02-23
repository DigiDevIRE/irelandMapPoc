import { Injectable } from '@angular/core';
import Map from 'ol/Map';

@Injectable({ providedIn: 'root' })
export class MapService {
    private map: Map | null = null;

    setMap(map: Map): void {
        this.map = map;
    }

    getMap(): Map {
        if (!this.map) {
            throw new Error('Map has not been initialised yet. Ensure ForestryMapComponent calls MapService.setMap().');
        }
        return this.map;
    }

    hasMap(): boolean {
        return !!this.map;
    }
}
