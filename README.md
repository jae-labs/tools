<p align="center">
<img src="public/favicon.svg" alt="lui.z Logo" width="120"/>
</p>

<p align="center">
<a href="https://cg5l6gtazzu04lvpkz4ycr8t.fra.prisma.build"><img src="https://img.shields.io/website?url=https%3A%2F%2Ftools.justanother.engineer&label=website" alt="Website"></a>
<a href="https://github.com/jae-labs/tools/actions/workflows/prisma-deploy.yml"><img src="https://github.com/jae-labs/tools/actions/workflows/prisma-deploy.yml/badge.svg" alt="Deploy"></a>
<a href="https://github.com/jae-labs/tools/issues"><img src="https://img.shields.io/github/issues/jae-labs/tools" alt="GitHub issues"></a>
<a href="https://github.com/jae-labs/tools/stargazers"><img src="https://img.shields.io/github/stars/jae-labs/tools" alt="GitHub stars"></a>
<a href="https://github.com/jae-labs/tools/network"><img src="https://img.shields.io/github/forks/jae-labs/tools" alt="GitHub forks"></a>
<a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-runtime-f9f1e1?logo=bun&logoColor=000" alt="Bun"></a>
<a href="https://www.prisma.io"><img src="https://img.shields.io/badge/Prisma%20Compute-deployed-2d3748?logo=prisma&logoColor=white" alt="Prisma Compute"></a>
<a href="https://buymeacoffee.com/luiz1361"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-donate-orange.svg?logo=buymeacoffee" alt="Buy Me A Coffee"></a>
</p>

Network diagnostics and utility suite powering [tools.justanother.engineer](https://tools.justanother.engineer).

Includes **What Is My IP** (dual-stack IPv4/IPv6, Leaflet geolocation map, ISP/ASN, and HTTP headers), **Online Ping** (live probe-by-probe ICMP with TCP fallback), **Traceroute** (live hop-by-hop trace), **DNS Lookup**, **DNS Propagation** (live multi-region Prisma Compute + 9 global DNS resolvers with world map), **WHOIS**, **Port Check**, **Reverse Lookup** (PTR + FCrDNS), **Proxy Checker**, **RBL Blacklist Check** (25+ DNSBL & domain blocklist zones via DoH), **SPF Policy Tester** (Basic & Advanced RFC 7208 evaluator with macros, 10-lookup guard & custom policy override), **Country by IP**, **Multi-Region Speed Test** (Three.js 3D Prisma Compute topology + live throughput chart), **Network / Subnet Calculator**, **SLA Calculator** (Simple, Compare, and Reverse uptime/downtime nines calculator), **Epoch Converter** (live Unix ticker, multi-precision timestamps & human date conversion), **Days & Workdays Calculator** (add/subtract days or effort hours, between-dates diff, skip weekends & country holidays), **JSON Sort** (deep alphabetical key & optional array sorting), **XML to JSON**, **Base64 Encode / Decode**, **URL Encode / Decode**, **Crontab Converter** (human summary + next 10 run times), **Regex Tester** (live match highlighter, capture groups, substitution & token explainer), **ASCII Art Builder**, **IPv4 to IPv6 Converter** (`::ffff:`, 6to4, NAT64, ISATAP & reverse extraction), and **Unit Converter**.

## Stack

- Bun HTTP runtime on Prisma Compute
- TypeScript & Vite
- Tailwind CSS 4
- Three.js for interactive 3D speed topology & packet animation
- Leaflet for interactive IP geolocation mapping
- Vitest & ESLint
- GitHub Actions for CI and deployment

## Endpoints

| Endpoint | Response |
| --- | --- |
| `GET /api/me` | JSON with visitor `client` IP info and `geo` metadata |
| `GET /api/info` | JSON with `client`, `geo`, `connection`, and sanitized `headers` |
| `GET /api/ping?host=H&count=N` | JSON RTT probe results (ICMP with TCP connect fallback) or speed probe when `host` is omitted |
| `GET /api/traceroute?host=H` | JSON hop-by-hop route trace (supports `?hop=N` for live stepping) |
| `GET /api/dns?host=H&type=ALL` | JSON DNS records with TTLs (`A`, `AAAA`, `MX`, `NS`, `TXT`, `CNAME`, `SOA`, `CAA`, `SRV`, `PTR`) |
| `GET /api/propagation?host=H&type=A` | JSON global DNS propagation results across 6 Prisma Compute regions & 9 public resolvers (supports `offset`/`limit` & `expected`) |
| `GET /api/whois?query=Q` | JSON WHOIS / RDAP registration summary and raw record |
| `GET /api/port?host=H&ports=80,443` | JSON TCP port reachability and latency |
| `GET /api/reverse?ip=IP` | JSON PTR hostnames and FCrDNS verification |
| `GET /api/proxy?ip=IP` | JSON proxy header, open proxy port, and ASN risk signals |
| `GET /api/rbl?target=T` | JSON multi-zone DNSBL / domain blocklist lookup results (supports `offset`/`limit` batching) |
| `GET/POST /api/spf` | JSON RFC 7208 SPF policy test (`domain`, optional `ip`, `sender`, `helo`, `record` custom policy) |
| `GET /api/geo?target=T` | JSON geolocation, ASN, and ISP metadata |
| `GET /api/download?bytes=N` | Streams `N` incompressible bytes with `Cache-Control: no-store, no-transform` |
| `POST /api/upload` | Consumes body stream and returns JSON throughput summary |
| `GET /api/bandwidth?bytes=N` | Alias for `GET /api/download` |
| `GET /api/subnet?cidr=C` | JSON IPv4/IPv6 CIDR, masks, binary octets, and subnet splits |
| `GET /api/sla?pct=99.9` | JSON SLA uptime/downtime intervals (`?compare=99.99` or reverse `?down=45m&period=monthly`) |
| `GET /api/epoch?ts=1700000000` | JSON Unix epoch timestamp conversion (`?ts=...` or `?date=...`, auto-detects s/ms/µs/ns) |

## Quick Start

Requires Node.js `>=22.18` (or `>=24.11`) and Bun.

1. Install dependencies.

   ```bash
   npm ci
   ```

2. Build and start the local emulator.

   ```bash
   npm run dev
   ```

3. Open the local URL printed in the terminal, usually `http://localhost:3000`.

4. Run the full verification suite before pushing.

   ```bash
   npm run check
   ```

Common commands:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `npm run dev` | Build and start local Prisma Compute emulator |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test:run` | Run unit tests once |
| `npm run build` | Build client and server bundles into `dist/` |
| `npm run check` | Run lint, typecheck, tests, and build |
| `npm run deploy` | Run full check and deploy to Prisma Compute |

## Project Structure

```text
index.html                          document shell and layout
src/client/                         frontend tools UI, 3D speed topology, Leaflet map, and styles
src/server.ts                       Bun entrypoint
src/server/                         HTTP router, IP/SSRF validation, geo lookup, and diagnostic probes
src/shared/                         subnet calculator, unit converter, and Prisma region registry
tests/                              unit and route tests
module.ts                           Prisma Composer root module
service.ts                          Prisma Compute service definition
prisma.config.ts                    Prisma CLI and target configuration
public/                             static assets
.github/workflows/ci.yml            Pull request quality checks
.github/workflows/prisma-deploy.yml CI checks and Prisma Compute deployment
.github/dependabot.yml              Weekly npm and GitHub Actions updates
```

## Deployment

- **Production:** [tools.justanother.engineer](https://tools.justanother.engineer)

## Contributing

See [CONTRIBUTING.md](https://github.com/jae-labs/tools?tab=contributing-ov-file).

## Agent Notes

See [AGENTS.md](AGENTS.md).

## License

See [LICENSE](LICENSE).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=jae-labs/tools&type=date&legend=top-left)](https://www.star-history.com/#jae-labs/tools&type=date&legend=top-left)
