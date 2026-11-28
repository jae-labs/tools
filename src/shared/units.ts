export interface UnitDefinition {
  id: string;
  label: string;
  symbol: string;
  group: 'decimal' | 'binary' | 'bits';
  toBase: number; // bits for data, bits/sec for bandwidth
}

export const DATA_UNITS: UnitDefinition[] = [
  { id: 'b', label: 'Bits', symbol: 'b', group: 'bits', toBase: 1 },
  { id: 'Kb', label: 'Kilobits', symbol: 'Kb', group: 'bits', toBase: 1e3 },
  { id: 'Mb', label: 'Megabits', symbol: 'Mb', group: 'bits', toBase: 1e6 },
  { id: 'Gb', label: 'Gigabits', symbol: 'Gb', group: 'bits', toBase: 1e9 },
  { id: 'Tb', label: 'Terabits', symbol: 'Tb', group: 'bits', toBase: 1e12 },
  { id: 'B', label: 'Bytes', symbol: 'B', group: 'decimal', toBase: 8 },
  { id: 'KB', label: 'Kilobytes (SI)', symbol: 'KB', group: 'decimal', toBase: 8 * 1e3 },
  { id: 'MB', label: 'Megabytes (SI)', symbol: 'MB', group: 'decimal', toBase: 8 * 1e6 },
  { id: 'GB', label: 'Gigabytes (SI)', symbol: 'GB', group: 'decimal', toBase: 8 * 1e9 },
  { id: 'TB', label: 'Terabytes (SI)', symbol: 'TB', group: 'decimal', toBase: 8 * 1e12 },
  { id: 'PB', label: 'Petabytes (SI)', symbol: 'PB', group: 'decimal', toBase: 8 * 1e15 },
  { id: 'KiB', label: 'Kibibytes (IEC)', symbol: 'KiB', group: 'binary', toBase: 8 * 1024 },
  { id: 'MiB', label: 'Mebibytes (IEC)', symbol: 'MiB', group: 'binary', toBase: 8 * 1024 ** 2 },
  { id: 'GiB', label: 'Gibibytes (IEC)', symbol: 'GiB', group: 'binary', toBase: 8 * 1024 ** 3 },
  { id: 'TiB', label: 'Tebibytes (IEC)', symbol: 'TiB', group: 'binary', toBase: 8 * 1024 ** 4 },
];

export const BANDWIDTH_UNITS: UnitDefinition[] = [
  { id: 'bps', label: 'Bits / sec', symbol: 'bps', group: 'bits', toBase: 1 },
  { id: 'Kbps', label: 'Kilobits / sec', symbol: 'Kbps', group: 'bits', toBase: 1e3 },
  { id: 'Mbps', label: 'Megabits / sec', symbol: 'Mbps', group: 'bits', toBase: 1e6 },
  { id: 'Gbps', label: 'Gigabits / sec', symbol: 'Gbps', group: 'bits', toBase: 1e9 },
  { id: 'Tbps', label: 'Terabits / sec', symbol: 'Tbps', group: 'bits', toBase: 1e12 },
  { id: 'B/s', label: 'Bytes / sec', symbol: 'B/s', group: 'decimal', toBase: 8 },
  { id: 'KB/s', label: 'Kilobytes / sec', symbol: 'KB/s', group: 'decimal', toBase: 8 * 1e3 },
  { id: 'MB/s', label: 'Megabytes / sec', symbol: 'MB/s', group: 'decimal', toBase: 8 * 1e6 },
  { id: 'GB/s', label: 'Gigabytes / sec', symbol: 'GB/s', group: 'decimal', toBase: 8 * 1e9 },
  { id: 'MiB/s', label: 'Mebibytes / sec', symbol: 'MiB/s', group: 'binary', toBase: 8 * 1024 ** 2 },
];

export interface UnitConversionRow {
  id: string;
  label: string;
  symbol: string;
  group: UnitDefinition['group'];
  value: number;
  formatted: string;
}

export function formatUnitNumber(value: number): string {
  if (!Number.isFinite(value)) return '--';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e12 || (abs > 0 && abs < 1e-4)) {
    return value.toExponential(4);
  }
  if (abs >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return Number(value.toPrecision(6)).toString();
}

export function convertUnits(
  value: number,
  fromUnitId: string,
  units: UnitDefinition[],
): UnitConversionRow[] {
  const source = units.find((u) => u.id === fromUnitId);
  if (!source || !Number.isFinite(value)) {
    return [];
  }
  const baseValue = value * source.toBase;
  return units.map((unit) => {
    const converted = baseValue / unit.toBase;
    return {
      id: unit.id,
      label: unit.label,
      symbol: unit.symbol,
      group: unit.group,
      value: converted,
      formatted: formatUnitNumber(converted),
    };
  });
}

export function estimateTransferSeconds(
  sizeValue: number,
  sizeUnitId: string,
  speedValue: number,
  speedUnitId: string,
): number | null {
  const sizeUnit = DATA_UNITS.find((u) => u.id === sizeUnitId);
  const speedUnit = BANDWIDTH_UNITS.find((u) => u.id === speedUnitId);
  if (!sizeUnit || !speedUnit || sizeValue < 0 || speedValue <= 0) {
    return null;
  }
  const totalBits = sizeValue * sizeUnit.toBase;
  const bitsPerSecond = speedValue * speedUnit.toBase;
  return totalBits / bitsPerSecond;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 0.001) return '< 1 ms';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}
