
import { seededRandom, mapRange, randomRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

// --- Helper Classes ---

class NodeComputer {
    id: number;
    level: 1 | 2 | 3;
    x: number;
    y: number;
    size: number;
    power: number;
    
    isWorking: boolean = false;
    workStartTime: number = -1;
    workDuration: number = 1;
    
    // For visual pulse on packet arrival
    lastPacketTime: number = -1;
    pulseIntensity: number = 0;

    constructor(id: number, level: 1 | 2 | 3, x: number, y: number) {
        this.id = id;
        this.level = level;
        this.x = x;
        this.y = y;

        if (level === 1) {
            this.size = 15;
            this.power = 1;
        } else if (level === 2) {
            this.size = 25;
            this.power = 5;
        } else { // level 3
            this.size = 40;
            this.power = 20;
        }
    }

    startWork(time: number) {
        if (!this.isWorking) {
            this.isWorking = true;
            this.workStartTime = time;
            this.workDuration = seededRandom(this.id + time) * 2 + (4 - this.level); // Higher level = faster
            this.lastPacketTime = time;
        }
    }

    update(time: number): number {
        let dataProcessed = 0;
        if (this.isWorking) {
            if (time > this.workStartTime + this.workDuration) {
                this.isWorking = false;
                dataProcessed = this.power;
            }
        }
        
        // Update pulse effect
        if (this.lastPacketTime > 0) {
            const timeSincePacket = time - this.lastPacketTime;
            if (timeSincePacket < 0.5) { // Pulse duration
                this.pulseIntensity = (1 - (timeSincePacket / 0.5));
            } else {
                this.pulseIntensity = 0;
            }
        }
        
        return dataProcessed;
    }

    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        const { hue } = settings;

        // Draw node
        ctx.fillStyle = this.isWorking ? `hsl(${hue}, 80%, 40%)` : `hsl(${hue}, 50%, 20%)`;
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.lineWidth = 1;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.strokeRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        
        // Draw pulse
        if (this.pulseIntensity > 0) {
            ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${this.pulseIntensity})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(
                this.x - this.size/2 - 5, 
                this.y - this.size/2 - 5, 
                this.size + 10, 
                this.size + 10
            );
        }
        
        // Draw work progress
        if (this.isWorking) {
            const progress = (performance.now()/1000 - this.workStartTime) / this.workDuration;
            ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
            ctx.fillRect(this.x - this.size/2 + 2, this.y + this.size/2 - 6, (this.size - 4) * Math.min(1, progress), 4);
        }
    }
}

class Packet {
    startX: number;
    startY: number;
    target: NodeComputer;
    
    x: number;
    y: number;
    
    startTime: number;
    duration: number;
    isArrived: boolean = false;
    
    constructor(startX: number, startY: number, target: NodeComputer, time: number, packetSpeed: number) {
        this.startX = startX;
        this.startY = startY;
        this.target = target;
        this.startTime = time;
        
        const distance = Math.sqrt(Math.pow(target.x - startX, 2) + Math.pow(target.y - startY, 2));
        this.duration = distance / (packetSpeed * 100);
        
        this.x = startX;
        this.y = startY;
    }

    update(time: number) {
        if (this.isArrived) return;
        
        const timeSinceStart = time - this.startTime;
        if (timeSinceStart >= this.duration) {
            this.isArrived = true;
            this.target.startWork(time);
            return;
        }

        const progress = timeSinceStart / this.duration;
        this.x = mapRange(progress, 0, 1, this.startX, this.target.x);
        this.y = mapRange(progress, 0, 1, this.startY, this.target.y);
    }
    
    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        if (this.isArrived) return;

        const { hackerHue } = settings;
        ctx.fillStyle = `hsl(${hackerHue}, 100%, 80%)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}


// --- Main Effect Class ---

export class ZombieNetworkEffect implements VFXEffect {
    static effectName = "Zombie Network";
    static defaultSettings: VFXSettings = {
        lvl1Computers: 20,
        lvl2Computers: 5,
        lvl3Computers: 2,
        hue: 200,
        hackerHue: 0,
        packetSpeed: 2, // multiplier
    };

    private settings: VFXSettings = ZombieNetworkEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;

    private hackerNode: { x: number, y: number } | null = null;
    private nodes: NodeComputer[] = [];
    private packets: Packet[] = [];
    
    // Metrics
    private totalDataProcessed: number = 0;
    private lastPacketSendTime: number = -1;

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...ZombieNetworkEffect.defaultSettings, ...settings };
        
        this.hackerNode = { x: this.width / 2, y: this.height * 0.9 };
        this.nodes = [];
        this.packets = [];
        this.totalDataProcessed = 0;
        this.lastPacketSendTime = -1;
        
        const { lvl1Computers, lvl2Computers, lvl3Computers } = this.settings;
        
        let idCounter = 0;
        const placeNodes = (count: number, level: 1 | 2 | 3, radiusMin: number, radiusMax: number) => {
            for(let i=0; i<count; i++) {
                const angle = seededRandom(idCounter) * Math.PI * 2;
                const radius = seededRandom(idCounter+1) * (radiusMax - radiusMin) + radiusMin;
                const x = this.width/2 + Math.cos(angle) * radius;
                const y = this.height/2 + Math.sin(angle) * radius;
                this.nodes.push(new NodeComputer(idCounter, level, x, y));
                idCounter++;
            }
        };
        
        const baseRadius = Math.min(this.width, this.height);
        placeNodes(lvl3Computers as number, 3, baseRadius * 0.1, baseRadius * 0.2);
        placeNodes(lvl2Computers as number, 2, baseRadius * 0.2, baseRadius * 0.35);
        placeNodes(lvl1Computers as number, 1, baseRadius * 0.35, baseRadius * 0.45);
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height ||
            this.settings.lvl1Computers !== settings.lvl1Computers ||
            this.settings.lvl2Computers !== settings.lvl2Computers ||
            this.settings.lvl3Computers !== settings.lvl3Computers;

        this.settings = { ...ZombieNetworkEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        // Update nodes and collect processed data
        this.nodes.forEach(node => {
            this.totalDataProcessed += node.update(time);
        });
        
        // Update packets and remove arrived ones
        this.packets.forEach(p => p.update(time));
        this.packets = this.packets.filter(p => !p.isArrived);
        
        // Send new packets
        const packetInterval = 0.05; // seconds
        if (time > this.lastPacketSendTime + packetInterval) {
            const idleNodes = this.nodes.filter(n => !n.isWorking);
            if (idleNodes.length > 0 && this.hackerNode) {
                // Find nearest idle node to send a packet to
                let nearestNode: NodeComputer | null = null;
                let minDist = Infinity;
                for(const node of idleNodes) {
                    const dist = Math.sqrt(Math.pow(node.x - this.hackerNode.x, 2) + Math.pow(node.y - this.hackerNode.y, 2));
                    if(dist < minDist) {
                        minDist = dist;
                        nearestNode = node;
                    }
                }
                if (nearestNode) {
                    this.packets.push(new Packet(this.hackerNode.x, this.hackerNode.y, nearestNode, time, this.settings.packetSpeed as number));
                    this.lastPacketSendTime = time;
                }
            }
        }
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height || !this.hackerNode) return;
        const { hue, hackerHue } = this.settings;

        // Draw network lines
        ctx.strokeStyle = `hsla(${hue}, 50%, 25%, 0.5)`;
        ctx.lineWidth = 0.5;
        this.nodes.forEach(node => {
            ctx.beginPath();
            ctx.moveTo(this.hackerNode!.x, this.hackerNode!.y);
            ctx.lineTo(node.x, node.y);
            ctx.stroke();
        });
        
        // Draw nodes
        this.nodes.forEach(node => node.draw(ctx, this.settings));
        
        // Draw hacker node
        const hackerSize = 50;
        ctx.fillStyle = `hsl(${hackerHue}, 80%, 30%)`;
        ctx.strokeStyle = `hsl(${hackerHue}, 80%, 70%)`;
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(this.hackerNode.x, this.hackerNode.y);
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            const angle = i * Math.PI / 3;
            const x = Math.cos(angle) * hackerSize/2;
            const y = Math.sin(angle) * hackerSize/2;
            if(i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = `hsl(${hackerHue}, 100%, 80%)`;
        ctx.font = 'bold 12px "Space Grotesk"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HACKER', 0, 0);
        ctx.restore();
        
        // Draw packets
        this.packets.forEach(p => p.draw(ctx, this.settings));

        // Draw metrics
        const workingNodes = this.nodes.filter(n => n.isWorking).length;
        const metricsText = [
            `NODES INFECTED: ${this.nodes.length}`,
            `NODES ACTIVE: ${workingNodes}`,
            `DATA PROCESSED: ${Math.floor(this.totalDataProcessed)} TB`
        ];
        
        ctx.font = '16px "Source Code Pro"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = `hsla(${hackerHue}, 100%, 80%, 0.8)`;
        
        metricsText.forEach((text, i) => {
            ctx.fillText(text, 20, 20 + i * 20);
        });
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
