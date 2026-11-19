export interface ChartSample {
  tSec: number;
  downloadMbps: number;
  uploadMbps: number;
}

export function renderThroughputChart(
  canvas: HTMLCanvasElement,
  samples: readonly ChartSample[],
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 160;
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  let maxMbps = 10;
  for (const s of samples) {
    if (s.downloadMbps > maxMbps) maxMbps = s.downloadMbps;
    if (s.uploadMbps > maxMbps) maxMbps = s.uploadMbps;
  }
  maxMbps = Math.ceil((maxMbps * 1.15) / 10) * 10 || 10;

  ctx.font = '10px "Fira Code Variable", monospace';
  const maxLabelWidth = ctx.measureText(maxMbps.toFixed(2)).width;
  const padLeft = Math.max(52, Math.ceil(maxLabelWidth) + 14);
  const padRight = 14;
  const padTop = 14;
  const padBottom = 22;
  const plotW = Math.max(20, width - padLeft - padRight);
  const plotH = Math.max(20, height - padTop - padBottom);

  // Horizontal grid lines & Y-axis labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const ratio = i / 4;
    const y = padTop + plotH * (1 - ratio);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + plotW, y);
    ctx.stroke();

    ctx.fillStyle = '#757575';
    const labelVal = (maxMbps * ratio).toFixed(2);
    ctx.fillText(labelVal, padLeft - 8, y);
  }

  if (samples.length < 2) {
    ctx.restore();
    return;
  }

  const maxT = Math.max(5, samples[samples.length - 1].tSec);
  const minT = samples[0].tSec;
  const spanT = Math.max(1, maxT - minT);

  const drawSeries = (
    pick: (s: ChartSample) => number,
    stroke: string,
    fillTop: string,
    fillBottom: string,
  ) => {
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBottom);

    ctx.beginPath();
    samples.forEach((s, idx) => {
      const x = padLeft + ((s.tSec - minT) / spanT) * plotW;
      const y = padTop + plotH - (Math.min(maxMbps, pick(s)) / maxMbps) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.shadowColor = stroke;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Area fill
    const lastX = padLeft + ((samples[samples.length - 1].tSec - minT) / spanT) * plotW;
    const firstX = padLeft + ((samples[0].tSec - minT) / spanT) * plotW;
    ctx.lineTo(lastX, padTop + plotH);
    ctx.lineTo(firstX, padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  };

  drawSeries(
    (s) => s.downloadMbps,
    '#00ffff',
    'rgba(0, 255, 255, 0.22)',
    'rgba(0, 255, 255, 0.0)',
  );
  drawSeries(
    (s) => s.uploadMbps,
    '#f3eb2c',
    'rgba(243, 235, 44, 0.20)',
    'rgba(243, 235, 44, 0.0)',
  );

  // X-axis time markers
  ctx.fillStyle = '#757575';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const t = minT + (spanT * i) / 4;
    const x = padLeft + (plotW * i) / 4;
    ctx.fillText(`${t.toFixed(0)}s`, x, padTop + plotH + 6);
  }

  ctx.restore();
}
