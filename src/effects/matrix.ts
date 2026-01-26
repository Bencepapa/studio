import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nums = '0123456789';
const charset = katakana + latin + nums;

class Symbol {
  x: number;
  y: number;
  value: string;
  isFirst: boolean;
  
  constructor(x: number, y: number, isFirst: boolean) {
    this.x = x;
    this.y = y;
    this.value = '';
    this.isFirst = isFirst;
    this.setRandomSymbol();
  }

  setRandomSymbol() {
    this.value = charset.charAt(Math.floor(Math.random() * charset.length));
  }
}

class Column {
  symbols: Symbol[] = [];
  x: number;
  y: number;
  fontSize: number;
  canvasHeight: number;
  totalSymbols: number;
  initialY: number;
  timeOffset: number;

  constructor(x: number, fontSize: number, canvasHeight: number) {
    this.x = x;
    this.fontSize = fontSize;
    this.canvasHeight = canvasHeight;
    this.totalSymbols = Math.ceil(canvasHeight / fontSize) + 1;
    
    this.initialY = randomRange(-canvasHeight * 1.5, 0);
    this.timeOffset = randomRange(0, 100);
    this.y = this.initialY;

    this.createSymbols();
  }

  createSymbols() {
    let isFirst = randomRange(0, 10) > 7;
    for (let i = 0; i <= this.totalSymbols; i++) {
      this.symbols.push(new Symbol(this.x, i * this.fontSize, isFirst));
      isFirst = false;
    }
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    const fallSpeed = settings.fallSpeed as number;
    const effectiveTime = time + this.timeOffset;
    
    const loopDistance = this.canvasHeight + this.totalSymbols * this.fontSize;
    this.y = (this.initialY + effectiveTime * fallSpeed * 20) % loopDistance;
    if(this.y < this.initialY) this.y += loopDistance; // ensure positive y
    
    // Randomly change symbols - this part is not fully deterministic on scrub for visual variety
    if (Math.random() > 0.98) {
      this.symbols.forEach(s => s.setRandomSymbol());
    }
  }

  draw(ctx: CanvasRenderingContext2D, hue: number) {
    this.symbols.forEach((symbol, index) => {
        const yPos = this.y + index * this.fontSize;
        if (yPos > 0 && yPos < this.canvasHeight) {
            const greenHue = hue;
            const whiteHue = hue;
            const lightness = symbol.isFirst ? 95 : 70;
            const color = symbol.isFirst ? `hsl(${whiteHue}, 100%, ${lightness}%)` : `hsl(${greenHue}, 80%, ${lightness}%)`;
            const alpha = mapRange(index, 0, this.totalSymbols, 1, 0.1);

            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fillText(symbol.value, symbol.x, yPos);
        }
    });
    ctx.globalAlpha = 1;
  }
}

export class MatrixEffect implements VFXEffect {
  private columns: Column[] = [];
  private settings: VFXSettings = MatrixEffect.defaultSettings;
  private canvas: HTMLCanvasElement | null = null;
  private width = 0;
  private height = 0;
  
  static effectName = "Cyber Matrix";
  static defaultSettings: VFXSettings = {
    fontSize: 18,
    fallSpeed: 1,
    hue: 128,
  };

  init(canvas: HTMLCanvasElement, settings: VFXSettings) {
    this.canvas = canvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    if (this.width === 0 || this.height === 0) return;

    this.settings = { ...MatrixEffect.defaultSettings, ...settings };
    this.columns = [];
    const fontSize = this.settings.fontSize as number;
    const numberOfColumns = Math.ceil(this.width / fontSize);
    for (let i = 0; i < numberOfColumns; i++) {
      this.columns.push(new Column(i * fontSize, fontSize, this.height));
    }
  }

  destroy() {
    this.columns = [];
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
     this.settings = { ...MatrixEffect.defaultSettings, ...settings };

    const currentFontSize = this.settings.fontSize as number;
    const fontChanged = this.columns.length > 0 && this.columns[0].fontSize !== currentFontSize;
    const sizeChanged = this.columns.length > 0 && this.columns[0].canvasHeight !== this.height;

    if (fontChanged || sizeChanged) {
        this.init(this.canvas!, this.settings);
    }

    this.columns.forEach(column => column.update(time, deltaTime, this.settings));
  }

  render(ctx: CanvasRenderingContext2D) {
    const fontSize = this.settings.fontSize as number;
    const hue = this.settings.hue as number;
    ctx.font = `bold ${fontSize}px "Source Code Pro", monospace`;
    ctx.textAlign = 'center';
    this.columns.forEach(column => column.draw(ctx, hue));
  }

  getSettings(): VFXSettings {
    return this.settings;
  }
}
