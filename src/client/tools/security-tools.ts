import type { DkimInspectResult, DmarcInspectResult } from '../../server/tools/emailauth.ts';
import type { HttpHeaderInspectResult } from '../../server/tools/headers.ts';
import type { SmtpProbeResult } from '../../server/tools/smtp.ts';
import type { TlsInspectResult } from '../../server/tools/tls.ts';
import { decodeJwt, verifyJwtHmac } from '../../shared/jwt.ts';
import { apiGet, copyText, escapeHtml, showError, showLoading } from './ui-helpers.ts';

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Imx1aS56IiwiYWRtaW4iOnRydWUsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODkzNDU2MDAwfQ.n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg';

export function mountJwtTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label for="tool-primary-input" class="font-fira text-[11px] uppercase tracking-[0.16em] text-[#858585]">JWT Token</label>
          <button id="jwt-sample-btn" type="button" class="font-fira text-[10px] uppercase tracking-wider text-[#00ffff] hover:text-white cursor-pointer">Load Sample</button>
        </div>
        <textarea
          id="tool-primary-input"
          rows="3"
          spellcheck="false"
          placeholder="Paste a JWT (eyJhbGciOi...)..."
          class="cyber-input resize-y font-fira text-xs leading-relaxed"
        >${SAMPLE_JWT}</textarea>
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="jwt-secret-input" class="font-fira text-[11px] uppercase tracking-[0.16em] text-[#858585]">HMAC Secret (Optional — verifies HS256 / HS384 / HS512 locally)</label>
        <input
          id="jwt-secret-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="Enter secret key to verify signature..."
          class="cyber-input !py-2 !text-xs"
        />
      </div>
    </div>
  `;

  const tokenEl = document.getElementById('tool-primary-input') as HTMLTextAreaElement;
  const secretEl = document.getElementById('jwt-secret-input') as HTMLInputElement;

  const render = async () => {
    const raw = tokenEl.value.trim();
    if (!raw) {
      outputEl.innerHTML = '';
      return;
    }

    try {
      const decoded = decodeJwt(raw);
      const secret = secretEl.value;
      const sigCheck = secret ? await verifyJwtHmac(raw, secret) : null;

      const statusBadge =
        decoded.claims.isExpired === true
          ? `<span class="rounded-full border border-rose-500/40 bg-rose-950/30 px-2.5 py-0.5 font-fira text-[10px] font-bold uppercase text-rose-300">EXPIRED</span>`
          : decoded.claims.isNotYetValid === true
            ? `<span class="rounded-full border border-amber-500/40 bg-amber-950/30 px-2.5 py-0.5 font-fira text-[10px] font-bold uppercase text-amber-300">NOT YET VALID</span>`
            : decoded.claims.expiresAt
              ? `<span class="rounded-full border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-0.5 font-fira text-[10px] font-bold uppercase text-emerald-300">ACTIVE</span>`
              : `<span class="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-fira text-[10px] uppercase text-[#aaa]">NO EXP CLAIM</span>`;

      const sigBanner = sigCheck
        ? `<div class="rounded-xl border px-4 py-2.5 font-fira text-xs ${
            sigCheck.valid
              ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-300'
              : sigCheck.supported
                ? 'border-rose-500/40 bg-rose-950/25 text-rose-300'
                : 'border-amber-500/40 bg-amber-950/25 text-amber-300'
          }">${escapeHtml(sigCheck.message)}</div>`
        : '';

      const headerJson = JSON.stringify(decoded.header, null, 2);
      const payloadJson = JSON.stringify(decoded.payload, null, 2);

      outputEl.innerHTML = `
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-[#00ffff]/40 bg-[#00ffff]/10 px-2.5 py-0.5 font-fira text-[10px] font-bold uppercase text-[#00ffff]">ALG: ${escapeHtml(decoded.alg)}</span>
          <span class="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-fira text-[10px] uppercase text-[#ccc]">TYP: ${escapeHtml(decoded.typ)}</span>
          ${statusBadge}
          ${decoded.claims.expiresAt ? `<span class="font-fira text-[11px] text-[#888]">exp: <strong class="text-white">${escapeHtml(decoded.claims.expiresAt)}</strong></span>` : ''}
          ${decoded.claims.issuedAt ? `<span class="font-fira text-[11px] text-[#888]">iat: <strong class="text-white">${escapeHtml(decoded.claims.issuedAt)}</strong></span>` : ''}
        </div>
        ${sigBanner}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/60">
              <span class="font-fira text-[10px] uppercase tracking-[0.2em] text-[#00ffff]">Header</span>
              <button type="button" data-copy-jwt="header" class="rounded border border-white/15 bg-black px-2 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY</button>
            </div>
            <pre class="p-4 font-fira text-xs text-[#e0e0e0] overflow-x-auto leading-relaxed">${escapeHtml(headerJson)}</pre>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/60">
              <span class="font-fira text-[10px] uppercase tracking-[0.2em] text-[#f3eb2c]">Payload</span>
              <button type="button" data-copy-jwt="payload" class="rounded border border-white/15 bg-black px-2 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY</button>
            </div>
            <pre class="p-4 font-fira text-xs text-[#e0e0e0] overflow-x-auto leading-relaxed">${escapeHtml(payloadJson)}</pre>
          </div>
        </div>
      `;

      outputEl.querySelectorAll<HTMLButtonElement>('[data-copy-jwt]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const text = btn.dataset.copyJwt === 'header' ? headerJson : payloadJson;
          void copyText(text, btn, 'COPY');
        });
      });
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'Invalid JWT.');
    }
  };

  tokenEl.addEventListener('input', () => void render());
  secretEl.addEventListener('input', () => void render());
  document.getElementById('jwt-sample-btn')?.addEventListener('click', () => {
    tokenEl.value = SAMPLE_JWT;
    void render();
  });

  void render();
}

export function mountTlsTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tls-form" class="flex flex-col sm:flex-row gap-3">
      <input
        id="tool-primary-input"
        type="text"
        value="google.com"
        placeholder="Hostname or domain (e.g. google.com)"
        class="cyber-input flex-1"
      />
      <input
        id="tls-port-input"
        type="number"
        min="1"
        max="65535"
        value="443"
        aria-label="Port"
        class="cyber-input sm:w-28 text-center"
      />
      <button
        type="submit"
        class="rounded-lg bg-[#f3eb2c] px-5 py-2.5 font-fira text-xs font-bold uppercase tracking-wider text-black hover:bg-[#fbf36a] transition-colors cursor-pointer shrink-0"
      >Inspect TLS</button>
    </form>
  `;

  const hostEl = document.getElementById('tool-primary-input') as HTMLInputElement;
  const portEl = document.getElementById('tls-port-input') as HTMLInputElement;

  const run = async () => {
    const host = hostEl.value.trim();
    const port = Number(portEl.value) || 443;
    if (!host) return;
    showLoading(outputEl, `Running TLS handshake to ${host}:${port}...`);

    try {
      const data = await apiGet<TlsInspectResult>(
        `/api/tls?host=${encodeURIComponent(host)}&port=${encodeURIComponent(String(port))}`,
      );
      const cert = data.certificate;
      const expiryColor = cert.expired
        ? 'text-rose-400'
        : cert.daysRemaining < 21
          ? 'text-amber-300'
          : 'text-emerald-400';

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Trust Status</p>
            <p class="mt-1 font-fira text-sm font-bold ${data.authorized ? 'text-emerald-400' : 'text-rose-400'}">${data.authorized ? 'VALID / TRUSTED' : 'UNTRUSTED'}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Days Remaining</p>
            <p class="mt-1 font-fira text-sm font-bold ${expiryColor}">${cert.expired ? `EXPIRED (${cert.daysRemaining}d)` : `${cert.daysRemaining} days`}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Protocol</p>
            <p class="mt-1 font-fira text-sm font-bold text-[#00ffff]">${escapeHtml(data.protocol ?? 'Unknown')}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Handshake</p>
            <p class="mt-1 font-fira text-sm font-bold text-[#f3eb2c]">${data.handshakeMs} ms</p>
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-fira text-xs">
          <div><span class="text-[#777]">Subject CN:</span> <strong class="text-white">${escapeHtml(cert.subject.CN ?? '--')}</strong></div>
          <div><span class="text-[#777]">Issuer:</span> <strong class="text-white">${escapeHtml(cert.issuer.O ?? cert.issuer.CN ?? '--')}</strong></div>
          <div><span class="text-[#777]">Valid From:</span> <span class="text-[#ddd]">${escapeHtml(cert.validFrom)}</span></div>
          <div><span class="text-[#777]">Valid To:</span> <span class="text-[#ddd]">${escapeHtml(cert.validTo)}</span></div>
          <div><span class="text-[#777]">Cipher:</span> <span class="text-[#00ffff]">${escapeHtml(data.cipher?.name ?? '--')}</span></div>
          <div><span class="text-[#777]">Resolved IP:</span> <span class="text-[#ddd]">${escapeHtml(data.ip)}</span></div>
          <div class="md:col-span-2"><span class="text-[#777]">SHA-256 Fingerprint:</span> <code class="text-[#f3eb2c] break-all">${escapeHtml(cert.fingerprint256)}</code></div>
        </div>

        ${
          cert.subjectAltNames.length > 0
            ? `
              <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-2">
                <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Subject Alternative Names (${cert.subjectAltNames.length})</p>
                <div class="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  ${cert.subjectAltNames.map((san) => `<span class="rounded border border-white/10 bg-black px-2 py-0.5 font-fira text-[11px] text-[#ddd]">${escapeHtml(san)}</span>`).join('')}
                </div>
              </div>
            `
            : ''
        }

        ${
          data.chain.length > 0
            ? `
              <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-2">
                <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Certificate Chain (${data.chain.length})</p>
                <div class="flex flex-col gap-2">
                  ${data.chain
                    .map(
                      (c, idx) => `
                        <div class="rounded-lg border border-white/8 bg-black/70 px-3 py-2 font-fira text-xs flex flex-wrap items-center justify-between gap-2">
                          <span><span class="text-[#00ffff] mr-2">#${idx + 1}</span><strong class="text-white">${escapeHtml(c.subjectCN)}</strong> <span class="text-[#777]">← ${escapeHtml(c.issuerCN)}</span></span>
                          <span class="text-[10px] text-[#888]">Expires: ${escapeHtml(c.validTo)}</span>
                        </div>
                      `,
                    )
                    .join('')}
                </div>
              </div>
            `
            : ''
        }
      `;
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'TLS inspection failed.');
    }
  };

  document.getElementById('tls-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void run();
  });
}

export function mountHeadersTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="headers-form" class="flex flex-col sm:flex-row gap-3">
      <input
        id="tool-primary-input"
        type="text"
        value="https://google.com"
        placeholder="https://example.com"
        class="cyber-input flex-1"
      />
      <button
        type="submit"
        class="rounded-lg bg-[#f3eb2c] px-5 py-2.5 font-fira text-xs font-bold uppercase tracking-wider text-black hover:bg-[#fbf36a] transition-colors cursor-pointer shrink-0"
      >Audit Headers</button>
    </form>
  `;

  const urlEl = document.getElementById('tool-primary-input') as HTMLInputElement;

  const run = async () => {
    const raw = urlEl.value.trim();
    if (!raw) return;
    showLoading(outputEl, `Inspecting HTTP headers & redirects for ${raw}...`);

    try {
      const data = await apiGet<HttpHeaderInspectResult>(`/api/headers?url=${encodeURIComponent(raw)}`);
      const gradeColor =
        data.grade === 'A+' || data.grade === 'A'
          ? 'text-emerald-400'
          : data.grade === 'B'
            ? 'text-[#00ffff]'
            : data.grade === 'C'
              ? 'text-[#f3eb2c]'
              : 'text-rose-400';

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Security Grade</p>
            <p class="mt-1 font-fira text-lg font-black ${gradeColor}">${data.grade} <span class="text-xs font-normal text-[#888]">(${data.score}/100)</span></p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">HTTP Status</p>
            <p class="mt-1 font-fira text-sm font-bold text-white">${data.status} ${escapeHtml(data.statusText)}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Redirects</p>
            <p class="mt-1 font-fira text-sm font-bold text-[#00ffff]">${data.redirects.length} hop${data.redirects.length === 1 ? '' : 's'}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Total Time</p>
            <p class="mt-1 font-fira text-sm font-bold text-[#f3eb2c]">${data.totalMs} ms</p>
          </div>
        </div>

        ${
          data.redirects.length > 0
            ? `
              <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-2">
                <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Redirect Chain</p>
                ${data.redirects
                  .map(
                    (hop, idx) => `
                      <div class="font-fira text-xs flex flex-wrap items-center gap-2 text-[#ccc]">
                        <span class="text-[#00ffff]">#${idx + 1}</span>
                        <span class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-[#f3eb2c]">${hop.status}</span>
                        <span class="break-all">${escapeHtml(hop.url)}</span>
                        <span class="text-[#777]">(${hop.durationMs}ms)</span>
                      </div>
                    `,
                  )
                  .join('')}
                <div class="font-fira text-xs text-emerald-400 break-all">→ Final: ${escapeHtml(data.finalUrl)}</div>
              </div>
            `
            : ''
        }

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-2">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Security Header Audit</p>
          <div class="flex flex-col gap-2">
            ${data.audit
              .map((a) => {
                const badge =
                  a.status === 'pass'
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                    : a.status === 'warn'
                      ? 'border-amber-500/40 bg-amber-950/30 text-amber-300'
                      : 'border-white/15 bg-white/5 text-[#aaa]';
                return `
                  <div class="rounded-lg border border-white/8 bg-black/70 px-3 py-2 flex flex-col gap-1 font-fira text-xs">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="font-bold text-white">${escapeHtml(a.header)}</span>
                      <span class="rounded border px-1.5 py-0.5 text-[9px] uppercase ${badge}">${a.status}</span>
                    </div>
                    <p class="text-[11px] text-[#999]">${escapeHtml(a.note)}</p>
                    ${a.value ? `<code class="text-[11px] text-[#00ffff] break-all">${escapeHtml(a.value)}</code>` : ''}
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
          <div class="px-4 py-2 border-b border-white/10 bg-black/60 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">All Response Headers (${Object.keys(data.headers).length})</div>
          <div class="p-4 flex flex-col gap-1.5 font-fira text-xs max-h-72 overflow-y-auto">
            ${Object.entries(data.headers)
              .map(
                ([k, v]) =>
                  `<div class="break-all"><span class="text-[#f3eb2c]">${escapeHtml(k)}:</span> <span class="text-[#ddd]">${escapeHtml(v)}</span></div>`,
              )
              .join('')}
          </div>
        </div>
      `;
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'Header audit failed.');
    }
  };

  document.getElementById('headers-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void run();
  });
}

export function mountDmarcDkimTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="emailauth-form" class="flex flex-col sm:flex-row gap-3">
      <input
        id="tool-primary-input"
        type="text"
        value="google.com"
        placeholder="Domain (e.g. google.com)"
        class="cyber-input flex-1"
      />
      <input
        id="dkim-selector-input"
        type="text"
        value="20230601"
        placeholder="DKIM selector (e.g. google, selector1)"
        class="cyber-input sm:w-52"
      />
      <button
        type="submit"
        class="rounded-lg bg-[#f3eb2c] px-5 py-2.5 font-fira text-xs font-bold uppercase tracking-wider text-black hover:bg-[#fbf36a] transition-colors cursor-pointer shrink-0"
      >Check DMARC &amp; DKIM</button>
    </form>
  `;

  const domainEl = document.getElementById('tool-primary-input') as HTMLInputElement;
  const selectorEl = document.getElementById('dkim-selector-input') as HTMLInputElement;

  const run = async () => {
    const domain = domainEl.value.trim();
    const selector = selectorEl.value.trim() || 'default';
    if (!domain) return;
    showLoading(outputEl, `Querying _dmarc.${domain} and ${selector}._domainkey.${domain}...`);

    try {
      const [dmarc, dkim] = await Promise.all([
        apiGet<DmarcInspectResult>(`/api/dmarc?domain=${encodeURIComponent(domain)}`),
        apiGet<DkimInspectResult>(
          `/api/dkim?domain=${encodeURIComponent(domain)}&selector=${encodeURIComponent(selector)}`,
        ),
      ]);

      outputEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="font-fira text-xs font-bold uppercase tracking-wider text-[#00ffff]">DMARC (${escapeHtml(dmarc.queryHost)})</span>
              <span class="rounded border px-2 py-0.5 font-fira text-[10px] uppercase ${dmarc.found ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300' : 'border-rose-500/40 bg-rose-950/30 text-rose-300'}">${dmarc.found ? `p=${escapeHtml(dmarc.policy ?? '?')}` : 'NOT FOUND'}</span>
            </div>
            ${dmarc.record ? `<code class="rounded-lg border border-white/8 bg-black/80 p-3 font-fira text-xs text-[#e0e0e0] break-all">${escapeHtml(dmarc.record)}</code>` : ''}
            ${
              dmarc.issues.length > 0
                ? `<ul class="space-y-1 font-fira text-[11px] text-amber-300">${dmarc.issues.map((i) => `<li>• ${escapeHtml(i)}</li>`).join('')}</ul>`
                : `<p class="font-fira text-[11px] text-emerald-400">Policy looks healthy (enforced with reporting configured).</p>`
            }
          </div>

          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="font-fira text-xs font-bold uppercase tracking-wider text-[#f3eb2c]">DKIM (${escapeHtml(dkim.queryHost)})</span>
              <span class="rounded border px-2 py-0.5 font-fira text-[10px] uppercase ${dkim.found ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300' : 'border-rose-500/40 bg-rose-950/30 text-rose-300'}">${dkim.found ? `${escapeHtml(dkim.keyType ?? 'rsa')}${dkim.keyLengthHint ? ` ~${dkim.keyLengthHint}b` : ''}` : 'NOT FOUND'}</span>
            </div>
            ${dkim.record ? `<code class="rounded-lg border border-white/8 bg-black/80 p-3 font-fira text-xs text-[#e0e0e0] break-all max-h-40 overflow-y-auto">${escapeHtml(dkim.record)}</code>` : '<p class="font-fira text-[11px] text-[#888]">No TXT record found for this selector. Try common selectors like google, selector1, selector2, default, k1.</p>'}
          </div>
        </div>
      `;
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'DMARC/DKIM lookup failed.');
    }
  };

  document.getElementById('emailauth-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void run();
  });
}

export function mountSmtpTool(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-1.5">
        ${[
          { label: 'Gmail (587)', host: 'smtp.gmail.com', port: '587' },
          { label: 'Gmail SMTPS (465)', host: 'smtp.gmail.com', port: '465' },
          { label: 'Office365 (587)', host: 'smtp.office365.com', port: '587' },
          { label: 'Mailgun (587)', host: 'smtp.mailgun.org', port: '587' },
        ]
          .map(
            (p) =>
              `<button type="button" data-smtp-preset="${p.host}|${p.port}" class="rounded-md border border-white/10 bg-[#050505] px-2.5 py-1 font-fira text-[11px] text-[#aaa] hover:text-[#f3eb2c] hover:border-[#f3eb2c]/45 cursor-pointer">${p.label}</button>`,
          )
          .join('')}
      </div>
      <form id="smtp-form" class="flex flex-col sm:flex-row gap-3">
        <input
          id="smtp-host-input"
          type="text"
          value="smtp.gmail.com"
          placeholder="Mail server hostname (e.g. smtp.gmail.com)"
          class="cyber-input flex-1"
        />
        <select id="smtp-port-select" aria-label="SMTP Port" class="cyber-select sm:w-48">
          <option value="587" selected>587 (Submission)</option>
          <option value="465">465 (SMTPS / TLS)</option>
          <option value="25">25 (SMTP)</option>
          <option value="2525">2525 (Alternate)</option>
        </select>
        <button
          type="submit"
          class="rounded-lg bg-[#f3eb2c] px-5 py-2.5 font-fira text-xs font-bold uppercase tracking-wider text-black hover:bg-[#fbf36a] transition-colors cursor-pointer shrink-0"
        >Probe SMTP</button>
      </form>
    </div>
  `;

  const hostEl = document.getElementById('smtp-host-input') as HTMLInputElement;
  const portEl = document.getElementById('smtp-port-select') as HTMLSelectElement;

  const run = async () => {
    const host = hostEl.value.trim();
    const port = Number(portEl.value) || 587;
    if (!host) return;
    showLoading(outputEl, `Connecting to ${host}:${port} and running EHLO...`);

    try {
      const data = await apiGet<SmtpProbeResult>(
        `/api/smtp?host=${encodeURIComponent(host)}&port=${encodeURIComponent(String(port))}`,
      );

      const snippetEl = document.getElementById('cli-snippet');
      if (snippetEl) {
        snippetEl.textContent = `curl -s "${window.location.origin}/api/smtp?host=${encodeURIComponent(host)}&port=${port}"`;
      }

      const tlsLabel =
        data.tlsMode === 'implicit-tls'
          ? 'IMPLICIT TLS (465)'
          : data.tlsMode === 'starttls-advertised'
            ? 'STARTTLS SUPPORTED'
            : 'PLAINTEXT ONLY';
      const tlsColor = data.tlsMode === 'plaintext-only' ? 'text-amber-300' : 'text-emerald-400';

      const maxMb = data.maxMessageBytes
        ? `${(data.maxMessageBytes / (1024 * 1024)).toFixed(1)} MiB`
        : '--';

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Transport Security</p>
            <p class="mt-1 font-fira text-xs font-bold ${tlsColor}">${tlsLabel}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Connect / Total</p>
            <p class="mt-1 font-fira text-sm font-bold text-[#00ffff]">${data.connectMs} / ${data.totalMs} ms</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Max Message Size</p>
            <p class="mt-1 font-fira text-sm font-bold text-[#f3eb2c]">${maxMb}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Resolved IP</p>
            <p class="mt-1 font-fira text-xs font-bold text-white truncate">${escapeHtml(data.ip)}</p>
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">EHLO Capabilities (${data.capabilities.length})</p>
          <div class="flex flex-wrap gap-1.5">
            ${
              data.capabilities.length > 0
                ? data.capabilities
                    .map(
                      (cap) =>
                        `<span class="rounded border border-white/10 bg-black px-2 py-0.5 font-fira text-[11px] ${cap.toUpperCase() === 'STARTTLS' ? 'text-emerald-300 border-emerald-500/40' : 'text-[#ddd]'}">${escapeHtml(cap)}</span>`,
                    )
                    .join('')
                : '<span class="font-fira text-xs text-[#777]">None advertised.</span>'
            }
          </div>
          ${
            data.authMechanisms.length > 0
              ? `<div class="font-fira text-xs text-[#aaa]">AUTH mechanisms: <strong class="text-[#00ffff]">${escapeHtml(data.authMechanisms.join(', '))}</strong></div>`
              : ''
          }
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/60">
            <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">SMTP Transcript</span>
            <button id="smtp-copy-transcript" type="button" class="rounded border border-white/15 bg-black px-2 py-0.5 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY</button>
          </div>
          <pre class="p-4 font-fira text-xs text-[#e0e0e0] overflow-x-auto leading-relaxed">${escapeHtml(data.transcript.join('\n'))}</pre>
        </div>
      `;

      document.getElementById('smtp-copy-transcript')?.addEventListener('click', (e) => {
        void copyText(data.transcript.join('\n'), e.currentTarget as HTMLElement, 'COPY');
      });
    } catch (err) {
      showError(outputEl, err instanceof Error ? err.message : 'SMTP probe failed.');
    }
  };

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-smtp-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [h, p] = (btn.dataset.smtpPreset ?? '').split('|');
      if (h) hostEl.value = h;
      if (p) portEl.value = p;
      void run();
    });
  });

  document.getElementById('smtp-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void run();
  });
}
