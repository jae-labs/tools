import { resolveTxt } from 'node:dns/promises';
import { sanitizeTargetHost } from '../ip.ts';

export interface DmarcInspectResult {
  domain: string;
  queryHost: string;
  found: boolean;
  record: string | null;
  tags: Record<string, string>;
  policy: string | null;
  subdomainPolicy: string | null;
  pct: number;
  rua: string[];
  ruf: string[];
  issues: string[];
}

export interface DkimInspectResult {
  domain: string;
  selector: string;
  queryHost: string;
  found: boolean;
  record: string | null;
  tags: Record<string, string>;
  keyType: string | null;
  hasPublicKey: boolean;
  keyLengthHint: number | null;
}

export function parseTagList(record: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of record.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim().toLowerCase();
    const v = trimmed.slice(eq + 1).trim();
    if (k) tags[k] = v;
  }
  return tags;
}

export async function performDmarcLookup(rawDomain: string): Promise<DmarcInspectResult> {
  const domain = sanitizeTargetHost(rawDomain);
  const queryHost = `_dmarc.${domain}`;

  let txtRecords: string[];
  try {
    const chunks = await resolveTxt(queryHost);
    txtRecords = chunks.map((c) => c.join(''));
  } catch {
    txtRecords = [];
  }

  const dmarcRecord = txtRecords.find((r) => r.trim().toLowerCase().startsWith('v=dmarc1')) ?? null;
  if (!dmarcRecord) {
    return {
      domain,
      queryHost,
      found: false,
      record: null,
      tags: {},
      policy: null,
      subdomainPolicy: null,
      pct: 100,
      rua: [],
      ruf: [],
      issues: ['No DMARC TXT record found at _dmarc.' + domain],
    };
  }

  const tags = parseTagList(dmarcRecord);
  const policy = tags.p ?? null;
  const subdomainPolicy = tags.sp ?? null;
  const pct = tags.pct !== undefined && Number.isFinite(Number(tags.pct)) ? Number(tags.pct) : 100;
  const rua = tags.rua ? tags.rua.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const ruf = tags.ruf ? tags.ruf.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const issues: string[] = [];
  if (!policy) issues.push('Missing required p= policy tag.');
  else if (policy === 'none') issues.push('Policy is p=none (monitoring only; does not block spoofing).');
  if (pct < 100) issues.push(`Policy applies to only ${pct}% of messages (pct=${pct}).`);
  if (rua.length === 0) issues.push('No aggregate report address (rua=) configured.');

  return {
    domain,
    queryHost,
    found: true,
    record: dmarcRecord,
    tags,
    policy,
    subdomainPolicy,
    pct,
    rua,
    ruf,
    issues,
  };
}

export async function performDkimLookup(rawDomain: string, rawSelector: string): Promise<DkimInspectResult> {
  const domain = sanitizeTargetHost(rawDomain);
  const selector = rawSelector.trim().replace(/[^a-zA-Z0-9._-]/g, '');
  if (!selector) {
    throw new Error('DKIM selector is required (e.g. google, selector1, default).');
  }
  const queryHost = `${selector}._domainkey.${domain}`;

  let txtRecords: string[];
  try {
    const chunks = await resolveTxt(queryHost);
    txtRecords = chunks.map((c) => c.join(''));
  } catch {
    txtRecords = [];
  }

  const record =
    txtRecords.find((r) => r.toLowerCase().includes('v=dkim1') || r.toLowerCase().includes('p=')) ?? null;
  if (!record) {
    return {
      domain,
      selector,
      queryHost,
      found: false,
      record: null,
      tags: {},
      keyType: null,
      hasPublicKey: false,
      keyLengthHint: null,
    };
  }

  const tags = parseTagList(record);
  const pubKey = tags.p ?? '';
  const hasPublicKey = pubKey.length > 0;
  // Rough RSA bit estimate from Base64 SPKI length
  const rawBytes = Math.floor((pubKey.replace(/=+$/, '').length * 3) / 4);
  const keyLengthHint = hasPublicKey
    ? rawBytes >= 250
      ? 2048
      : rawBytes >= 120
        ? 1024
        : rawBytes * 8
    : null;

  return {
    domain,
    selector,
    queryHost,
    found: true,
    record,
    tags,
    keyType: tags.k ?? 'rsa',
    hasPublicKey,
    keyLengthHint,
  };
}
