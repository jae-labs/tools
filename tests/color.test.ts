import { describe, expect, it } from 'vitest';
import {
  buildHarmonyPalette,
  checkContrast,
  formatColorOutputs,
  hslToRgb,
  hsvToRgb,
  parseColor,
  rgbToHsl,
  rgbToHsv,
  rgbaToHex,
} from '../src/shared/color.ts';

describe('color utilities', () => {
  it('converts between RGB, HSV, HSL, and HEX accurately', () => {
    // Pure cyan #00ffff
    expect(rgbToHsv(0, 255, 255)).toEqual({ h: 180, s: 100, v: 100 });
    expect(hsvToRgb(180, 100, 100)).toEqual({ r: 0, g: 255, b: 255 });
    expect(rgbToHsl(0, 255, 255)).toEqual({ h: 180, s: 100, l: 50 });
    expect(hslToRgb(180, 100, 50)).toEqual({ r: 0, g: 255, b: 255 });
    expect(rgbaToHex({ r: 0, g: 255, b: 255, a: 1 })).toBe('#00ffff');
    expect(rgbaToHex({ r: 0, g: 255, b: 255, a: 0.5 }, true)).toBe('#00ffff80');
  });

  it('parses hex, rgb, rgba, hsl, and hsla formats', () => {
    expect(parseColor('#0ff')).toEqual({ r: 0, g: 255, b: 255, a: 1 });
    expect(parseColor('#f3eb2c')).toEqual({ r: 243, g: 235, b: 44, a: 1 });
    expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(parseColor('rgb(59, 130, 246)')).toEqual({ r: 59, g: 130, b: 246, a: 1 });
    expect(parseColor('rgba(59, 130, 246, 0.75)')).toEqual({ r: 59, g: 130, b: 246, a: 0.75 });
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseColor('hsla(240, 100%, 50%, 50%)')).toEqual({ r: 0, g: 0, b: 255, a: 0.5 });
    expect(parseColor('not-a-color')).toBeNull();
  });

  it('formats HEX, RGB, HSL, and CSS outputs for opaque and translucent colors', () => {
    const opaque = formatColorOutputs({ r: 0, g: 255, b: 255, a: 1 });
    expect(opaque.hex).toBe('#00ffff');
    expect(opaque.hexUpper).toBe('#00FFFF');
    expect(opaque.rgb).toBe('rgb(0, 255, 255)');
    expect(opaque.hsl).toBe('hsl(180, 100%, 50%)');
    expect(opaque.cssSnippet).toContain('--color-primary: #00ffff;');

    const translucent = formatColorOutputs({ r: 0, g: 255, b: 255, a: 0.5 });
    expect(translucent.hex).toBe('#00ffff80');
    expect(translucent.rgb).toBe('rgba(0, 255, 255, 0.5)');
    expect(translucent.hsl).toBe('hsla(180, 100%, 50%, 0.5)');
    expect(translucent.cssSnippet).toContain('background-color: rgba(0, 255, 255, 0.5);');
  });

  it('computes WCAG contrast ratios accurately', () => {
    const bw = checkContrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(bw.ratio).toBe(21);
    expect(bw.aaNormal).toBe(true);
    expect(bw.aaaNormal).toBe(true);

    const same = checkContrast({ r: 100, g: 100, b: 100 }, { r: 100, g: 100, b: 100 });
    expect(same.ratio).toBe(1);
    expect(same.aaLarge).toBe(false);
  });

  it('builds a 6-swatch harmony palette', () => {
    const swatches = buildHarmonyPalette({ r: 0, g: 255, b: 255, a: 1 });
    expect(swatches).toHaveLength(6);
    expect(swatches.find((s) => s.label === 'Complement')?.hex).toBe('#FF0000');
  });
});
