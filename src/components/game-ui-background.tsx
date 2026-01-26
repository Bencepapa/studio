
'use client';

import * as React from 'react';
import { seededRandom, mapRange } from '@/effects/utils';

interface Shape {
  id: number;
  type: 'rect' | 'circle' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  update: (time: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

class AnimatedRect implements Shape {
  id: number;
  type: 'rect' = 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number = 0;
  private seed: number;
  private appearTime: number;
  private duration: number;

  constructor(id: number, canvasWidth: number, canvasHeight: number) {
    this.id = id;
    this.seed = id;
    this.x = seededRandom(this.seed) * canvasWidth;
    this.y = seededRandom(this.seed + 1) * canvasHeight;
    this.width = seededRandom(this.seed + 2) * 100 + 20;
    this.height = seededRandom(this.seed + 3) * 100 + 20;
    this.color = `hsla(${seededRandom(this.seed + 4) * 60 + 180}, 80%, 70%, 1)`;
    this.appearTime = seededRandom(this.seed + 5) * 5;
    this.duration = seededRandom(this.seed + 6) * 3 + 2;
  }

  update(time: number) {
    const timeInCycle = (time + this.appearTime) % 10;
    if (timeInCycle < this.duration) {
      const progress = timeInCycle / this.duration;
      if (progress < 0.2) {
        this.opacity = mapRange(progress, 0, 0.2, 0, 0.7);
      } else if (progress > 0.8) {
        this.opacity = mapRange(progress, 0.8, 1, 0.7, 0);
      } else {
        this.opacity = 0.7;
      }
    } else {
      this.opacity = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.opacity <= 0) return;
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.globalAlpha = 1;
  }
}

export function GameUiBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const shapesRef = React.useRef<Shape[]>([]);
  const animationFrameIdRef = React.useRef<number>();

  const draw = React.useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    shapesRef.current.forEach(shape => {
      shape.update(time);
      shape.draw(ctx);
    });
  }, []);
  
  const resizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if(ctx) {
        ctx.scale(dpr, dpr);
    }
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    resizeCanvas();
    const { width, height } = canvas.getBoundingClientRect();
    
    shapesRef.current = [];
    for (let i = 0; i < 20; i++) {
        shapesRef.current.push(new AnimatedRect(i, width, height));
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let lastTime = 0;
    const animate = (timestamp: number) => {
      if (lastTime === 0) lastTime = timestamp;
      const timeSeconds = timestamp / 1000;
      draw(ctx, timeSeconds);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameIdRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [draw, resizeCanvas]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />;
}
