"use client";

import * as React from "react";
import { type VFXEffect, type VFXEffectClass, type VFXSettings } from "@/effects/types";

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

  // This should only handle canvas resizing.
  // The effects themselves will handle re-init on size change within their update loop.
  const resizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }, []);

  // Sync time from props, which is the source of truth from the parent
  React.useEffect(() => {
    internalTimeRef.current = time;
  }, [time]);
  
  // Effect initialization and cleanup.
  // This should only run when the effect *class* changes.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const instance = new Effect();
    effectInstanceRef.current = instance;
    // Pass initial settings on first init. The effect's `update` method
    // will handle subsequent settings changes.
    instance.init(canvas, settings);
    resizeCanvas();

    return () => {
      instance.destroy();
      effectInstanceRef.current = null;
    };
  }, [Effect, resizeCanvas]);

  const renderFrame = React.useCallback((currentTime: number, deltaTime = 0) => {
     const ctx = canvasRef.current?.getContext("2d");
     const effect = effectInstanceRef.current;
     if (ctx && effect) {
       const dpr = window.devicePixelRatio || 1;
       ctx.save();
       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
       ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
       ctx.restore();
       // Always pass the latest settings to update.
       effect.update(currentTime, deltaTime, settings);
       effect.render(ctx);
     }
  }, [settings]);

  // Animation loop for PLAYING state
  React.useEffect(() => {
    if (!isPlaying) {
      return;
    }
    
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      let newTime = internalTimeRef.current + deltaTime * speed;
      if (newTime > duration) {
        newTime %= duration;
      } else if (newTime < 0) {
        newTime = duration + (newTime % duration);
        if (newTime === duration) newTime = 0;
      }
      
      onTimeUpdate(newTime);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying, speed, duration, onTimeUpdate]);
  
  // Render frames based on `time` prop. This handles both playing and paused states.
  React.useEffect(() => {
    // We pass a small non-zero delta time to ensure effects that might rely on it don't break.
    // For purely time-based effects, this value is ignored.
    renderFrame(time, 1/60); 
  }, [time, renderFrame]);

  // Resize handler
  React.useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
