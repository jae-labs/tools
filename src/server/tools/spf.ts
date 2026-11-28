import { isIP } from 'node:net';
import { normalizeIp } from '../ip.ts';

export type SpfQualifier = '+' | '-' | '~' | '?';

export type SpfVerdict =
  | 'pass'
  | 'fail'
  | 'softfail'
  | 'neutral'
  | 'none'
  | 'permerror'
  | 'temperror';

export interface SpfTraceStep {
  depth: number;
  domain: string;
  term: string;
  expandedTerm: string;
  mechanism: string;
  qualifier: SpfQualifier | 'modifier';
  dnsLookupDelta: number;
  voidLookupDelta: number;
  matched: boolean | null;
  result?: SpfVerdict;
  detail: string;
}

export interface SpfTestInput {
  domain: string;
  senderIp?: string;
  sender?: string;
  helo?: string;
  customRecord?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export interface SpfTestResult {
  domain: string;
  sender: string;
  helo: string;
  senderIp: string | null;
  usedCustomRecord: boolean;
  record: string | null;
  allTxtSpfRecords: string[];
  verdict: SpfVerdict;
  matchedMechanism: string | null;
  explanation?: string;
  dnsLookups: number;
  maxDnsLookups: number;
  voidLookups: number;
  maxVoidLookups: number;
  authorizedNetworks: string[];
  includes: string[];
  warnings: string[];
  trace: SpfTraceStep[];
  elapsedMs: number;
}

interface DohAnswer {
  type?: number;
  data?: string;
}

interface DohResponse {
  Status?: number;
  Answer?: DohAnswer[];
}

interface ParsedCidr {
  family: 4 | 6;
  value: bigint;
  prefix: number;
}

const QUALIFIER_TO_VERDICT: Record<SpfQualifier, SpfVerdict> = {
  '+': 'pass',
  '-': 'fail',
  '~': 'softfail',
  '?': 'neutral',
};

function assertAllowedDnsDomain(rawDomain: string): string {
  const cleaned = rawDomain.trim().replace(/\.$/, '').toLowerCase();
  if (!cleaned || cleaned.length > 253) {
    throw new Error('Invalid or empty domain name.');
  }
  const labels = cleaned.split('.');
  // Allow underscores in SPF/service DNS labels (e.g. _spf.google.com, _netblocks.google.com)
  if (labels.some((l) => !l || l.length > 63 || !/^[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?$/.test(l))) {
    throw new Error(`Invalid DNS domain syntax: "${rawDomain}"`);
  }
  if (
    cleaned === 'localhost' ||
    cleaned.endsWith('.localhost') ||
    cleaned.endsWith('.local') ||
    cleaned.endsWith('.internal')
  ) {
    throw new Error(`Reserved or local domain "${cleaned}" cannot be queried.`);
  }
  return cleaned;
}

function stripTxtQuotes(raw: string): string {
  return raw
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/"\s+"/g, '');
}

async function queryDohJson(
  name: string,
  rrType: 'TXT' | 'A' | 'AAAA' | 'MX' | 'PTR',
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<{ status: number; answers: string[] }> {
  const cleanName = assertAllowedDnsDomain(name);
  const res = await fetchFn(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanName)}&type=${rrType}`,
    {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!res.ok) {
    throw new Error(`DoH HTTP ${res.status}`);
  }
  const body = (await res.json()) as DohResponse;
  const status = body.Status ?? 0;
  const answers = (body.Answer ?? [])
    .filter((a) => typeof a.data === 'string')
    .map((a) => stripTxtQuotes(a.data as string));
  return { status, answers };
}

function ipv4ToBigInt(ip: string): bigint {
  const parts = ip.split('.').map(Number);
  return BigInt((((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0));
}

function expandIpv6(ip: string): string {
  const clean = ip.toLowerCase().split('%')[0] ?? ip;
  const [leftRaw, rightRaw] = clean.split('::');
  const left = leftRaw ? leftRaw.split(':').filter(Boolean) : [];
  const right = rightRaw !== undefined ? (rightRaw ? rightRaw.split(':').filter(Boolean) : []) : [];
  const missing = rightRaw !== undefined ? Math.max(0, 8 - (left.length + right.length)) : 0;
  const full = [...left, ...Array<string>(missing).fill('0'), ...right];
  return full.map((g) => g.padStart(4, '0')).join(':');
}

function ipv6ToBigInt(ip: string): bigint {
  return BigInt(`0x${expandIpv6(ip).replaceAll(':', '')}`);
}

function parseCidr(ipStr: string, prefixStr?: string): ParsedCidr {
  const norm = normalizeIp(ipStr);
  if (!norm) {
    throw new Error(`Invalid IP address "${ipStr}".`);
  }
  const family = isIP(norm) === 6 ? 6 : 4;
  const maxBits = family === 6 ? 128 : 32;
  const prefix = prefixStr !== undefined ? Number(prefixStr) : maxBits;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxBits) {
    throw new Error(`Invalid /${prefixStr} CIDR prefix for IPv${family}.`);
  }
  const value = family === 4 ? ipv4ToBigInt(norm) : ipv6ToBigInt(norm);
  return { family, value, prefix };
}

function ipMatchesCidr(ipCidr: ParsedCidr, networkCidr: ParsedCidr): boolean {
  if (ipCidr.family !== networkCidr.family) return false;
  const totalBits = ipCidr.family === 6 ? 128 : 32;
  if (networkCidr.prefix === 0) return true;
  const shift = BigInt(totalBits - networkCidr.prefix);
  return (ipCidr.value >> shift) === (networkCidr.value >> shift);
}

function formatMacroIp(ip: string | null): { iStr: string; vStr: 'in-addr' | 'ip6' } {
  if (!ip) return { iStr: '0.0.0.0', vStr: 'in-addr' };
  const family = isIP(ip);
  if (family === 6) {
    const nibbles = expandIpv6(ip).replaceAll(':', '').split('').join('.');
    return { iStr: nibbles, vStr: 'ip6' };
  }
  return { iStr: ip, vStr: 'in-addr' };
}

export function expandSpfMacro(
  template: string,
  ctx: { domain: string; sender: string; helo: string; ip: string | null },
): string {
  const atIdx = ctx.sender.indexOf('@');
  const localPart = atIdx > 0 ? ctx.sender.slice(0, atIdx) : 'postmaster';
  const senderDomain = atIdx >= 0 ? ctx.sender.slice(atIdx + 1) : ctx.domain;
  const { iStr, vStr } = formatMacroIp(ctx.ip);

  return template
    .replace(/%%|%_|%-|%\{([a-zA-Z])(\d*)(r?)([^}]*)\}/g, (full, letterRaw, digitsRaw, revFlag, delimsRaw) => {
      if (full === '%%') return '%';
      if (full === '%_') return ' ';
      if (full === '%-') return '%20';

      const letter = String(letterRaw).toLowerCase();
      let rawVal: string;
      if (letter === 's') rawVal = `${localPart}@${senderDomain}`;
      else if (letter === 'l') rawVal = localPart;
      else if (letter === 'o') rawVal = senderDomain;
      else if (letter === 'd') rawVal = ctx.domain;
      else if (letter === 'i') rawVal = iStr;
      else if (letter === 'v') rawVal = vStr;
      else if (letter === 'h') rawVal = ctx.helo;
      else if (letter === 'p') rawVal = 'unknown';
      else if (letter === 'c') rawVal = ctx.ip ?? '0.0.0.0';
      else if (letter === 't') rawVal = String(Math.floor(Date.now() / 1000));
      else return full;

      const splitPattern = delimsRaw ? new RegExp(`[${delimsRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`) : /\./;
      let parts = rawVal.split(splitPattern);
      if (revFlag === 'r') parts = parts.reverse();
      if (digitsRaw) {
        const keep = Number(digitsRaw);
        if (keep > 0 && keep < parts.length) {
          parts = parts.slice(parts.length - keep);
        }
      }
      const joined = parts.join('.');
      return letterRaw === letterRaw.toUpperCase() ? encodeURIComponent(joined) : joined;
    });
}

function splitCidrSuffix(spec: string): { hostSpec: string; v4Prefix?: string; v6Prefix?: string } {
  const slashIdx = spec.indexOf('/');
  if (slashIdx === -1) return { hostSpec: spec };
  const hostSpec = spec.slice(0, slashIdx);
  const rest = spec.slice(slashIdx + 1);
  if (rest.includes('//')) {
    const [v4P, v6P] = rest.split('//');
    return {
      hostSpec,
      v4Prefix: v4P || undefined,
      v6Prefix: v6P || undefined,
    };
  }
  return { hostSpec, v4Prefix: rest || undefined };
}

export async function performSpfTest(input: SpfTestInput): Promise<SpfTestResult> {
  const started = Date.now();
  const fetchFn = input.fetchFn ?? fetch;
  const timeoutMs = Math.max(800, Math.min(8000, input.timeoutMs ?? 4500));

  let rawDomain = input.domain.trim();
  const senderInput = input.sender?.trim() || '';
  if (!rawDomain && senderInput.includes('@')) {
    rawDomain = senderInput.slice(senderInput.indexOf('@') + 1);
  }
  if (!rawDomain) {
    throw new Error('Enter a domain name or MAIL FROM email address.');
  }

  const domain = assertAllowedDnsDomain(rawDomain);
  const sender = senderInput
    ? senderInput.includes('@')
      ? senderInput
      : `postmaster@${senderInput}`
    : `postmaster@${domain}`;
  const helo = input.helo?.trim() ? assertAllowedDnsDomain(input.helo) : domain;

  let senderIp: string | null = null;
  let parsedSenderIp: ParsedCidr | null = null;
  if (input.senderIp && input.senderIp.trim()) {
    const norm = normalizeIp(input.senderIp.trim());
    if (!norm) {
      throw new Error(`Invalid Sender IP address: "${input.senderIp.trim()}"`);
    }
    senderIp = norm;
    parsedSenderIp = parseCidr(norm);
  }

  const customRecord = input.customRecord?.trim() || null;
  const warnings: string[] = [];
  const trace: SpfTraceStep[] = [];
  const authorizedNetworks: string[] = [];
  const includes: string[] = [];

  let dnsLookups = 0;
  let voidLookups = 0;
  const maxDnsLookups = 10;
  const maxVoidLookups = 2;

  let topRecord: string | null = customRecord;
  let allTxtSpfRecords: string[] = customRecord ? [customRecord] : [];

  const fetchSpfRecord = async (targetDomain: string): Promise<{ record: string | null; all: string[]; verdict?: SpfVerdict; error?: string }> => {
    try {
      const txtRes = await queryDohJson(targetDomain, 'TXT', fetchFn, timeoutMs);
      if (txtRes.status === 2) {
        return { record: null, all: [], verdict: 'temperror', error: 'DNS SERVFAIL querying TXT record' };
      }
      const spfStrings = txtRes.answers.filter((t) => /^v=spf1(?:\s|$)/i.test(t.trim()));
      if (spfStrings.length === 0) {
        return { record: null, all: [], verdict: 'none' };
      }
      if (spfStrings.length > 1) {
        return {
          record: spfStrings[0]!,
          all: spfStrings,
          verdict: 'permerror',
          error: `Multiple v=spf1 records found (${spfStrings.length}) — RFC 7208 §3.2 requires exactly one.`,
        };
      }
      return { record: spfStrings[0]!, all: spfStrings };
    } catch (err) {
      return {
        record: null,
        all: [],
        verdict: 'temperror',
        error: err instanceof Error ? err.message : 'DNS lookup error',
      };
    }
  };

  if (!customRecord) {
    const top = await fetchSpfRecord(domain);
    topRecord = top.record;
    allTxtSpfRecords = top.all;
    if (top.verdict === 'none') {
      return {
        domain,
        sender,
        helo,
        senderIp,
        usedCustomRecord: false,
        record: null,
        allTxtSpfRecords: [],
        verdict: 'none',
        matchedMechanism: null,
        dnsLookups,
        maxDnsLookups,
        voidLookups,
        maxVoidLookups,
        authorizedNetworks,
        includes,
        warnings: ['No v=spf1 TXT record published for this domain.'],
        trace: [
          {
            depth: 0,
            domain,
            term: 'TXT v=spf1',
            expandedTerm: domain,
            mechanism: 'lookup',
            qualifier: 'modifier',
            dnsLookupDelta: 0,
            voidLookupDelta: 0,
            matched: false,
            result: 'none',
            detail: 'No v=spf1 TXT record found.',
          },
        ],
        elapsedMs: Date.now() - started,
      };
    }
    if (top.verdict === 'permerror' || top.verdict === 'temperror') {
      return {
        domain,
        sender,
        helo,
        senderIp,
        usedCustomRecord: false,
        record: topRecord,
        allTxtSpfRecords,
        verdict: top.verdict,
        matchedMechanism: null,
        dnsLookups,
        maxDnsLookups,
        voidLookups,
        maxVoidLookups,
        authorizedNetworks,
        includes,
        warnings: [top.error ?? 'SPF record lookup failed.'],
        trace: [
          {
            depth: 0,
            domain,
            term: 'TXT v=spf1',
            expandedTerm: domain,
            mechanism: 'lookup',
            qualifier: 'modifier',
            dnsLookupDelta: 0,
            voidLookupDelta: 0,
            matched: false,
            result: top.verdict,
            detail: top.error ?? 'SPF lookup failed.',
          },
        ],
        elapsedMs: Date.now() - started,
      };
    }
  } else if (!/^v=spf1(?:\s|$)/i.test(customRecord)) {
    return {
      domain,
      sender,
      helo,
      senderIp,
      usedCustomRecord: true,
      record: customRecord,
      allTxtSpfRecords,
      verdict: 'permerror',
      matchedMechanism: null,
      dnsLookups,
      maxDnsLookups,
      voidLookups,
      maxVoidLookups,
      authorizedNetworks,
      includes,
      warnings: ['Custom SPF record must begin with "v=spf1".'],
      trace: [],
      elapsedMs: Date.now() - started,
    };
  }

  let finalMatchedMech: string | null = null;
  let explanationText: string | undefined;

  const checkLookupBudget = (): boolean => {
    dnsLookups += 1;
    if (dnsLookups > maxDnsLookups) {
      warnings.push(`DNS lookup limit exceeded (${dnsLookups}/${maxDnsLookups}) per RFC 7208 §4.6.4.`);
      return false;
    }
    return true;
  };

  const trackVoid = (status: number, answerCount: number): boolean => {
    if (status === 3 || answerCount === 0) {
      voidLookups += 1;
      if (voidLookups > maxVoidLookups) {
        warnings.push(`Void lookup limit exceeded (${voidLookups}/${maxVoidLookups}) per RFC 7208 §4.6.4.`);
        return false;
      }
    }
    return true;
  };

  const evalDomainSpf = async (
    currentDomain: string,
    recordString: string,
    depth: number,
    visited: Set<string>,
  ): Promise<SpfVerdict> => {
    if (visited.has(currentDomain)) {
      warnings.push(`Circular SPF reference detected on "${currentDomain}".`);
      return 'permerror';
    }
    const nextVisited = new Set(visited);
    nextVisited.add(currentDomain);

    const tokens = recordString.trim().split(/\s+/).slice(1);
    let redirectModifier: string | null = null;
    let expModifier: string | null = null;
    const mechanisms: string[] = [];

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (lower.startsWith('redirect=')) {
        redirectModifier = token.slice('redirect='.length);
      } else if (lower.startsWith('exp=')) {
        expModifier = token.slice('exp='.length);
      } else {
        mechanisms.push(token);
      }
    }

    for (const rawTerm of mechanisms) {
      let qualifier: SpfQualifier = '+';
      let termBody = rawTerm;
      if (/^[+\-~?]/.test(rawTerm)) {
        qualifier = rawTerm[0] as SpfQualifier;
        termBody = rawTerm.slice(1);
      }

      const colonIdx = termBody.indexOf(':');
      const slashIdx = termBody.indexOf('/');
      let mechName = termBody;
      let arg = '';
      if (colonIdx !== -1) {
        mechName = termBody.slice(0, colonIdx);
        arg = termBody.slice(colonIdx + 1);
      } else if (slashIdx !== -1 && !termBody.toLowerCase().startsWith('ip')) {
        mechName = termBody.slice(0, slashIdx);
        arg = termBody.slice(slashIdx);
      }
      mechName = mechName.toLowerCase();

      const macroCtx = { domain: currentDomain, sender, helo, ip: senderIp };
      const expandedArg = arg ? expandSpfMacro(arg, macroCtx) : '';
      const expandedTerm = expandedArg ? `${qualifier}${mechName}:${expandedArg}` : `${qualifier}${mechName}`;

      if (mechName === 'all') {
        const verdict = QUALIFIER_TO_VERDICT[qualifier];
        trace.push({
          depth,
          domain: currentDomain,
          term: rawTerm,
          expandedTerm: `${qualifier}all`,
          mechanism: 'all',
          qualifier,
          dnsLookupDelta: 0,
          voidLookupDelta: 0,
          matched: parsedSenderIp ? true : null,
          result: verdict,
          detail: parsedSenderIp
            ? `Fallback "all" matched -> ${verdict.toUpperCase()}`
            : `Default catch-all policy: ${verdict.toUpperCase()}`,
        });
        if (parsedSenderIp) {
          finalMatchedMech = rawTerm;
          return verdict;
        }
        continue;
      }

      if (mechName === 'ip4' || mechName === 'ip6') {
        const [addrStr, prefixStr] = arg.split('/');
        try {
          const netCidr = parseCidr(addrStr ?? '', prefixStr);
          if ((mechName === 'ip4' && netCidr.family !== 4) || (mechName === 'ip6' && netCidr.family !== 6)) {
            throw new Error(`Family mismatch in ${rawTerm}`);
          }
          authorizedNetworks.push(arg.includes('/') ? arg : `${addrStr}/${netCidr.prefix}`);
          const matched = parsedSenderIp ? ipMatchesCidr(parsedSenderIp, netCidr) : null;
          trace.push({
            depth,
            domain: currentDomain,
            term: rawTerm,
            expandedTerm: rawTerm,
            mechanism: mechName,
            qualifier,
            dnsLookupDelta: 0,
            voidLookupDelta: 0,
            matched,
            result: matched ? QUALIFIER_TO_VERDICT[qualifier] : undefined,
            detail: matched ? `Sender IP ${senderIp} matches ${arg}` : `Network ${arg}`,
          });
          if (matched) {
            finalMatchedMech = rawTerm;
            return QUALIFIER_TO_VERDICT[qualifier];
          }
        } catch (err) {
          warnings.push(`Invalid CIDR in "${rawTerm}": ${err instanceof Error ? err.message : 'syntax error'}`);
          trace.push({
            depth,
            domain: currentDomain,
            term: rawTerm,
            expandedTerm: rawTerm,
            mechanism: mechName,
            qualifier,
            dnsLookupDelta: 0,
            voidLookupDelta: 0,
            matched: false,
            result: 'permerror',
            detail: err instanceof Error ? err.message : 'Invalid CIDR syntax',
          });
          return 'permerror';
        }
        continue;
      }

      if (mechName === 'include') {
        if (!expandedArg) {
          warnings.push(`Missing domain argument on "${rawTerm}".`);
          return 'permerror';
        }
        includes.push(expandedArg);
        if (!checkLookupBudget()) return 'permerror';

        const sub = await fetchSpfRecord(expandedArg);
        if (sub.verdict === 'permerror' || sub.verdict === 'temperror') {
          trace.push({
            depth,
            domain: currentDomain,
            term: rawTerm,
            expandedTerm,
            mechanism: 'include',
            qualifier,
            dnsLookupDelta: 1,
            voidLookupDelta: 0,
            matched: false,
            result: sub.verdict,
            detail: sub.error ?? `Sub-lookup error on ${expandedArg}`,
          });
          return sub.verdict;
        }
        if (sub.verdict === 'none' || !sub.record) {
          trackVoid(3, 0);
          warnings.push(`Included domain "${expandedArg}" has no SPF record.`);
          trace.push({
            depth,
            domain: currentDomain,
            term: rawTerm,
            expandedTerm,
            mechanism: 'include',
            qualifier,
            dnsLookupDelta: 1,
            voidLookupDelta: 1,
            matched: false,
            result: 'permerror',
            detail: `No v=spf1 record at ${expandedArg} (PermError)`,
          });
          return 'permerror';
        }

        const headerStep: SpfTraceStep = {
          depth,
          domain: currentDomain,
          term: rawTerm,
          expandedTerm,
          mechanism: 'include',
          qualifier,
          dnsLookupDelta: 1,
          voidLookupDelta: 0,
          matched: null,
          detail: `Evaluating include:${expandedArg}`,
        };
        trace.push(headerStep);

        const subResult = await evalDomainSpf(expandedArg, sub.record, depth + 1, nextVisited);
        if (subResult === 'permerror' || subResult === 'temperror') {
          headerStep.result = subResult;
          return subResult;
        }
        if (parsedSenderIp && subResult === 'pass') {
          headerStep.matched = true;
          headerStep.result = QUALIFIER_TO_VERDICT[qualifier];
          return QUALIFIER_TO_VERDICT[qualifier];
        }
        headerStep.matched = parsedSenderIp ? false : null;
        continue;
      }

      if (mechName === 'a' || mechName === 'mx') {
        if (!checkLookupBudget()) return 'permerror';
        const { hostSpec, v4Prefix, v6Prefix } = splitCidrSuffix(expandedArg);
        const queryHost = hostSpec || currentDomain;
        const resolvedCidrs: ParsedCidr[] = [];
        let isVoid: boolean;

        try {
          if (mechName === 'a') {
            const wantV6 = parsedSenderIp?.family === 6;
            const res = await queryDohJson(queryHost, wantV6 ? 'AAAA' : 'A', fetchFn, timeoutMs);
            isVoid = !trackVoid(res.status, res.answers.length);
            for (const ip of res.answers) {
              if (normalizeIp(ip)) {
                const pref = isIP(ip) === 6 ? (v6Prefix ?? v4Prefix) : v4Prefix;
                resolvedCidrs.push(parseCidr(ip, pref));
                authorizedNetworks.push(pref ? `${ip}/${pref}` : ip);
              }
            }
          } else {
            const mxRes = await queryDohJson(queryHost, 'MX', fetchFn, timeoutMs);
            isVoid = !trackVoid(mxRes.status, mxRes.answers.length);
            const mxHosts = mxRes.answers
              .map((line) => line.split(/\s+/).pop()?.replace(/\.$/, '') ?? '')
              .filter(Boolean)
              .slice(0, 10);
            const targetFamily = parsedSenderIp?.family === 6 ? 'AAAA' : 'A';
            const ipLookups = await Promise.all(
              mxHosts.map((mxHost) => queryDohJson(mxHost, targetFamily, fetchFn, timeoutMs)),
            );
            for (const r of ipLookups) {
              for (const ip of r.answers) {
                if (normalizeIp(ip)) {
                  const pref = isIP(ip) === 6 ? (v6Prefix ?? v4Prefix) : v4Prefix;
                  resolvedCidrs.push(parseCidr(ip, pref));
                  authorizedNetworks.push(pref ? `${ip}/${pref}` : ip);
                }
              }
            }
          }
        } catch {
          trace.push({
            depth,
            domain: currentDomain,
            term: rawTerm,
            expandedTerm,
            mechanism: mechName,
            qualifier,
            dnsLookupDelta: 1,
            voidLookupDelta: 0,
            matched: false,
            result: 'temperror',
            detail: `DNS error querying ${mechName.toUpperCase()} for ${queryHost}`,
          });
          return 'temperror';
        }

        if (isVoid) return 'permerror';

        const matched = parsedSenderIp
          ? resolvedCidrs.some((c) => ipMatchesCidr(parsedSenderIp!, c))
          : null;
        trace.push({
          depth,
          domain: currentDomain,
          term: rawTerm,
          expandedTerm,
          mechanism: mechName,
          qualifier,
          dnsLookupDelta: 1,
          voidLookupDelta: resolvedCidrs.length === 0 ? 1 : 0,
          matched,
          result: matched ? QUALIFIER_TO_VERDICT[qualifier] : undefined,
          detail:
            resolvedCidrs.length > 0
              ? `Resolved ${resolvedCidrs.length} host IP(s) for ${queryHost}`
              : `No ${mechName.toUpperCase()} records found for ${queryHost}`,
        });
        if (matched) {
          finalMatchedMech = rawTerm;
          return QUALIFIER_TO_VERDICT[qualifier];
        }
        continue;
      }

      if (mechName === 'exists') {
        if (!expandedArg) {
          warnings.push(`Missing domain argument on "${rawTerm}".`);
          return 'permerror';
        }
        if (!checkLookupBudget()) return 'permerror';
        try {
          const res = await queryDohJson(expandedArg, 'A', fetchFn, timeoutMs);
          if (!trackVoid(res.status, res.answers.length)) return 'permerror';
          const matched = parsedSenderIp ? res.answers.length > 0 : null;
          trace.push({
            depth,
            domain: currentDomain,
            term: rawTerm,
            expandedTerm,
            mechanism: 'exists',
            qualifier,
            dnsLookupDelta: 1,
            voidLookupDelta: res.answers.length === 0 ? 1 : 0,
            matched,
            result: matched ? QUALIFIER_TO_VERDICT[qualifier] : undefined,
            detail:
              res.answers.length > 0
                ? `A record exists for ${expandedArg}`
                : `No A record at ${expandedArg}`,
          });
          if (matched) {
            finalMatchedMech = rawTerm;
            return QUALIFIER_TO_VERDICT[qualifier];
          }
        } catch {
          return 'temperror';
        }
        continue;
      }

      if (mechName === 'ptr') {
        if (!checkLookupBudget()) return 'permerror';
        warnings.push('Mechanism "ptr" is discouraged by RFC 7208 §5.5 due to slow/unreliable reverse DNS.');
        trace.push({
          depth,
          domain: currentDomain,
          term: rawTerm,
          expandedTerm,
          mechanism: 'ptr',
          qualifier,
          dnsLookupDelta: 1,
          voidLookupDelta: 0,
          matched: parsedSenderIp ? false : null,
          detail: `PTR check evaluated (${expandedArg || currentDomain})`,
        });
        continue;
      }

      warnings.push(`Unknown or unsupported SPF mechanism: "${rawTerm}".`);
      return 'permerror';
    }

    if (redirectModifier) {
      const target = expandSpfMacro(redirectModifier, { domain: currentDomain, sender, helo, ip: senderIp });
      includes.push(`redirect=${target}`);
      if (!checkLookupBudget()) return 'permerror';
      const redir = await fetchSpfRecord(target);
      if (redir.verdict === 'none' || !redir.record) {
        warnings.push(`Redirect target "${target}" has no SPF record.`);
        return 'permerror';
      }
      if (redir.verdict === 'permerror' || redir.verdict === 'temperror') {
        return redir.verdict;
      }
      trace.push({
        depth,
        domain: currentDomain,
        term: `redirect=${redirectModifier}`,
        expandedTerm: `redirect=${target}`,
        mechanism: 'redirect',
        qualifier: 'modifier',
        dnsLookupDelta: 1,
        voidLookupDelta: 0,
        matched: null,
        detail: `Redirecting evaluation to ${target}`,
      });
      return evalDomainSpf(target, redir.record, depth + 1, nextVisited);
    }

    if (expModifier && parsedSenderIp) {
      try {
        const expHost = expandSpfMacro(expModifier, { domain: currentDomain, sender, helo, ip: senderIp });
        const expRes = await queryDohJson(expHost, 'TXT', fetchFn, timeoutMs);
        if (expRes.answers[0]) {
          explanationText = expandSpfMacro(expRes.answers[0], { domain: currentDomain, sender, helo, ip: senderIp });
        }
      } catch {
        // Optional explanation TXT lookup
      }
    }

    return 'neutral';
  };

  let verdict = await evalDomainSpf(domain, topRecord ?? '', 0, new Set());
  if (voidLookups > maxVoidLookups && verdict !== 'temperror') {
    verdict = 'permerror';
  }
  if (dnsLookups > maxDnsLookups && verdict !== 'temperror') {
    verdict = 'permerror';
  }
  if (!parsedSenderIp && verdict !== 'permerror' && verdict !== 'temperror') {
    // Audit-only mode when no sender IP provided: report pass/valid-policy if no errors occurred
    verdict = 'pass';
  }

  return {
    domain,
    sender,
    helo,
    senderIp,
    usedCustomRecord: Boolean(customRecord),
    record: topRecord,
    allTxtSpfRecords,
    verdict,
    matchedMechanism: finalMatchedMech,
    explanation: explanationText,
    dnsLookups,
    maxDnsLookups,
    voidLookups,
    maxVoidLookups,
    authorizedNetworks: Array.from(new Set(authorizedNetworks)),
    includes: Array.from(new Set(includes)),
    warnings,
    trace,
    elapsedMs: Math.max(1, Date.now() - started),
  };
}
