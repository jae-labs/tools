/**
 * Computes a fuzzy match score for `query` against `text` (higher is better, 0 = no match).
 * Rewards exact matches, word-boundary/prefix matches, consecutive characters, and subsequences.
 */
export function fuzzyScoreText(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (!t) return 0;

  if (t === q) return 200;
  if (t.startsWith(q)) return 150 + Math.min(20, q.length);

  const subIdx = t.indexOf(q);
  if (subIdx !== -1) {
    const atBoundary = subIdx === 0 || /[\s\-_/→]/.test(t[subIdx - 1]);
    return (atBoundary ? 120 : 95) - Math.min(25, subIdx);
  }

  // Subsequence fuzzy match (e.g. "jsbr" -> "JSON Browser", "tp" -> "TCP Ping")
  let qi = 0;
  let score = 0;
  let consecutive = 0;
  let lastMatchIdx = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      const isBoundary = ti === 0 || /[\s\-_/→]/.test(t[ti - 1]);
      if (ti === lastMatchIdx + 1) {
        consecutive += 1;
        score += 10 + consecutive * 3;
      } else {
        consecutive = 0;
        score += isBoundary ? 12 : 4;
      }
      lastMatchIdx = ti;
      qi += 1;
    }
  }

  if (qi < q.length) return 0;
  // Slightly prefer tighter matches
  return Math.max(1, score - Math.floor((t.length - q.length) * 0.25));
}

export interface FuzzySearchCandidate {
  primary: string;
  secondary?: string[];
}

export function scoreFuzzyCandidate(query: string, candidate: FuzzySearchCandidate): number {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;

  let total = 0;
  for (const token of tokens) {
    let best = fuzzyScoreText(token, candidate.primary) * 2;
    if (candidate.secondary) {
      for (const field of candidate.secondary) {
        const s = fuzzyScoreText(token, field);
        if (s > best) best = s;
      }
    }
    if (best <= 0) return 0;
    total += best;
  }
  return total;
}
