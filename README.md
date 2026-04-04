# Fenrir — Network Security Scanner

> *In Norse mythology, Fenrir is the great wolf — unchained, relentless, and unstoppable. This tool hunts your network the same way.*

An AI-powered network security scanner. Discovers hosts, maps ports and services, identifies vulnerabilities, and uses an LLM to prioritize findings and suggest attack paths — all from a modern web UI.

## Features

- Phase 1 — DNS & WHOIS — subdomain enumeration via subfinder, dig, whois
- Phase 2 — Port & service scan — nmap -sV -sC, banner grabbing
- Phase 3 — Vulnerability scan — nuclei templates + CVE enrichment via NVD API
- Phase 4 — AI analysis — Claude prioritizes findings and maps CVEs to exploits
- Phase 5 — Reporting — auto-generated markdown/PDF pentest report
- Web UI — React + FastAPI dashboard with live scan output via WebSocket

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI + Python |
| AI | Anthropic Claude API |
| Scanning | nmap, nuclei, subfinder, masscan |
| Database | SQLite |

## Safety

This tool is for authorized testing only. A scope file restricts all scans to explicitly allowed CIDR ranges. All actions are logged to an append-only audit log. Exploitation features run in dry-run mode by default.

## Quickstart

Clone the repo, install dependencies, define your scope and run.

## Status

Work in progress.

## License

MIT
