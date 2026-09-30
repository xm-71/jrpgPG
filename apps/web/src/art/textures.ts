import { Texture } from 'pixi.js';

/**
 * Rasterise SVG markup to a PixiJS texture. Textures are cached by key and drawn at twice their
 * display size, so figures stay sharp on high-density screens.
 */

const cache = new Map<string, Promise<Texture>>();

export interface Rasterized {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load generated art'));
    img.src = src;
  });
}

export async function rasterize(svg: string, width: number, height: number, scale = 2): Promise<Rasterized> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas available');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function svgTexture(key: string, svg: string, width: number, height: number): Promise<Texture> {
  let hit = cache.get(key);
  if (!hit) {
    hit = rasterize(svg, width, height).then((r) => Texture.from(r.canvas));
    cache.set(key, hit);
  }
  return hit;
}
