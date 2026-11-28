export function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function copyText(text: string, button: HTMLElement, originalLabel: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'COPIED';
    setTimeout(() => {
      button.textContent = originalLabel;
    }, 1500);
  } catch {
    button.textContent = 'FAILED';
    setTimeout(() => {
      button.textContent = originalLabel;
    }, 1500);
  }
}

export async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function showLoading(outputEl: HTMLElement, message: string): void {
  outputEl.innerHTML = `
    <div class="rounded-xl border border-[#00ffff]/30 bg-[#050505] p-5 flex items-center gap-3 font-fira text-xs text-[#00ffff]">
      <span class="inline-block w-2.5 h-2.5 rounded-full bg-[#00ffff] animate-ping"></span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

export function showError(outputEl: HTMLElement, message: string): void {
  outputEl.innerHTML = `
    <div class="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 font-fira text-xs text-rose-300">
      <span class="font-bold text-rose-400 uppercase tracking-wider mr-2">[ERROR]</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

export interface TabDefinition {
  id: string;
  label: string;
  mount: (controlsEl: HTMLElement, outputEl: HTMLElement) => void;
}

export function mountTabbedTool(
  controlsEl: HTMLElement,
  outputEl: HTMLElement,
  tabs: TabDefinition[],
  initialTabId?: string,
  onCleanup?: () => void,
): void {
  let activeId = tabs.some((t) => t.id === initialTabId) ? initialTabId! : tabs[0]!.id;

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-5">
      <div id="merged-tab-bar" role="tablist" class="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1.5 self-start"></div>
      <div id="merged-tab-controls"></div>
    </div>
  `;

  const tabBar = controlsEl.querySelector<HTMLElement>('#merged-tab-bar')!;
  const subControls = controlsEl.querySelector<HTMLElement>('#merged-tab-controls')!;

  const renderTabs = () => {
    tabBar.innerHTML = tabs
      .map((t) => {
        const isActive = t.id === activeId;
        return `
          <button
            type="button"
            role="tab"
            data-merged-tab="${t.id}"
            aria-selected="${isActive ? 'true' : 'false'}"
            class="rounded-lg px-3.5 py-1.5 font-fira text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/50 shadow-[0_0_14px_rgba(0,255,255,0.12)]'
                : 'text-[#8e8e8e] hover:text-white border border-transparent'
            }"
          >${escapeHtml(t.label)}</button>
        `;
      })
      .join('');

    tabBar.querySelectorAll<HTMLButtonElement>('[data-merged-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.mergedTab;
        if (!next || next === activeId) return;
        onCleanup?.();
        activeId = next;
        renderTabs();
        mountActive();
      });
    });
  };

  const mountActive = () => {
    subControls.innerHTML = '';
    outputEl.innerHTML = '';
    const tab = tabs.find((t) => t.id === activeId) ?? tabs[0]!;
    tab.mount(subControls, outputEl);
  };

  renderTabs();
  mountActive();
}
