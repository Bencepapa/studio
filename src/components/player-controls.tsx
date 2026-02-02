
"use client";

import * as React from "react";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Repeat,
  Repeat1,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlayerControlsProps {
  isPlaying: boolean;
  onIsPlayingChange: (playing: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  time: number;
  onTimeChange: (time: number) => void;
  duration: number;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export function PlayerControls({
  isPlaying,
  onIsPlayingChange,
  speed,
  onSpeedChange,
  time,
  onTimeChange,
  duration,
  loop,
  onLoopChange,
}: PlayerControlsProps) {
  const [originalSpeed, setOriginalSpeed] = React.useState(speed);

  const handleFastForwardDown = () => {
    setOriginalSpeed(speed);
    onSpeedChange(2);
  };

  const handleFastForwardUp = () => {
    onSpeedChange(originalSpeed);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/50 to-transparent">
      <div className="mx-auto max-w-4xl space-y-2">
        <div className="flex items-center gap-4 text-white">
          <span className="text-xs font-mono tabular-nums">{formatTime(time)}</span>
          <Slider
            id="timeline"
            min={0}
            max={duration}
            step={0.1}
            value={[time]}
            onValueChange={([v]) => onTimeChange(v)}
          />
          <span className="text-xs font-mono tabular-nums">{formatTime(duration)}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white" onClick={() => onTimeChange(0)}>
                  <Rewind />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rewind to Start</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14 rounded-full text-white"
            onClick={() => onIsPlayingChange(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white"
                  onMouseDown={handleFastForwardDown}
                  onMouseUp={handleFastForwardUp}
                  onMouseLeave={handleFastForwardUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleFastForwardDown();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleFastForwardUp();
                  }}
                >
                  <FastForward />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hold to Fast-Forward (2x)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white" onClick={() => onLoopChange(!loop)}>
                  {loop ? <Repeat /> : <Repeat1 />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{loop ? "Looping enabled" : "Looping disabled"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
