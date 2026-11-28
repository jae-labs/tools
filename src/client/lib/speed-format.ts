export function formatMbpsNumber(mbps: number | null | undefined): string {
  if (typeof mbps !== 'number' || !Number.isFinite(mbps)) return '0.00';
  return mbps.toFixed(2);
}

export function formatMbpsTriple(min: number, max: number, avg: number): string {
  if (avg <= 0 && max <= 0) return '-- / -- / -- Mbps';
  return `${formatMbpsNumber(min)} / ${formatMbpsNumber(max)} / ${formatMbpsNumber(avg)} Mbps`;
}

export function formatMsTriple(
  min: number | null,
  max: number | null,
  avg: number | null,
): string {
  if (avg === null || min === null || max === null) return '-- / -- / -- ms';
  return `${min.toFixed(1)} / ${max.toFixed(1)} / ${avg.toFixed(1)} ms`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx++;
  }
  return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

export function formatDuration(totalSec: number): string {
  const clamped = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
