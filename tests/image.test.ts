import { describe, expect, it } from 'vitest';
import {
  buildExportFilename,
  clampCropRect,
  computeAspectLockedSize,
  computeCenteredCropForAspect,
  computeSavingsPercent,
} from '../src/shared/image.ts';

describe('image crop/resize/export helpers', () => {
  it('clamps crop rectangles within image bounds', () => {
    expect(clampCropRect({ x: -20, y: 10, w: 500, h: 400 }, 300, 200)).toEqual({
      x: 0,
      y: 0,
      w: 300,
      h: 200,
    });
    expect(clampCropRect({ x: 250, y: 150, w: 100, h: 100 }, 300, 200)).toEqual({
      x: 200,
      y: 100,
      w: 100,
      h: 100,
    });
  });

  it('computes centered crops for aspect ratios', () => {
    expect(computeCenteredCropForAspect(1600, 900, 1)).toEqual({
      x: 350,
      y: 0,
      w: 900,
      h: 900,
    });
    expect(computeCenteredCropForAspect(800, 800, 16 / 9)).toEqual({
      x: 0,
      y: 175,
      w: 800,
      h: 450,
    });
  });

  it('locks aspect ratio on resize and calculates savings & filenames', () => {
    expect(computeAspectLockedSize(1600, 900, 800, 'w', true, 900)).toEqual({ w: 800, h: 450 });
    expect(computeAspectLockedSize(1600, 900, 800, 'w', false, 600)).toEqual({ w: 800, h: 600 });
    expect(computeSavingsPercent(1000, 250)).toBe(75);
    expect(buildExportFilename('holiday photo.png', 1200, 800, 'image/webp')).toBe(
      'holiday-photo-1200x800.webp',
    );
    expect(buildExportFilename('pic.webp', 640, 480, 'image/jpeg')).toBe('pic-640x480.jpg');
  });
});
