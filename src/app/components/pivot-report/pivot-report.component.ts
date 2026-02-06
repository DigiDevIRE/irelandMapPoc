import {AfterViewInit, Component, Input} from '@angular/core';
import * as WebDataRocks from 'webdatarocks';

@Component({
  selector: 'pivot-report',
  standalone: false,
  templateUrl: './pivot-report.component.html',
  styleUrl: './pivot-report.component.css'
})
export class PivotReportComponent implements AfterViewInit {

  @Input() data: any[] = [];

  ngAfterViewInit(): void {
    new WebDataRocks({
      container: "#wdr-container",
      toolbar: true,
      report: {
        dataSource: {
          data: this.data
        }
      }
    });
  }
}
