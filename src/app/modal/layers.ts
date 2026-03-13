<div class="layer-label">

Townlands

<span
*ngIf="mapZoom < 12"
#infoIcon
class="info-icon"
(mouseenter)="showTooltip()"
(mouseleave)="hideTooltip()"
    >
      ⓘ
    </span>

    <div
#tooltip
class="map-tooltip"
role="tooltip"
    >
    Zoom in to level 12 to enable Townlands
<div class="tooltip-arrow"></div>
    </div>

    </div>

    <label class="switch">
<input
    type="checkbox"
    [checked]="mapLayerService.townlandsVisible"
    [disabled]="mapZoom < 12"
(change)="toggleTownlands($event)"
/>
<span class="slider"></span>
    </label>

    </div>





import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { createPopper } from '@popperjs/core';

export class LayersModalComponent implements AfterViewInit {

    @ViewChild('infoIcon') infoIcon!: ElementRef;
    @ViewChild('tooltip') tooltip!: ElementRef;

    popperInstance: any;

    ngAfterViewInit() {
        this.popperInstance = createPopper(
            this.infoIcon.nativeElement,
            this.tooltip.nativeElement,
            {
                placement: 'top',
                modifiers: [
                    {
                        name: 'offset',
                        options: {
                            offset: [0, 8]
                        }
                    }
                ]
            }
        );
    }

    showTooltip() {
        this.tooltip.nativeElement.setAttribute('data-show', '');
        this.popperInstance.update();
    }

    hideTooltip() {
        this.tooltip.nativeElement.removeAttribute('data-show');
    }
}



.map-tooltip {
    background: #333;
    color: #fff;
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 4px;
    position: absolute;
    z-index: 1000;
    display: none;
}

.map-tooltip[data-show] {
    display: block;
}

.tooltip-arrow,
.tooltip-arrow::before {
    position: absolute;
    width: 8px;
    height: 8px;
    background: inherit;
}

.tooltip-arrow {
    visibility: hidden;
}

.tooltip-arrow::before {
    visibility: visible;
    content: '';
    transform: rotate(45deg);
}
