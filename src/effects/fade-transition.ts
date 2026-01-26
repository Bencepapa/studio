
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class FadeCell {
    x: number;
    y: number;
    width: number;
    height: number;
    delay: number;

    constructor(x: number, y: number, width: number, height: number, totalDuration: number, gridWidth: number, gridHeight: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        // Delay based on distance from top-left, gives a wipe effect
        const maxDist = gridWidth + gridHeight;
        const currentDist = (x / width) + (y / height);
        this.delay = (currentDist / maxDist) * (totalDuration / 3);
    }

    draw(ctx: CanvasRenderingContext2D, time: number, totalDuration: number) {
        const halfDuration = totalDuration / 2;

        const timeWithDelay = time - this.delay;
        if (timeWithDelay < 0) return;

        let opacity = 0;
        const fadeInDuration = halfDuration - this.delay;
        if (fadeInDuration <=0) return;

        if (timeWithDelay < fadeInDuration) {
            // Fade in to white
            const progress = timeWithDelay / fadeInDuration;
            opacity = Math.min(1, progress);
        } else {
            // Fade out from white
            const fadeOutDuration = halfDuration;
            const progress = (timeWithDelay - fadeInDuration) / fadeOutDuration;
            opacity = 1 - Math.min(1, progress);
        }

        opacity = Math.max(0, opacity);
        if (opacity <= 0) return;

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

export class FadeTransitionEffect implements VFXEffect {
    private cells: FadeCell[] = [];
    private settings: VFXSettings = FadeTransitionEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private totalDuration = 2.0;

    static effectName = "Fade Transition";
    static defaultSettings: VFXSettings = {
        gridDivisions: 20,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...FadeTransitionEffect.defaultSettings, ...settings };
        
        this.cells = [];
        const divisions = this.settings.gridDivisions as number;
        const cellWidth = this.width / divisions;
        const cellHeight = this.height / divisions;

        for (let i = 0; i < divisions; i++) {
            for (let j = 0; j < divisions; j++) {
                this.cells.push(new FadeCell(i * cellWidth, j * cellHeight, cellWidth, cellHeight, this.totalDuration, divisions, divisions));
            }
        }
    }

    destroy() {
        this.cells = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width ||
            this.height !== rect.height ||
            this.settings.gridDivisions !== settings.gridDivisions;

        this.settings = { ...FadeTransitionEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        this.cells.forEach(cell => {
            cell.draw(ctx, this.currentTime, this.totalDuration);
        });
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
