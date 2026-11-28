import { resolvePublicTarget } from '../ip.ts';

export interface HeaderAuditItem {
  header: string;
  present: boolean;
  value: string | null;
  status: 'pass' | 'warn' | 'info';
  note: string;
}

export interface RedirectHop {
  url: string;
  status: number;
  location: string | null;
  durationMs: number;
}

export interface HttpHeaderInspectResult {
  initialUrl: string;
  finalUrl: string;
  status: number;
  statusText: string;
  totalMs: number;
  redirects: RedirectHop[];
  headers: Record<string, string>;
  audit: HeaderAuditItem[];
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

const MAX_HOPS = 8;

function normalizeHttpUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('URL is required.');
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    throw new Error('Invalid URL format.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http:// and https:// URLs are allowed.');
  }
  return parsed;
}

export function auditSecurityHeaders(headers: Record<string, string>, isHttps: boolean): {
  audit: HeaderAuditItem[];
  score: number;
  grade: HttpHeaderInspectResult['grade'];
} {
  const get = (name: string): string | null => headers[name.toLowerCase()] ?? null;

  const hsts = get('strict-transport-security');
  const csp = get('content-security-policy');
  const xcto = get('x-content-type-options');
  const xfo = get('x-frame-options');
  const refPol = get('referrer-policy');
  const permPol = get('permissions-policy');
  const cors = get('access-control-allow-origin');
  const server = get('server');

  const audit: HeaderAuditItem[] = [
    {
      header: 'Strict-Transport-Security',
      present: Boolean(hsts),
      value: hsts,
      status: hsts ? 'pass' : isHttps ? 'warn' : 'info',
      note: hsts ? 'Enforces HTTPS connections.' : 'Missing HSTS header.',
    },
    {
      header: 'Content-Security-Policy',
      present: Boolean(csp),
      value: csp,
      status: csp ? 'pass' : 'warn',
      note: csp ? 'Restricts script/resource origins.' : 'Missing CSP header (helps prevent XSS).',
    },
    {
      header: 'X-Content-Type-Options',
      present: Boolean(xcto),
      value: xcto,
      status: xcto?.toLowerCase() === 'nosniff' ? 'pass' : 'warn',
      note: xcto?.toLowerCase() === 'nosniff' ? 'MIME sniffing disabled (nosniff).' : 'Should be set to "nosniff".',
    },
    {
      header: 'X-Frame-Options',
      present: Boolean(xfo) || Boolean(csp?.toLowerCase().includes('frame-ancestors')),
      value: xfo,
      status: xfo || csp?.toLowerCase().includes('frame-ancestors') ? 'pass' : 'warn',
      note: xfo ? `Clickjacking protection (${xfo}).` : csp?.toLowerCase().includes('frame-ancestors') ? 'Covered via CSP frame-ancestors.' : 'Missing clickjacking protection.',
    },
    {
      header: 'Referrer-Policy',
      present: Boolean(refPol),
      value: refPol,
      status: refPol ? 'pass' : 'warn',
      note: refPol ? 'Controls referrer leakage.' : 'Missing Referrer-Policy.',
    },
    {
      header: 'Permissions-Policy',
      present: Boolean(permPol),
      value: permPol,
      status: permPol ? 'pass' : 'info',
      note: permPol ? 'Restricts browser feature APIs.' : 'Optional: restrict camera/mic/geolocation APIs.',
    },
    {
      header: 'Access-Control-Allow-Origin',
      present: Boolean(cors),
      value: cors,
      status: 'info',
      note: cors ? (cors === '*' ? 'Open wildcard CORS (*).' : `Restricted CORS (${cors}).`) : 'Not set (same-origin default).',
    },
    {
      header: 'Server',
      present: Boolean(server),
      value: server,
      status: 'info',
      note: server ? `Advertises "${server}".` : 'Server banner hidden.',
    },
  ];

  const scoredItems = audit.slice(0, 5);
  const passed = scoredItems.filter((a) => a.status === 'pass').length;
  const score = Math.round((passed / scoredItems.length) * 100) + (permPol ? 5 : 0);
  const clampedScore = Math.min(100, score);

  const grade: HttpHeaderInspectResult['grade'] =
    clampedScore >= 95
      ? 'A+'
      : clampedScore >= 80
        ? 'A'
        : clampedScore >= 60
          ? 'B'
          : clampedScore >= 40
            ? 'C'
            : clampedScore >= 20
              ? 'D'
              : 'F';

  return { audit, score: clampedScore, grade };
}

export async function performHttpHeaderInspect(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HttpHeaderInspectResult> {
  let currentUrl = normalizeHttpUrl(rawUrl);
  const initialUrl = currentUrl.toString();
  const redirects: RedirectHop[] = [];
  const startedTotal = performance.now();

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    // SSRF check on every single hop!
    await resolvePublicTarget(currentUrl.hostname);

    const hopStart = performance.now();
    const res = await fetchImpl(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'lui.z-tools-header-inspector/1.0',
        Accept: 'text/html,application/json,*/*;q=0.8',
      },
    });
    const durationMs = Math.round((performance.now() - hopStart) * 10) / 10;

    // Drain/cancel body to avoid resource leaks
    try {
      await res.body?.cancel();
    } catch {
      // Ignore cancel errors
    }

    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      redirects.push({
        url: currentUrl.toString(),
        status: res.status,
        location,
        durationMs,
      });
      if (hop === MAX_HOPS) {
        throw new Error(`Exceeded maximum redirect hops (${MAX_HOPS}).`);
      }
      currentUrl = new URL(location, currentUrl);
      if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
        throw new Error('Redirect target uses a disallowed protocol.');
      }
      continue;
    }

    const headersObj: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headersObj[k.toLowerCase()] = v;
    });

    const { audit, score, grade } = auditSecurityHeaders(headersObj, currentUrl.protocol === 'https:');

    return {
      initialUrl,
      finalUrl: currentUrl.toString(),
      status: res.status,
      statusText: res.statusText || '',
      totalMs: Math.round((performance.now() - startedTotal) * 10) / 10,
      redirects,
      headers: headersObj,
      audit,
      score,
      grade,
    };
  }

  throw new Error('Failed to resolve HTTP response.');
}
