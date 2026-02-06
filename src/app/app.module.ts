import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import {SidebarComponent} from "./sidebar/sidebar.component";
import {provideHttpClient} from "@angular/common/http";
import {PivotReportComponent} from "./components/pivot-report/pivot-report.component";

@NgModule({
  declarations: [AppComponent, MapComponent, SidebarComponent, PivotReportComponent],
  imports: [BrowserModule],
  bootstrap: [AppComponent],
  providers: [
      provideHttpClient(),
  ]
})
export class AppModule {}
