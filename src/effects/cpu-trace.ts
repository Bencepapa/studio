
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

// A single point on the board (IC, circle, or just a connection point)
class Node {
    x: number;
    y: number;
    size: number;
    type: 'ic' | 'circle' | 'cpu';

    constructor(x: number, y: number, type: 'ic' | 'circle' | 'cpu' = 'ic') {
        this.x = x;
        this.y = y;
        this.type = type;
        if (type === 'cpu') {
            this.size = 80;
        } else if (type === 'ic') {
            this.size = seededRandom(x * y) * 15 + 5;
        } else { // circle
            this.size = seededRandom(x * y) * 10 + 4;
        }
    }

    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        const { hue } = settings;
        const color = `hsl(${hue}, 80%, 70%)`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (this.type === 'cpu') {
            ctx.fillStyle = `hsl(${hue}, 50%, 15%)`;
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
            ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        } else if (this.type === 'ic') {
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        } else { // circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// A connection between two nodes
class Trace {
    fromNode: Node;
    toNode: Node;
    delay: number;
    duration: number;

    constructor(fromNode: Node, toNode: Node, totalDuration: number, index: number) {
        this.fromNode = fromNode;
        this.toNode = toNode;
        this.duration = seededRandom(index) * 1 + 0.5; // lasts 0.5-1.5s
        this.delay = seededRandom(index * 2) * (totalDuration - this.duration);
    }

    draw(ctx: CanvasRenderingContext2D, time: number, settings: VFXSettings) {
        const timeInCycle = time - this.delay;
        if (timeInCycle < 0 || timeInCycle > this.duration) {
            return;
        }

        const { hue } = settings;
        const progress = timeInCycle / this.duration;

        // Line
        ctx.beginPath();
        ctx.moveTo(this.fromNode.x, this.fromNode.y);
        ctx.lineTo(this.toNode.x, this.toNode.y);
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Moving head
        const headX = this.fromNode.x + (this.toNode.x - this.fromNode.x) * progress;
        const headY = this.fromNode.y + (this.toNode.y - this.fromNode.y) * progress;
        const headSize = 4;
        
        const gradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, headSize * 2);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.9)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(headX - headSize, headY - headSize, headSize * 2, headSize * 2);
    }
}


export class CPUTraceEffect implements VFXEffect {
    private nodes: Node[] = [];
    private traces: Trace[] = [];
    private cpuNode: Node | null = null;

    private settings: VFXSettings = CPUTraceEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private totalDuration = 5.0;

    static effectName = "CPU Trace";
    static defaultSettings: VFXSettings = {
        nodeCount: 40,
        hue: 200,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...CPUTraceEffect.defaultSettings, ...settings };
        
        this.nodes = [];
        this.traces = [];
        const nodeCount = this.settings.nodeCount as number;
        
        // Create CPU node
        this.cpuNode = new Node(this.width / 2, this.height / 2, 'cpu');
        this.nodes.push(this.cpuNode);

        // Create other nodes
        for (let i = 0; i < nodeCount; i++) {
            const x = seededRandom(i) * this.width;
            const y = seededRandom(i * 2) * this.height;
            const type = seededRandom(i * 3) > 0.3 ? 'ic' : 'circle';
            
            // Ensure nodes are not on top of CPU
            if (Math.abs(x - this.width/2) < 60 && Math.abs(y - this.height/2) < 60) continue;
            
            this.nodes.push(new Node(x, y, type));
        }

        // Create traces
        let traceIndex = 0;
        for (const node of this.nodes) {
            if (node.type === 'cpu') continue;
            
            // Connect some nodes to CPU
            if (seededRandom(traceIndex) > 0.2) {
                this.traces.push(new Trace(this.cpuNode, node, this.totalDuration, traceIndex++));
            }
            
            // Connect some nodes to other nodes
            if (seededRandom(traceIndex) > 0.6) {
                const otherNode = this.nodes[Math.floor(seededRandom(traceIndex * 2) * this.nodes.length)];
                if (otherNode !== node && otherNode !== this.cpuNode) {
                    this.traces.push(new Trace(node, otherNode, this.totalDuration, traceIndex++));
                }
            }
        }
    }

    destroy() {
        this.nodes = [];
        this.traces = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width ||
            this.height !== rect.height ||
            this.settings.nodeCount !== settings.nodeCount;

        this.settings = { ...CPUTraceEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;
        
        // Draw all nodes
        this.nodes.forEach(node => node.draw(ctx, this.settings));
        
        // Draw all traces
        this.traces.forEach(trace => trace.draw(ctx, this.currentTime, this.settings));
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
