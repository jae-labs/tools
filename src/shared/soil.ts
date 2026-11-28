export type SoilLengthUnit = 'm' | 'cm' | 'mm' | 'ft' | 'in' | 'yd';
export type SoilShape = 'rectangle' | 'circle' | 'triangle';
export type SoilMaterialId =
  | 'topsoil-compost'
  | 'topsoil'
  | 'compost'
  | 'potting'
  | 'bark-mulch'
  | 'gravel';

export interface SoilMaterial {
  id: SoilMaterialId;
  label: string;
  densityKgPerM3: number;
  note: string;
}

export const SOIL_MATERIALS: SoilMaterial[] = [
  {
    id: 'topsoil-compost',
    label: 'Veg Soil / Topsoil & Compost Mix',
    densityKgPerM3: 1100,
    note: 'Balanced raised-bed blend (~1,100 kg/m³)',
  },
  {
    id: 'topsoil',
    label: 'Screened Topsoil',
    densityKgPerM3: 1300,
    note: 'Dense garden topsoil (~1,300 kg/m³)',
  },
  {
    id: 'compost',
    label: 'Organic / Peat-Free Compost',
    densityKgPerM3: 700,
    note: 'Lighter enriched compost (~700 kg/m³)',
  },
  {
    id: 'potting',
    label: 'Potting / Multi-Purpose Mix',
    densityKgPerM3: 550,
    note: 'Airy container & seed mix (~550 kg/m³)',
  },
  {
    id: 'bark-mulch',
    label: 'Bark Mulch / Woodchip',
    densityKgPerM3: 450,
    note: 'Surface weed-suppressing mulch (~450 kg/m³)',
  },
  {
    id: 'gravel',
    label: 'Horticultural Grit / Gravel',
    densityKgPerM3: 1600,
    note: 'Drainage & pathway aggregate (~1,600 kg/m³)',
  },
];

export const LENGTH_TO_METERS: Record<SoilLengthUnit, number> = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
  yd: 0.9144,
};

export interface SoilInputs {
  shape: SoilShape;
  length: number;
  lengthUnit: SoilLengthUnit;
  width: number;
  widthUnit: SoilLengthUnit;
  depth: number;
  depthUnit: SoilLengthUnit;
  beds: number;
  bufferPercent: number;
  material: SoilMaterialId;
}

export interface SoilBagEstimate {
  label: string;
  litresPerBag: number;
  bagsExact: number;
  bagsNeeded: number;
}

export interface SoilResult {
  areaM2: number;
  baseVolumeM3: number;
  volumeM3: number;
  litres: number;
  cubicFeet: number;
  cubicYards: number;
  weightKg: number;
  weightTonnes: number;
  material: SoilMaterial;
  bags: SoilBagEstimate[];
}

const BAG_SIZES: Array<{ label: string; litres: number }> = [
  { label: '20L Bags', litres: 20 },
  { label: '40L Bags', litres: 40 },
  { label: '50L Bags', litres: 50 },
  { label: '60L Bags', litres: 60 },
  { label: 'Bulk / Dumpy Bags (850L)', litres: 850 },
];

export function toMeters(value: number, unit: SoilLengthUnit): number {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  return safe * LENGTH_TO_METERS[unit];
}

export function calculateSoilVolume(inputs: SoilInputs): SoilResult {
  const lengthM = toMeters(inputs.length, inputs.lengthUnit);
  const widthM = toMeters(inputs.width, inputs.widthUnit);
  const depthM = toMeters(inputs.depth, inputs.depthUnit);
  const beds = Math.max(1, Math.min(1000, Math.round(Number.isFinite(inputs.beds) ? inputs.beds : 1)));
  const bufferPct = Math.max(0, Math.min(50, Number.isFinite(inputs.bufferPercent) ? inputs.bufferPercent : 0));

  let singleAreaM2: number;
  if (inputs.shape === 'rectangle') {
    singleAreaM2 = lengthM * widthM;
  } else if (inputs.shape === 'circle') {
    // `length` represents diameter for circular beds/planters
    const radius = lengthM / 2;
    singleAreaM2 = Math.PI * radius * radius;
  } else {
    // `length` = base, `width` = perpendicular height
    singleAreaM2 = 0.5 * lengthM * widthM;
  }

  const areaM2 = singleAreaM2 * beds;
  const baseVolumeM3 = areaM2 * depthM;
  const volumeM3 = baseVolumeM3 * (1 + bufferPct / 100);
  const litres = volumeM3 * 1000;
  const cubicFeet = volumeM3 * 35.3146667;
  const cubicYards = volumeM3 * 1.30795062;

  const material = SOIL_MATERIALS.find((m) => m.id === inputs.material) ?? SOIL_MATERIALS[0];
  const weightKg = volumeM3 * material.densityKgPerM3;
  const weightTonnes = weightKg / 1000;

  const bags: SoilBagEstimate[] = BAG_SIZES.map(({ label, litres: bagL }) => {
    const exact = litres / bagL;
    return {
      label,
      litresPerBag: bagL,
      bagsExact: Math.round(exact * 100) / 100,
      bagsNeeded: litres > 0 ? Math.ceil(exact) : 0,
    };
  });

  return {
    areaM2,
    baseVolumeM3,
    volumeM3,
    litres,
    cubicFeet,
    cubicYards,
    weightKg,
    weightTonnes,
    material,
    bags,
  };
}

export const DEFAULT_SOIL_INPUTS: SoilInputs = {
  shape: 'rectangle',
  length: 2.4,
  lengthUnit: 'm',
  width: 1.2,
  widthUnit: 'm',
  depth: 30,
  depthUnit: 'cm',
  beds: 1,
  bufferPercent: 10,
  material: 'topsoil-compost',
};
