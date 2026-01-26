import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class Node {
    gridX: number;
    gridY: number;
    x: number;
    y: number;
    shape: 'circle' | 'square' | 'triangle';
    size: number;
    appearTime: number;
    duration: number;
    seed: number;
    hasConnection: { n: boolean, e: boolean, s: boolean, w: boolean };

    constructor(gridX: number, gridY: number, gridSize: number, canvasWidth: number, canvasHeight: number) {
        this.gridX = gridX;
        this.gridY = gridY;
        
        const xOffset = (canvasWidth % gridSize) / 2;
        const yOffset = (canvasHeight % gridSize) / 2;

        this.x = gridX * gridSize + gridSize / 2 + xOffset;
        this.y = gridY * gridSize + gridSize / 2 + yOffset;
        
        this.seed = (gridX * 1000) + gridY;

        this.appearTime = seededRandom(this.seed) * 5; // Appears at some point in a 5s cycle
        this.duration = seededRandom(this.seed + 1) * 2 + 1; // Lasts 1-3 seconds

        const shapeRand = seededRandom(this.seed + 2);
        if (shapeRand < 0.5) this.shape = 'circle';
        else if (shapeRand < 0.8) this.shape = 'square';
        else this.shape = 'triangle';

        this.size = seededRandom(this.seed + 3) * (gridSize * 0.4) + (gridSize * 0.2);

        this.hasConnection = {
            n: seededRandom(this.seed + 4) > 0.5,
            e: seededRandom(this.seed + 5) > 0.5,
            s: seededRandom(this.seed + 6) > 0.5,
            w: seededRandom(this.seed + 7) > 0.5,
        };
    }

    draw(ctx: CanvasRenderingContext2D, time: number, settings: VFXSettings, neighbors: {n?: Node, e?: Node, s?: Node, w?: Node}) {
        const { hue } = settings;
        const timeInCycle = time % 5;
        const timeSinceAppear = timeInCycle - this.appearTime;

        if (timeSinceAppear < 0 || timeSinceAppear > this.duration) {
            return;
        }

        const pulse = Math.sin((timeSinceAppear / this.duration) * Math.PI);
        const opacity = pulse * 0.9;
        const size = this.size * pulse;

        if (opacity <= 0.01) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw shape
        ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${opacity})`;
        ctx.strokeStyle = `hsla(${hue}, 100%, 85%, ${opacity})`;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        switch (this.shape) {
            case 'circle':
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                break;
            case 'square':
                ctx.rect(-size / 2, -size / 2, size, size);
                break;
            case 'triangle':
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2, size / 2);
                ctx.lineTo(-size / 2, size / 2);
                ctx.closePath();
                break;
        }
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Draw connections
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${opacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (this.hasConnection.n && neighbors.n) {
             ctx.moveTo(this.x, this.y);
             ctx.lineTo(neighbors.n.x, neighbors.n.y);
        }
        if (this.hasConnection.e && neighbors.e) {
             ctx.moveTo(this.x, this.y);
             ctx.lineTo(neighbors.e.x, neighbors.e.y);
        }
        ctx.stroke();
    }
}


export class CyberGridEffect implements VFXEffect {
    private nodes: Node[] = [];
    private nodeMap: Map<string, Node> = new Map();
    private settings: VFXSettings = CyberGridEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    static effectName = "Cyber Grid";
    static defaultSettings: VFXSettings = {
        gridSize: 50,
        hue: 220,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...CyberGridEffect.defaultSettings, ...settings };
        this.nodes = [];
        this.nodeMap.clear();
        
        const gridSize = this.settings.gridSize as number;
        const gridWidth = Math.ceil(this.width / gridSize);
        const gridHeight = Math.ceil(this.height / gridSize);

        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                const node = new Node(gx, gy, gridSize, this.width, this.height);
                this.nodes.push(node);
                this.nodeMap.set(`${gx},${gy}`, node);
            }
        }
    }

    destroy() {
        this.nodes = [];
        this.nodeMap.clear();
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit = 
            settings.gridSize !== this.settings.gridSize ||
            this.width !== rect.width ||
            this.height !== rect.height;

        this.settings = { ...CyberGridEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;
        
        this.nodes.forEach(node => {
            const { gridX, gridY } = node;
            const neighbors = {
                n: this.nodeMap.get(`${gridX},${gridY - 1}`),
                e: this.nodeMap.get(`${gridX + 1},${gridY}`),
                s: this.nodeMap.get(`${gridX},${gridY + 1}`),
                w: this.nodeMap.get(`${gridX - 1},${gridY}`),
            };
            node.draw(ctx, this.currentTime, this.settings, neighbors);
        });
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
