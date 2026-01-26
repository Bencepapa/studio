
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const testItemsList = [
    'BIOS ROM CHECKSUM... OK',
    'MEMORY TEST (640KB)... OK',
    'ビデオ・メモリ・チェック...', // Video Memory Check
    'DMA CONTROLLER... OK',
    'キーボード... OK', // Keyboard
    'INT 13H... OK',
    'FIXED DISK 0... OK',
    'ディスク・ドライブ... OK', // Disk Drive
    'INITIALIZING...',
];

interface TestLine {
    text: string;
    appearTime: number;
}

export class PCStartupEffect implements VFXEffect {
    private settings: VFXSettings = PCStartupEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    private testLines: TestLine[] = [];
    private totalDuration = 5.0; // Total duration of one startup cycle

    static effectName = "PC Startup";
    static defaultSettings: VFXSettings = {
        hue: 120, // Green
        scanlineOpacity: 0.1,
        glitchChance: 0.1,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...PCStartupEffect.defaultSettings, ...settings };
        
        this.testLines = [];
        let time = 0.5; // Start after a brief pause
        const timeStep = 0.15; // Fast steps
        
        testItemsList.forEach((item, index) => {
            this.testLines.push({ text: item, appearTime: time });
            time += timeStep;
            // Add some random fast katakana lines
            if (seededRandom(index) > 0.5) {
                 this.testLines.push({ text: this.generateRandomKatakana(), appearTime: time });
                 time += timeStep;
            }
        });
        
        this.testLines.push({ text: 'BOOTING FROM FIXED DISK...', appearTime: time + 0.5 });
    }

    generateRandomKatakana(): string {
        let result = '';
        const len = Math.floor(seededRandom(this.testLines.length) * 10) + 5;
        for(let i=0; i<len; i++) {
            result += katakana.charAt(Math.floor(Math.random() * katakana.length));
        }
        return result;
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;

        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        
        this.settings = { ...PCStartupEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
    }
    
    drawPixelLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, hue: number) {
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        const s = size;
        // A simple, abstract pixel logo
        ctx.fillRect(x, y, s*3, s);
        ctx.fillRect(x + s, y + s, s, s*3);
        ctx.fillRect(x, y + s*4, s*3, s);
        ctx.fillRect(x + s*3, y + s*2, s*2, s);
    }
    
    drawScanlines(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = `hsla(0, 0%, 0%, ${this.settings.scanlineOpacity})`;
        for(let y=0; y < this.height; y += 3) {
            ctx.fillRect(0, y, this.width, 1);
        }
        ctx.restore();
    }
    
    applyGlitch(ctx: CanvasRenderingContext2D) {
        if (Math.random() < (this.settings.glitchChance as number)) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const spliceWidth = this.width - x;
            const spliceHeight = Math.random() * 10 + 1;
            ctx.drawImage(ctx.canvas, x, y, spliceWidth, spliceHeight, x, y - 5 + Math.random() * 10, spliceWidth, spliceHeight);
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const { hue } = this.settings;
        const timeInCycle = this.currentTime;

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.width, this.height);

        // Scanlines
        this.drawScanlines(ctx);

        // Text color and font
        ctx.fillStyle = `hsl(${hue as number}, 70%, 60%)`;
        ctx.font = `bold ${Math.min(this.width, this.height) / 40}px "Source Code Pro", monospace`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        // Draw Pixel Logo
        this.drawPixelLogo(ctx, this.width * 0.05, this.height * 0.1, Math.min(this.width, this.height) / 100, hue as number);
        
        // Draw Text
        const textX = this.width * 0.05;
        let currentY = this.height * 0.25;
        const lineHeight = Math.min(this.width, this.height) / 40 * 1.5;
        const maxLines = Math.floor((this.height - currentY) / lineHeight) -1;
        let scrollOffset = 0;

        const visibleLines = this.testLines.filter(line => timeInCycle >= line.appearTime);
        if (visibleLines.length > maxLines) {
            scrollOffset = (visibleLines.length - maxLines) * lineHeight;
        }

        visibleLines.forEach(line => {
             // Typing effect for the label
            const timeSinceAppear = timeInCycle - line.appearTime;
            const typingSpeed = 50; // chars per second
            const charsToShow = Math.floor(timeSinceAppear * typingSpeed);
            const textToDraw = line.text.substring(0, charsToShow);
            
            const yPos = currentY - scrollOffset;

            if (yPos > this.height * 0.2) { // don't draw over the logo
                 ctx.fillText(textToDraw, textX, yPos);
            }
            currentY += lineHeight;
        });
        
        // Blinking Cursor
        const cursorVisible = Math.floor(timeInCycle * 2) % 2 === 0;
        if (cursorVisible && timeInCycle < this.totalDuration - 0.5) {
            const lastLine = visibleLines[visibleLines.length - 1];
            if (lastLine) {
                 const timeSinceAppear = timeInCycle - lastLine.appearTime;
                 const typingSpeed = 50;
                 const charsToShow = Math.floor(timeSinceAppear * typingSpeed);
                 const textToDraw = lastLine.text.substring(0, charsToShow);
                 const cursorX = textX + ctx.measureText(textToDraw).width;
                 const cursorY = currentY - lineHeight - scrollOffset;
                 if (cursorY > this.height * 0.2) {
                    ctx.fillRect(cursorX, cursorY, lineHeight * 0.6, lineHeight);
                 }
            }
        }
        
        // Final Glitch
        this.applyGlitch(ctx);

        // Add a little CRT glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.08;
        ctx.filter = 'blur(6px)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
