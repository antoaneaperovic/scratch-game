import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardsService } from '../../services/cards.service';
import { SCRATCH_TYPE, ScratchConfig } from '../../models/scratch-config.model';
import { MatDialog } from '@angular/material/dialog';
import { HistoryDialogComponent } from '../history-dialog/history-dialog.component';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-scratch-card',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './scratch-card.component.html',
  styleUrl: './scratch-card.component.scss',
})
export class ScratchCardComponent {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  canvasElement!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  balance: number = 10000;
  betValue: number = 1;
  betValues: number[] = [0.1, 0.25, 0.5, 1, 2];
  decreaseBalance: boolean = false;
  playerWon: boolean = false;

  brushImage!: HTMLImageElement;

  callbackDone: boolean = false;
  readyToClear: boolean = false;

  zone!: { top: number; left: number };
  position!: number[];
  percent!: number;
  mouseX!: number;
  mouseY!: number;
  config!: ScratchConfig;
  scratchType!: SCRATCH_TYPE;
  cardValues: number[] = [];

  cardService = inject(CardsService);
  dialog = inject(MatDialog);

  ngOnInit() {
    this.resetCard();
  }

  changeBalance(value: number) {
    this.balance += value;
  }

  openHistoryModal() {
    this.dialog.open(HistoryDialogComponent, {
      width: '600px',
    });
  }

  canvasInit() {
    this.canvasElement = document.createElement('canvas');
    this.ctx = this.canvasElement.getContext('2d') ?? this.ctx;
    this.canvasElement.classList.add('sc__canvas');
    this.canvasElement.width = 400;
    this.canvasElement.height = 400;
    this.canvas.nativeElement.appendChild(this.canvasElement);
    this.ctx.globalCompositeOperation = 'destination-over';

    this.canvasElement.addEventListener('mousedown', (event) => {
      event.preventDefault();
      this._setScratchPosition();
      this.canvasElement.addEventListener('mousemove', this.scratching);
      this.removeMouseListener();
    });

    this.canvasElement.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this._setScratchPosition();
      this.canvasElement.addEventListener('touchmove', this.scratching);
      this.removeTouchEventListener();
    });

    this.canvasImageLoad();
  }

  canvasImageLoad(): void {
    this.cardService.loadImage().subscribe({
      next: (img: HTMLImageElement) => {
        this.ctx.drawImage(img, 0, 0, 400, 400);
      },
      error: (err) => {
        console.error(err.message);
      },
      complete: () => {
        console.log('Image loaded successfully');
      },
    });
  }

  prizeCanvasInit() {
    const prizeCanvasElement = <HTMLCanvasElement>(
      document.getElementById('myCanvas')
    );
    const canvasItem = prizeCanvasElement.getContext('2d');
    if (!canvasItem) return;
    canvasItem.font = '20px Arial';
    if (this.percent > 5) {
      canvasItem.clearRect(
        0,
        0,
        prizeCanvasElement.width,
        prizeCanvasElement.height,
      );
      canvasItem.fillStyle = '#000';
      canvasItem.fillText(this.config.htmlBackground, 10, 50);
    } else {
      canvasItem.fillText('Scratch More', 10, 50);
    }
  }

  _setScratchPosition() {
    this.zone = this.getOffset(this.canvasElement);
    // console.log(this.zone, ' Zone');
  }

  scratching = this.throttle((event: Event) => {
    if (!this.decreaseBalance) {
      this.changeBalance(-this.betValue);
      this.decreaseBalance = true;
    }
    event.preventDefault();
    this.dispatchEvent('scratch', 'move');
    this.position = this.mousePosition(event);
    this.updateMousePosition(this.position[0], this.position[1]);
    this.scratch();
    if (this.config.enabledPercentUpdate) {
      this.prizeCanvasInit();
      this.percent = this.updatePercent();
    }
  }, 16);

  throttle(callback: Function, delay: number): (...args: any[]) => void {
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (...args: any[]) => {
      const now = Date.now();

      if (now - last >= delay) {
        last = now;
        callback(...args);
      } else {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(
          () => {
            last = Date.now();
            callback(...args);
          },
          delay - (now - last),
        );
      }
    };
  }

  dispatchEvent(phase: string, type: string) {
    this.dispatchCustomEvent(this.canvasElement, `${phase}.${type}`, {});
  }

  dispatchCustomEvent(target: HTMLCanvasElement, type: string, detail: any) {
    let customEvent = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: detail,
    });
    target.dispatchEvent(customEvent);
  }

  mousePosition(event: any): number[] {
    var posX: number = 0;
    var posY: number = 0;

    switch (event.type) {
      case 'touchmove':
        posX =
          event.touches[0].clientX -
          this.config.clearZoneRadius -
          this.zone.left;
        posY =
          event.touches[0].clientY -
          this.config.clearZoneRadius -
          this.zone.top;
        break;
      case 'mousemove':
        posX = event.clientX - this.config.clearZoneRadius - this.zone.left;
        posY = event.clientY - this.config.clearZoneRadius - this.zone.top;
        break;
    }

    return [posX, posY];
  }

  removeMouseListener() {
    document.body.addEventListener('mouseup', () => {
      this.finish();
      this.canvasElement.removeEventListener('mousemove', this.scratching);
      document.body.removeEventListener('mouseup', () => {});
    });
  }

  removeTouchEventListener() {
    document.body.addEventListener('touchend', () => {
      this.finish();
      this.canvasElement.removeEventListener('touchmove', this.scratching);
      document.body.removeEventListener(
        'touchend',
        this.removeTouchEventListener,
      );
    });
  }

  finish(wager: boolean = false) {
    this.cardService.betValue.set(this.betValue);
    if (wager) {
      this.changeBalance(-this.betValue);
      this.percent = 100;
    }
    if (!this.callbackDone && this.percent > this.config.percentToFinish) {
      if (this.cardService.winValue() !== 0) this.playerWon = true;
      this.cardService.addHistoryItem();
      this.changeBalance(this.cardService.winValue() * this.betValue);
      this.clearCanvas();
      this.canvasElement.style.pointerEvents = 'none';
      this.canvasElement.remove();
      if (this.config.callback !== undefined) {
        this.callbackDone = true;
        this.config.callback();
      }
    }
  }

  updatePercent(): number {
    let counter = 0;
    let imageData = this.ctx.getImageData(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height,
    );
    let imageDataLength = imageData.data.length;

    for (let i = 0; i < imageDataLength; i += 4) {
      if (
        imageData.data[i] === 0 &&
        imageData.data[i + 1] === 0 &&
        imageData.data[i + 2] === 0 &&
        imageData.data[i + 3] === 0
      ) {
        counter++;
      }
    }

    return counter >= 1
      ? (counter / (this.canvasElement.width * this.canvasElement.height)) * 100
      : 0;
  }

  clearCanvas(): void {
    if (this.canvasElement) {
      this.ctx.clearRect(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height,
      );
      this.percent = 100;
    }
  }

  updateMousePosition(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  scratch(): void {
    let x = this.position[0];
    let y = this.position[1];
    let i = 0;

    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.save();
    switch (this.config.scratchType) {
      case SCRATCH_TYPE.BRUSH:
        this.brush(this.brushImage);
        break;
      case SCRATCH_TYPE.CIRCLE:
        this.circle(this.config.clearZoneRadius);
        break;
      case SCRATCH_TYPE.SPRAY:
        this.spray(
          this.config.clearZoneRadius,
          this.config.pointSize,
          this.config.nPoints,
        );
        break;
    }

    this.ctx.restore();
  }

  circle(r: number) {
    this.ctx.beginPath();
    this.ctx.arc(this.mouseX + r, this.mouseY + r, r, 0, Math.PI * 2, false);
    this.ctx.fillStyle = '#000000';
    this.ctx.fill();
    this.ctx.closePath();
  }

  clearPoint(r: number): number[] {
    let radius: number = r;
    let x: number = Math.random() * 2 * radius - radius;
    let ylim: number = Math.sqrt(radius * radius - x * x);
    let y: number = Math.random() * 2 * ylim - ylim;
    x += radius;
    y += radius;

    x += this.mouseX;
    y += this.mouseY;

    return [x, y];
  }

  spray(area: number, dropsSize: number, dropsCount: number) {
    let i = 0;

    for (i; i < dropsCount; i++) {
      let points = this.clearPoint(area / 2);
      this.ctx.beginPath();
      this.ctx.arc(
        points[0] + area / 2,
        points[1] + area / 2,
        dropsSize / 2,
        0,
        Math.PI * 2,
        false,
      );
      this.ctx.fillStyle = '#000000';
      this.ctx.fill();
      this.ctx.closePath();
    }
  }

  brush(img: HTMLImageElement) {
    if (img === null) {
      let error = new Error('IMG error');
      console.log(error.message);
      return;
    }
    let angle = Math.atan2(this.mouseY, this.mouseX);
    this.ctx.save();
    this.ctx.translate(this.mouseX, this.mouseY);
    this.ctx.rotate(angle);
    this.ctx.drawImage(img, -(img.width / 2), -(img.height / 2));
  }

  resetCard() {
    this.cardService.drawCards(9);
    this.decreaseBalance = false;
    const defaults = {
      scratchType: SCRATCH_TYPE.SPRAY,
      containerWidth: 300,
      containerHeight: 300,
      percentToFinish: 45,
      nPoints: 100,
      pointSize: 50,
      callback: () => {},
      brushSrc: '',
      imageForwardSrc: '',
      imageBackgroundSrc: '',
      clearZoneRadius: 0,
      htmlBackground: '',
      enabledPercentUpdate: true,
      cursor: {
        cur: 'string',
        png: 'string',
        poosition: [0, 0],
      },
    };
    this.config = { ...defaults };
    if (this.percent !== 100 && this.config && this.canvasElement) {
      this.percent = 100;
      this.finish();
    }
    this.scratchType = this.config.scratchType;
    this.position = [0, 0];
    this.readyToClear = false;
    this.percent = 0;
    this.callbackDone = false;
    this.playerWon = false;

    this.canvasInit();
  }

  getOffset(element: HTMLElement) {
    let offset = {
      left: 0,
      top: 0,
    };
    let clientRect = element.getBoundingClientRect();

    while (element) {
      offset.top += element.offsetTop;
      offset.left += element.offsetLeft;
      element = <HTMLElement>element.offsetParent;
    }
    let deltaLeft = offset.left - clientRect.left;
    let deltaTop = offset.top - clientRect.top;

    return {
      left:
        deltaLeft < 0
          ? offset.left + Math.abs(deltaLeft)
          : offset.left - Math.abs(deltaLeft),
      top:
        deltaTop < 0
          ? offset.top + Math.abs(deltaTop)
          : offset.top - Math.abs(deltaTop),
    };
  }
}
