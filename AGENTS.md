# AGENTS.md

## Overview

- Network diagnostics & utility suite (Ping, Traceroute, DNS Lookup, DNS Propagation, WHOIS, Port Check, Reverse Lookup, Proxy Checker, RBL Blacklist Check, SPF Policy Tester, Country/IP Lookup, Bandwidth Meter, Subnet Calculator, SLA Calculator, Epoch Converter, Days & Workdays Calculator, JSON Sort, XML to JSON, Base64 Encode/Decode, URL Encode/Decode, Crontab Converter, Regex Tester, ASCII Art Builder, IPv4 to IPv6 Converter, Unit Converter) running on Prisma Compute (Bun runtime).
- Primary JSON/streaming endpoints: `/api/me`, `/api/ping`, `/api/traceroute`, `/api/dns`, `/api/propagation`, `/api/whois`, `/api/port`, `/api/reverse`, `/api/proxy`, `/api/rbl`, `/api/spf`, `/api/geo`, `/api/bandwidth`, `/api/subnet`, `/api/sla`, `/api/epoch`.

## Commands

- `npm ci` — install dependencies
- `npm run check` — lint, typecheck, test, build
- `npm run dev` — build and start local emulator

## Constraints

- Composer declarations live in `module.ts`, `service.ts`, and `prisma.config.ts`.
- Bind `0.0.0.0` on `service.port()`; never read `process.env` in service runtime code.
- Always run `npm run build` before `prisma dev` or `prisma deploy`.
- All server-side network probes must validate targets and block private/loopback/link-local/reserved IPs to prevent SSRF.
