import { describe, expect, it } from 'vitest';
import {
  BANDWIDTH_UNITS,
  DATA_UNITS,
  convertUnits,
  estimateTransferSeconds,
  formatDuration,
} from '../src/shared/units.ts';

describe('unit converter', () => {
  it('converts SI and IEC data storage units accurately', () => {
    const rows = convertUnits(1, 'GiB', DATA_UNITS);
    const bytes = rows.find((r) => r.id === 'B');
    const mib = rows.find((r) => r.id === 'MiB');
    expect(bytes?.value).toBe(1073741824);
    expect(mib?.value).toBe(1024);
  });

  it('converts bandwidth units accurately', () => {
    const rows = convertUnits(100, 'Mbps', BANDWIDTH_UNITS);
    const mbs = rows.find((r) => r.id === 'MB/s');
    expect(mbs?.value).toBe(12.5);
  });

  it('estimates transfer time correctly', () => {
    // 1 GB (8e9 bits) at 100 Mbps (1e8 bits/s) = 80 seconds
    const secs = estimateTransferSeconds(1, 'GB', 100, 'Mbps');
    expect(secs).toBe(80);
    expect(formatDuration(80)).toBe('1m 20s');
    expect(formatDuration(3661)).toBe('1h 1m 1s');
  });
});
