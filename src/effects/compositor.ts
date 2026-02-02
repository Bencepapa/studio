
'use client';

import { lerp, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

interface PropertyAnimation {
    property: string;
    from: number;
    to: number;
    startTime?: number;
    endTime?: number;
}

interface CompositorLayer {
    id: string;
    effect: string;
    start: number;
    end: number;
    rect: [number, number, number, number]; // x, y, w, h in percentage
    settings: VFXSettings;
    useOwnTimeline?: boolean;
    animations?: PropertyAnimation[];
}

interface ActiveInstance {
    instance: VFXEffect;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    layer: CompositorLayer;
    layerOpacity: number;
}

const defaultScript = `[
    {
        "id": "background",
        "effect": "matrix",
        "start": 0,
        "end": 30,
        "rect": [0, 0, 100, 100],
        "settings": { "fallSpeed": 1.5 },
        "animations": [
            { "property": "hue", "from": 128, "to": 289, "startTime": 0, "endTime": 15 },
            { "property": "hue", "from": 289, "to": 128, "startTime": 15, "endTime": 30 }
        ]
    },
    {
        "id": "alert1",
        "effect": "alert",
        "start": 2,
        "end": 8,
        "useOwnTimeline": true,
        "rect": [65, 5, 30, 20],
        "settings": { "hue": 0, "warningMessage": "BREACH" },
        "animations": [
            { "property": "layerOpacity", "from": 1, "to": 0, "startTime": 7, "endTime": 8 }
        ]
    },
    {
        "id": "shield",
        "effect": "shield",
        "start": 5,
        "end": 15,
        "useOwnTimeline": true,
        "rect": [10, 20, 80, 60],
        "settings": { "hue": 200, "hexSize": 30 },
        "animations": [
            { "property": "rippleSpeed", "from": 1, "to": 5 }
        ]
    },
    {
        "id": "message",
        "effect": "incoming-message",
        "start": 12,
        "end": 25,
        "useOwnTimeline": true,
        "rect": [15, 15, 70, 70],
        "settings": { "sender": "ghost@system", "subject": "Payload Delivered" },
        "animations": [
             { "property": "layerOpacity", "from": 0, "to": 1, "startTime": 12, "endTime": 13 },
             { "property": "layerOpacity", "from": 1, "to": 0, "startTime": 24, "endTime": 25 }
        ]
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
                        this.activeInstances.set(layer.id, { instance, canvas, ctx, layer, layerOpacity: 1.0 });
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
            
            if (
                layer.rect[2] / 100 * this.width !== activeInstance.canvas.width ||
                layer.rect[3] / 100 * this.height !== activeInstance.canvas.height
            ) {
                 this.resizeInstanceCanvas(activeInstance);
                 instance.init(activeInstance.canvas, layer.settings);
            }

            const frameSettings = { ...layer.settings };
            let layerOpacity = 1.0;

            if (layer.animations) {
                layer.animations.forEach(anim => {
                    const animStartTime = anim.startTime !== undefined ? anim.startTime : layer.start;
                    const animEndTime = anim.endTime !== undefined ? anim.endTime : layer.end;
    
                    if (time >= animStartTime && time <= animEndTime) {
                        const progress = mapRange(time, animStartTime, animEndTime, 0, 1);
                        const value = lerp(anim.from, anim.to, progress);
    
                        if (anim.property === 'layerOpacity') {
                            layerOpacity = value;
                        } else {
                            frameSettings[anim.property] = value;
                        }
                    }
                });
            }
            
            activeInstance.layerOpacity = layerOpacity;

            const effectTime = layer.useOwnTimeline ? time : time - layer.start;
            instance.update(effectTime, deltaTime, frameSettings);
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
            this.activeInstances.forEach(inst => this.resizeInstanceCanvas(inst));
        }

        this.updateSettings(settings);
        this.updateInstances(time, deltaTime);
    }

    render(ctx: CanvasRenderingContext2D) {
         this.activeInstances.forEach(activeInstance => {
            const { instance, canvas, ctx: instanceCtx, layer, layerOpacity } = activeInstance;
            const w = (layer.rect[2] / 100) * this.width;
            const h = (layer.rect[3] / 100) * this.height;

            instanceCtx.clearRect(0, 0, w, h);
            instance.render(instanceCtx);

            const x = (layer.rect[0] / 100) * this.width;
            const y = (layer.rect[1] / 100) * this.height;
            
            ctx.save();
            ctx.globalAlpha = layerOpacity !== undefined ? layerOpacity : 1.0;
            ctx.drawImage(canvas, x, y, w, h);
            ctx.restore();
        });
    }

    getSettings() {
        return this.settings;
    }
}
