import { describe, expect, it } from 'vitest';
import { DEFAULT_SOIL_INPUTS, calculateSoilVolume } from '../src/shared/soil.ts';

describe('Soil & Mulch Calculator', () => {
  it('computes rectangular raised bed volume, weight, and bag counts with mixed units', () => {
    const res = calculateSoilVolume({
      ...DEFAULT_SOIL_INPUTS,
      length: 2.4,
      lengthUnit: 'm',
      width: 1.2,
      widthUnit: 'm',
      depth: 30,
      depthUnit: 'cm',
      beds: 1,
      bufferPercent: 0,
      material: 'topsoil-compost',
    });

    expect(res.areaM2).toBeCloseTo(2.88, 4);
    expect(res.volumeM3).toBeCloseTo(0.864, 4);
    expect(res.litres).toBeCloseTo(864, 2);
    expect(res.weightTonnes).toBeCloseTo(0.9504, 4);
    const bags50 = res.bags.find((b) => b.litresPerBag === 50)!;
    expect(bags50.bagsNeeded).toBe(18);
    const bulk = res.bags.find((b) => b.litresPerBag === 850)!;
    expect(bulk.bagsNeeded).toBe(2);
  });

  it('supports circular beds, imperial units, multiple beds, and settling buffer', () => {
    const res = calculateSoilVolume({
      shape: 'circle',
      length: 4,
      lengthUnit: 'ft',
      width: 0,
      widthUnit: 'ft',
      depth: 12,
      depthUnit: 'in',
      beds: 2,
      bufferPercent: 10,
      material: 'compost',
    });

    // Diameter 4ft -> radius 2ft = 0.6096m, depth 12in = 0.3048m
    const singleM3 = Math.PI * 0.6096 * 0.6096 * 0.3048;
    expect(res.baseVolumeM3).toBeCloseTo(singleM3 * 2, 4);
    expect(res.volumeM3).toBeCloseTo(singleM3 * 2 * 1.1, 4);
    expect(res.weightKg).toBeCloseTo(res.volumeM3 * 700, 1);
  });

  it('computes triangular corner beds accurately', () => {
    const res = calculateSoilVolume({
      shape: 'triangle',
      length: 2,
      lengthUnit: 'm',
      width: 3,
      widthUnit: 'm',
      depth: 20,
      depthUnit: 'cm',
      beds: 1,
      bufferPercent: 0,
      material: 'bark-mulch',
    });

    expect(res.areaM2).toBeCloseTo(3, 4);
    expect(res.volumeM3).toBeCloseTo(0.6, 4);
    expect(res.litres).toBeCloseTo(600, 2);
  });
});
