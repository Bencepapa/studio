"use client";

import * as React from "react";
import { type VFXEffect, type VFXEffectClass, type VFXSettings } from "@/effects/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface EffectPlayerProps {
  effect: VFXEffectClass;
  isPlaying: boolean;
  speed: number;
  time: number;
  onTimeUpdate: (time: number) => void;
  duration: number;
  settings: VFXSettings;
}

export function EffectPlayer({
  effect: Effect,
  isPlaying,
  speed,
  time,
  onTimeUpdate,
  duration,
  settings,
}: EffectPlayerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const effectInstanceRef = React.useRef<VFXEffect | null>(null);
  const animationFrameIdRef = React.useRef<number>();
  const lastTimeRef = React.useRef<number>(0);
  const internalTimeRef = React.useRef<number>(time);
  const isMobile = useIsMobile();

  const resizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Re-initialize effect on resize to adapt to new dimensions
    if (effectInstanceRef.current) {
      effectInstanceRef.current.init(canvas, settings);
    }
  }, [settings]);

  // Sync external time to internal time when it changes (e.g., from slider)
  React.useEffect(() => {
    internalTimeRef.current = time;
  }, [time]);

  // Effect initialization and cleanup
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const instance = new Effect();
    effectInstanceRef.current = instance;
    instance.init(canvas, settings);
    resizeCanvas();

    return () => {
      instance.destroy();
      effectInstanceRef.current = null;
    };
  }, [Effect, settings, resizeCanvas]);

  // Animation loop
  React.useEffect(() => {
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const ctx = canvasRef.current?.getContext("2d");
      const effect = effectInstanceRef.current;

      if (ctx && effect) {
        // Clear canvas
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.restore();

        // Update time
        let newTime = internalTimeRef.current + deltaTime * speed;
        if (newTime > duration) newTime %= duration;
        internalTimeRef.current = newTime;

        // Propagate time update to parent
        onTimeUpdate(newTime);
        
        effect.update(internalTimeRef.current, deltaTime * speed, settings);
        effect.render(ctx);
      }

      if (isPlaying) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      lastTimeRef.current = 0; // Reset lastTime to avoid large deltaTime jump
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else {
      // If paused, still render the current frame once
      const ctx = canvasRef.current?.getContext("2d");
      const effect = effectInstanceRef.current;
       if (ctx && effect) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.restore();
        effect.update(internalTimeRef.current, 0, settings);
        effect.render(ctx);
      }
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying, speed, settings, duration, onTimeUpdate]);
  
  // Resize handler
  React.useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
