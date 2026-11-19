export interface DualStackResult {
  ipv4: string | null;
  ipv6: string | null;
}

async function probeEndpoint(url: string, timeoutMs = 2800): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { ip?: unknown };
    return typeof data.ip === 'string' && data.ip.length > 0 ? data.ip : null;
  } catch {
    return null;
  }
}

export async function resolveDualStack(
  serverIp: string,
  serverFamily: 'IPv4' | 'IPv6' | 'unknown',
): Promise<DualStackResult> {
  let ipv4: string | null = serverFamily === 'IPv4' ? serverIp : null;
  let ipv6: string | null = serverFamily === 'IPv6' ? serverIp : null;

  const tasks: Array<Promise<void>> = [];

  if (!ipv4) {
    tasks.push(
      probeEndpoint('https://api4.ipify.org?format=json').then((probed) => {
        if (probed) ipv4 = probed;
      }),
    );
  }

  if (!ipv6) {
    tasks.push(
      probeEndpoint('https://api6.ipify.org?format=json').then((probed) => {
        if (probed) ipv6 = probed;
      }),
    );
  }

  await Promise.all(tasks);

  return { ipv4, ipv6 };
}
