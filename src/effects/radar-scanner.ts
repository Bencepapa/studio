import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

// Target rectangles that appear
class Target {
    x: number;
    y: number;
    width: number;
    height: number;
    appearTime: number;
    duration: number;

    constructor(appearTime: number, canvasWidth: number, canvasHeight: number) {
        // Use a seeded random to make target positions deterministic
        const seed = Math.floor(appearTime * 10);
        this.x = seededRandom(seed) * (canvasWidth - 120);
        this.y = seededRandom(seed * 2) * (canvasHeight - 120);
        this.width = seededRandom(seed * 3) * 100 + 20;
        this.height = seededRandom(seed * 4) * 100 + 20;
        this.appearTime = appearTime;
        this.duration = seededRandom(seed * 5) * 2 + 1; // Lasts 1-3 seconds
    }

    draw(ctx: CanvasRenderingContext2D, time: number, hue: number) {
        const timeSinceAppear = time - this.appearTime;
        if (timeSinceAppear < 0 || timeSinceAppear > this.duration) {
            return;
        }

        const fadeOutProgress = timeSinceAppear / this.duration;
        const opacity = (1.0 - fadeOutProgress) * 0.8;

        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${opacity})`;
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${opacity * 0.1})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}


export class RadarScannerEffect implements VFXEffect {
    private settings: VFXSettings = RadarScannerEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private targets: Target[] = [];
    private lastTargetSpawnTime: number = -1;

    static effectName = "Radar Scanner";
    static defaultSettings: VFXSettings = {
        scanSpeed: 0.5,
        shadowLineCount: 5,
        targetFrequency: 0.5, // targets per second
        hue: 180,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...RadarScannerEffect.defaultSettings, ...settings };
        this.targets = [];
        this.lastTargetSpawnTime = -1;
    }

    destroy() {
        this.targets = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width || this.height !== rect.height;

        this.settings = { ...RadarScannerEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }
        
        const targetFrequency = this.settings.targetFrequency as number;
        // Deterministically decide when to spawn a new target
        const timeForNewTarget = Math.floor(this.currentTime * targetFrequency);

        if (timeForNewTarget > this.lastTargetSpawnTime) {
            this.lastTargetSpawnTime = timeForNewTarget;
            // The time used for seeding should be consistent
            const spawnTime = timeForNewTarget / targetFrequency;
            const newTarget = new Target(spawnTime, this.width, this.height);
            this.targets.push(newTarget);
        }

        // Clean up old targets for performance
        this.targets = this.targets.filter(target => this.currentTime < target.appearTime + target.duration);
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const { scanSpeed, shadowLineCount, hue } = this.settings;
        const speed = scanSpeed as number;
        const numShadows = shadowLineCount as number;
        const colorHue = hue as number;

        ctx.save();

        // Draw targets first so lines appear on top
        this.targets.forEach(target => target.draw(ctx, this.currentTime, colorHue));

        // --- Main Scan Lines ---
        // Ping-pong progress (0 -> 1 -> 0)
        const vScanProgress = (this.currentTime * speed) % 2;
        const vScanX = (vScanProgress < 1) 
            ? mapRange(vScanProgress, 0, 1, 0, this.width)
            : mapRange(vScanProgress, 1, 2, this.width, 0);
        
        const hScanProgress = (this.currentTime * speed * 0.7) % 2;
        const hScanY = (hScanProgress < 1)
            ? mapRange(hScanProgress, 0, 1, 0, this.height)
            : mapRange(hScanProgress, 1, 2, this.height, 0);

        // --- Draw Shadow Lines ---
        for (let i = 1; i <= numShadows; i++) {
            const shadowOffset = i * 10;
            const shadowOpacity = 0.2 - (i / numShadows) * 0.18;

            ctx.fillStyle = `hsla(${colorHue}, 80%, 70%, ${shadowOpacity})`;
            
            // Vertical shadows
            ctx.fillRect(vScanX - shadowOffset, 0, 1, this.height);
            ctx.fillRect(vScanX + shadowOffset, 0, 1, this.height);
            
            // Horizontal shadows
            ctx.fillRect(0, hScanY - shadowOffset, this.width, 1);
            ctx.fillRect(0, hScanY + shadowOffset, this.width, 1);
        }
        
        // --- Draw Main Lines ---
        const mainLineColor = `hsla(${colorHue}, 100%, 80%, 0.8)`;
        const glowColor = `hsla(${colorHue}, 100%, 70%, 0.4)`;
        
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = mainLineColor;
        
        // Vertical line
        ctx.fillRect(vScanX - 1, 0, 2, this.height);
        
        // Horizontal line
        ctx.fillRect(0, hScanY - 1, this.width, 2);
        
        ctx.restore();
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
