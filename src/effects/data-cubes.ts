
import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const CUBE_SIZE = 50;

class DataCube {
    // 3D position
    x: number;
    y: number;
    z: number;
    
    // Rotation
    rotX: number;
    rotY: number;
    rotZ: number;

    // Velocities
    speedX: number;
    speedY: number;
    speedZ: number;
    rotSpeedX: number;
    rotSpeedY: number;
    rotSpeedZ: number;

    size: number;
    hasLock: boolean;

    canvasWidth: number;
    canvasHeight: number;
    
    // Unit cube vertices
    private vertices: { x: number; y: number; z: number }[];
    private edges: number[][];


    constructor(canvasWidth: number, canvasHeight: number, hasLock: boolean = false) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.hasLock = hasLock;

        const positionRange = Math.min(canvasWidth, canvasHeight) * 2;
        this.x = randomRange(-positionRange, positionRange);
        this.y = randomRange(-positionRange, positionRange);
        this.z = randomRange(-200, 200);

        this.rotX = randomRange(0, Math.PI * 2);
        this.rotY = randomRange(0, Math.PI * 2);
        this.rotZ = randomRange(0, Math.PI * 2);
        
        this.speedX = randomRange(-50, 50);
        this.speedY = randomRange(-50, 50);
        this.speedZ = randomRange(-20, 20);

        this.rotSpeedX = randomRange(-0.5, 0.5);
        this.rotSpeedY = randomRange(-0.5, 0.5);
        this.rotSpeedZ = randomRange(-0.5, 0.5);
        
        this.size = CUBE_SIZE;
        
        const s = this.size / 2;
        this.vertices = [
            { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
            { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
            { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
            { x: s, y: s, z: s }, { x: -s, y: s, z: s }
        ];

        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // back face
            [4, 5], [5, 6], [6, 7], [7, 4], // front face
            [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
        ];
    }

    update(deltaTime: number, speedMultiplier: number) {
        this.x += this.speedX * deltaTime * speedMultiplier;
        this.y += this.speedY * deltaTime * speedMultiplier;
        this.z += this.speedZ * deltaTime * speedMultiplier;

        this.rotX += this.rotSpeedX * deltaTime * speedMultiplier;
        this.rotY += this.rotSpeedY * deltaTime * speedMultiplier;
        this.rotZ += this.rotSpeedZ * deltaTime * speedMultiplier;

        const bounds = Math.min(this.canvasWidth, this.canvasHeight) * 3;
        if (this.x > bounds || this.x < -bounds) this.speedX *= -1;
        if (this.y > bounds || this.y < -bounds) this.speedY *= -1;
        if (this.z > 200 || this.z < -200) this.speedZ *= -1;
    }

    draw(ctx: CanvasRenderingContext2D, fov: number, settings: VFXSettings) {
        const { hue } = settings;
        
        const projectedPoints: { x: number, y: number, z: number }[] = [];

        for (const vertex of this.vertices) {
            // Rotation around Y axis
            let x = vertex.x * Math.cos(this.rotY) - vertex.z * Math.sin(this.rotY);
            let z = vertex.x * Math.sin(this.rotY) + vertex.z * Math.cos(this.rotY);
            
            // Rotation around X axis
            let y = vertex.y * Math.cos(this.rotX) - z * Math.sin(this.rotX);
            z = vertex.y * Math.sin(this.rotX) + z * Math.cos(this.rotX);

            // Final position in 3D space
            x += this.x;
            y += this.y;
            z += this.z;

            // Perspective projection
            const scale = fov / (fov + z);
            if (scale < 0) { // point is behind camera
                projectedPoints.push({ x: -1, y: -1, z: -1 }); // Invalid point
                continue;
            }
            
            const projectedX = x * scale + this.canvasWidth / 2;
            const projectedY = y * scale + this.canvasHeight / 2;

            projectedPoints.push({ x: projectedX, y: projectedY, z });
        }
        
        const avgZ = projectedPoints.reduce((acc, p) => acc + p.z, 0) / projectedPoints.length;
        const opacity = mapRange(avgZ, -200, 200, 0, 1);
        if (opacity <= 0.05) return;


        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${opacity * 0.8})`;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${opacity * 0.1})`;
        ctx.lineWidth = mapRange(avgZ, -200, 200, 0.5, 2.5);

        // Draw faces
        const faces = [
            [0, 1, 2, 3], // back
            [4, 5, 6, 7], // front
            [0, 1, 5, 4], // top
            [2, 3, 7, 6], // bottom
            [1, 2, 6, 5], // right
            [0, 3, 7, 4]  // left
        ];

        faces.forEach(face => {
            const p1 = projectedPoints[face[0]];
            if (p1.x === -1) return;
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            for (let i = 1; i < face.length; i++) {
                const p = projectedPoints[face[i]];
                 if (p.x === -1) return;
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
        });


        // Draw lock icon
        if (this.hasLock) {
            const centerX = projectedPoints.reduce((sum, p) => sum + p.x, 0) / projectedPoints.length;
            const centerY = projectedPoints.reduce((sum, p) => sum + p.y, 0) / projectedPoints.length;
            const avgScale = fov / (fov + avgZ);

            if (avgScale > 0) {
                this.drawLock(ctx, centerX, centerY, avgScale, hue as number, opacity);
            }
        }
    }
    
    private drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, hue: number, opacity: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        const lockSize = 40;
        const shackleRadius = lockSize / 4;
        const bodyWidth = lockSize / 2;
        const bodyHeight = lockSize * 0.4;
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 90%, ${opacity})`;
        ctx.lineWidth = 4 / scale;

        // Shackle
        ctx.beginPath();
        ctx.arc(0, -bodyHeight / 2, shackleRadius, Math.PI, 0);
        ctx.stroke();

        // Body
        ctx.strokeRect(-bodyWidth/2, -bodyHeight/2, bodyWidth, bodyHeight);

        ctx.restore();
    }
}

export class DataCubesEffect implements VFXEffect {
    private cubes: DataCube[] = [];
    private settings: VFXSettings = DataCubesEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private fov = 300;
    private width = 0;
    private height = 0;

    static effectName = "Data Cubes";
    static defaultSettings: VFXSettings = {
        cubeCount: 20,
        lockedCubeCount: 5,
        speed: 1.0,
        hue: 128,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.fov = this.width * 0.5;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...DataCubesEffect.defaultSettings, ...settings };
        this.cubes = [];
        const cubeCount = this.settings.cubeCount as number;
        const lockedCubeCount = this.settings.lockedCubeCount as number;

        for (let i = 0; i < cubeCount; i++) {
            this.cubes.push(new DataCube(this.width, this.height, i < lockedCubeCount));
        }
    }

    destroy() {
        this.cubes = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            settings.cubeCount !== this.settings.cubeCount ||
            settings.lockedCubeCount !== this.settings.lockedCubeCount ||
            this.width !== rect.width ||
            this.height !== rect.height;

        this.settings = { ...DataCubesEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        const speed = this.settings.speed as number;
        this.cubes.forEach(cube => cube.update(deltaTime, speed));
    }

    render(ctx: CanvasRenderingContext2D) {
        // Sort cubes by Z-index for pseudo-3D rendering
        this.cubes.sort((a, b) => b.z - a.z);

        this.cubes.forEach(cube => {
            cube.draw(ctx, this.fov, this.settings);
        });
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
