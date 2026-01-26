import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import {SidebarComponent} from "./sidebar/sidebar.component";

@NgModule({
  declarations: [AppComponent, MapComponent, SidebarComponent],
  imports: [BrowserModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
