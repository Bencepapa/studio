export type VFXSettings = {
  [key: string]: any;
};

export interface VFXEffect {
  init: (canvas: HTMLCanvasElement, settings: VFXSettings) => void;
  destroy: () => void;
  update: (time: number, deltaTime: number, settings: VFXSettings) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
  getSettings: () => VFXSettings;
}

export interface VFXEffectClass {
  new (): VFXEffect;
  effectName: string;
  defaultSettings: VFXSettings;
}
