
'use client';

import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

interface CompositorLayer {
    id: string;
    effect: string;
    start: number;
    end: number;
    rect: [number, number, number, number]; // x, y, w, h in percentage
    settings: VFXSettings;
    useOwnTimeline?: boolean; // If true, use the effect's own looping; if false, use main timeline.
}

interface ActiveInstance {
    instance: VFXEffect;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    layer: CompositorLayer;
}

const defaultScript = `[
    {
        "id": "background",
        "effect": "matrix",
        "start": 0,
        "end": 30,
        "rect": [0, 0, 100, 100],
        "settings": { "hue": 128, "fallSpeed": 1.5 }
    },
    {
        "id": "alert1",
        "effect": "alert",
        "start": 2,
        "end": 8,
        "useOwnTimeline": true,
        "rect": [65, 5, 30, 20],
        "settings": { "hue": 0, "warningMessage": "BREACH" }
    },
    {
        "id": "shield",
        "effect": "shield",
        "start": 5,
        "end": 15,
        "useOwnTimeline": true,
        "rect": [10, 20, 80, 60],
        "settings": { "hue": 200, "hexSize": 30, "rippleSpeed": 1 }
    },
    {
        "id": "message",
        "effect": "incoming-message",
        "start": 12,
        "end": 25,
        "useOwnTimeline": true,
        "rect": [15, 15, 70, 70],
        "settings": { "sender": "ghost@system", "subject": "Payload Delivered" }
    }
]`;

export class CompositorEffect implements VFXEffect {
    static effectName = "Effect Compositor";
    static defaultSettings: VFXSettings = {
        script: defaultScript,
    };

    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;

    private settings: VFXSettings = CompositorEffect.defaultSettings;
    private availableEffects: Record<string, VFXEffectClass> = {};
    private parsedScript: CompositorLayer[] = [];
    private lastScript: string = '';

    private activeInstances: Map<string, ActiveInstance> = new Map();

    private parseScript(script: string): CompositorLayer[] {
        try {
            const parsed = JSON.parse(script);
            if (Array.isArray(parsed)) {
                // Basic validation can be added here
                return parsed;
            }
        } catch (e) {
            console.error("Invalid compositor script:", e);
        }
        return [];
    }
    
    private updateInstances(time: number, deltaTime: number) {
        if (!this.canvas) return;

        // Manage active instances based on the main timeline
        this.parsedScript.forEach(layer => {
            const isActive = time >= layer.start && time < layer.end;
            const instanceExists = this.activeInstances.has(layer.id);

            if (isActive && !instanceExists) {
                // Create new instance
                const EffectClass = this.availableEffects[layer.effect];
                if (EffectClass && layer.effect !== 'compositor') {
                    const instance = new EffectClass();
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        this.activeInstances.set(layer.id, { instance, canvas, ctx, layer });
                        // Initial setup of canvas size
                        this.resizeInstanceCanvas(this.activeInstances.get(layer.id)!);
                        instance.init(canvas, layer.settings);
                    }
                }
            } else if (!isActive && instanceExists) {
                // Destroy instance
                const activeInstance = this.activeInstances.get(layer.id)!;
                activeInstance.instance.destroy();
                this.activeInstances.delete(layer.id);
            }
        });
        
        // Update all currently active instances
        this.activeInstances.forEach(activeInstance => {
            const { instance, layer } = activeInstance;
            
            // Check if rect has changed, if so, resize canvas
            if (
                layer.rect[2] / 100 * this.width !== activeInstance.canvas.width ||
                layer.rect[3] / 100 * this.height !== activeInstance.canvas.height
            ) {
                 this.resizeInstanceCanvas(activeInstance);
                 // Re-init might be too harsh, but it's the safest way to handle size changes
                 instance.init(activeInstance.canvas, layer.settings);
            }

            // useOwnTimeline allows the effect to loop naturally using its own internal logic.
            // Otherwise, we pin it to the compositor's timeline segment.
            const effectTime = layer.useOwnTimeline ? time : time - layer.start;
            instance.update(effectTime, deltaTime, layer.settings);
        });
    }

    private resizeInstanceCanvas(activeInstance: ActiveInstance) {
        if (!this.canvas) return;
        const { layer, canvas, ctx } = activeInstance;
        const w = (layer.rect[2] / 100) * this.width;
        const h = (layer.rect[3] / 100) * this.height;

        if (w > 0 && h > 0) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.resetTransform();
            ctx.scale(dpr, dpr);
            
            // Mock getBoundingClientRect
            canvas.getBoundingClientRect = () => ({
                width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0,
                toJSON: () => JSON.stringify({width: w, height: h}),
            });
        }
    }


    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.updateSettings(settings);
    }

    destroy() {
        this.activeInstances.forEach(({ instance }) => instance.destroy());
        this.activeInstances.clear();
    }
    
    private updateSettings(newSettings: VFXSettings) {
        this.settings = { ...CompositorEffect.defaultSettings, ...newSettings };
        
        if (newSettings.availableEffects) {
            this.availableEffects = newSettings.availableEffects;
        }

        const script = this.settings.script as string;
        if (script !== this.lastScript) {
            this.lastScript = script;
            this.parsedScript = this.parseScript(script);
            // Destroy all and let the update loop recreate what's needed
            this.activeInstances.forEach(({ instance }) => instance.destroy());
            this.activeInstances.clear();
        }
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        
        if (this.width !== rect.width || this.height !== rect.height) {
            this.width = rect.width;
            this.height = rect.height;
            // Force re-init of all instances on main canvas resize
            this.activeInstances.forEach(inst => this.resizeInstanceCanvas(inst));
        }

        this.updateSettings(settings);
        this.updateInstances(time, deltaTime);
    }

    render(ctx: CanvasRenderingContext2D) {
         this.activeInstances.forEach(activeInstance => {
            const { instance, canvas, ctx: instanceCtx, layer } = activeInstance;
            const w = (layer.rect[2] / 100) * this.width;
            const h = (layer.rect[3] / 100) * this.height;

            // Clear and render the inner effect
            instanceCtx.clearRect(0, 0, w, h);
            instance.render(instanceCtx);

            // Draw the result to the main canvas
            const x = (layer.rect[0] / 100) * this.width;
            const y = (layer.rect[1] / 100) * this.height;
            ctx.drawImage(canvas, x, y, w, h);
        });
    }

    getSettings() {
        return this.settings;
    }
}
