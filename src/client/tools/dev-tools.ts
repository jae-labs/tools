import {
  buildChmodCommands,
  buildSetfaclCommands,
  formatChmod,
  parseChmodOctal,
  parseChmodSymbolic,
  type AclRule,
  type ChmodState,
} from '../../shared/chmod.ts';
import { convertDataFormat, type DataFormat } from '../../shared/dataconvert.ts';
import { computeLineDiff } from '../../shared/diff.ts';
import {
  decodeHexUtf8,
  decodeHtmlEntities,
  encodeHexUtf8,
  encodeHtmlEntities,
} from '../../shared/encoders.ts';
import { decodeIdTimestamp, generateIds, type IdKind } from '../../shared/idgen.ts';
import { buildMarkdownTable, renderMarkdownToHtml, type TableAlign } from '../../shared/markdown.ts';
import { copyText, escapeHtml, showError } from './ui-helpers.ts';

// --- 1. Text & JSON Diff Checker ---
export function mountDiffTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const sampleA = JSON.stringify({ service: 'tools', version: 1, features: ['ping', 'dns'] }, null, 2);
  const sampleB = JSON.stringify({ service: 'tools', version: 2, features: ['ping', 'dns', 'jwt'] }, null, 2);

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <label class="inline-flex items-center gap-2 font-fira text-xs text-[#ccc] cursor-pointer">
          <input id="diff-json-mode" type="checkbox" class="accent-[#00ffff]" />
          <span>Format &amp; Sort JSON first</span>
        </label>
        <label class="inline-flex items-center gap-2 font-fira text-xs text-[#ccc] cursor-pointer">
          <input id="diff-ignore-ws" type="checkbox" class="accent-[#00ffff]" />
          <span>Ignore whitespace</span>
        </label>
        <button id="diff-swap-btn" type="button" class="ml-auto rounded-lg border border-white/15 bg-black px-3 py-1 font-fira text-[11px] text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer">Swap A ↔ B</button>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label for="diff-left" class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Original (A)</label>
          <textarea id="diff-left" rows="7" spellcheck="false" class="cyber-input font-fira text-xs resize-y">${escapeHtml(sampleA)}</textarea>
        </div>
        <div class="flex flex-col gap-1">
          <label for="diff-right" class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Modified (B)</label>
          <textarea id="diff-right" rows="7" spellcheck="false" class="cyber-input font-fira text-xs resize-y">${escapeHtml(sampleB)}</textarea>
        </div>
      </div>
    </div>
  `;

  const leftEl = document.getElementById('diff-left') as HTMLTextAreaElement;
  const rightEl = document.getElementById('diff-right') as HTMLTextAreaElement;
  const jsonEl = document.getElementById('diff-json-mode') as HTMLInputElement;
  const wsEl = document.getElementById('diff-ignore-ws') as HTMLInputElement;

  const render = () => {
    try {
      const res = computeLineDiff(leftEl.value, rightEl.value, {
        jsonMode: jsonEl.checked,
        ignoreWhitespace: wsEl.checked,
      });

      const rowsHtml = res.lines
        .map((line) => {
          const bg =
            line.kind === 'add'
              ? 'bg-emerald-950/40 text-emerald-200'
              : line.kind === 'remove'
                ? 'bg-rose-950/40 text-rose-200'
                : 'text-[#b5b5b5]';
          const prefix = line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' ';
          return `
            <div class="grid grid-cols-[44px_44px_20px_1fr] font-fira text-xs leading-relaxed ${bg}">
              <span class="px-2 text-right text-[#666] select-none border-r border-white/5">${line.oldLine ?? ''}</span>
              <span class="px-2 text-right text-[#666] select-none border-r border-white/5">${line.newLine ?? ''}</span>
              <span class="text-center font-bold select-none">${prefix}</span>
              <span class="px-2 whitespace-pre-wrap break-all">${escapeHtml(line.text)}</span>
            </div>
          `;
        })
        .join('');

      outputEl.innerHTML = `
        <div class="flex flex-wrap items-center gap-3 font-fira text-xs">
          <span class="rounded border border-emerald-500/35 bg-emerald-950/30 px-2.5 py-0.5 text-emerald-300">+${res.added} added</span>
          <span class="rounded border border-rose-500/35 bg-rose-950/30 px-2.5 py-0.5 text-rose-300">-${res.removed} removed</span>
          <span class="rounded border border-white/10 bg-white/5 px-2.5 py-0.5 text-[#aaa]">${res.unchanged} unchanged</span>
          ${res.identical ? '<span class="text-[#00ffff] font-bold">Inputs are identical</span>' : ''}
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden max-h-[420px] overflow-y-auto">
          ${rowsHtml}
        </div>
      `;
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'Diff failed.');
    }
  };

  [leftEl, rightEl, jsonEl, wsEl].forEach((el) => el.addEventListener('input', render));
  document.getElementById('diff-swap-btn')?.addEventListener('click', () => {
    const tmp = leftEl.value;
    leftEl.value = rightEl.value;
    rightEl.value = tmp;
    render();
  });

  render();
}

// --- 2. UUID / ULID / NanoID Generator ---
export function mountUuidTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let kind: IdKind = 'uuidv7';
  let count = 5;
  let nanoLen = 21;
  let ids = generateIds(kind, count, nanoLen);

  const renderAll = () => {
    const tabs: Array<{ id: IdKind; label: string }> = [
      { id: 'uuidv4', label: 'UUID v4' },
      { id: 'uuidv7', label: 'UUID v7' },
      { id: 'ulid', label: 'ULID' },
      { id: 'nanoid', label: 'NanoID' },
    ];

    controlsEl.innerHTML = `
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <div class="inline-flex rounded-lg border border-white/10 bg-black/80 p-1 gap-1">
            ${tabs
              .map(
                (t) => `
                  <button type="button" data-id-kind="${t.id}" class="rounded-md px-3 py-1.5 font-fira text-xs font-semibold cursor-pointer ${
                    kind === t.id
                      ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45'
                      : 'text-[#888] hover:text-white border border-transparent'
                  }">${t.label}</button>
                `,
              )
              .join('')}
          </div>

          <label class="inline-flex items-center gap-2 font-fira text-xs text-[#aaa]">
            <span>Count</span>
            <input id="id-count-input" type="number" min="1" max="100" value="${count}" class="cyber-input !w-20 !py-1.5 !text-xs text-center" />
          </label>

          ${
            kind === 'nanoid'
              ? `<label class="inline-flex items-center gap-2 font-fira text-xs text-[#aaa]"><span>Length</span><input id="id-nano-len" type="number" min="4" max="64" value="${nanoLen}" class="cyber-input !w-20 !py-1.5 !text-xs text-center" /></label>`
              : ''
          }

          <button id="id-regen-btn" type="button" class="ml-auto rounded-lg bg-[#f3eb2c] px-4 py-2 font-fira text-xs font-bold uppercase tracking-wider text-black hover:bg-[#fbf36a] cursor-pointer">Generate</button>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="id-decode-input" class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">UUIDv7 / ULID Timestamp Decoder</label>
          <input id="id-decode-input" type="text" placeholder="Paste any UUIDv7 or ULID to extract its embedded timestamp..." class="cyber-input !py-2 !text-xs" />
          <div id="id-decode-result" class="font-fira text-xs text-[#00ffff]"></div>
        </div>
      </div>
    `;

    outputEl.innerHTML = `
      <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/60">
          <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Generated ${kind.toUpperCase()} (${ids.length})</span>
          <button id="id-copy-all" type="button" class="rounded border border-white/15 bg-black px-2.5 py-1 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY ALL</button>
        </div>
        <div class="divide-y divide-white/8">
          ${ids
            .map(
              (id, idx) => `
                <div class="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
                  <code class="font-fira text-xs sm:text-sm text-white select-all break-all">${escapeHtml(id)}</code>
                  <button type="button" data-copy-id="${idx}" class="rounded border border-white/15 bg-black px-2 py-0.5 font-fira text-[10px] text-[#00ffff] cursor-pointer shrink-0">COPY</button>
                </div>
              `,
            )
            .join('')}
        </div>
      </div>
    `;

    controlsEl.querySelectorAll<HTMLButtonElement>('[data-id-kind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        kind = btn.dataset.idKind as IdKind;
        ids = generateIds(kind, count, nanoLen);
        renderAll();
      });
    });

    const countEl = document.getElementById('id-count-input') as HTMLInputElement;
    countEl.addEventListener('change', () => {
      count = Math.min(100, Math.max(1, Number(countEl.value) || 5));
      ids = generateIds(kind, count, nanoLen);
      renderAll();
    });

    const nanoEl = document.getElementById('id-nano-len') as HTMLInputElement | null;
    nanoEl?.addEventListener('change', () => {
      nanoLen = Math.min(64, Math.max(4, Number(nanoEl.value) || 21));
      ids = generateIds(kind, count, nanoLen);
      renderAll();
    });

    document.getElementById('id-regen-btn')?.addEventListener('click', () => {
      ids = generateIds(kind, count, nanoLen);
      renderAll();
    });

    const decodeInput = document.getElementById('id-decode-input') as HTMLInputElement;
    const decodeOut = document.getElementById('id-decode-result')!;
    decodeInput.addEventListener('input', () => {
      const val = decodeInput.value.trim();
      if (!val) {
        decodeOut.textContent = '';
        return;
      }
      const decoded = decodeIdTimestamp(val);
      decodeOut.textContent = decoded
        ? `${decoded.kind.toUpperCase()} Timestamp: ${decoded.iso} (${decoded.timestampMs} ms)`
        : 'Not a valid UUIDv7 or ULID.';
    });

    document.getElementById('id-copy-all')?.addEventListener('click', (e) => {
      void copyText(ids.join('\n'), e.currentTarget as HTMLElement, 'COPY ALL');
    });

    outputEl.querySelectorAll<HTMLButtonElement>('[data-copy-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = ids[Number(btn.dataset.copyId)];
        if (id) void copyText(id, btn, 'COPY');
      });
    });
  };

  renderAll();
}

// --- 3. Chmod / Unix Permissions Calculator ---
export function mountChmodTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let subTab: 'mode' | 'acl' | 'attrs' = 'mode';
  let state: ChmodState = parseChmodOctal('755')!;
  let targetPath = 'script.sh';
  let recursive = false;
  let smartX = false;

  let aclPath = '/var/www/app';
  let aclRecursive = true;
  let aclDefault = false;
  let aclRules: AclRule[] = [
    { scope: 'u', name: 'www-data', read: true, write: true, execute: true },
    { scope: 'g', name: 'deploy', read: true, write: false, execute: true },
  ];

  let attrPath = '/path/to/file';

  const renderTabBar = () => `
    <div role="tablist" class="inline-flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1.5 self-start">
      ${(
        [
          ['mode', 'Mode & Special Bits'],
          ['acl', 'POSIX ACL (setfacl)'],
          ['attrs', 'xattr / chattr / setcap'],
        ] as const
      )
        .map(
          ([id, label]) => `
            <button type="button" role="tab" data-chmod-tab="${id}" class="rounded-lg px-3.5 py-1.5 font-fira text-xs font-semibold cursor-pointer ${
              subTab === id
                ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/50'
                : 'text-[#888] hover:text-white border border-transparent'
            }">${label}</button>
          `,
        )
        .join('')}
    </div>
  `;

  const bindTabBar = () => {
    controlsEl.querySelectorAll<HTMLButtonElement>('[data-chmod-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        subTab = btn.dataset.chmodTab as typeof subTab;
        render();
      });
    });
  };

  const render = () => {
    if (subTab === 'mode') {
      const summary = formatChmod(state);
      const cmds = buildChmodCommands(state, { path: targetPath, recursive, smartX });

      const row = (role: 'owner' | 'group' | 'other', label: string) => {
        const t = state[role];
        return `
          <tr class="border-b border-white/8">
            <td class="px-4 py-3 font-fira text-xs font-bold text-white">${label}</td>
            <td class="px-4 py-3 text-center"><input type="checkbox" data-chmod="${role}.read" ${t.read ? 'checked' : ''} class="w-4 h-4 accent-[#00ffff] cursor-pointer" /></td>
            <td class="px-4 py-3 text-center"><input type="checkbox" data-chmod="${role}.write" ${t.write ? 'checked' : ''} class="w-4 h-4 accent-[#00ffff] cursor-pointer" /></td>
            <td class="px-4 py-3 text-center"><input type="checkbox" data-chmod="${role}.execute" ${t.execute ? 'checked' : ''} class="w-4 h-4 accent-[#00ffff] cursor-pointer" /></td>
          </tr>
        `;
      };

      controlsEl.innerHTML = `
        <div class="flex flex-col gap-4">
          ${renderTabBar()}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label class="flex flex-col gap-1">
              <span class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Octal (e.g. 755, 4755)</span>
              <input id="tool-primary-input" type="text" value="${summary.octal4.startsWith('0') ? summary.octal3 : summary.octal4}" class="cyber-input !py-2 !text-sm" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Symbolic (e.g. rwsr-xr-x)</span>
              <input id="chmod-sym-input" type="text" value="${summary.symbolic}" class="cyber-input !py-2 !text-sm" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Target Path</span>
              <input id="chmod-path-input" type="text" value="${escapeHtml(targetPath)}" class="cyber-input !py-2 !text-sm" />
            </label>
          </div>

          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="border-b border-white/10 bg-black/60 font-fira text-[10px] uppercase tracking-[0.16em] text-[#00ffff]">
                  <th class="px-4 py-2.5 text-left">Scope</th>
                  <th class="px-4 py-2.5 text-center">Read (4)</th>
                  <th class="px-4 py-2.5 text-center">Write (2)</th>
                  <th class="px-4 py-2.5 text-center">Execute (1)</th>
                </tr>
              </thead>
              <tbody>
                ${row('owner', 'Owner (u)')}
                ${row('group', 'Group (g)')}
                ${row('other', 'Public (o)')}
              </tbody>
            </table>
            <div class="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-black/40 font-fira text-xs text-[#ccc]">
              <div class="flex flex-wrap items-center gap-5">
                <label class="inline-flex items-center gap-2 cursor-pointer" title="Run executable as file owner"><input type="checkbox" data-chmod-special="setuid" ${state.setuid ? 'checked' : ''} class="accent-[#f3eb2c]" /><span>Setuid (4000)</span></label>
                <label class="inline-flex items-center gap-2 cursor-pointer" title="Inherit directory group / run as group"><input type="checkbox" data-chmod-special="setgid" ${state.setgid ? 'checked' : ''} class="accent-[#f3eb2c]" /><span>Setgid (2000)</span></label>
                <label class="inline-flex items-center gap-2 cursor-pointer" title="Restrict deletion in shared dirs (/tmp)"><input type="checkbox" data-chmod-special="sticky" ${state.sticky ? 'checked' : ''} class="accent-[#f3eb2c]" /><span>Sticky (1000)</span></label>
              </div>
              <div class="flex flex-wrap items-center gap-5">
                <label class="inline-flex items-center gap-2 cursor-pointer"><input id="chmod-rec" type="checkbox" ${recursive ? 'checked' : ''} class="accent-[#00ffff]" /><span>Recursive (-R)</span></label>
                <label class="inline-flex items-center gap-2 cursor-pointer" title="Use capital X (execute on dirs/executables only)"><input id="chmod-smartx" type="checkbox" ${smartX ? 'checked' : ''} class="accent-[#00ffff]" /><span>Smart +X</span></label>
              </div>
            </div>
          </div>
        </div>
      `;

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Octal</p>
            <p class="mt-1 font-fira text-lg font-black text-[#f3eb2c]">${summary.octal4} <span class="text-xs text-[#888]">(${summary.octal3})</span></p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">File / Dir Mode</p>
            <p class="mt-1 font-fira text-sm font-bold text-[#00ffff]">${summary.fileSymbolic}</p>
            <p class="font-fira text-[11px] text-[#777]">${summary.dirSymbolic}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Umask (File / Dir)</p>
            <p class="mt-1 font-fira text-sm font-bold text-emerald-400">${summary.umaskFile} / ${summary.umaskDir}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Special Bits Note</p>
            <p class="mt-1 font-fira text-[11px] text-[#aaa]">Lowercase <code class="text-white">s/t</code> = with x; uppercase <code class="text-amber-300">S/T</code> = without x.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="block font-fira text-[9px] uppercase tracking-wider text-[#777]">Octal Command</span>
              <code class="font-fira text-xs text-white break-all select-all">${escapeHtml(cmds.octalCommand)}</code>
            </div>
            <button type="button" data-copy-cmd="${escapeHtml(cmds.octalCommand)}" class="rounded border border-white/15 bg-black px-2.5 py-1 font-fira text-[10px] text-[#f3eb2c] cursor-pointer shrink-0">COPY</button>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="block font-fira text-[9px] uppercase tracking-wider text-[#777]">Symbolic Command</span>
              <code class="font-fira text-xs text-[#00ffff] break-all select-all">${escapeHtml(cmds.symbolicCommand)}</code>
            </div>
            <button type="button" data-copy-cmd="${escapeHtml(cmds.symbolicCommand)}" class="rounded border border-white/15 bg-black px-2.5 py-1 font-fira text-[10px] text-[#f3eb2c] cursor-pointer shrink-0">COPY</button>
          </div>
        </div>
      `;

      bindTabBar();
      controlsEl.querySelectorAll<HTMLInputElement>('[data-chmod]').forEach((cb) => {
        cb.addEventListener('change', () => {
          const [role, bit] = (cb.dataset.chmod ?? '').split('.') as ['owner' | 'group' | 'other', 'read' | 'write' | 'execute'];
          state = { ...state, [role]: { ...state[role], [bit]: cb.checked } };
          render();
        });
      });
      controlsEl.querySelectorAll<HTMLInputElement>('[data-chmod-special]').forEach((cb) => {
        cb.addEventListener('change', () => {
          const key = cb.dataset.chmodSpecial as 'setuid' | 'setgid' | 'sticky';
          state = { ...state, [key]: cb.checked };
          render();
        });
      });
      document.getElementById('chmod-rec')?.addEventListener('change', (e) => {
        recursive = (e.currentTarget as HTMLInputElement).checked;
        render();
      });
      document.getElementById('chmod-smartx')?.addEventListener('change', (e) => {
        smartX = (e.currentTarget as HTMLInputElement).checked;
        render();
      });
      const pathEl = document.getElementById('chmod-path-input') as HTMLInputElement;
      pathEl.addEventListener('change', () => {
        targetPath = pathEl.value;
        render();
      });
      const octEl = document.getElementById('tool-primary-input') as HTMLInputElement;
      octEl.addEventListener('input', () => {
        const parsed = parseChmodOctal(octEl.value);
        if (parsed) {
          state = parsed;
          render();
        }
      });
      const symEl = document.getElementById('chmod-sym-input') as HTMLInputElement;
      symEl.addEventListener('input', () => {
        const parsed = parseChmodSymbolic(symEl.value);
        if (parsed) {
          state = parsed;
          render();
        }
      });
      outputEl.querySelectorAll<HTMLButtonElement>('[data-copy-cmd]').forEach((b) => {
        b.addEventListener('click', () => void copyText(b.dataset.copyCmd ?? '', b, 'COPY'));
      });
    } else if (subTab === 'acl') {
      const aclCmds = buildSetfaclCommands({
        path: aclPath,
        recursive: aclRecursive,
        defaultAcl: aclDefault,
        rules: aclRules,
      });

      controlsEl.innerHTML = `
        <div class="flex flex-col gap-4">
          ${renderTabBar()}
          <div class="flex flex-wrap items-end gap-3">
            <label class="flex flex-col gap-1 flex-1 min-w-[200px]">
              <span class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Target Path</span>
              <input id="acl-path" type="text" value="${escapeHtml(aclPath)}" class="cyber-input !py-2 !text-xs" />
            </label>
            <label class="inline-flex items-center gap-2 font-fira text-xs text-[#ccc] pb-2 cursor-pointer">
              <input id="acl-rec" type="checkbox" ${aclRecursive ? 'checked' : ''} class="accent-[#00ffff]" />
              <span>Recursive (-R)</span>
            </label>
            <label class="inline-flex items-center gap-2 font-fira text-xs text-[#ccc] pb-2 cursor-pointer" title="Default ACL inherited by new files in directory">
              <input id="acl-def" type="checkbox" ${aclDefault ? 'checked' : ''} class="accent-[#f3eb2c]" />
              <span>Default (-d)</span>
            </label>
            <button id="acl-add" type="button" class="rounded-lg border border-[#00ffff]/45 bg-[#00ffff]/10 px-3 py-2 font-fira text-xs text-[#00ffff] cursor-pointer">+ Add Rule</button>
          </div>

          <div class="flex flex-col gap-2">
            ${aclRules
              .map(
                (r, idx) => `
                  <div class="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#050505] p-3">
                    <select data-acl-scope="${idx}" class="cyber-select !py-1.5 !text-xs">
                      <option value="u" ${r.scope === 'u' ? 'selected' : ''}>User (u:)</option>
                      <option value="g" ${r.scope === 'g' ? 'selected' : ''}>Group (g:)</option>
                      <option value="m" ${r.scope === 'm' ? 'selected' : ''}>Mask (m::)</option>
                      <option value="o" ${r.scope === 'o' ? 'selected' : ''}>Other (o::)</option>
                    </select>
                    <input data-acl-name="${idx}" type="text" value="${escapeHtml(r.name)}" ${r.scope === 'm' || r.scope === 'o' ? 'disabled' : ''} placeholder="username / group" class="cyber-input !py-1.5 !text-xs flex-1 min-w-[140px] disabled:opacity-40" />
                    <label class="inline-flex items-center gap-1.5 font-fira text-xs text-white cursor-pointer"><input type="checkbox" data-acl-bit="${idx}.read" ${r.read ? 'checked' : ''} class="accent-[#00ffff]" />r</label>
                    <label class="inline-flex items-center gap-1.5 font-fira text-xs text-white cursor-pointer"><input type="checkbox" data-acl-bit="${idx}.write" ${r.write ? 'checked' : ''} class="accent-[#00ffff]" />w</label>
                    <label class="inline-flex items-center gap-1.5 font-fira text-xs text-white cursor-pointer"><input type="checkbox" data-acl-bit="${idx}.execute" ${r.execute ? 'checked' : ''} class="accent-[#00ffff]" />x</label>
                    <button type="button" data-acl-del="${idx}" class="rounded border border-white/10 bg-black px-2.5 py-1 font-fira text-[10px] text-[#888] hover:text-rose-400 cursor-pointer">Remove</button>
                  </div>
                `,
              )
              .join('')}
          </div>
        </div>
      `;

      outputEl.innerHTML = `
        <div class="flex flex-col gap-3">
          ${(
            [
              ['Apply ACL (setfacl)', aclCmds.apply, 'text-[#00ffff]'],
              ['Inspect ACLs (getfacl)', aclCmds.inspect, 'text-white'],
              ['Strip All ACLs', aclCmds.removeAll, 'text-amber-300'],
            ] as const
          )
            .map(
              ([label, cmd, color]) => `
                <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <span class="block font-fira text-[9px] uppercase tracking-wider text-[#777]">${label}</span>
                    <code class="font-fira text-xs ${color} break-all select-all">${escapeHtml(cmd)}</code>
                  </div>
                  <button type="button" data-copy-acl="${escapeHtml(cmd)}" class="rounded border border-white/15 bg-black px-2.5 py-1 font-fira text-[10px] text-[#f3eb2c] cursor-pointer shrink-0">COPY</button>
                </div>
              `,
            )
            .join('')}
        </div>
      `;

      bindTabBar();
      document.getElementById('acl-path')?.addEventListener('change', (e) => {
        aclPath = (e.currentTarget as HTMLInputElement).value;
        render();
      });
      document.getElementById('acl-rec')?.addEventListener('change', (e) => {
        aclRecursive = (e.currentTarget as HTMLInputElement).checked;
        render();
      });
      document.getElementById('acl-def')?.addEventListener('change', (e) => {
        aclDefault = (e.currentTarget as HTMLInputElement).checked;
        render();
      });
      document.getElementById('acl-add')?.addEventListener('click', () => {
        aclRules = [...aclRules, { scope: 'u', name: 'alice', read: true, write: false, execute: false }];
        render();
      });
      controlsEl.querySelectorAll<HTMLSelectElement>('[data-acl-scope]').forEach((sel) => {
        sel.addEventListener('change', () => {
          const i = Number(sel.dataset.aclScope);
          aclRules[i] = { ...aclRules[i]!, scope: sel.value as AclRule['scope'] };
          render();
        });
      });
      controlsEl.querySelectorAll<HTMLInputElement>('[data-acl-name]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const i = Number(inp.dataset.aclName);
          aclRules[i] = { ...aclRules[i]!, name: inp.value };
          render();
        });
      });
      controlsEl.querySelectorAll<HTMLInputElement>('[data-acl-bit]').forEach((cb) => {
        cb.addEventListener('change', () => {
          const [iStr, bit] = (cb.dataset.aclBit ?? '').split('.');
          const i = Number(iStr);
          aclRules[i] = { ...aclRules[i]!, [bit as 'read' | 'write' | 'execute']: cb.checked };
          render();
        });
      });
      controlsEl.querySelectorAll<HTMLButtonElement>('[data-acl-del]').forEach((btn) => {
        btn.addEventListener('click', () => {
          aclRules = aclRules.filter((_, i) => i !== Number(btn.dataset.aclDel));
          render();
        });
      });
      outputEl.querySelectorAll<HTMLButtonElement>('[data-copy-acl]').forEach((btn) => {
        btn.addEventListener('click', () => void copyText(btn.dataset.copyAcl ?? '', btn, 'COPY'));
      });
    } else {
      const p = attrPath.trim() || '/path/to/file';
      const snippets = [
        { group: 'Extended Attributes (macOS xattr)', label: 'List all extended attributes', cmd: `xattr -l ${p}` },
        { group: 'Extended Attributes (macOS xattr)', label: 'Remove Gatekeeper quarantine flag', cmd: `xattr -dr com.apple.quarantine ${p}` },
        { group: 'Extended Attributes (Linux)', label: 'Dump all Linux xattrs', cmd: `getfattr -d -m - ${p}` },
        { group: 'Filesystem Flags (Linux chattr)', label: 'Make file immutable (even root cannot delete)', cmd: `sudo chattr +i ${p}` },
        { group: 'Filesystem Flags (Linux chattr)', label: 'Make log file append-only', cmd: `sudo chattr +a ${p}` },
        { group: 'Filesystem Flags (Linux chattr)', label: 'Remove immutable flag & inspect', cmd: `sudo chattr -i ${p} && lsattr ${p}` },
        { group: 'Filesystem Flags (macOS chflags)', label: 'Lock file (user immutable)', cmd: `chflags uchg ${p}` },
        { group: 'Linux Capabilities (safer than SUID)', label: 'Allow binding ports <1024 without root', cmd: `sudo setcap 'cap_net_bind_service=+ep' ${p}` },
        { group: 'Linux Capabilities (safer than SUID)', label: 'Inspect or clear capabilities', cmd: `getcap ${p}` },
      ];

      controlsEl.innerHTML = `
        <div class="flex flex-col gap-4">
          ${renderTabBar()}
          <label class="flex flex-col gap-1 max-w-md">
            <span class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Target Path (updates commands below)</span>
            <input id="attr-path-input" type="text" value="${escapeHtml(attrPath)}" class="cyber-input !py-2 !text-xs" />
          </label>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5 font-fira text-xs text-[#bbb] flex flex-wrap gap-x-6 gap-y-1.5">
            <span><strong class="text-[#00ffff]">ls -l</strong> trailing symbols:</span>
            <span><code class="text-[#f3eb2c]">+</code> POSIX ACL present</span>
            <span><code class="text-[#f3eb2c]">@</code> macOS extended attributes (xattr)</span>
            <span><code class="text-[#f3eb2c]">.</code> SELinux security context</span>
          </div>
        </div>
      `;

      outputEl.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${snippets
            .map(
              (s) => `
                <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5 flex flex-col justify-between gap-2">
                  <div>
                    <span class="block font-fira text-[9px] uppercase tracking-wider text-[#00ffff]">${escapeHtml(s.group)}</span>
                    <span class="block font-fira text-xs text-[#ccc] mt-0.5">${escapeHtml(s.label)}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/80 px-3 py-2">
                    <code class="font-fira text-[11px] text-white break-all select-all">${escapeHtml(s.cmd)}</code>
                    <button type="button" data-copy-attr="${escapeHtml(s.cmd)}" class="rounded border border-white/15 bg-[#050505] px-2 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer shrink-0">COPY</button>
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      `;

      bindTabBar();
      document.getElementById('attr-path-input')?.addEventListener('change', (e) => {
        attrPath = (e.currentTarget as HTMLInputElement).value;
        render();
      });
      outputEl.querySelectorAll<HTMLButtonElement>('[data-copy-attr]').forEach((btn) => {
        btn.addEventListener('click', () => void copyText(btn.dataset.copyAttr ?? '', btn, 'COPY'));
      });
    }
  };

  render();
}

// --- 4. Data Format Converter (JSON <-> YAML <-> TOML <-> XML <-> CSV) ---
export function mountDataConvertTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const formats: Array<{ id: DataFormat; label: string }> = [
    { id: 'json', label: 'JSON' },
    { id: 'yaml', label: 'YAML' },
    { id: 'toml', label: 'TOML' },
    { id: 'xml', label: 'XML' },
    { id: 'csv', label: 'CSV' },
  ];

  let fromFmt: DataFormat = 'json';
  let toFmt: DataFormat = 'yaml';
  let sourceText = JSON.stringify(
    { service: 'jae-tools', port: 3000, tls: true, regions: ['eu-west', 'us-east'] },
    null,
    2,
  );

  const render = () => {
    controlsEl.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <label class="inline-flex items-center gap-2 font-fira text-xs text-[#aaa]">
            <span>From</span>
            <select id="dc-from" class="cyber-select !py-1.5 !text-xs">
              ${formats.map((f) => `<option value="${f.id}" ${f.id === fromFmt ? 'selected' : ''}>${f.label}</option>`).join('')}
            </select>
          </label>
          <span class="font-fira text-xs text-[#00ffff]">→</span>
          <label class="inline-flex items-center gap-2 font-fira text-xs text-[#aaa]">
            <span>To</span>
            <select id="dc-to" class="cyber-select !py-1.5 !text-xs">
              ${formats.map((f) => `<option value="${f.id}" ${f.id === toFmt ? 'selected' : ''}>${f.label}</option>`).join('')}
            </select>
          </label>
          <button id="dc-swap" type="button" class="rounded-lg border border-white/15 bg-black px-3 py-1.5 font-fira text-[11px] text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer">Swap</button>
        </div>
        <textarea id="dc-input" rows="8" spellcheck="false" class="cyber-input font-fira text-xs resize-y">${escapeHtml(sourceText)}</textarea>
      </div>
    `;

    const inputEl = document.getElementById('dc-input') as HTMLTextAreaElement;
    const fromEl = document.getElementById('dc-from') as HTMLSelectElement;
    const toEl = document.getElementById('dc-to') as HTMLSelectElement;

    const updateOutput = () => {
      sourceText = inputEl.value;
      try {
        const converted = convertDataFormat(sourceText, fromFmt, toFmt);
        outputEl.innerHTML = `
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/60">
              <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff]">${toFmt.toUpperCase()} Output</span>
              <button id="dc-copy" type="button" class="rounded border border-white/15 bg-black px-2.5 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY</button>
            </div>
            <pre class="p-4 font-fira text-xs text-[#e0e0e0] overflow-x-auto leading-relaxed whitespace-pre-wrap break-words max-h-[380px] overflow-y-auto">${escapeHtml(converted)}</pre>
          </div>
        `;
        document.getElementById('dc-copy')?.addEventListener('click', (e) => {
          void copyText(converted, e.currentTarget as HTMLElement, 'COPY');
        });
      } catch (err) {
        showError(outputEl, err instanceof Error ? err.message : 'Conversion failed.');
      }
    };

    inputEl.addEventListener('input', updateOutput);
    fromEl.addEventListener('change', () => {
      fromFmt = fromEl.value as DataFormat;
      updateOutput();
    });
    toEl.addEventListener('change', () => {
      toFmt = toEl.value as DataFormat;
      updateOutput();
    });
    document.getElementById('dc-swap')?.addEventListener('click', () => {
      try {
        sourceText = convertDataFormat(sourceText, fromFmt, toFmt);
      } catch {
        // keep source text
      }
      const prev = fromFmt;
      fromFmt = toFmt;
      toFmt = prev;
      render();
    });

    updateOutput();
  };

  render();
}

// --- 5. HTML Entities & Hex Encoder/Decoder (Tab 3 of Encoder/Decoder) ---
export function mountHtmlHexTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let mode: 'html' | 'hex' = 'html';
  let direction: 'encode' | 'decode' = 'encode';
  let input = '<div class="cyber">lui.z & tools</div>';

  const render = () => {
    controlsEl.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <div class="inline-flex rounded-lg border border-white/10 bg-black/80 p-1 gap-1">
            <button type="button" data-hh-mode="html" class="rounded-md px-3 py-1 font-fira text-xs cursor-pointer ${mode === 'html' ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45' : 'text-[#888] border border-transparent'}">HTML Entities</button>
            <button type="button" data-hh-mode="hex" class="rounded-md px-3 py-1 font-fira text-xs cursor-pointer ${mode === 'hex' ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45' : 'text-[#888] border border-transparent'}">Hex (UTF-8)</button>
          </div>
          <div class="inline-flex rounded-lg border border-white/10 bg-black/80 p-1 gap-1">
            <button type="button" data-hh-dir="encode" class="rounded-md px-3 py-1 font-fira text-xs cursor-pointer ${direction === 'encode' ? 'bg-[#f3eb2c]/15 text-[#f3eb2c] border border-[#f3eb2c]/45' : 'text-[#888] border border-transparent'}">Encode</button>
            <button type="button" data-hh-dir="decode" class="rounded-md px-3 py-1 font-fira text-xs cursor-pointer ${direction === 'decode' ? 'bg-[#f3eb2c]/15 text-[#f3eb2c] border border-[#f3eb2c]/45' : 'text-[#888] border border-transparent'}">Decode</button>
          </div>
        </div>
        <textarea id="hh-input" rows="4" spellcheck="false" class="cyber-input font-fira text-xs resize-y">${escapeHtml(input)}</textarea>
      </div>
    `;

    const inputEl = document.getElementById('hh-input') as HTMLTextAreaElement;

    const update = () => {
      input = inputEl.value;
      try {
        const result =
          mode === 'html'
            ? direction === 'encode'
              ? encodeHtmlEntities(input)
              : decodeHtmlEntities(input)
            : direction === 'encode'
              ? encodeHexUtf8(input, true)
              : decodeHexUtf8(input).text;

        outputEl.innerHTML = `
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/60">
              <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff]">Result</span>
              <button id="hh-copy" type="button" class="rounded border border-white/15 bg-black px-2.5 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY</button>
            </div>
            <pre class="p-4 font-fira text-xs text-[#e0e0e0] whitespace-pre-wrap break-all">${escapeHtml(result)}</pre>
          </div>
        `;
        document.getElementById('hh-copy')?.addEventListener('click', (e) => {
          void copyText(result, e.currentTarget as HTMLElement, 'COPY');
        });
      } catch (err) {
        showError(outputEl, err instanceof Error ? err.message : 'Transform failed.');
      }
    };

    inputEl.addEventListener('input', update);
    controlsEl.querySelectorAll<HTMLButtonElement>('[data-hh-mode]').forEach((b) => {
      b.addEventListener('click', () => {
        mode = b.dataset.hhMode as 'html' | 'hex';
        render();
      });
    });
    controlsEl.querySelectorAll<HTMLButtonElement>('[data-hh-dir]').forEach((b) => {
      b.addEventListener('click', () => {
        direction = b.dataset.hhDir as 'encode' | 'decode';
        render();
      });
    });

    update();
  };

  render();
}

// --- 6. Markdown Preview & Table Builder ---
export function mountMarkdownTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let subMode: 'preview' | 'table' = 'preview';
  let mdText = `# lui.z Tools\n\nLive **GitHub-Flavored Markdown** preview with \`inline code\`, lists, and tables.\n\n- [x] Safe HTML escaping\n- [x] Live split preview\n- [ ] Ship awesome docs\n\n| Tool | Status |\n| :--- | :---: |\n| Password Gen | Ready |\n| Hash + bcrypt | Ready |`;

  const headers = ['Endpoint', 'Method', 'Purpose'];
  const aligns: TableAlign[] = ['left', 'center', 'left'];
  const rows = [
    ['/api/password', 'GET', 'Generate CSPRNG passwords'],
    ['/api/hash', 'GET', 'MD5 / SHA / HMAC / bcrypt'],
    ['/api/tls', 'GET', 'Inspect TLS certificates'],
  ];

  const renderPreview = () => {
    controlsEl.innerHTML = `
      <div class="flex flex-col gap-4">
        <div class="inline-flex rounded-lg border border-white/10 bg-black/80 p-1 gap-1 self-start">
          <button type="button" data-md-tab="preview" class="rounded-md px-3.5 py-1.5 font-fira text-xs font-semibold bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45 cursor-pointer">Live Preview</button>
          <button type="button" data-md-tab="table" class="rounded-md px-3.5 py-1.5 font-fira text-xs font-semibold text-[#888] hover:text-white border border-transparent cursor-pointer">Table Builder</button>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="md-editor" class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Markdown Source</label>
            <textarea id="md-editor" rows="12" spellcheck="false" class="cyber-input font-fira text-xs leading-relaxed resize-y">${escapeHtml(mdText)}</textarea>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#00ffff]">Rendered Preview</span>
              <button id="md-copy-html" type="button" class="rounded border border-white/15 bg-black px-2 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY HTML</button>
            </div>
            <div id="md-preview-pane" class="rounded-xl border border-white/10 bg-[#050505] p-4 min-h-[260px] flex flex-col gap-3 overflow-x-auto"></div>
          </div>
        </div>
      </div>
    `;
    outputEl.innerHTML = '';

    const editor = document.getElementById('md-editor') as HTMLTextAreaElement;
    const pane = document.getElementById('md-preview-pane')!;

    const sync = () => {
      mdText = editor.value;
      pane.innerHTML = renderMarkdownToHtml(mdText);
    };

    editor.addEventListener('input', sync);
    document.getElementById('md-copy-html')?.addEventListener('click', (e) => {
      void copyText(renderMarkdownToHtml(mdText), e.currentTarget as HTMLElement, 'COPY HTML');
    });
    bindTabSwitch();
    sync();
  };

  const renderTableBuilder = () => {
    const mdTable = buildMarkdownTable(headers, rows, aligns);
    controlsEl.innerHTML = `
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex rounded-lg border border-white/10 bg-black/80 p-1 gap-1">
            <button type="button" data-md-tab="preview" class="rounded-md px-3.5 py-1.5 font-fira text-xs font-semibold text-[#888] hover:text-white border border-transparent cursor-pointer">Live Preview</button>
            <button type="button" data-md-tab="table" class="rounded-md px-3.5 py-1.5 font-fira text-xs font-semibold bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45 cursor-pointer">Table Builder</button>
          </div>
          <div class="flex items-center gap-2">
            <button id="tb-add-row" type="button" class="rounded-lg border border-white/15 bg-black px-3 py-1 font-fira text-[11px] text-[#00ffff] cursor-pointer">+ Row</button>
            <button id="tb-add-col" type="button" class="rounded-lg border border-white/15 bg-black px-3 py-1 font-fira text-[11px] text-[#f3eb2c] cursor-pointer">+ Column</button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-white/10 bg-[#050505] p-3">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                ${headers
                  .map(
                    (h, c) => `
                      <th class="p-1.5">
                        <input data-tb-head="${c}" type="text" value="${escapeHtml(h)}" class="cyber-input !py-1.5 !px-2 !text-xs font-bold text-[#00ffff]" />
                        <select data-tb-align="${c}" class="cyber-select !mt-1 !w-full !py-1 !pl-2 !pr-6 !text-[10px]">
                          <option value="left" ${aligns[c] === 'left' ? 'selected' : ''}>Left</option>
                          <option value="center" ${aligns[c] === 'center' ? 'selected' : ''}>Center</option>
                          <option value="right" ${aligns[c] === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                      </th>
                    `,
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, ri) => `
                    <tr>
                      ${headers
                        .map(
                          (_, ci) =>
                            `<td class="p-1.5"><input data-tb-cell="${ri},${ci}" type="text" value="${escapeHtml(r[ci] ?? '')}" class="cyber-input !py-1.5 !px-2 !text-xs" /></td>`,
                        )
                        .join('')}
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const syncTableOutput = () => {
      const nextMd = buildMarkdownTable(headers, rows, aligns);
      outputEl.innerHTML = `
        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/60">
            <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff]">Generated GFM Table</span>
            <button id="tb-copy-md" type="button" class="rounded border border-white/15 bg-black px-2.5 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY MARKDOWN</button>
          </div>
          <pre class="p-4 font-fira text-xs text-[#e0e0e0] overflow-x-auto">${escapeHtml(nextMd)}</pre>
        </div>
      `;
      document.getElementById('tb-copy-md')?.addEventListener('click', (e) => {
        void copyText(nextMd, e.currentTarget as HTMLElement, 'COPY MARKDOWN');
      });
    };

    controlsEl.querySelectorAll<HTMLInputElement>('[data-tb-head]').forEach((inp) => {
      inp.addEventListener('input', () => {
        headers[Number(inp.dataset.tbHead)] = inp.value;
        syncTableOutput();
      });
    });
    controlsEl.querySelectorAll<HTMLSelectElement>('[data-tb-align]').forEach((sel) => {
      sel.addEventListener('change', () => {
        aligns[Number(sel.dataset.tbAlign)] = sel.value as TableAlign;
        syncTableOutput();
      });
    });
    controlsEl.querySelectorAll<HTMLInputElement>('[data-tb-cell]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const [ri, ci] = (inp.dataset.tbCell ?? '0,0').split(',').map(Number);
        rows[ri!]![ci!] = inp.value;
        syncTableOutput();
      });
    });

    document.getElementById('tb-add-row')?.addEventListener('click', () => {
      rows.push(headers.map(() => ''));
      renderTableBuilder();
    });
    document.getElementById('tb-add-col')?.addEventListener('click', () => {
      headers.push(`Col ${headers.length + 1}`);
      aligns.push('left');
      rows.forEach((r) => r.push(''));
      renderTableBuilder();
    });

    bindTabSwitch();
    void mdTable;
    syncTableOutput();
  };

  const bindTabSwitch = () => {
    controlsEl.querySelectorAll<HTMLButtonElement>('[data-md-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        subMode = btn.dataset.mdTab as 'preview' | 'table';
        if (subMode === 'preview') renderPreview();
        else renderTableBuilder();
      });
    });
  };

  renderPreview();
}
