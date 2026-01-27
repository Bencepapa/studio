import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

// Data for letter shapes (1 = part of letter, 0 = empty)
const LETTER_SHAPES: { [key: string]: string[] } = {
    'M': ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
    'A': [".11.", "1..1", "1..1", "1111", "1..1", "1..1", "1..1"],
    'T': ["11111", ".010.", ".010.", ".010.", ".010.", ".010.", ".010."],
    'R': ["1110", "1..1", "1..1", "1110", "1.1.", "1..1", "1..1"],
    'I': ["111", ".1.", ".1.", ".1.", ".1.", ".1.", "111"],
    'X': ["1...1", ".1.1.", "..1..", ".1.1.", "1...1", "1...1", "1...1"]
};

const CELL_SIZE = 10;

class PathNode {
    x: number; y: number; g = 0; h = 0; f = 0;
    parent: PathNode | null = null;
    constructor(x: number, y: number) { this.x = x; this.y = y; }
}

class Trace {
    path: { x: number, y: number }[];
    delay: number;
    duration: number;

    constructor(path: { x: number, y: number }[], totalDuration: number, seed: number) {
        this.path = path;
        this.duration = seededRandom(seed) * 1.5 + 1.0;
        this.delay = seededRandom(seed + 1) * (totalDuration - this.duration);
    }

    draw(ctx: CanvasRenderingContext2D, time: number, onActivate: (x: number, y: number) => void, hue: number) {
        const timeInCycle = time - this.delay;
        if (timeInCycle < 0 || timeInCycle > this.duration || this.path.length < 2) return;

        const progress = timeInCycle / this.duration;
        const headIndex = Math.floor(progress * (this.path.length - 1));
        const segmentProgress = (progress * (this.path.length - 1)) % 1;

        const from = this.path[headIndex];
        const to = this.path[headIndex + 1];
        if (!from || !to) return;
        
        const headX = mapRange(segmentProgress, 0, 1, from.x, to.x) * CELL_SIZE;
        const headY = mapRange(segmentProgress, 0, 1, from.y, to.y) * CELL_SIZE;

        onActivate(from.x, from.y);

        const headSize = 6;
        const gradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, headSize * 2);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.9)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(headX - headSize, headY - headSize, headSize * 2, headSize * 2);
    }
}

class Letter {
    char: string;
    grid: number[][];
    pins: { x: number, y: number }[] = [];
    traces: Trace[] = [];
    activatedCells: Map<string, number> = new Map();
    gridWidth: number;
    gridHeight: number;
    xOffset: number;

    constructor(char: string, xOffset: number, pinCount: number, seed: number) {
        this.char = char;
        this.xOffset = xOffset;
        const shape = LETTER_SHAPES[char] || [];
        this.gridHeight = shape.length;
        this.gridWidth = shape[0]?.length || 0;
        this.grid = shape.map(row => row.split('').map(c => (c === '1' ? 1 : 0)));
        this.createPins(pinCount, seed);
    }

    createPins(pinCount: number, seed: number) {
        const edges: {x: number, y: number}[] = [];
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if(this.grid[y][x] === 1) {
                    if(y === 0 || y === this.gridHeight - 1 || x === 0 || x === this.gridWidth - 1) {
                        edges.push({x, y});
                    }
                }
            }
        }

        for(let i=0; i<pinCount; i++) {
            if(edges.length === 0) break;
            const index = Math.floor(seededRandom(seed + i) * edges.length);
            this.pins.push(edges.splice(index, 1)[0]);
        }
    }

    createTraces(totalDuration: number) {
        if(this.pins.length < 2) return;
        for (let i = 0; i < this.pins.length; i++) {
            const startPin = this.pins[i];
            const endPin = this.pins[(i + Math.floor(this.pins.length / 2)) % this.pins.length];
            const path = this.aStar(startPin, endPin);
            if (path) {
                this.traces.push(new Trace(path, totalDuration, i));
            }
        }
    }

    aStar(start: { x: number; y: number; }, end: { x: number; y: number; }): { x: number; y: number; }[] | null {
        const openList: PathNode[] = [];
        const closedList: boolean[][] = Array.from({ length: this.gridWidth }, () => Array(this.gridHeight).fill(false));
        const startNode = new PathNode(start.x, start.y);
        openList.push(startNode);

        while (openList.length > 0) {
            openList.sort((a, b) => a.f - b.f);
            const currentNode = openList.shift()!;
            closedList[currentNode.x][currentNode.y] = true;

            if (currentNode.x === end.x && currentNode.y === end.y) {
                let path: {x:number, y:number}[] = [];
                let curr: PathNode | null = currentNode;
                while (curr) { path.push({ x: curr.x, y: curr.y }); curr = curr.parent; }
                return path.reverse();
            }

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = currentNode.x + dx;
                    const ny = currentNode.y + dy;

                    if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) continue;
                    if (closedList[nx][ny] || this.grid[ny][nx] !== 1) continue;

                    const g = currentNode.g + Math.sqrt(dx*dx + dy*dy);
                    let neighbor = openList.find(n => n.x === nx && n.y === ny);

                    if (!neighbor) {
                        neighbor = new PathNode(nx, ny);
                        neighbor.h = Math.abs(nx - end.x) + Math.abs(ny - end.y);
                        neighbor.g = g;
                        neighbor.f = g + neighbor.h;
                        neighbor.parent = currentNode;
                        openList.push(neighbor);
                    } else if (g < neighbor.g) {
                        neighbor.g = g;
                        neighbor.f = g + neighbor.h;
                        neighbor.parent = currentNode;
                    }
                }
            }
        }
        return null;
    }

    update(deltaTime: number) {
        this.activatedCells.forEach((brightness, key) => {
            const newBrightness = brightness - deltaTime * 0.5; // Fade speed
            if (newBrightness <= 0) {
                this.activatedCells.delete(key);
            } else {
                this.activatedCells.set(key, newBrightness);
            }
        });
    }

    draw(ctx: CanvasRenderingContext2D, time: number, settings: VFXSettings) {
        const { hue, glowFactor } = settings;
        ctx.save();
        ctx.translate(this.xOffset, 0);

        // Draw base grid
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 1) {
                    ctx.fillStyle = `hsla(${hue}, 80%, 20%, 0.2)`;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }

        // Draw activated cells
        this.activatedCells.forEach((brightness, key) => {
            const [x, y] = key.split(',').map(Number);
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${brightness})`;
            ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${brightness * 0.8})`;
            ctx.shadowBlur = brightness * 10 * (glowFactor as number);
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        });
        ctx.shadowBlur = 0;

        // Draw traces
        this.traces.forEach(trace => trace.draw(ctx, time, (x, y) => {
            this.activatedCells.set(`${x},${y}`, 1.0);
        }, hue as number));
        
        ctx.restore();
    }
}

export class CircuitLogoEffect implements VFXEffect {
    private letters: Letter[] = [];
    private settings: VFXSettings = CircuitLogoEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private totalDuration = 5.0;

    static effectName = "Circuit Logo";
    static defaultSettings: VFXSettings = {
        pinCount: 4,
        hue: 120,
        traceSpeed: 1.0,
        glowFactor: 2.0,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...CircuitLogoEffect.defaultSettings, ...settings };
        this.letters = [];

        const word = "MATRIX";
        const allLettersWidth = word.split('').reduce((acc, char) => {
            const shape = LETTER_SHAPES[char] || [];
            return acc + (shape[0]?.length || 0) * CELL_SIZE;
        }, 0) + (word.length - 1) * CELL_SIZE;

        let currentX = (this.width - allLettersWidth) / 2;
        const yOffset = (this.height - (LETTER_SHAPES['M'][0].length + 5) * CELL_SIZE) / 2;

        word.split('').forEach((char, index) => {
            const letter = new Letter(char, currentX, this.settings.pinCount as number, index);
            letter.createTraces(this.totalDuration);
            this.letters.push(letter);
            currentX += letter.gridWidth * CELL_SIZE + CELL_SIZE;
        });
        
        // Apply yOffset to all letters
        this.letters.forEach(l => l.xOffset += yOffset);
    }

    destroy() { this.letters = []; }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        const effectiveTime = time * (settings.traceSpeed as number);
        this.currentTime = effectiveTime % this.totalDuration;
        
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width ||
            this.height !== rect.height ||
            this.settings.pinCount !== settings.pinCount;

        this.settings = { ...CircuitLogoEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        this.letters.forEach(l => l.update(deltaTime));
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;
        this.letters.forEach(l => l.draw(ctx, this.currentTime, this.settings));
    }

    getSettings() { return this.settings; }
}
