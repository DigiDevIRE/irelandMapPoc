# irelandMapPoc

<div style="position: absolute; top: 10px; left: 10px; z-index: 1000; background: white; padding: 5px; border-radius: 4px;">
  <label for="basemap">Base Map:</label>
  <select id="basemap" (change)="switchBaseMap($event.target.value)">
    <option value="standard">OSM Standard</option>
    <option value="humanitarian">OSM Humanitarian</option>
  </select>
</div>

<div id="map" class="map-container"></div>


