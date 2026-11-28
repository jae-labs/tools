export type PaintLengthUnit = 'm' | 'cm' | 'ft';

export type PaintSurfaceMode = 'room' | 'wall';

export type PaintFinishId =
  | 'matt'
  | 'silk'
  | 'primer'
  | 'masonry'
  | 'textured'
  | 'trim'
  | 'custom';

export interface PaintFinishMeta {
  id: PaintFinishId;
  label: string;
  coverageM2PerLitre: number;
  note: string;
}

export const PAINT_FINISHES: readonly PaintFinishMeta[] = [
  { id: 'matt', label: 'Matt / Vinyl Matt Emulsion', coverageM2PerLitre: 12, note: 'Standard interior walls (~12 m²/L)' },
  { id: 'silk', label: 'Silk / Soft Sheen / Eggshell', coverageM2PerLitre: 13, note: 'Washable walls & kitchens (~13 m²/L)' },
  { id: 'primer', label: 'Primer / Bare Plaster Mist', coverageM2PerLitre: 10, note: 'Absorbent plaster & undercoat (~10 m²/L)' },
  { id: 'masonry', label: 'Smooth Masonry (Exterior)', coverageM2PerLitre: 8, note: 'Rendered exterior walls (~8 m²/L)' },
  { id: 'textured', label: 'Rough / Textured Masonry', coverageM2PerLitre: 5, note: 'Pebbledash or brick (~5 m²/L)' },
  { id: 'trim', label: 'Satinwood / Gloss (Woodwork)', coverageM2PerLitre: 14, note: 'Doors, skirting & trim (~14 m²/L)' },
  { id: 'custom', label: 'Custom Coverage', coverageM2PerLitre: 12, note: 'Enter manufacturer m²/L from tin' },
];

export const STANDARD_DOOR_M2 = 1.89; // 0.9m × 2.1m
export const STANDARD_WINDOW_M2 = 1.44; // 1.2m × 1.2m

export interface PaintInputs {
  mode: PaintSurfaceMode;
  length: number;
  width: number;
  height: number;
  unit: PaintLengthUnit;
  includeCeiling: boolean;
  doors: number;
  windows: number;
  customDeductionM2: number;
  finish: PaintFinishId;
  customCoverageM2PerL: number;
  coats: number;
  bufferPercent: number;
}

export interface TinRecommendationItem {
  sizeLitres: number;
  count: number;
}

export interface TinSizeBreakdown {
  sizeLitres: number;
  label: string;
  tinsNeeded: number;
  totalLitresBought: number;
  leftoverLitres: number;
}

export interface PaintResult {
  grossWallAreaM2: number;
  deductionAreaM2: number;
  netWallAreaM2: number;
  ceilingAreaM2: number;
  totalSurfaceAreaM2: number;
  totalSurfaceAreaFt2: number;
  coatAreaM2: number;
  coverageM2PerL: number;
  baseLitres: number;
  totalLitres: number;
  wallLitres: number;
  ceilingLitres: number;
  optimalTins: TinRecommendationItem[];
  optimalTotalLitres: number;
  optimalLeftoverLitres: number;
  tinBreakdowns: TinSizeBreakdown[];
}

export const DEFAULT_PAINT_INPUTS: PaintInputs = {
  mode: 'room',
  length: 4.5,
  width: 3.6,
  height: 2.4,
  unit: 'm',
  includeCeiling: false,
  doors: 1,
  windows: 1,
  customDeductionM2: 0,
  finish: 'matt',
  customCoverageM2PerL: 12,
  coats: 2,
  bufferPercent: 10,
};

const TIN_SIZES = [10, 5, 2.5, 1] as const;

export function toMeters(value: number, unit: PaintLengthUnit): number {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  if (unit === 'cm') return safe / 100;
  if (unit === 'ft') return safe * 0.3048;
  return safe;
}

/**
 * Picks a practical mix of standard 10L / 5L / 2.5L / 1L tins minimizing waste, then tin count.
 */
export function recommendOptimalTins(litresNeeded: number): {
  items: TinRecommendationItem[];
  totalLitres: number;
  leftoverLitres: number;
} {
  if (!Number.isFinite(litresNeeded) || litresNeeded <= 0) {
    return { items: [], totalLitres: 0, leftoverLitres: 0 };
  }

  // Work in half-litre units so 2.5L is an exact integer (5)
  const targetHalf = Math.ceil(litresNeeded * 2);
  const maxHalf = targetHalf + 20; // up to +10L overshoot search window
  const sizesHalf = [20, 10, 5, 2]; // 10L, 5L, 2.5L, 1L

  // Unbounded min-tin DP for exact half-litre totals
  const INF = 1e9;
  const dp = new Array<number>(maxHalf + 1).fill(INF);
  const prev = new Array<number>(maxHalf + 1).fill(-1);
  dp[0] = 0;

  for (let h = 1; h <= maxHalf; h++) {
    for (const s of sizesHalf) {
      if (h >= s && dp[h - s]! + 1 < dp[h]!) {
        dp[h] = dp[h - s]! + 1;
        prev[h] = s;
      }
    }
  }

  // Pick smallest total >= targetHalf (minimum leftover); break ties by fewest tins
  let bestH = targetHalf;
  for (let h = targetHalf; h <= maxHalf; h++) {
    if (dp[h]! < INF) {
      bestH = h;
      break;
    }
  }
  // If adding <= 0.5L saves >= 2 tins (e.g., 1x 5L instead of 2x 2.5L or 1x 2.5L instead of 3x 1L), prefer it
  for (let h = bestH + 1; h <= Math.min(maxHalf, bestH + 1); h++) {
    if (dp[h]! + 1 < dp[bestH]!) {
      bestH = h;
    }
  }

  const counts = new Map<number, number>();
  let cur = bestH;
  while (cur > 0 && prev[cur]! > 0) {
    const s = prev[cur]!;
    const litres = s / 2;
    counts.set(litres, (counts.get(litres) ?? 0) + 1);
    cur -= s;
  }

  const items: TinRecommendationItem[] = TIN_SIZES.filter((sz) => (counts.get(sz) ?? 0) > 0).map(
    (sz) => ({ sizeLitres: sz, count: counts.get(sz)! }),
  );
  const totalLitres = bestH / 2;
  const leftoverLitres = Math.max(0, Math.round((totalLitres - litresNeeded) * 100) / 100);

  return { items, totalLitres, leftoverLitres };
}

export function calculatePaint(inputs: PaintInputs): PaintResult {
  const lenM = toMeters(inputs.length, inputs.unit);
  const widM = toMeters(inputs.width, inputs.unit);
  const hgtM = toMeters(inputs.height, inputs.unit);

  const grossWallAreaM2 = inputs.mode === 'room' ? 2 * (lenM + widM) * hgtM : lenM * hgtM;
  const doors = Math.max(0, Math.round(Number.isFinite(inputs.doors) ? inputs.doors : 0));
  const windows = Math.max(0, Math.round(Number.isFinite(inputs.windows) ? inputs.windows : 0));
  const customDed = Math.max(0, Number.isFinite(inputs.customDeductionM2) ? inputs.customDeductionM2 : 0);

  const deductionAreaM2 = doors * STANDARD_DOOR_M2 + windows * STANDARD_WINDOW_M2 + customDed;
  const netWallAreaM2 = Math.max(0, grossWallAreaM2 - deductionAreaM2);
  const ceilingAreaM2 = inputs.mode === 'room' && inputs.includeCeiling ? lenM * widM : 0;
  const totalSurfaceAreaM2 = netWallAreaM2 + ceilingAreaM2;

  const finishMeta = PAINT_FINISHES.find((f) => f.id === inputs.finish) ?? PAINT_FINISHES[0]!;
  const coverageM2PerL =
    inputs.finish === 'custom'
      ? Math.max(1, Number.isFinite(inputs.customCoverageM2PerL) ? inputs.customCoverageM2PerL : 12)
      : finishMeta.coverageM2PerLitre;

  const coats = Math.min(6, Math.max(1, Math.round(Number.isFinite(inputs.coats) ? inputs.coats : 2)));
  const bufferPct = Math.min(50, Math.max(0, Number.isFinite(inputs.bufferPercent) ? inputs.bufferPercent : 10));
  const multiplier = 1 + bufferPct / 100;

  const coatAreaM2 = totalSurfaceAreaM2 * coats;
  const baseLitres = coatAreaM2 / coverageM2PerL;
  const totalLitres = baseLitres * multiplier;
  const wallLitres = ((netWallAreaM2 * coats) / coverageM2PerL) * multiplier;
  const ceilingLitres = ((ceilingAreaM2 * coats) / coverageM2PerL) * multiplier;

  const optimal = recommendOptimalTins(totalLitres);

  const tinBreakdowns: TinSizeBreakdown[] = TIN_SIZES.map((sz) => {
    const tinsNeeded = totalLitres > 0 ? Math.ceil(totalLitres / sz) : 0;
    const totalLitresBought = tinsNeeded * sz;
    return {
      sizeLitres: sz,
      label: `${sz}L Tin`,
      tinsNeeded,
      totalLitresBought,
      leftoverLitres: Math.max(0, Math.round((totalLitresBought - totalLitres) * 100) / 100),
    };
  });

  return {
    grossWallAreaM2,
    deductionAreaM2,
    netWallAreaM2,
    ceilingAreaM2,
    totalSurfaceAreaM2,
    totalSurfaceAreaFt2: totalSurfaceAreaM2 * 10.76391,
    coatAreaM2,
    coverageM2PerL,
    baseLitres,
    totalLitres,
    wallLitres,
    ceilingLitres,
    optimalTins: optimal.items,
    optimalTotalLitres: optimal.totalLitres,
    optimalLeftoverLitres: optimal.leftoverLitres,
    tinBreakdowns,
  };
}
