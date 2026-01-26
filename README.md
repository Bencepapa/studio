# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Live Demo

You can view the live application at: [https://bencepapa.github.io/studio/](https://bencepapa.github.io/studio/)

## How to Use

This project serves as both a showcase and a laboratory for a library of pure JavaScript/TypeScript visual effects (VFX). You can easily add your own effects to the lab or copy existing ones into your own game or application.

### Adding a New Effect to the Lab

1.  **Create the Effect File:** Create a new TypeScript file in `src/effects/`. It's best to copy an existing effect file (e.g., `src/effects/healing.ts`) to use as a template.

2.  **Implement the `VFXEffect` Interface:** Your effect class must implement the `VFXEffect` interface found in `src/effects/types.ts`. This includes:
    *   `static effectName`: A user-friendly name for your effect that will appear in the UI.
    *   `static defaultSettings`: An object defining the controllable parameters for your effect and their default values. These will automatically appear as controls in the sidebar.
    *   `init(canvas, settings)`: Called once when the effect is loaded. Use this to set up your canvas, initial variables, and any objects you need.
    *   `update(time, deltaTime, settings)`: Called on every frame before rendering. This is where you update animations, particle positions, and other logic based on the current `time` and `settings`.
    *   `render(ctx)`: Called on every frame after `update()`. This is where you draw everything to the 2D canvas context.
    *   `destroy()`: Called when the effect is switched. Use this to clean up any resources, event listeners, or intervals.

3.  **Import and Register:**
    *   Open `src/app/page.tsx`.
    *   Import your new effect class at the top of the file (e.g., `import { MyNewEffect } from '@/effects/my-new-effect';`).
    *   Add your effect to the `availableEffects` object. The key should be a unique string identifier, and the value is your effect class:
        ```javascript
        const availableEffects: Record<string, VFXEffectClass> = {
          "my-new-effect": MyNewEffect,
          // ... existing effects
        };
        ```

4.  **Enable Dependency Generation (Optional):**
    *   Open `src/app/actions.ts`.
    *   Add an entry to the `effectFileMap` object. The key must match the one you used in `availableEffects`, and the value should be the filename of your effect:
        ```javascript
        const effectFileMap: { [key: string]: string } = {
          "my-new-effect": "my-new-effect.ts",
          // ... existing effects
        };
        ```
    *   This allows the "Get Dependencies" feature to find and analyze your effect's source code.

### Integrating an Effect into Your Own Project

Each effect is designed to be self-contained for easy integration.

1.  **Get Dependencies:**
    *   In the VFX Lab, select the effect you want to use.
    *   Click the **Get Dependencies** button in the control panel.
    *   This will analyze the effect's code using Genkit and provide instructions for any helper functions (like `mapRange` or `seededRandom` from `src/effects/utils.ts`) it relies on.

2.  **Copy Files:**
    *   Copy the effect's TypeScript file from the `src/effects/` directory into your project.
    *   If the dependency check mentioned any utilities, copy the `src/effects/utils.ts` file (or just the specific functions you need) into your project as well.
    *   Copy the `src/effects/types.ts` file, as it contains the interfaces the effect class depends on.

3.  **Instantiate and Use in Your Component:**
    *   Import the effect class in your component file.
    *   Create a `<canvas>` element in your JSX and get a reference to it using `useRef`.
    *   In a `useEffect` hook, create a new instance of your effect class and initialize it.
    *   Use `requestAnimationFrame` to create a render loop that calls the effect's `update()` and `render()` methods.
    *   Ensure you call `effect.destroy()` in the `useEffect` cleanup function to prevent memory leaks.

    **Example (React):**
    ```jsx
    import React, { useRef, useEffect } from 'react';
    import { MyCoolEffect } from './effects/my-cool-effect';
    import type { VFXEffect } from './effects/types';

    const MyComponent = () => {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const effectRef = useRef<VFXEffect | null>(null);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Instantiate the effect
        const effect = new MyCoolEffect();
        effectRef.current = effect;
        
        // Initialize with default settings
        effect.init(canvas, MyCoolEffect.defaultSettings);

        let animationFrameId: number;
        let lastTime = 0;

        const renderLoop = (timestamp: number) => {
          if (lastTime === 0) lastTime = timestamp;
          const deltaTime = (timestamp - lastTime) / 1000;
          lastTime = timestamp;
          
          const time = timestamp / 1000;

          // Clear canvas before each render
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }

          effect.update(time, deltaTime, MyCoolEffect.defaultSettings);
          if (ctx) {
            effect.render(ctx);
          }

          animationFrameId = window.requestAnimationFrame(renderLoop);
        };

        renderLoop(0);

        return () => {
          window.cancelAnimationFrame(animationFrameId);
          effect.destroy();
        };
      }, []);

      return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
    };
    ```
