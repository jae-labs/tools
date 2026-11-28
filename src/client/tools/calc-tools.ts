import {
  DEFAULT_PAINT_INPUTS,
  PAINT_FINISHES,
  calculatePaint,
  type PaintFinishId,
  type PaintInputs,
  type PaintLengthUnit,
  type PaintSurfaceMode,
} from '../../shared/paint.ts';
import { escapeHtml } from './ui-helpers.ts';

export function mountPaintTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const inputs: PaintInputs = { ...DEFAULT_PAINT_INPUTS };
  let pricePerLitre = 0;

  const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '0');

  const presets: Array<{ label: string; apply: Partial<PaintInputs> }> = [
    { label: 'Bedroom (4×3.5m)', apply: { mode: 'room', length: 4, width: 3.5, height: 2.4, unit: 'm', doors: 1, windows: 1 } },
    { label: 'Living Room (5.5×4.2m)', apply: { mode: 'room', length: 5.5, width: 4.2, height: 2.5, unit: 'm', doors: 2, windows: 2 } },
    { label: 'Hallway (6×1.5m)', apply: { mode: 'room', length: 6, width: 1.5, height: 2.4, unit: 'm', doors: 4, windows: 0 } },
    { label: 'Feature Wall (4×2.4m)', apply: { mode: 'wall', length: 4, width: 0, height: 2.4, unit: 'm', doors: 0, windows: 0 } },
  ];

  const renderOutput = () => {
    const res = calculatePaint(inputs);
    const optimalLabel =
      res.optimalTins.length > 0
        ? res.optimalTins.map((t) => `${t.count} × ${t.sizeLitres}L`).join(' + ')
        : '0 L';

    const estCost = pricePerLitre > 0 ? `€${fmt(res.optimalTotalLitres * pricePerLitre, 2)}` : '--';

    outputEl.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="rounded-xl border border-[#f3eb2c]/40 bg-[#f3eb2c]/8 p-4">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#aaa]">Paint Needed</p>
          <p class="mt-1 font-fira text-2xl font-black text-[#f3eb2c]">${fmt(res.totalLitres, 2)} L</p>
          <p class="font-fira text-[10px] text-[#888]">Base (0% waste): ${fmt(res.baseLitres, 2)} L</p>
        </div>
        <div class="rounded-xl border border-[#00ffff]/35 bg-[#050505] p-4">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Recommended Tins</p>
          <p class="mt-1 font-fira text-base font-bold text-[#00ffff]">${escapeHtml(optimalLabel)}</p>
          <p class="font-fira text-[10px] text-[#888]">${fmt(res.optimalTotalLitres, 1)}L total · ${fmt(res.optimalLeftoverLitres, 2)}L spare</p>
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] p-4">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Paintable Area</p>
          <p class="mt-1 font-fira text-lg font-bold text-white">${fmt(res.totalSurfaceAreaM2, 1)} m²</p>
          <p class="font-fira text-[10px] text-[#888]">${fmt(res.coatAreaM2, 1)} m² across ${inputs.coats} coat${inputs.coats === 1 ? '' : 's'}</p>
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] p-4">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Est. Cost</p>
          <p class="mt-1 font-fira text-lg font-bold text-emerald-400">${estCost}</p>
          <p class="font-fira text-[10px] text-[#888]">Coverage: ${res.coverageM2PerL} m²/L</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
        <div class="px-4 py-2.5 border-b border-white/10 bg-black/60 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Single-Size Tin Breakdown</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          ${res.tinBreakdowns
            .map(
              (b) => `
                <div class="p-4 flex flex-col gap-1">
                  <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">${b.label}</span>
                  <span class="font-fira text-2xl font-black text-white">${b.tinsNeeded}</span>
                  <span class="font-fira text-[10px] text-[#777]">${fmt(b.totalLitresBought, 1)}L (${fmt(b.leftoverLitres, 2)}L spare)</span>
                </div>
              `,
            )
            .join('')}
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 border-t border-white/10 bg-black/40 font-fira text-[11px] text-[#858585]">
          <span>Walls: <strong class="text-white">${fmt(res.netWallAreaM2, 1)} m²</strong> (${fmt(res.wallLitres, 2)} L)</span>
          ${inputs.includeCeiling && inputs.mode === 'room' ? `<span>Ceiling: <strong class="text-[#00ffff]">${fmt(res.ceilingAreaM2, 1)} m²</strong> (${fmt(res.ceilingLitres, 2)} L)</span>` : ''}
          <span>Deducted: <strong class="text-amber-300">-${fmt(res.deductionAreaM2, 1)} m²</strong></span>
          <span>Imperial: <strong class="text-white">${fmt(res.totalSurfaceAreaFt2, 0)} ft²</strong></span>
        </div>
      </div>
    `;
  };

  const renderControls = () => {
    controlsEl.innerHTML = `
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex rounded-lg border border-white/10 bg-black/80 p-1 gap-1">
            <button type="button" data-paint-mode="room" class="rounded-md px-3.5 py-1.5 font-fira text-xs font-semibold cursor-pointer ${inputs.mode === 'room' ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/50' : 'text-[#888] hover:text-white border border-transparent'}">Room (4 Walls)</button>
            <button type="button" data-paint-mode="wall" class="rounded-md px-3.5 py-1.5 font-fira text-xs font-semibold cursor-pointer ${inputs.mode === 'wall' ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/50' : 'text-[#888] hover:text-white border border-transparent'}">Single Wall</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${presets
              .map(
                (p, idx) =>
                  `<button type="button" data-paint-preset="${idx}" class="rounded-md border border-white/10 bg-[#050505] px-2.5 py-1 font-fira text-[11px] text-[#aaa] hover:text-[#f3eb2c] hover:border-[#f3eb2c]/45 cursor-pointer">${escapeHtml(p.label)}</button>`,
              )
              .join('')}
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label class="flex flex-col gap-1">
            <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">${inputs.mode === 'room' ? 'Room Length' : 'Wall Width'}</span>
            <input id="paint-length" type="number" step="0.1" min="0" value="${inputs.length}" class="cyber-input !py-2 !text-sm" />
          </label>
          ${
            inputs.mode === 'room'
              ? `
                <label class="flex flex-col gap-1">
                  <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Room Width</span>
                  <input id="paint-width" type="number" step="0.1" min="0" value="${inputs.width}" class="cyber-input !py-2 !text-sm" />
                </label>
              `
              : ''
          }
          <label class="flex flex-col gap-1">
            <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Wall Height</span>
            <input id="paint-height" type="number" step="0.1" min="0" value="${inputs.height}" class="cyber-input !py-2 !text-sm" />
          </label>
          <label class="flex flex-col gap-1">
            <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Unit</span>
            <select id="paint-unit" class="cyber-select !py-2 !text-sm">
              <option value="m" ${inputs.unit === 'm' ? 'selected' : ''}>Metres (m)</option>
              <option value="cm" ${inputs.unit === 'cm' ? 'selected' : ''}>Centimetres (cm)</option>
              <option value="ft" ${inputs.unit === 'ft' ? 'selected' : ''}>Feet (ft)</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label class="flex flex-col gap-1 sm:col-span-2">
            <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Paint Type / Finish</span>
            <select id="paint-finish" class="cyber-select !py-2 !text-xs">
              ${PAINT_FINISHES.map((f) => `<option value="${f.id}" ${f.id === inputs.finish ? 'selected' : ''}>${escapeHtml(f.label)} (${f.coverageM2PerLitre} m²/L)</option>`).join('')}
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Coats</span>
            <select id="paint-coats" class="cyber-select !py-2 !text-sm">
              ${[1, 2, 3, 4].map((c) => `<option value="${c}" ${c === inputs.coats ? 'selected' : ''}>${c} coat${c === 1 ? '' : 's'}</option>`).join('')}
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Wastage Buffer</span>
            <select id="paint-buffer" class="cyber-select !py-2 !text-sm">
              ${[0, 5, 10, 15, 20].map((b) => `<option value="${b}" ${b === inputs.bufferPercent ? 'selected' : ''}>${b}%</option>`).join('')}
            </select>
          </label>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <label class="flex flex-col gap-1">
            <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Doors (1.89 m²)</span>
            <input id="paint-doors" type="number" min="0" max="20" value="${inputs.doors}" class="cyber-input !py-2 !text-sm text-center" />
          </label>
          <label class="flex flex-col gap-1">
            <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Windows (1.44 m²)</span>
            <input id="paint-windows" type="number" min="0" max="20" value="${inputs.windows}" class="cyber-input !py-2 !text-sm text-center" />
          </label>
          ${
            inputs.finish === 'custom'
              ? `
                <label class="flex flex-col gap-1">
                  <span class="font-fira text-[10px] uppercase tracking-wider text-[#00ffff]">Coverage (m²/L)</span>
                  <input id="paint-custom-cov" type="number" step="0.5" min="1" value="${inputs.customCoverageM2PerL}" class="cyber-input !py-2 !text-sm text-center" />
                </label>
              `
              : `
                <label class="flex flex-col gap-1">
                  <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">Price (€ / L, opt.)</span>
                  <input id="paint-price" type="number" step="0.5" min="0" value="${pricePerLitre || ''}" placeholder="e.g. 12" class="cyber-input !py-2 !text-sm text-center" />
                </label>
              `
          }
          ${
            inputs.mode === 'room'
              ? `
                <label class="inline-flex items-center gap-2 font-fira text-xs text-white pb-2.5 cursor-pointer">
                  <input id="paint-ceiling" type="checkbox" ${inputs.includeCeiling ? 'checked' : ''} class="w-4 h-4 accent-[#00ffff]" />
                  <span>Include Ceiling</span>
                </label>
              `
              : ''
          }
        </div>
      </div>
    `;

    controlsEl.querySelectorAll<HTMLButtonElement>('[data-paint-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        inputs.mode = btn.dataset.paintMode as PaintSurfaceMode;
        renderControls();
        renderOutput();
      });
    });

    controlsEl.querySelectorAll<HTMLButtonElement>('[data-paint-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = presets[Number(btn.dataset.paintPreset)];
        if (!p) return;
        Object.assign(inputs, p.apply);
        renderControls();
        renderOutput();
      });
    });

    const bindNum = (id: string, setter: (v: number) => void) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.addEventListener('input', () => {
        setter(Number(el.value) || 0);
        renderOutput();
      });
    };

    bindNum('paint-length', (v) => { inputs.length = v; });
    bindNum('paint-width', (v) => { inputs.width = v; });
    bindNum('paint-height', (v) => { inputs.height = v; });
    bindNum('paint-doors', (v) => { inputs.doors = v; });
    bindNum('paint-windows', (v) => { inputs.windows = v; });
    bindNum('paint-custom-cov', (v) => { inputs.customCoverageM2PerL = v; });
    bindNum('paint-price', (v) => { pricePerLitre = v; });

    document.getElementById('paint-unit')?.addEventListener('change', (e) => {
      inputs.unit = (e.currentTarget as HTMLSelectElement).value as PaintLengthUnit;
      renderOutput();
    });
    document.getElementById('paint-finish')?.addEventListener('change', (e) => {
      inputs.finish = (e.currentTarget as HTMLSelectElement).value as PaintFinishId;
      renderControls();
      renderOutput();
    });
    document.getElementById('paint-coats')?.addEventListener('change', (e) => {
      inputs.coats = Number((e.currentTarget as HTMLSelectElement).value) || 2;
      renderOutput();
    });
    document.getElementById('paint-buffer')?.addEventListener('change', (e) => {
      inputs.bufferPercent = Number((e.currentTarget as HTMLSelectElement).value) || 0;
      renderOutput();
    });
    document.getElementById('paint-ceiling')?.addEventListener('change', (e) => {
      inputs.includeCeiling = (e.currentTarget as HTMLInputElement).checked;
      renderOutput();
    });
  };

  renderControls();
  renderOutput();
}
