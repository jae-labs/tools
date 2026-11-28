import {
  ASPECT_PRESETS,
  FORMAT_META,
  buildExportFilename,
  clampCropRect,
  computeAspectLockedSize,
  computeCenteredCropForAspect,
  computeSavingsPercent,
  type AspectPresetId,
  type CropRect,
  type ImageExportFormat,
} from '../../shared/image.ts';
import { escapeHtml, showError } from './ui-helpers.ts';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function mountImageTool(controlsEl: HTMLElement, outputEl: HTMLElement): () => void {
  let sourceImage: HTMLImageElement | null = null;
  let sourceName = 'image.png';
  let sourceBytes = 0;
  let sourceW = 0;
  let sourceH = 0;

  let rotation = 0; // 0, 90, 180, 270
  let flipH = false;
  let flipV = false;
  let aspectId: AspectPresetId = 'free';
  let crop: CropRect = { x: 0, y: 0, w: 0, h: 0 };

  let outW = 0;
  let outH = 0;
  let lockAspect = true;
  let format: ImageExportFormat = 'image/webp';
  let quality = 85;
  let jpegBg = '#ffffff';

  let lastBlob: Blob | null = null;
  let exportSeq = 0;
  let exportDebounce: ReturnType<typeof setTimeout> | null = null;

  // Offscreen canvas holding the rotated/flipped working image
  const workCanvas = document.createElement('canvas');

  const rebuildWorkCanvas = () => {
    if (!sourceImage) return;
    const swapped = rotation === 90 || rotation === 270;
    sourceW = swapped ? sourceImage.naturalHeight : sourceImage.naturalWidth;
    sourceH = swapped ? sourceImage.naturalWidth : sourceImage.naturalHeight;

    workCanvas.width = sourceW;
    workCanvas.height = sourceH;
    const ctx = workCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, sourceW, sourceH);
    ctx.translate(sourceW / 2, sourceH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(sourceImage, -sourceImage.naturalWidth / 2, -sourceImage.naturalHeight / 2);
    ctx.restore();
  };

  const renderToExportBlob = async (): Promise<Blob | null> => {
    if (!sourceImage || crop.w <= 0 || crop.h <= 0 || outW <= 0 || outH <= 0) return null;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (format === 'image/jpeg') {
      ctx.fillStyle = jpegBg;
      ctx.fillRect(0, 0, outW, outH);
    }

    ctx.drawImage(workCanvas, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);

    return new Promise<Blob | null>((resolve) => {
      outCanvas.toBlob(
        (blob) => resolve(blob),
        format,
        FORMAT_META[format].lossy ? quality / 100 : undefined,
      );
    });
  };

  const updateExportStats = () => {
    if (exportDebounce) clearTimeout(exportDebounce);
    exportDebounce = setTimeout(() => {
      const seq = ++exportSeq;
      void renderToExportBlob().then((blob) => {
        if (seq !== exportSeq || !blob) return;
        lastBlob = blob;
        const sizeEl = document.getElementById('img-out-size');
        const savingsEl = document.getElementById('img-out-savings');
        const dlBtn = document.getElementById('img-download-btn') as HTMLButtonElement | null;
        if (sizeEl) sizeEl.textContent = formatBytes(blob.size);
        if (savingsEl) {
          const pct = computeSavingsPercent(sourceBytes, blob.size);
          savingsEl.textContent = pct >= 0 ? `-${pct}% smaller` : `+${Math.abs(pct)}% larger`;
          savingsEl.className = `font-fira text-xs font-bold ${pct >= 0 ? 'text-emerald-400' : 'text-amber-300'}`;
        }
        if (dlBtn) dlBtn.disabled = false;
      });
    }, 100);
  };

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showError(outputEl, 'Please select a valid image file (PNG, JPEG, WebP, GIF, AVIF, SVG).');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      sourceImage = img;
      sourceName = file.name || 'image.png';
      sourceBytes = file.size;
      rotation = 0;
      flipH = false;
      flipV = false;
      aspectId = 'free';
      rebuildWorkCanvas();
      crop = { x: 0, y: 0, w: sourceW, h: sourceH };
      outW = sourceW;
      outH = sourceH;
      renderEditor();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showError(outputEl, 'Failed to decode the selected image.');
    };
    img.src = url;
  };

  const onPaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          loadFile(file);
          break;
        }
      }
    }
  };
  window.addEventListener('paste', onPaste);

  const renderDropzone = () => {
    controlsEl.innerHTML = `
      <label
        id="img-dropzone"
        for="img-file-input"
        class="rounded-2xl border-2 border-dashed border-[#00ffff]/35 bg-[#05080c] hover:border-[#00ffff]/75 hover:bg-[#071018] transition-colors p-10 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer"
      >
        <span class="font-fira text-sm font-bold text-white">Drop an image here, click to browse, or press Ctrl/Cmd+V to paste</span>
        <span class="font-fira text-xs text-[#858585]">Supports PNG, JPEG, WebP, GIF, AVIF, SVG · 100% client-side (never uploaded)</span>
        <input id="img-file-input" type="file" accept="image/*" class="sr-only" />
      </label>
    `;
    outputEl.innerHTML = '';

    const fileInput = document.getElementById('img-file-input') as HTMLInputElement;
    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      if (f) loadFile(f);
    });

    const dz = document.getElementById('img-dropzone')!;
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('border-[#f3eb2c]');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('border-[#f3eb2c]'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('border-[#f3eb2c]');
      const f = e.dataTransfer?.files?.[0];
      if (f) loadFile(f);
    });
  };

  const renderEditor = () => {
    if (!sourceImage) {
      renderDropzone();
      return;
    }

    controlsEl.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Left: Interactive Crop Stage -->
        <div class="lg:col-span-7 flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-1">
              ${ASPECT_PRESETS.map(
                (p) => `
                  <button type="button" data-img-aspect="${p.id}" class="rounded-md px-2.5 py-1 font-fira text-[11px] cursor-pointer ${
                    aspectId === p.id
                      ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/50'
                      : 'text-[#888] hover:text-white border border-white/10 bg-[#050505]'
                  }">${p.label}</button>
                `,
              ).join('')}
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button id="img-rot-btn" type="button" class="rounded-md border border-white/10 bg-[#050505] px-2.5 py-1 font-fira text-[11px] text-[#ccc] hover:text-[#f3eb2c] cursor-pointer">Rotate 90°</button>
              <button id="img-fliph-btn" type="button" class="rounded-md border border-white/10 bg-[#050505] px-2.5 py-1 font-fira text-[11px] text-[#ccc] hover:text-[#f3eb2c] cursor-pointer">Flip H</button>
              <button id="img-flipv-btn" type="button" class="rounded-md border border-white/10 bg-[#050505] px-2.5 py-1 font-fira text-[11px] text-[#ccc] hover:text-[#f3eb2c] cursor-pointer">Flip V</button>
              <button id="img-reset-btn" type="button" class="rounded-md border border-white/10 bg-[#050505] px-2.5 py-1 font-fira text-[11px] text-[#888] hover:text-white cursor-pointer">Reset</button>
              <label class="rounded-md border border-white/15 bg-black px-2.5 py-1 font-fira text-[11px] text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer">
                Change Image
                <input id="img-replace-input" type="file" accept="image/*" class="sr-only" />
              </label>
            </div>
          </div>

          <div class="rounded-xl border border-white/15 bg-[#050505] color-checker p-3 flex items-center justify-center overflow-hidden">
            <div id="img-stage" class="relative inline-block select-none touch-none max-w-full">
              <canvas id="img-preview-canvas" class="block max-w-full max-h-[420px] rounded"></canvas>
              <div id="img-crop-box" class="absolute border-2 border-[#00ffff] shadow-[0_0_0_9999px_rgba(0,0,0,0.62)] cursor-move">
                <div class="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  <div class="border-r border-b border-white/20"></div>
                  <div class="border-r border-b border-white/20"></div>
                  <div class="border-b border-white/20"></div>
                  <div class="border-r border-b border-white/20"></div>
                  <div class="border-r border-b border-white/20"></div>
                  <div class="border-b border-white/20"></div>
                  <div class="border-r border-white/20"></div>
                  <div class="border-r border-white/20"></div>
                  <div></div>
                </div>
                <div data-handle="nw" class="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-[#f3eb2c] border-2 border-black cursor-nwse-resize"></div>
                <div data-handle="ne" class="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#f3eb2c] border-2 border-black cursor-nesw-resize"></div>
                <div data-handle="sw" class="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-[#f3eb2c] border-2 border-black cursor-nesw-resize"></div>
                <div data-handle="se" class="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-[#f3eb2c] border-2 border-black cursor-nwse-resize"></div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 font-fira text-[11px] text-[#888]">
            <span>Source: <strong class="text-white">${escapeHtml(sourceName)}</strong> (${sourceW}×${sourceH}, ${formatBytes(sourceBytes)})</span>
            <span id="img-crop-readout" class="text-[#00ffff]">Crop: ${crop.w}×${crop.h} @ (${crop.x}, ${crop.y})</span>
          </div>
        </div>

        <!-- Right: Resize & Export Controls -->
        <div class="lg:col-span-5 flex flex-col gap-4">
          <!-- Resize -->
          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Output Dimensions (px)</span>
              <label class="inline-flex items-center gap-1.5 font-fira text-[11px] text-[#ccc] cursor-pointer">
                <input id="img-lock-aspect" type="checkbox" ${lockAspect ? 'checked' : ''} class="accent-[#00ffff]" />
                <span>Lock ratio</span>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex flex-col gap-1">
                <span class="font-fira text-[10px] text-[#777]">Width</span>
                <input id="img-out-w" type="number" min="1" max="8192" value="${outW}" class="cyber-input !py-2 !text-sm text-center" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="font-fira text-[10px] text-[#777]">Height</span>
                <input id="img-out-h" type="number" min="1" max="8192" value="${outH}" class="cyber-input !py-2 !text-sm text-center" />
              </label>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${[100, 75, 50, 25]
                .map(
                  (pct) =>
                    `<button type="button" data-img-scale="${pct}" class="rounded border border-white/10 bg-black px-2.5 py-1 font-fira text-[10px] text-[#aaa] hover:text-[#00ffff] hover:border-[#00ffff]/45 cursor-pointer">${pct}%</button>`,
                )
                .join('')}
            </div>
          </div>

          <!-- Format & Compression -->
          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3.5">
            <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Format &amp; Compression</span>
            <div class="grid grid-cols-3 gap-1.5 rounded-lg border border-white/10 bg-black/80 p-1">
              ${(['image/webp', 'image/jpeg', 'image/png'] as const)
                .map(
                  (f) => `
                    <button type="button" data-img-format="${f}" class="rounded-md py-1.5 font-fira text-xs font-semibold cursor-pointer ${
                      format === f
                        ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/50'
                        : 'text-[#888] hover:text-white border border-transparent'
                    }">${FORMAT_META[f].label}</button>
                  `,
                )
                .join('')}
            </div>

            ${
              FORMAT_META[format].lossy
                ? `
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between font-fira text-xs">
                      <span class="text-[#aaa]">Quality</span>
                      <span id="img-quality-label" class="text-[#f3eb2c] font-bold">${quality}%</span>
                    </div>
                    <input id="img-quality-slider" type="range" min="10" max="100" value="${quality}" style="--slider-pct: ${((quality - 10) / 90) * 100}%" class="pw-range" />
                  </div>
                `
                : `<p class="font-fira text-[11px] text-[#888]">PNG uses lossless compression (preserves transparency).</p>`
            }

            ${
              format === 'image/jpeg'
                ? `
                  <label class="flex items-center justify-between font-fira text-xs text-[#aaa]">
                    <span>Transparent Matte Fill</span>
                    <input id="img-jpeg-bg" type="color" value="${jpegBg}" class="w-8 h-7 rounded border border-white/15 bg-transparent cursor-pointer" />
                  </label>
                `
                : ''
            }

            <div class="rounded-lg border border-white/8 bg-black/75 px-3.5 py-2.5 flex items-center justify-between">
              <div>
                <span class="block font-fira text-[9px] uppercase tracking-wider text-[#777]">Estimated Size</span>
                <span id="img-out-size" class="font-fira text-sm font-bold text-white">Calculating...</span>
              </div>
              <span id="img-out-savings" class="font-fira text-xs text-[#888]">--</span>
            </div>

            <button
              id="img-download-btn"
              type="button"
              class="w-full rounded-xl bg-[#f3eb2c] px-5 py-3 font-inter text-sm font-bold text-black shadow-[0_0_24px_rgba(243,235,44,0.22)] hover:bg-[#fbf36a] transition-colors cursor-pointer"
            >Download ${FORMAT_META[format].label}</button>
          </div>
        </div>
      </div>
    `;
    outputEl.innerHTML = '';

    // Draw working image onto preview canvas
    const previewCanvas = document.getElementById('img-preview-canvas') as HTMLCanvasElement;
    previewCanvas.width = sourceW;
    previewCanvas.height = sourceH;
    previewCanvas.getContext('2d')?.drawImage(workCanvas, 0, 0);

    const cropBox = document.getElementById('img-crop-box')!;
    const cropReadout = document.getElementById('img-crop-readout')!;
    const outWEl = document.getElementById('img-out-w') as HTMLInputElement;
    const outHEl = document.getElementById('img-out-h') as HTMLInputElement;

    const syncCropOverlay = (syncDims = false) => {
      cropBox.style.left = `${(crop.x / sourceW) * 100}%`;
      cropBox.style.top = `${(crop.y / sourceH) * 100}%`;
      cropBox.style.width = `${(crop.w / sourceW) * 100}%`;
      cropBox.style.height = `${(crop.h / sourceH) * 100}%`;
      cropReadout.textContent = `Crop: ${crop.w}×${crop.h} @ (${crop.x}, ${crop.y})`;
      if (syncDims) {
        outW = crop.w;
        outH = crop.h;
        outWEl.value = String(outW);
        outHEl.value = String(outH);
      }
      updateExportStats();
    };

    // Interactive drag / corner resize on cropBox
    let dragMode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | null = null;
    let startClientX = 0;
    let startClientY = 0;
    let startCrop: CropRect = { ...crop };

    const activeAspectRatio = () => ASPECT_PRESETS.find((p) => p.id === aspectId)?.ratio ?? null;

    cropBox.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      dragMode = (target.dataset.handle as typeof dragMode) ?? 'move';
      startClientX = e.clientX;
      startClientY = e.clientY;
      startCrop = { ...crop };
      cropBox.setPointerCapture(e.pointerId);
    });

    cropBox.addEventListener('pointermove', (e) => {
      if (!dragMode) return;
      const rect = previewCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const scaleX = sourceW / rect.width;
      const scaleY = sourceH / rect.height;
      const dx = (e.clientX - startClientX) * scaleX;
      const dy = (e.clientY - startClientY) * scaleY;
      const ratio = activeAspectRatio();

      if (dragMode === 'move') {
        crop = clampCropRect(
          { x: startCrop.x + dx, y: startCrop.y + dy, w: startCrop.w, h: startCrop.h },
          sourceW,
          sourceH,
        );
      } else {
        let { x, y, w, h } = startCrop;
        if (dragMode === 'se') {
          w = startCrop.w + dx;
          h = ratio ? w / ratio : startCrop.h + dy;
        } else if (dragMode === 'sw') {
          w = startCrop.w - dx;
          h = ratio ? w / ratio : startCrop.h + dy;
          x = startCrop.x + (startCrop.w - w);
        } else if (dragMode === 'ne') {
          w = startCrop.w + dx;
          h = ratio ? w / ratio : startCrop.h - dy;
          y = startCrop.y + (startCrop.h - h);
        } else if (dragMode === 'nw') {
          w = startCrop.w - dx;
          h = ratio ? w / ratio : startCrop.h - dy;
          x = startCrop.x + (startCrop.w - w);
          y = startCrop.y + (startCrop.h - h);
        }
        crop = clampCropRect({ x, y, w, h }, sourceW, sourceH);
      }
      syncCropOverlay(true);
    });

    const endDrag = (e: PointerEvent) => {
      dragMode = null;
      if (cropBox.hasPointerCapture(e.pointerId)) cropBox.releasePointerCapture(e.pointerId);
    };
    cropBox.addEventListener('pointerup', endDrag);
    cropBox.addEventListener('pointercancel', endDrag);

    // Aspect presets
    controlsEl.querySelectorAll<HTMLButtonElement>('[data-img-aspect]').forEach((btn) => {
      btn.addEventListener('click', () => {
        aspectId = btn.dataset.imgAspect as AspectPresetId;
        const ratio = activeAspectRatio();
        crop = computeCenteredCropForAspect(sourceW, sourceH, ratio);
        outW = crop.w;
        outH = crop.h;
        renderEditor();
      });
    });

    // Transforms
    document.getElementById('img-rot-btn')?.addEventListener('click', () => {
      rotation = (rotation + 90) % 360;
      rebuildWorkCanvas();
      crop = computeCenteredCropForAspect(sourceW, sourceH, activeAspectRatio());
      outW = crop.w;
      outH = crop.h;
      renderEditor();
    });
    document.getElementById('img-fliph-btn')?.addEventListener('click', () => {
      flipH = !flipH;
      rebuildWorkCanvas();
      renderEditor();
    });
    document.getElementById('img-flipv-btn')?.addEventListener('click', () => {
      flipV = !flipV;
      rebuildWorkCanvas();
      renderEditor();
    });
    document.getElementById('img-reset-btn')?.addEventListener('click', () => {
      rotation = 0;
      flipH = false;
      flipV = false;
      aspectId = 'free';
      rebuildWorkCanvas();
      crop = { x: 0, y: 0, w: sourceW, h: sourceH };
      outW = sourceW;
      outH = sourceH;
      renderEditor();
    });

    const replaceInput = document.getElementById('img-replace-input') as HTMLInputElement;
    replaceInput.addEventListener('change', () => {
      const f = replaceInput.files?.[0];
      if (f) loadFile(f);
    });

    // Resize controls
    const lockEl = document.getElementById('img-lock-aspect') as HTMLInputElement;
    lockEl.addEventListener('change', () => {
      lockAspect = lockEl.checked;
    });

    outWEl.addEventListener('input', () => {
      const next = computeAspectLockedSize(crop.w, crop.h, Number(outWEl.value), 'w', lockAspect, outH);
      outW = next.w;
      outH = next.h;
      if (lockAspect) outHEl.value = String(outH);
      updateExportStats();
    });
    outHEl.addEventListener('input', () => {
      const next = computeAspectLockedSize(crop.w, crop.h, Number(outHEl.value), 'h', lockAspect, outW);
      outW = next.w;
      outH = next.h;
      if (lockAspect) outWEl.value = String(outW);
      updateExportStats();
    });

    controlsEl.querySelectorAll<HTMLButtonElement>('[data-img-scale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pct = Number(btn.dataset.imgScale) / 100;
        outW = Math.max(1, Math.round(crop.w * pct));
        outH = Math.max(1, Math.round(crop.h * pct));
        outWEl.value = String(outW);
        outHEl.value = String(outH);
        updateExportStats();
      });
    });

    // Format & quality
    controlsEl.querySelectorAll<HTMLButtonElement>('[data-img-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        format = btn.dataset.imgFormat as ImageExportFormat;
        renderEditor();
      });
    });

    const qSlider = document.getElementById('img-quality-slider') as HTMLInputElement | null;
    const qLabel = document.getElementById('img-quality-label');
    qSlider?.addEventListener('input', () => {
      quality = Number(qSlider.value);
      qSlider.style.setProperty('--slider-pct', `${((quality - 10) / 90) * 100}%`);
      if (qLabel) qLabel.textContent = `${quality}%`;
      updateExportStats();
    });

    const bgEl = document.getElementById('img-jpeg-bg') as HTMLInputElement | null;
    bgEl?.addEventListener('input', () => {
      jpegBg = bgEl.value;
      updateExportStats();
    });

    document.getElementById('img-download-btn')?.addEventListener('click', async () => {
      const blob = lastBlob ?? (await renderToExportBlob());
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildExportFilename(sourceName, outW, outH, format);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    syncCropOverlay(false);
  };

  renderDropzone();

  return () => {
    window.removeEventListener('paste', onPaste);
    if (exportDebounce) clearTimeout(exportDebounce);
  };
}
