
import { mapRange, randomRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

interface TestItem {
    label: string;
    status: string;
    appearTime: number;
    hasRun: boolean;
}

export class ArcadeStartupEffect implements VFXEffect {
    private settings: VFXSettings = ArcadeStartupEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    private testItems: TestItem[] = [];
    private gridPattern: CanvasPattern | null = null;

    // Animation timings
    private gridFadeInDuration = 0.5;
    private checksDuration = 3.0;
    private holdDuration = 2.0;
    private totalDuration = 0;

    static effectName = "Arcade Startup";
    static defaultSettings: VFXSettings = {
        hue: 180, // cyan for grid
        textHue: 50, // yellow for text
        backgroundColor: 'hsl(0, 0%, 5%)',
        scanlineOpacity: 0.1,
        gridSize: 30,
    };

    constructor() {
        this.totalDuration = this.gridFadeInDuration + this.checksDuration + this.holdDuration;
    }

    private createGridPattern() {
        if (!this.settings.gridSize) return;

        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d')!;
        const gridSize = this.settings.gridSize as number;
        patternCanvas.width = gridSize;
        patternCanvas.height = gridSize;

        const gridColor = `hsl(${this.settings.hue as number}, 100%, 30%)`;
        patternCtx.strokeStyle = gridColor;
        patternCtx.lineWidth = 1;
        
        // Horizontal and Vertical lines
        patternCtx.beginPath();
        patternCtx.moveTo(0, gridSize);
        patternCtx.lineTo(gridSize, gridSize);
        patternCtx.moveTo(gridSize, 0);
        patternCtx.lineTo(gridSize, gridSize);
        patternCtx.stroke();
        
        this.gridPattern = patternCtx.createPattern(patternCanvas, 'repeat')!;
    }

    private initializeTests() {
        this.testItems = [];
        const baseTime = this.gridFadeInDuration;
        const timeStep = 0.2;

        this.testItems.push({ label: 'RAM CHECK', status: 'OK', appearTime: baseTime, hasRun: false });
        this.testItems.push({ label: 'ROM CHECK', status: 'OK', appearTime: baseTime + timeStep * 2, hasRun: false });
        
        for(let i=0; i<8; i++) {
            const label = katakana.charAt(Math.floor(Math.random() * katakana.length)) +
                          katakana.charAt(Math.floor(Math.random() * katakana.length)) +
                          ' SUBSYSTEM';
            this.testItems.push({ label, status: 'OK', appearTime: baseTime + timeStep * (4 + i), hasRun: false });
        }
        
        this.testItems.push({ label: 'SYSTEM READY', status: '', appearTime: baseTime + timeStep * 14, hasRun: false });
    }

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...ArcadeStartupEffect.defaultSettings, ...settings };
        
        this.createGridPattern();
        this.initializeTests();
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;

        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height || this.settings.gridSize !== settings.gridSize || this.settings.hue !== settings.hue;
        
        this.settings = { ...ArcadeStartupEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
    }
    
    drawScanlines(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = `hsla(0, 0%, 0%, ${this.settings.scanlineOpacity})`;
        for(let y=0; y < this.height; y += 4) {
            ctx.fillRect(0, y, this.width, 2);
        }
        ctx.restore();
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const timeInCycle = this.currentTime;
        const { backgroundColor } = this.settings;

        // Background
        ctx.fillStyle = backgroundColor as string;
        ctx.fillRect(0, 0, this.width, this.height);

        // Grid
        if (this.gridPattern) {
             const gridFadeInEnd = this.gridFadeInDuration;
             let gridOpacity = 0;
             if (timeInCycle < gridFadeInEnd) {
                 gridOpacity = mapRange(timeInCycle, 0, gridFadeInEnd, 0, 1);
             } else {
                 gridOpacity = 1;
             }
             ctx.save();
             ctx.globalAlpha = gridOpacity * 0.5;
             ctx.fillStyle = this.gridPattern;
             ctx.fillRect(0, 0, this.width, this.height);
             ctx.restore();
        }

        // Scanlines
        this.drawScanlines(ctx);
        
        // Text
        const textColor = `hsl(${this.settings.textHue as number}, 100%, 60%)`;
        ctx.fillStyle = textColor;
        ctx.font = `bold ${Math.min(this.width, this.height) / 30}px "Source Code Pro", monospace`;
        ctx.textBaseline = 'top';

        const textX = this.width * 0.1;
        let currentY = this.height * 0.2;
        const lineHeight = Math.min(this.width, this.height) / 30 * 1.5;
        const statusX = textX + 250;
        
        this.testItems.forEach(item => {
            if (timeInCycle >= item.appearTime) {
                // Typing effect for the label
                const timeSinceAppear = timeInCycle - item.appearTime;
                const typingSpeed = 50; // chars per second
                const charsToShow = Math.floor(timeSinceAppear * typingSpeed);
                const labelToShow = item.label.substring(0, charsToShow);
                
                ctx.fillText(labelToShow, textX, currentY);

                // Show status after a delay
                if (timeSinceAppear > 0.5 && item.status) {
                    ctx.fillText(item.status, statusX, currentY);
                }
                currentY += lineHeight;
            }
        });

        // Add a little CRT glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.1;
        ctx.filter = 'blur(8px)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
