
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

export class EffectWindowEffect implements VFXEffect {
    static effectName = "Effect Window";
    static defaultSettings: VFXSettings = {
        windowX: 10, // percentage
        windowY: 10, // percentage
        windowWidth: 80, // percentage
        windowHeight: 80, // percentage
        innerEffect: 'matrix', // default inner effect key
        borderWidth: 15,
        hue: 200,
    };

    private canvas: HTMLCanvasElement | null = null;
    private mainCtx: CanvasRenderingContext2D | null = null;
    private width = 0;
    private height = 0;

    private innerCanvas: HTMLCanvasElement;
    private innerCtx: CanvasRenderingContext2D;
    private innerEffectInstance: VFXEffect | null = null;
    private innerEffectKey: string = '';

    private availableEffects: Record<string, VFXEffectClass> = {};
    private settings: VFXSettings = EffectWindowEffect.defaultSettings;

    constructor() {
        this.innerCanvas = document.createElement('canvas');
        const ctx = this.innerCanvas.getContext('2d');
        if (!ctx) {
            throw new Error("Could not create 2D context for inner canvas");
        }
        this.innerCtx = ctx;
    }

    private setupInnerEffect(key: string) {
        if (this.innerEffectInstance) {
            this.innerEffectInstance.destroy();
        }

        if (!this.availableEffects || Object.keys(this.availableEffects).length === 0) {
            this.innerEffectInstance = null;
            this.innerEffectKey = '';
            return;
        }

        const EffectClass = this.availableEffects[key];
        if (EffectClass && key !== 'effect-window') { // Prevent recursion
            this.innerEffectKey = key;
            this.innerEffectInstance = new EffectClass();
            
            const w = (this.settings.windowWidth / 100) * this.width;
            const h = (this.settings.windowHeight / 100) * this.height;

            if(w > 0 && h > 0) {
                this.innerCanvas.width = w;
                this.innerCanvas.height = h;
                this.innerEffectInstance.init(this.innerCanvas, EffectClass.defaultSettings);
            } else {
                this.innerEffectInstance = null;
                this.innerEffectKey = '';
            }

        } else {
            this.innerEffectInstance = null;
            this.innerEffectKey = '';
        }
    }
    
    private updateSettings(newSettings: VFXSettings) {
        if (newSettings.availableEffects) {
            this.availableEffects = newSettings.availableEffects;
        }

        if (newSettings.innerEffect !== this.innerEffectKey) {
            this.setupInnerEffect(newSettings.innerEffect);
        }
    
        const sizeChanged = this.settings.windowWidth !== newSettings.windowWidth || 
                            this.settings.windowHeight !== newSettings.windowHeight;
    
        this.settings = { ...EffectWindowEffect.defaultSettings, ...newSettings };
    
        if (sizeChanged && this.innerEffectInstance) {
            const w = (this.settings.windowWidth / 100) * this.width;
            const h = (this.settings.windowHeight / 100) * this.height;
            if(w > 0 && h > 0 && (this.innerCanvas.width !== w || this.innerCanvas.height !== h)) {
                this.innerCanvas.width = w;
                this.innerCanvas.height = h;
                this.innerEffectInstance.init(this.innerCanvas, this.availableEffects[this.innerEffectKey].defaultSettings);
            }
        }
    }

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        this.mainCtx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.updateSettings(settings);
    }

    destroy() {
        if (this.innerEffectInstance) {
            this.innerEffectInstance.destroy();
            this.innerEffectInstance = null;
        }
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;

        this.updateSettings(settings);

        if (this.innerEffectInstance) {
            const innerSettings = this.availableEffects[this.innerEffectKey]?.defaultSettings || {};
            this.innerEffectInstance.update(time, deltaTime, innerSettings);
        }
    }

    private drawCyberBorder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number) {
        const borderWidth = this.settings.borderWidth as number;
        const hue = this.settings.hue as number;

        ctx.save();
        
        ctx.fillStyle = `hsl(${hue}, 50%, 5%)`;
        ctx.fillRect(x - borderWidth, y - borderWidth, w + borderWidth * 2, h + borderWidth * 2);

        ctx.strokeStyle = `hsl(${hue}, 80%, 40%)`;
        ctx.lineWidth = Math.max(1, borderWidth / 10);
        ctx.strokeRect(x - borderWidth, y - borderWidth, w + borderWidth * 2, h + borderWidth * 2);

        const cornerSize = borderWidth * 1.5;
        ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.lineWidth = Math.max(2, borderWidth / 5);
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = Math.max(5, borderWidth / 2);
        ctx.lineCap = 'round';


        const pulse = (Math.sin(time * 4) + 1) / 2;
        const animatedCornerSize = cornerSize * (0.8 + pulse * 0.2);

        const corners = [
            [x - borderWidth, y - borderWidth],
            [x + w + borderWidth, y - borderWidth],
            [x + w + borderWidth, y + h + borderWidth],
            [x - borderWidth, y + h + borderWidth],
        ];
        
        ctx.beginPath();
        ctx.moveTo(corners[0][0], corners[0][1] + animatedCornerSize);
        ctx.lineTo(corners[0][0], corners[0][1]);
        ctx.lineTo(corners[0][0] + animatedCornerSize, corners[0][1]);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(corners[1][0] - animatedCornerSize, corners[1][1]);
        ctx.lineTo(corners[1][0], corners[1][1]);
        ctx.lineTo(corners[1][0], corners[1][1] + animatedCornerSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(corners[2][0], corners[2][1] - animatedCornerSize);
        ctx.lineTo(corners[2][0], corners[2][1]);
        ctx.lineTo(corners[2][0] - animatedCornerSize, corners[2][1]);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(corners[3][0] + animatedCornerSize, corners[3][1]);
        ctx.lineTo(corners[3][0], corners[3][1]);
        ctx.lineTo(corners[3][0], corners[3][1] - animatedCornerSize);
        ctx.stroke();
        
        ctx.shadowBlur = 0;

        ctx.font = '10px "Source Code Pro", monospace';
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.6)`;
        const glyphs = "01AbCdEfGHIjKLMnOpQRstUVwXyZ";
        const glyphOffset = (time * 30) % 15;

        for (let i = 0; i < (w + borderWidth*2) / 15; i++) {
            ctx.fillText(glyphs[Math.floor(i + time*2) % glyphs.length], x - borderWidth + i * 15 + glyphOffset, y - borderWidth/2);
            ctx.fillText(glyphs[Math.floor(i + time*2 + 10) % glyphs.length], x + w + borderWidth - (i * 15 + glyphOffset), y + h + borderWidth/2);
        }

        ctx.restore();
    }

    render(ctx: CanvasRenderingContext2D) {
        const time = performance.now() / 1000;
        const w = (this.settings.windowWidth / 100) * this.width;
        const h = (this.settings.windowHeight / 100) * this.height;
        const x = (this.settings.windowX / 100) * this.width;
        const y = (this.settings.windowY / 100) * this.height;

        this.drawCyberBorder(ctx, x, y, w, h, time);

        if (this.innerEffectInstance && this.innerCanvas.width > 0 && this.innerCanvas.height > 0) {
            this.innerCtx.clearRect(0, 0, this.innerCanvas.width, this.innerCanvas.height);
            this.innerEffectInstance.render(this.innerCtx);
            ctx.drawImage(this.innerCanvas, x, y, w, h);
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(x,y,w,h);
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = '16px "Source Code Pro", monospace';
            ctx.fillText("Select an inner effect", x + w/2, y + h/2);
        }
    }

    getSettings() {
        return this.settings;
    }
}
