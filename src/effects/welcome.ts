
import { mapRange, seededRandom } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class WelcomeParticle {
    x: number;
    y: number;
    z: number;
    size: number;
    opacity: number;
    seed: number;
    
    initialX: number;
    initialY: number;
    initialZ: number;

    constructor(seed: number, canvasWidth: number, canvasHeight: number) {
        this.seed = seed;
        this.initialX = (seededRandom(this.seed) - 0.5) * canvasWidth * 2;
        this.initialY = (seededRandom(this.seed + 1) - 0.5) * canvasHeight * 2;
        this.initialZ = seededRandom(this.seed + 2) * 1000;
        
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.size = 0;
        this.opacity = 0;
    }

    update(time: number, canvasWidth: number, canvasHeight: number) {
        this.z = (this.initialZ - time * 50) % 1000;
        if (this.z < 0) this.z += 1000;

        const fov = canvasWidth * 0.7;
        const scale = fov / (fov + this.z);
        
        this.x = this.initialX * scale + canvasWidth / 2;
        this.y = this.initialY * scale + canvasHeight / 2;
        this.size = (1 - this.z / 1000) * 5;
        this.opacity = (1 - this.z / 1000) * 0.8;
    }
    
    draw(ctx: CanvasRenderingContext2D, hue: number) {
        if (this.opacity <= 0) return;
        ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


export class WelcomeEffect implements VFXEffect {
    private particles: WelcomeParticle[] = [];
    private settings: VFXSettings = WelcomeEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    static effectName = "VFX Lab Welcome";
    static defaultSettings: VFXSettings = {
        hue: 289,
        particleCount: 100,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...WelcomeEffect.defaultSettings, ...settings };
        
        this.particles = [];
        const particleCount = this.settings.particleCount as number;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new WelcomeParticle(i, this.width, this.height));
        }
    }

    destroy() {
        this.particles = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit = 
            settings.particleCount !== this.settings.particleCount ||
            this.width !== rect.width ||
            this.height !== rect.height;
        
        this.settings = { ...WelcomeEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        this.particles.forEach(p => p.update(time, this.width, this.height));
    }

    private drawText(ctx: CanvasRenderingContext2D, time: number) {
        const { hue } = this.settings;
        const mainColor = `hsl(${hue as number}, 100%, 85%)`;
        const glowColor = `hsla(${hue as number}, 100%, 70%, 0.7)`;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const fadeInDuration = 1.0;
        const overallOpacity = Math.min(1, time / fadeInDuration);
        
        ctx.globalAlpha = overallOpacity;

        // Main Title
        const titleSize = Math.min(this.width / 8, 100);
        ctx.font = `700 ${titleSize}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = mainColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        ctx.fillText("VFX LAB", this.width / 2, this.height / 2 - titleSize * 0.6);
        ctx.shadowBlur = 0;

        // Subtitles
        const subtitleSize = Math.min(this.width / 40, 24);
        ctx.font = `400 ${subtitleSize}px "Source Code Pro", monospace`;
        ctx.fillStyle = `hsla(${hue as number}, 80%, 80%, 0.9)`;
        
        const line1 = "Welcome, developer.";
        const line2 = "Select an effect from the sidebar to begin.";
        
        const typingSpeed = 15; // chars per second
        const timeForLine1 = line1.length / typingSpeed;
        
        const line1Chars = Math.floor(Math.max(0, time - fadeInDuration) * typingSpeed);
        const line1Text = line1.substring(0, line1Chars);
        
        const line2StartTime = fadeInDuration + timeForLine1 + 0.5;
        const line2Chars = Math.floor(Math.max(0, time - line2StartTime) * typingSpeed);
        const line2Text = line2.substring(0, line2Chars);
        
        const textY = this.height / 2 + subtitleSize;
        ctx.fillText(line1Text, this.width / 2, textY);
        ctx.fillText(line2Text, this.width / 2, textY + subtitleSize * 1.5);
        
        ctx.globalAlpha = 1;
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        // Draw particles
        this.particles.forEach(p => p.draw(ctx, this.settings.hue as number));
        
        // Draw text
        this.drawText(ctx, this.currentTime);
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
