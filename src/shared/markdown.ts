export type TableAlign = 'left' | 'center' | 'right';

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeHref(raw: string): string {
  const trimmed = raw.trim();
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return '#';
}

function renderInline(text: string): string {
  const codeSpans: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_, code: string) => {
    const idx = codeSpans.length;
    codeSpans.push(
      `<code class="rounded bg-white/10 px-1.5 py-0.5 font-fira text-[12px] text-[#f3eb2c]">${escapeHtml(code)}</code>`,
    );
    return `\u0000CODE${idx}\u0000`;
  });

  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
    return `<a href="${sanitizeHref(href)}" target="_blank" rel="noopener noreferrer" class="text-[#00ffff] underline underline-offset-2 hover:text-[#f3eb2c]">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong class="font-bold text-white">$1</strong>');
  s = s.replace(/~~([^~]+)~~/g, '<del class="opacity-60">$1</del>');
  s = s.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  s = s.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

  for (let i = 0; i < codeSpans.length; i++) {
    s = s.replace(`\u0000CODE${i}\u0000`, codeSpans[i]!);
  }
  return s;
}

/**
 * Safe GFM Markdown-to-HTML renderer (escapes all raw HTML to prevent XSS).
 */
export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    const fenceMatch = /^```(\w*)/.exec(line.trim());
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // consume closing fence
      const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
      out.push(
        `<pre${langAttr} class="rounded-lg border border-white/10 bg-black/85 p-3.5 overflow-x-auto font-fira text-xs text-[#e0e0e0] leading-relaxed"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(?:---|\*\*\*|___)\s*$/.test(line.trim())) {
      out.push('<hr class="border-white/15 my-3" />');
      i++;
      continue;
    }

    // Headings
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const sizes: Record<number, string> = {
        1: 'text-2xl font-bold text-white border-b border-white/10 pb-2 mt-2',
        2: 'text-xl font-bold text-white mt-3',
        3: 'text-lg font-semibold text-[#00ffff] mt-2',
        4: 'text-base font-semibold text-white mt-2',
        5: 'text-sm font-semibold text-[#ddd]',
        6: 'text-xs font-semibold uppercase tracking-wider text-[#999]',
      };
      out.push(`<h${level} class="${sizes[level]}">${renderInline(headingMatch[2]!)}</h${level}>`);
      i++;
      continue;
    }

    // GFM Table
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(lines[i + 1]!)
    ) {
      const parseRow = (r: string) =>
        r
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseRow(line);
      const aligns = parseRow(lines[i + 1]!).map((sep) => {
        const left = sep.startsWith(':');
        const right = sep.endsWith(':');
        if (left && right) return 'text-center';
        if (right) return 'text-right';
        return 'text-left';
      });
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim() !== '') {
        bodyRows.push(parseRow(lines[i]!));
        i++;
      }
      const thead = headers
        .map(
          (h, idx) =>
            `<th class="px-3 py-2 font-fira text-[11px] uppercase tracking-wider text-[#00ffff] border-b border-white/15 ${aligns[idx] ?? 'text-left'}">${renderInline(h)}</th>`,
        )
        .join('');
      const tbody = bodyRows
        .map(
          (row) =>
            `<tr class="border-b border-white/8">${headers
              .map(
                (_, idx) =>
                  `<td class="px-3 py-2 text-xs text-[#d6d6d6] ${aligns[idx] ?? 'text-left'}">${renderInline(row[idx] ?? '')}</td>`,
              )
              .join('')}</tr>`,
        )
        .join('');
      out.push(
        `<div class="overflow-x-auto rounded-lg border border-white/10"><table class="w-full border-collapse"><thead><tr class="bg-black/60">${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`,
      );
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('> ')) {
        quoteLines.push(lines[i]!.trim().slice(2));
        i++;
      }
      out.push(
        `<blockquote class="border-l-2 border-[#00ffff] pl-3.5 py-1 text-sm text-[#bbb] italic">${quoteLines.map(renderInline).join('<br />')}</blockquote>`,
      );
      continue;
    }

    // Unordered / Task list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i]!)) {
        const content = lines[i]!.replace(/^\s*[-*+]\s+/, '');
        const taskMatch = /^\[([ xX])\]\s+(.*)$/.exec(content);
        if (taskMatch) {
          const checked = taskMatch[1]!.toLowerCase() === 'x';
          items.push(
            `<li class="list-none flex items-center gap-2 text-sm"><span class="inline-flex items-center justify-center w-4 h-4 rounded border ${checked ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-white/25 text-transparent'} text-[10px]">✓</span><span>${renderInline(taskMatch[2]!)}</span></li>`,
          );
        } else {
          items.push(`<li class="text-sm">${renderInline(content)}</li>`);
        }
        i++;
      }
      out.push(`<ul class="list-disc pl-5 space-y-1 text-[#d6d6d6]">${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        const content = lines[i]!.replace(/^\s*\d+\.\s+/, '');
        items.push(`<li class="text-sm">${renderInline(content)}</li>`);
        i++;
      }
      out.push(`<ol class="list-decimal pl-5 space-y-1 text-[#d6d6d6]">${items.join('')}</ol>`);
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !/^(#{1,6}\s|```|>\s|\s*[-*+]\s|\s*\d+\.\s|---|\*\*\*|___)/.test(lines[i]!)
    ) {
      paraLines.push(lines[i]!);
      i++;
    }
    out.push(`<p class="text-sm text-[#d6d6d6] leading-relaxed">${paraLines.map(renderInline).join(' ')}</p>`);
  }

  return out.join('\n');
}

export function buildMarkdownTable(
  headers: string[],
  rows: string[][],
  alignments: TableAlign[] = [],
): string {
  const cols = Math.max(1, headers.length);
  const escCell = (v: string) => v.replaceAll('|', '\\|').trim();
  const normHeaders = Array.from({ length: cols }, (_, i) => escCell(headers[i] ?? `Col ${i + 1}`) || `Col ${i + 1}`);
  const normRows = rows.map((r) => Array.from({ length: cols }, (_, i) => escCell(r[i] ?? '')));

  const widths = normHeaders.map((h, i) =>
    Math.max(3, h.length, ...normRows.map((r) => (r[i] ?? '').length)),
  );

  const padCell = (val: string, width: number, align: TableAlign): string => {
    const diff = Math.max(0, width - val.length);
    if (align === 'right') return ' '.repeat(diff) + val;
    if (align === 'center') {
      const left = Math.floor(diff / 2);
      return ' '.repeat(left) + val + ' '.repeat(diff - left);
    }
    return val + ' '.repeat(diff);
  };

  const sepCell = (width: number, align: TableAlign): string => {
    if (align === 'center') return `:${'-'.repeat(Math.max(1, width - 2))}:`;
    if (align === 'right') return `${'-'.repeat(Math.max(2, width - 1))}:`;
    return '-'.repeat(width);
  };

  const headerLine = `| ${normHeaders.map((h, i) => padCell(h, widths[i]!, alignments[i] ?? 'left')).join(' | ')} |`;
  const sepLine = `| ${widths.map((w, i) => sepCell(w, alignments[i] ?? 'left')).join(' | ')} |`;
  const rowLines = normRows.map(
    (r) => `| ${r.map((c, i) => padCell(c, widths[i]!, alignments[i] ?? 'left')).join(' | ')} |`,
  );

  return [headerLine, sepLine, ...rowLines].join('\n');
}
