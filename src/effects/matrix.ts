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

  constructor(x: number, fontSize: number, canvasHeight: number) {
    this.x = x;
    this.fontSize = fontSize;
    this.canvasHeight = canvasHeight;
    this.y = randomRange(-canvasHeight, 0);
    this.totalSymbols = Math.ceil(canvasHeight / fontSize);
    this.createSymbols();
  }

  createSymbols() {
    let isFirst = randomRange(0, 10) > 7;
    for (let i = 0; i <= this.totalSymbols; i++) {
      this.symbols.push(new Symbol(this.x, i * this.fontSize, isFirst));
      isFirst = false;
    }
  }

  update(fallSpeed: number) {
    this.y += fallSpeed;
    if (this.y > this.canvasHeight) {
        this.y = randomRange(-this.canvasHeight, 0);
    }
    
    // Randomly change symbols
    if (Math.random() > 0.98) {
      this.symbols.forEach(s => s.setRandomSymbol());
    }
  }

  draw(ctx: CanvasRenderingContext2D, hue: number) {
    this.symbols.forEach((symbol, index) => {
        const yPos = this.y + index * this.fontSize;
        if (yPos > 0 && yPos < this.canvasHeight) {
            const greenHue = hue; // Neon Green
            const whiteHue = hue;
            const lightness = symbol.isFirst ? 95 : 70;
            const color = symbol.isFirst ? `hsl(${whiteHue}, 100%, ${lightness}%)` : `hsl(${greenHue}, 80%, ${lightness}%)`;
            const alpha = mapRange(yPos, 0, this.canvasHeight, 1, 0.1);

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
  
  static effectName = "Cyber Matrix";
  static defaultSettings: VFXSettings = {
    fontSize: 18,
    fallSpeed: 1,
    hue: 128,
  };

  init(canvas: HTMLCanvasElement, settings: VFXSettings) {
    this.canvas = canvas;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    this.settings = { ...MatrixEffect.defaultSettings, ...settings };
    this.columns = [];
    const fontSize = this.settings.fontSize as number;
    const numberOfColumns = Math.ceil(width / fontSize);
    for (let i = 0; i < numberOfColumns; i++) {
      this.columns.push(new Column(i * fontSize, fontSize, height));
    }
  }

  destroy() {
    this.columns = [];
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
     this.settings = { ...MatrixEffect.defaultSettings, ...settings };
    const fallSpeed = (this.settings.fallSpeed as number) * (deltaTime * 60);

    // Re-initialize if font size or canvas dimensions changed significantly
    const currentFontSize = this.settings.fontSize as number;
    if (this.columns.length > 0 && this.columns[0].fontSize !== currentFontSize) {
        this.init(this.canvas!, this.settings);
    }

    this.columns.forEach(column => column.update(fallSpeed));
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
