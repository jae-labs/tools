export type ImageExportFormat = 'image/webp' | 'image/jpeg' | 'image/png';

export type AspectPresetId = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '4:5' | '9:16';

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AspectPreset {
  id: AspectPresetId;
  label: string;
  ratio: number | null; // width / height
}

export const ASPECT_PRESETS: readonly AspectPreset[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
];

export const FORMAT_META: Record<ImageExportFormat, { label: string; ext: string; lossy: boolean }> = {
  'image/webp': { label: 'WebP', ext: 'webp', lossy: true },
  'image/jpeg': { label: 'JPEG', ext: 'jpg', lossy: true },
  'image/png': { label: 'PNG', ext: 'png', lossy: false },
};

export function clampCropRect(rect: CropRect, imgW: number, imgH: number, minSize = 16): CropRect {
  const safeMinW = Math.min(minSize, imgW);
  const safeMinH = Math.min(minSize, imgH);
  const w = Math.min(imgW, Math.max(safeMinW, Math.round(rect.w)));
  const h = Math.min(imgH, Math.max(safeMinH, Math.round(rect.h)));
  const x = Math.min(imgW - w, Math.max(0, Math.round(rect.x)));
  const y = Math.min(imgH - h, Math.max(0, Math.round(rect.y)));
  return { x, y, w, h };
}

export function computeCenteredCropForAspect(imgW: number, imgH: number, ratio: number | null): CropRect {
  if (!ratio || ratio <= 0) {
    return { x: 0, y: 0, w: imgW, h: imgH };
  }
  const imgRatio = imgW / imgH;
  if (imgRatio > ratio) {
    const h = imgH;
    const w = Math.round(h * ratio);
    return { x: Math.round((imgW - w) / 2), y: 0, w, h };
  }
  const w = imgW;
  const h = Math.round(w / ratio);
  return { x: 0, y: Math.round((imgH - h) / 2), w, h };
}

export function computeAspectLockedSize(
  srcW: number,
  srcH: number,
  targetVal: number,
  changedAxis: 'w' | 'h',
  lockAspect: boolean,
  otherVal: number,
): { w: number; h: number } {
  const clamped = Math.min(8192, Math.max(1, Math.round(Number.isFinite(targetVal) ? targetVal : 1)));
  if (!lockAspect || srcW <= 0 || srcH <= 0) {
    const other = Math.min(8192, Math.max(1, Math.round(Number.isFinite(otherVal) ? otherVal : 1)));
    return changedAxis === 'w' ? { w: clamped, h: other } : { w: other, h: clamped };
  }
  const ratio = srcW / srcH;
  if (changedAxis === 'w') {
    return { w: clamped, h: Math.max(1, Math.round(clamped / ratio)) };
  }
  return { w: Math.max(1, Math.round(clamped * ratio)), h: clamped };
}

export function computeSavingsPercent(originalBytes: number, outputBytes: number): number {
  if (originalBytes <= 0) return 0;
  return Math.round(((originalBytes - outputBytes) / originalBytes) * 100);
}

export function buildExportFilename(
  originalName: string,
  width: number,
  height: number,
  format: ImageExportFormat,
): string {
  const base = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-') || 'image';
  return `${base}-${width}x${height}.${FORMAT_META[format].ext}`;
}
