import type { MacLookupResult, VendorSearchResult } from '../../server/tools/mac.ts';
import { apiGet, copyText, escapeHtml, showError, showLoading } from './ui-helpers.ts';

export function mountMacTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let mode: 'mac' | 'vendor' | 'bulk' = 'mac';

  const renderControls = () => {
    const tabs: Array<{ id: typeof mode; label: string }> = [
      { id: 'mac', label: 'MAC / OUI Lookup' },
      { id: 'vendor', label: 'Vendor Search' },
      { id: 'bulk', label: 'Bulk / ARP Table' },
    ];

    const bodyHtml =
      mode === 'mac'
        ? `
          <form id="mac-single-form" class="flex flex-col sm:flex-row gap-3">
            <input
              id="tool-primary-input"
              type="text"
              value="00:00:0C:12:34:56"
              placeholder="MAC or OUI (e.g. 00:1A:2B:3C:4D:5E, 001a.2b3c.4d5e)"
              autocomplete="off"
              spellcheck="false"
              class="cyber-input flex-1"
            />
            <button type="submit" class="rounded-lg bg-[#f3eb2c] px-5 py-2.5 font-fira text-xs font-bold uppercase tracking-wider text-black hover:bg-[#fbf36a] transition-colors cursor-pointer shrink-0">Lookup MAC</button>
          </form>
        `
        : mode === 'vendor'
          ? `
            <form id="mac-vendor-form" class="flex flex-col sm:flex-row gap-3">
              <input
                id="mac-vendor-input"
                type="text"
                value="Raspberry Pi"
                placeholder="Vendor name (e.g. Apple, Cisco, Ubiquiti, Espressif)"
                autocomplete="off"
                spellcheck="false"
                class="cyber-input flex-1"
              />
              <button type="submit" class="rounded-lg bg-[#f3eb2c] px-5 py-2.5 font-fira text-xs font-bold uppercase tracking-wider text-black hover:bg-[#fbf36a] transition-colors cursor-pointer shrink-0">Search Vendors</button>
            </form>
          `
          : `
            <form id="mac-bulk-form" class="flex flex-col gap-3">
              <textarea
                id="mac-bulk-input"
                rows="5"
                spellcheck="false"
                placeholder="Paste a list of MACs or raw arp -a output..."
                class="cyber-input font-fira text-xs resize-y"
              >? (192.168.1.1) at 00:00:0c:12:34:56 on en0
? (192.168.1.42) at b8:27:eb:11:22:33 on en0
? (192.168.1.99) at 02:42:ac:11:00:02 on docker0</textarea>
              <button type="submit" class="self-start rounded-lg bg-[#f3eb2c] px-5 py-2.5 font-fira text-xs font-bold uppercase tracking-wider text-black hover:bg-[#fbf36a] transition-colors cursor-pointer">Resolve All MACs</button>
            </form>
          `;

    controlsEl.innerHTML = `
      <div class="flex flex-col gap-4">
        <div role="tablist" class="inline-flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1.5 self-start">
          ${tabs
            .map(
              (t) => `
                <button
                  type="button"
                  role="tab"
                  data-mac-mode="${t.id}"
                  aria-selected="${mode === t.id ? 'true' : 'false'}"
                  class="rounded-lg px-3.5 py-1.5 font-fira text-xs font-semibold cursor-pointer ${
                    mode === t.id
                      ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/50'
                      : 'text-[#888] hover:text-white border border-transparent'
                  }"
                >${t.label}</button>
              `,
            )
            .join('')}
        </div>
        ${bodyHtml}
      </div>
    `;

    controlsEl.querySelectorAll<HTMLButtonElement>('[data-mac-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.macMode as typeof mode;
        if (next === mode) return;
        mode = next;
        outputEl.innerHTML = '';
        renderControls();
        if (mode === 'mac') void runSingle();
        else if (mode === 'vendor') void runVendor();
        else void runBulk();
      });
    });

    document.getElementById('mac-single-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void runSingle();
    });
    document.getElementById('mac-vendor-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void runVendor();
    });
    document.getElementById('mac-bulk-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void runBulk();
    });
  };

  const runSingle = async () => {
    const input = (document.getElementById('tool-primary-input') as HTMLInputElement | null)?.value.trim() ?? '';
    if (!input) return;
    showLoading(outputEl, `Looking up OUI for ${input}...`);

    try {
      const data = await apiGet<MacLookupResult>(`/api/mac?mac=${encodeURIComponent(input)}`);
      const snippetEl = document.getElementById('cli-snippet');
      if (snippetEl) {
        snippetEl.textContent = `curl -s "${window.location.origin}/api/mac?mac=${encodeURIComponent(input)}"`;
      }

      const laaBadge = data.flags.locallyAdministered
        ? `<span class="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 font-fira text-[10px] font-bold uppercase text-amber-300">Locally Administered (Randomized / Virtual)</span>`
        : `<span class="rounded border border-emerald-500/40 bg-emerald-950/30 px-2 py-0.5 font-fira text-[10px] font-bold uppercase text-emerald-300">Universally Administered (IEEE Burned-in)</span>`;

      const castBadge = data.flags.multicast
        ? `<span class="rounded border border-[#f3eb2c]/40 bg-[#f3eb2c]/10 px-2 py-0.5 font-fira text-[10px] font-bold uppercase text-[#f3eb2c]">Multicast</span>`
        : `<span class="rounded border border-[#00ffff]/40 bg-[#00ffff]/10 px-2 py-0.5 font-fira text-[10px] font-bold uppercase text-[#00ffff]">Unicast</span>`;

      outputEl.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 sm:col-span-2">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Vendor / Organization</p>
            <p class="mt-1 font-fira text-base sm:text-lg font-bold ${data.found ? 'text-white' : 'text-amber-300'}">${escapeHtml(
              data.found
                ? (data.vendor ?? 'Unknown')
                : data.flags.locallyAdministered
                  ? 'Unregistered (Locally Administered / Private MAC)'
                  : 'No IEEE OUI match found',
            )}</p>
            ${data.address ? `<p class="mt-1 font-fira text-xs text-[#999]">${escapeHtml(data.address)}</p>` : ''}
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-4">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Country &amp; Block</p>
            <p class="mt-1 font-fira text-sm font-bold text-[#00ffff]">${escapeHtml(data.country ?? '--')}</p>
            <p class="mt-1 font-fira text-[11px] text-[#888]">${escapeHtml(data.blockType)}${data.prefixFormatted ? ` · ${escapeHtml(data.prefixFormatted)}` : ''}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          ${castBadge}
          ${laaBadge}
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          ${(
            [
              ['Colon', data.formats.colon],
              ['Hyphen', data.formats.hyphen],
              ['Cisco Dot', data.formats.cisco],
              ['Bare Hex', data.formats.bare],
            ] as const
          )
            .map(
              ([label, val]) => `
                <div class="rounded-lg border border-white/8 bg-black/75 px-3 py-2 flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <span class="block font-fira text-[9px] uppercase tracking-wider text-[#777]">${label}</span>
                    <code class="font-fira text-xs text-white select-all truncate block">${escapeHtml(val)}</code>
                  </div>
                  <button type="button" data-copy-mac="${escapeHtml(val)}" class="rounded border border-white/15 bg-[#050505] px-2 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer shrink-0">COPY</button>
                </div>
              `,
            )
            .join('')}
        </div>
      `;

      outputEl.querySelectorAll<HTMLButtonElement>('[data-copy-mac]').forEach((btn) => {
        btn.addEventListener('click', () => {
          void copyText(btn.dataset.copyMac ?? '', btn, 'COPY');
        });
      });
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'MAC lookup failed.');
    }
  };

  const runVendor = async () => {
    const query = (document.getElementById('mac-vendor-input') as HTMLInputElement | null)?.value.trim() ?? '';
    if (!query) return;
    showLoading(outputEl, `Searching IEEE OUI registry for "${query}"...`);

    try {
      const data = await apiGet<VendorSearchResult>(`/api/mac?vendor=${encodeURIComponent(query)}&limit=60`);
      const snippetEl = document.getElementById('cli-snippet');
      if (snippetEl) {
        snippetEl.textContent = `curl -s "${window.location.origin}/api/mac?vendor=${encodeURIComponent(query)}"`;
      }

      outputEl.innerHTML = `
        <div class="font-fira text-xs text-[#888]">
          Found <strong class="text-[#00ffff]">${data.totalMatches.toLocaleString()}</strong> OUI blocks across ${data.databaseSize.toLocaleString()} IEEE entries${data.truncated ? ` (showing first ${data.results.length})` : ''}.
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto max-h-[420px] overflow-y-auto">
          <table class="w-full text-left font-fira text-xs">
            <thead class="border-b border-white/10 bg-black/60 text-[10px] uppercase tracking-wider text-[#858585]">
              <tr><th class="px-4 py-2.5">Prefix</th><th class="px-4 py-2.5">Block</th><th class="px-4 py-2.5">Vendor</th><th class="px-4 py-2.5">Country</th></tr>
            </thead>
            <tbody class="divide-y divide-white/8">
              ${
                data.results.length > 0
                  ? data.results
                      .map(
                        (r) => `
                          <tr class="hover:bg-white/[0.02]">
                            <td class="px-4 py-2 text-[#f3eb2c] font-bold whitespace-nowrap">${escapeHtml(r.prefixFormatted)}</td>
                            <td class="px-4 py-2 text-[#00ffff] whitespace-nowrap">${escapeHtml(r.blockType)}</td>
                            <td class="px-4 py-2 text-white">${escapeHtml(r.vendor)}</td>
                            <td class="px-4 py-2 text-[#aaa]">${escapeHtml(r.country ?? '--')}</td>
                          </tr>
                        `,
                      )
                      .join('')
                  : `<tr><td colspan="4" class="px-4 py-6 text-center text-[#777]">No matching vendors found.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'Vendor search failed.');
    }
  };

  const runBulk = async () => {
    const text = (document.getElementById('mac-bulk-input') as HTMLTextAreaElement | null)?.value ?? '';
    if (!text.trim()) return;
    showLoading(outputEl, 'Extracting and resolving MAC addresses...');

    try {
      const data = await apiGet<{ count: number; results: MacLookupResult[] }>(
        `/api/mac?bulk=${encodeURIComponent(text)}`,
      );
      outputEl.innerHTML = `
        <div class="font-fira text-xs text-[#888]">
          Resolved <strong class="text-[#00ffff]">${data.count}</strong> unique MAC address${data.count === 1 ? '' : 'es'}.
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
          <table class="w-full text-left font-fira text-xs">
            <thead class="border-b border-white/10 bg-black/60 text-[10px] uppercase tracking-wider text-[#858585]">
              <tr><th class="px-4 py-2.5">MAC</th><th class="px-4 py-2.5">Vendor</th><th class="px-4 py-2.5">Type</th><th class="px-4 py-2.5">Country</th></tr>
            </thead>
            <tbody class="divide-y divide-white/8">
              ${
                data.results.length > 0
                  ? data.results
                      .map(
                        (r) => `
                          <tr class="hover:bg-white/[0.02]">
                            <td class="px-4 py-2 text-[#f3eb2c] font-semibold whitespace-nowrap">${escapeHtml(r.formats.colon)}</td>
                            <td class="px-4 py-2 text-white">${escapeHtml(r.vendor ?? (r.flags.locallyAdministered ? 'Locally Administered (LAA)' : 'Unknown'))}</td>
                            <td class="px-4 py-2 text-[#00ffff] whitespace-nowrap">${r.flags.locallyAdministered ? 'LAA / Random' : r.blockType}</td>
                            <td class="px-4 py-2 text-[#aaa]">${escapeHtml(r.country ?? '--')}</td>
                          </tr>
                        `,
                      )
                      .join('')
                  : `<tr><td colspan="4" class="px-4 py-6 text-center text-[#777]">No MAC addresses detected in input.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'Bulk MAC lookup failed.');
    }
  };

  renderControls();
  void runSingle();
}
