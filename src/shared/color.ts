export interface RgbaColor {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  a: number; // 0..1
}

export interface HsvColor {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

export interface HslColor {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

export interface FormattedColorOutputs {
  hex: string;
  hexUpper: string;
  hex8: string;
  rgb: string;
  hsl: string;
  cssSnippet: string;
}

export interface ContrastCheck {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
}

export interface SwatchItem {
  label: string;
  hex: string;
  rgba: RgbaColor;
}

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export function normalizeRgba(color: Partial<RgbaColor>): RgbaColor {
  return {
    r: Math.round(clamp(color.r ?? 0, 0, 255)),
    g: Math.round(clamp(color.g ?? 0, 0, 255)),
    b: Math.round(clamp(color.b ?? 0, 0, 255)),
    a: Math.round(clamp(color.a ?? 1, 0, 1) * 100) / 100,
  };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const vv = clamp(v, 0, 100) / 100;

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) {
    r1 = c;
    g1 = x;
  } else if (hh < 120) {
    r1 = x;
    g1 = c;
  } else if (hh < 180) {
    g1 = c;
    b1 = x;
  } else if (hh < 240) {
    g1 = x;
    b1 = c;
  } else if (hh < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / d) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / d + 2);
    } else {
      h = 60 * ((rn - gn) / d + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;

  return {
    h: Math.round(h),
    s: Math.round(s * 10) / 10,
    v: Math.round(v * 10) / 10,
  };
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) {
      h = 60 * (((gn - bn) / d) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / d + 2);
    } else {
      h = 60 * ((rn - gn) / d + 4);
    }
  }
  if (h < 0) h += 360;

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) {
    r1 = c;
    g1 = x;
  } else if (hh < 120) {
    r1 = x;
    g1 = c;
  } else if (hh < 180) {
    g1 = c;
    b1 = x;
  } else if (hh < 240) {
    g1 = x;
    b1 = c;
  } else if (hh < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function byteHex(n: number): string {
  return Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
}

export function rgbaToHex(color: RgbaColor, includeAlpha = false): string {
  const base = `#${byteHex(color.r)}${byteHex(color.g)}${byteHex(color.b)}`;
  if (!includeAlpha) return base;
  return `${base}${byteHex(color.a * 255)}`;
}

export function formatColorOutputs(raw: RgbaColor): FormattedColorOutputs {
  const c = normalizeRgba(raw);
  const hex = rgbaToHex(c, false);
  const hex8 = rgbaToHex(c, true);
  const hasAlpha = c.a < 1;
  const alphaStr = Number(c.a.toFixed(2)).toString();
  const rgb = hasAlpha ? `rgba(${c.r}, ${c.g}, ${c.b}, ${alphaStr})` : `rgb(${c.r}, ${c.g}, ${c.b})`;
  const hslObj = rgbToHsl(c.r, c.g, c.b);
  const hsl = hasAlpha
    ? `hsla(${hslObj.h}, ${hslObj.s}%, ${hslObj.l}%, ${alphaStr})`
    : `hsl(${hslObj.h}, ${hslObj.s}%, ${hslObj.l}%)`;
  const cssVal = hasAlpha ? rgb : hex;

  const cssSnippet = [
    `--color-primary: ${cssVal};`,
    `color: ${cssVal};`,
    `background-color: ${cssVal};`,
    `border-color: ${cssVal};`,
  ].join('\n');

  return {
    hex: hasAlpha ? hex8 : hex,
    hexUpper: (hasAlpha ? hex8 : hex).toUpperCase(),
    hex8,
    rgb,
    hsl,
    cssSnippet,
  };
}

export function parseColor(input: string): RgbaColor | null {
  const s = input.trim();
  if (!s) return null;

  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  const hexMatch = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(s);
  if (hexMatch) {
    const raw = hexMatch[1]!;
    if (raw.length === 3 || raw.length === 4) {
      const r = parseInt(raw[0]! + raw[0]!, 16);
      const g = parseInt(raw[1]! + raw[1]!, 16);
      const b = parseInt(raw[2]! + raw[2]!, 16);
      const a = raw.length === 4 ? parseInt(raw[3]! + raw[3]!, 16) / 255 : 1;
      return normalizeRgba({ r, g, b, a });
    }
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    const a = raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1;
    return normalizeRgba({ r, g, b, a });
  }

  // rgb() / rgba() — comma or space separated
  const rgbMatch =
    /^rgba?\(\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+)(%?))?\s*\)$/i.exec(s);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      const parsedA = Number(rgbMatch[4]);
      a = rgbMatch[5] === '%' ? parsedA / 100 : parsedA;
    }
    if ([r, g, b, a].every(Number.isFinite)) {
      return normalizeRgba({ r, g, b, a });
    }
  }

  // hsl() / hsla()
  const hslMatch =
    /^hsla?\(\s*(-?[0-9.]+)(?:deg)?\s*[,\s]\s*([0-9.]+)%\s*[,\s]\s*([0-9.]+)%(?:\s*[,/]\s*([0-9.]+)(%?))?\s*\)$/i.exec(
      s,
    );
  if (hslMatch) {
    const h = Number(hslMatch[1]);
    const sat = Number(hslMatch[2]);
    const l = Number(hslMatch[3]);
    let a = 1;
    if (hslMatch[4] !== undefined) {
      const parsedA = Number(hslMatch[4]);
      a = hslMatch[5] === '%' ? parsedA / 100 : parsedA;
    }
    if ([h, sat, l, a].every(Number.isFinite)) {
      const rgb = hslToRgb(h, sat, l);
      return normalizeRgba({ ...rgb, a });
    }
  }

  return null;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const v = clamp(c, 0, 255) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function checkContrast(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number },
): ContrastCheck {
  const l1 = relativeLuminance(fg.r, fg.g, fg.b);
  const l2 = relativeLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
  };
}

export function buildHarmonyPalette(raw: RgbaColor): SwatchItem[] {
  const c = normalizeRgba(raw);
  const hsl = rgbToHsl(c.r, c.g, c.b);

  const make = (label: string, h: number, s: number, l: number): SwatchItem => {
    const rgb = hslToRgb(h, clamp(s, 0, 100), clamp(l, 5, 95));
    const rgba: RgbaColor = { ...rgb, a: 1 };
    return { label, hex: rgbaToHex(rgba, false).toUpperCase(), rgba };
  };

  return [
    make('Lighter', hsl.h, hsl.s, Math.min(92, hsl.l + 20)),
    make('Darker', hsl.h, hsl.s, Math.max(10, hsl.l - 20)),
    make('Complement', (hsl.h + 180) % 360, hsl.s, hsl.l),
    make('Analogous -', (hsl.h + 330) % 360, hsl.s, hsl.l),
    make('Analogous +', (hsl.h + 30) % 360, hsl.s, hsl.l),
    make('Triadic', (hsl.h + 120) % 360, hsl.s, hsl.l),
  ];
}
