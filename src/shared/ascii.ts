export type AsciiStyle = 'block' | 'shadow' | 'banner' | 'dot' | 'cyber' | 'braille';

export type AsciiFrame = 'none' | 'single' | 'double' | 'cyber';

export type AsciiCommentPrefix = 'none' | '//' | '#' | '--' | '/*' | 'html';

export interface AsciiBuildOptions {
  style?: AsciiStyle;
  fillChar?: string;
  frame?: AsciiFrame;
  commentPrefix?: AsciiCommentPrefix;
  letterSpacing?: number;
  uppercase?: boolean;
}

export interface AsciiBuildResult {
  art: string;
  lines: number;
  columns: number;
  characterCount: number;
}

// Clean 5-row bitmap glyphs (`1` = ink pixel, `0` = blank)
const FONT_5X5: Record<string, readonly string[]> = {
  A: ['01110', '10001', '11111', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000'],
  G: ['01111', '10000', '10111', '10001', '01111'],
  H: ['10001', '10001', '11111', '10001', '10001'],
  I: ['111', '010', '010', '010', '111'],
  J: ['00111', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '11100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '11110', '10000', '10000'],
  Q: ['01110', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '11110', '10010', '10001'],
  S: ['01111', '10000', '01110', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100'],
  Z: ['11111', '00010', '00100', '01000', '11111'],
  '0': ['01110', '10011', '10101', '11001', '01110'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['11110', '00001', '01110', '10000', '11111'],
  '3': ['11110', '00001', '01110', '00001', '11110'],
  '4': ['10010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '11110'],
  '6': ['01111', '10000', '11110', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '00100'],
  '8': ['01110', '10001', '01110', '10001', '01110'],
  '9': ['01110', '10001', '01111', '00001', '11110'],
  '.': ['00', '00', '00', '00', '10'],
  ',': ['00', '00', '00', '01', '10'],
  ':': ['00', '10', '00', '10', '00'],
  '-': ['000', '000', '111', '000', '000'],
  '_': ['000', '000', '000', '000', '111'],
  '!': ['1', '1', '1', '0', '1'],
  '?': ['01110', '10001', '00110', '00000', '00100'],
  '/': ['0001', '0010', '0100', '1000', '1000'],
  '+': ['000', '010', '111', '010', '000'],
  '=': ['000', '111', '000', '111', '000'],
  '#': ['01010', '11111', '01010', '11111', '01010'],
  '@': ['01110', '10111', '10101', '10000', '01110'],
  ' ': ['000', '000', '000', '000', '000'],
};

const FALLBACK_GLYPH = ['111', '101', '101', '101', '111'];

function buildPixelGrid(line: string, spacing: number): number[][] {
  const spacer = Array<number>(Math.max(0, spacing)).fill(0);
  const grid: number[][] = Array.from({ length: 5 }, () => []);

  const chars = Array.from(line);
  chars.forEach((ch, idx) => {
    const glyph = FONT_5X5[ch] ?? FALLBACK_GLYPH;
    for (let r = 0; r < 5; r += 1) {
      const rowStr = glyph[r] ?? '000';
      for (const bit of rowStr) {
        grid[r]!.push(bit === '1' ? 1 : 0);
      }
      if (idx < chars.length - 1) {
        grid[r]!.push(...spacer);
      }
    }
  });

  return grid;
}

function renderGridWithStyle(grid: number[][], style: AsciiStyle, fillChar: string): string[] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (width === 0) return [''];

  if (style === 'braille') {
    // Pack 2x4 pixels into compact 2-row high Unicode Braille output
    const outRows: string[] = [];
    for (let rowBase = 0; rowBase < height; rowBase += 4) {
      let line = '';
      for (let colBase = 0; colBase < width; colBase += 2) {
        const px = (r: number, c: number) => ((grid[rowBase + r]?.[colBase + c] ?? 0) === 1 ? 1 : 0);
        const mask =
          (px(0, 0) << 0) |
          (px(1, 0) << 1) |
          (px(2, 0) << 2) |
          (px(0, 1) << 3) |
          (px(1, 1) << 4) |
          (px(2, 1) << 5) |
          (px(3, 0) << 6) |
          (px(3, 1) << 7);
        line += String.fromCodePoint(0x2800 + mask);
      }
      outRows.push(line.replace(/\u2800+$/, ''));
    }
    return outRows;
  }

  if (style === 'shadow') {
    const out = Array.from({ length: height + 1 }, () => Array<string>(width + 1).fill(' '));
    for (let r = 0; r < height; r += 1) {
      for (let c = 0; c < width; c += 1) {
        if (grid[r]![c] === 1) {
          out[r]![c] = '█';
          if ((grid[r]?.[c + 1] ?? 0) === 0 && out[r]![c + 1] === ' ') {
            out[r]![c + 1] = '░';
          }
          if ((grid[r + 1]?.[c + 1] ?? 0) === 0) {
            out[r + 1]![c + 1] = '░';
          }
          if ((grid[r + 1]?.[c] ?? 0) === 0 && out[r + 1]![c] === ' ') {
            out[r + 1]![c] = '░';
          }
        }
      }
    }
    return out.map((row) => row.join('').replace(/\s+$/, ''));
  }

  const ink =
    style === 'block'
      ? '██'
      : style === 'dot'
        ? '● '
        : style === 'cyber'
          ? '▓'
          : (fillChar.trim()[0] ?? '#');
  const empty = style === 'block' || style === 'dot' ? '  ' : ' ';

  return grid.map((row) =>
    row
      .map((cell) => (cell === 1 ? ink : empty))
      .join('')
      .replace(/\s+$/, ''),
  );
}

function applyFrame(lines: string[], frame: AsciiFrame): string[] {
  if (frame === 'none') return lines;
  const maxWidth = Math.max(...lines.map((l) => l.length), 1);
  const padded = lines.map((l) => l.padEnd(maxWidth, ' '));

  if (frame === 'single') {
    const bar = '─'.repeat(maxWidth + 2);
    return [`┌${bar}┐`, ...padded.map((l) => `│ ${l} │`), `└${bar}┘`];
  }
  if (frame === 'double') {
    const bar = '═'.repeat(maxWidth + 2);
    return [`╔${bar}╗`, ...padded.map((l) => `║ ${l} ║`), `╚${bar}╝`];
  }

  const bar = '='.repeat(maxWidth + 2);
  return [`//${bar}//`, ...padded.map((l) => `// ${l} //`), `//${bar}//`];
}

function applyCommentPrefix(lines: string[], prefix: AsciiCommentPrefix): string[] {
  if (prefix === 'none') return lines;
  if (prefix === '/*') {
    return ['/*', ...lines.map((l) => ` * ${l}`), ' */'];
  }
  if (prefix === 'html') {
    return ['<!--', ...lines.map((l) => `  ${l}`), '-->'];
  }
  return lines.map((l) => `${prefix} ${l}`);
}

export function buildAsciiArt(rawText: string, options: AsciiBuildOptions = {}): AsciiBuildResult {
  const style = options.style ?? 'block';
  const fillChar = options.fillChar ?? '#';
  const frame = options.frame ?? 'none';
  const commentPrefix = options.commentPrefix ?? 'none';
  const letterSpacing = options.letterSpacing ?? 1;
  const normalizedInput = (options.uppercase ?? true) ? rawText.toUpperCase() : rawText.toUpperCase();

  const inputLines = normalizedInput.replace(/\r\n?/g, '\n').split('\n');
  const renderedBlocks: string[] = [];

  for (const line of inputLines) {
    if (!line.trim()) {
      renderedBlocks.push('');
      continue;
    }
    const grid = buildPixelGrid(line, letterSpacing);
    renderedBlocks.push(...renderGridWithStyle(grid, style, fillChar));
    if (inputLines.length > 1) {
      renderedBlocks.push('');
    }
  }

  if (renderedBlocks.length > 1 && renderedBlocks[renderedBlocks.length - 1] === '') {
    renderedBlocks.pop();
  }

  const framed = applyFrame(renderedBlocks, frame);
  const finalLines = applyCommentPrefix(framed, commentPrefix);
  const art = finalLines.join('\n');
  const maxCols = Math.max(...finalLines.map((l) => l.length), 0);

  return {
    art,
    lines: finalLines.length,
    columns: maxCols,
    characterCount: art.length,
  };
}
