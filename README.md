<p align="center">
  <img src="logo.png" alt="Fenrir" width="900"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-red?style=flat-square&color=e53e3e" />
  <img src="https://img.shields.io/badge/python-3.12+-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/react-18-61dafb?style=flat-square" />
  <img src="https://img.shields.io/badge/AI-OpenRouter%20%7C%20Ollama-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" />
</p>

---

Fenrir is an AI-powered network security scanner built for penetration testers and security researchers. It combines fast network discovery, deep service enumeration, vulnerability scanning, and exploit lookup into a single war room interface — with an LLM analyzing every finding in real time.

Inspired by Armitage, rebuilt from scratch with a modern dark UI, a 5-phase workflow, and AI integrated at every step. Supports both cloud AI (OpenRouter) and local models (Ollama) — configurable at runtime without touching config files.

---

## Screenshot

![Fenrir War Room](Screenshot.png)

---

## Features

### Scanning
- **ARP sweep** — discovers all live hosts on a local network in under 3 seconds, cannot be blocked by host firewalls
- **Parallel OS detection** — fingerprints operating systems on up to 5 hosts simultaneously using nmap `-O`
- **Deep service scan** — nmap `-sV -sC` per host, identifies services, versions, and banners. Runs sequentially to prevent memory overload
- **Vulnerability scan** — nuclei with 5,000+ templates scans all discovered HTTP/HTTPS services. Fast and Extensive scan modes. Findings enriched with CVE IDs and CVSS scores from the NVD API
- **Exploit lookup** — searchsploit automatically matches findings to exploit-db entries. Metasploit module search per CVE
- **GitHub PoC linker** — queries poc-in-github.motikan2010.net to surface public proof-of-concept repositories for each CVE, sorted by star count
- **TLS/SSL inspector** — inspects certificate expiry, SAN list, cipher suite, protocol version (TLS 1.0/1.1 weak protocol detection), and self-signed detection without any external tools
- **HTTP fingerprinter** — sends HEAD + OPTIONS requests and probes 9 sensitive paths (`.env`, `.git/HEAD`, `phpinfo.php`, `wp-login.php`, etc.) to map attack surface
- **Default credential check** — tests 11 common credential pairs against HTTP Basic Auth and FTP. Respects `CRED_CHECK_ENABLED` flag. Every success is written to the audit log

### AI
- **Dual provider support** — use OpenRouter (cloud, 200+ models) or Ollama (local, fully private). Switchable at runtime from the Settings page without restarting
- **Per-finding analysis** — AI analyzes every critical and high severity finding individually: what it is, how it's exploited, how to fix it
- **Phase summaries** — AI summarizes what was found after detection and vulnerability scan phases
- **AI Attack Playbook** — generates a full exploitation playbook per finding: prerequisites, exploitation steps, post-exploitation, detection evasion, verification command
- **Attack Chain Analysis** — analyzes all findings on a host together and identifies multi-step kill chains with combined severity and end-goal impact
- **Pentest report generation** — structured report with executive summary, technical findings sorted by severity, and a prioritized remediation roadmap
- **Retry logic** — 3 retries with exponential backoff on rate limits and timeouts

### Interface
- **5-phase war room** — Detection → Port Scan → Vuln Scan → Exploitation → Report. Phase tabs with live status indicators
- **Settings page** — gear icon in the header opens the AI provider configurator. Switch between OpenRouter and Ollama, set API keys, select models, and test connectivity — all without editing files or restarting
- **Network topology map** — SVG visualization showing hosts as nodes, color-coded by severity, animated pulse on compromised hosts
- **Live terminal** — all tool output streams to a filterable console at the bottom. Filter by level: ALL / ERROR / WARN / OK / INFO. Pause and resume scrolling
- **Deduplication** — findings deduplicated at both the nuclei output and database level
- **Session isolation** — hosts and findings scoped to the active scan session, no cross-session contamination

---

## How it works

```
Phase 1 — Detection
  nmap ARP sweep → finds all live hosts in ~2 seconds
  nmap -O fingerprints OS on each host (parallel batches of 5)
  AI summarizes the network

Phase 2 — Port Scan
  nmap -sV -sC per selected host (sequential, one at a time)
  Identifies open ports, services, and versions
  Progress bar shows current host / total

Phase 3 — Vulnerability Scan
  FAST mode:      critical/high only, CVE+misconfig tags, ~5 min
  EXTENSIVE mode: all severities, all templates, ~20 min
  NVD API enriches each CVE with CVSS score and description
  AI analyzes each critical/high finding

Phase 4 — Exploitation (4-tab workbench)
  INTEL tab:
    searchsploit looks up exploit-db matches per finding
    GitHub PoC linker surfaces public CVE exploit repos
  MODULES tab:
    Metasploit searches for matching modules per CVE
    TLS/SSL inspector checks cert validity, cipher, protocol
  ACTIVE tab:
    HTTP fingerprinter probes headers and sensitive paths
    Default credential check against HTTP and FTP services
  PLAYBOOK tab:
    AI generates full attack playbook per finding
    Chain Analysis identifies multi-step kill chains across all findings
  Dry-run generates exact msfconsole command
  Live execution available with DRY_RUN=false

Phase 5 — Report
  Select any past scan session
  AI writes a full penetration test report
  Executive summary, technical findings, remediation roadmap
  Export as markdown

Settings (gear icon ⚙)
  Switch AI provider: OpenRouter or Ollama
  Set API keys, model names, Ollama URL
  Fetch installed Ollama models with one click
  Test connection before scanning
  Settings persist to settings.json — no restart required
```

---

## Stack

| Component | Technology |
|---|---|
| Frontend | React 18, Vite, Zustand |
| Typography | JetBrains Mono |
| Backend | FastAPI, Python 3.12 |
| Database | SQLite via SQLAlchemy |
| AI (cloud) | OpenRouter — any model (DeepSeek, Llama, Gemini, etc.) |
| AI (local) | Ollama — llama3.2, mistral, deepseek-r1, qwen2.5-coder, etc. |
| Host discovery | nmap (ARP sweep, OS detection) |
| Port scanning | nmap -sV -sC |
| Vulnerability scanning | nuclei v3 + NVD API |
| Exploit lookup | searchsploit, Metasploit Framework |
| PoC discovery | poc-in-github.motikan2010.net API |
| TLS inspection | Python stdlib `ssl` / `socket` |
| HTTP probing | httpx |
| Credential testing | httpx (HTTP Basic Auth), ftplib (FTP) |

---

## Requirements

- Python 3.12+
- Node.js 18+
- nmap
- nuclei v3
- searchsploit (optional — for exploit lookup)
- Metasploit Framework (optional — for module search)
- OpenRouter API key **or** Ollama running locally

---

## Installation

### 1. Clone and set up Python environment

```bash
git clone https://github.com/finnmagnuskverndalen/fenrir.git
cd fenrir
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Install scanning tools

```bash
# nmap
sudo apt install nmap -y

# Allow nmap to run without sudo
sudo setcap cap_net_raw,cap_net_admin+eip $(which nmap)

# nuclei (requires Go)
sudo apt install golang-go -y
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc && source ~/.bashrc

# Download nuclei templates (~500MB, required)
nuclei -update-templates

# searchsploit (optional)
sudo git clone https://gitlab.com/exploit-database/exploitdb.git /opt/exploitdb
sudo ln -sf /opt/exploitdb/searchsploit /usr/local/bin/searchsploit
git config --global --add safe.directory /opt/exploitdb
```

### 3. Fix Linux file watcher limit (required on Linux)

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 4. Configure AI provider

**Option A — OpenRouter (cloud)**

```bash
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY
```

Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys).

**Option B — Ollama (local, fully private)**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# No API key needed — configure in the Fenrir Settings page
```

You can also switch providers at any time from the **⚙ Settings** page in the UI without editing files or restarting.

### 5. Define authorized scope

```bash
# Find your network range
ip route | grep src

# Add to scope.txt
echo "192.168.x.0/24" > scope.txt
```

### 6. Start Fenrir

```bash
./start.sh
```

Open **http://localhost:5173**

---

## Configuration

### Environment variables (`.env`)

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | — | OpenRouter API key (can also be set in the UI) |
| `OPENROUTER_MODEL` | `deepseek/deepseek-chat` | Default model (overridden by UI settings) |
| `DRY_RUN` | `true` | Set `false` to enable real exploitation |
| `ALLOW_PUBLIC_IPS` | `false` | Set `true` to scan external targets |
| `NVD_API_KEY` | — | Optional. Increases NVD rate limits |
| `CRED_CHECK_ENABLED` | `false` | Set `true` to enable default credential testing |
| `POC_LOOKUP_ENABLED` | `true` | Set `false` to disable GitHub PoC lookup |
| `TLS_PROBE_ENABLED` | `true` | Set `false` to disable TLS/SSL inspection |
| `HOST` | `127.0.0.1` | Backend bind address |
| `PORT` | `8765` | Backend port |

### Runtime settings (`settings.json`)

These are managed through the **⚙ Settings** UI and do not require editing files:

| Setting | Description |
|---|---|
| Provider | `openrouter` or `ollama` |
| API key | OpenRouter key (stored locally, never sent anywhere except OpenRouter) |
| Model | Model name for the selected provider |
| Ollama URL | Base URL for Ollama (default: `http://localhost:11434`) |
| Max tokens | Maximum tokens per AI response |

Settings in `settings.json` take priority over `.env` values.

---

## AI model options

### OpenRouter

| Model | Cost (per 1M tokens) | Notes |
|---|---|---|
| `deepseek/deepseek-chat` | $0.32 / $0.89 | Best security knowledge |
| `meta-llama/llama-3.3-70b-instruct` | Free | Zero cost |
| `google/gemini-2.0-flash-exp` | Free | Zero cost, fast |
| `mistralai/mistral-small-3.1` | $0.10 / $0.30 | Good balance |

A full scan with 47 findings, per-finding AI analysis, and report generation costs approximately **$0.02** with DeepSeek.

### Ollama (local)

| Model | Notes |
|---|---|
| `llama3.2` | Good general-purpose, fast on CPU |
| `mistral` | Strong reasoning, good for analysis |
| `deepseek-r1` | Best security knowledge locally |
| `qwen2.5-coder` | Good for technical output |

---

## Project structure

```
fenrir/
├── backend/
│   ├── main.py                  # FastAPI app, all API endpoints
│   ├── config.py                # Settings and scope validation
│   ├── audit.py                 # Append-only action logger
│   ├── database.py              # SQLite models (Session, Host, Port, Finding)
│   ├── websocket.py             # WebSocket broadcast to frontend
│   └── phases/
│       ├── host_discovery.py    # ARP sweep + parallel OS detection
│       ├── port_scan.py         # nmap -sV -sC, skips redundant ping sweep
│       ├── vuln_scan.py         # nuclei + NVD enrichment + deduplication
│       └── exploit.py           # searchsploit, MSF, GitHub PoC, TLS probe, HTTP fingerprint, cred check
├── ai/
│   ├── provider.py              # Provider abstraction: OpenRouter + Ollama, settings persistence
│   ├── analyst.py               # Per-finding analysis
│   └── reporter.py              # Pentest report generation
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── store/
│       │   └── fenrirStore.js   # Zustand global state
│       ├── hooks/
│       │   └── useWebSocket.js  # Singleton WS connection, message dedup
│       ├── components/
│       │   ├── Header.jsx       # Phase tabs, live counters, gear icon
│       │   ├── HostCard.jsx     # Host display with OS, ports, severity
│       │   ├── NetworkMap.jsx   # SVG topology visualization
│       │   └── Terminal.jsx     # Filterable live console
│       └── pages/
│           ├── Phase1Detection.jsx    # ARP sweep, OS fingerprint, network map
│           ├── Phase2PortScan.jsx     # Port scan with progress bar
│           ├── Phase3VulnScan.jsx     # Vuln scan, findings list, AI analysis
│           ├── Phase4Exploitation.jsx # 4-tab exploitation workbench
│           ├── Phase5Report.jsx      # Report generation and download
│           └── PhaseSettings.jsx     # AI provider configuration
├── settings.json                # Runtime AI settings (auto-created by UI)
├── reports/                     # Generated reports (auto-created)
├── Screenshot.png               # UI screenshot
├── start.sh                     # Single command launcher
├── run.py                       # Backend entrypoint
├── scope.txt                    # Authorized CIDR ranges
├── audit.log                    # Append-only action log (auto-created)
├── .env.example
├── requirements.txt
└── Dockerfile
```

---

## Safety and authorization

> **This tool is for authorized security testing only. Only scan networks and systems you own or have explicit written permission to test. Unauthorized scanning is illegal.**

Fenrir has multiple layers of safety controls:

- **Scope enforcement** — `scope.txt` defines authorized CIDR ranges. Any target outside scope returns HTTP 403 and is logged. The scan never starts
- **Duplicate scan prevention** — the backend blocks concurrent scans against the same target
- **Dry run mode** — exploitation features generate commands but do not execute them. Set `DRY_RUN=false` in `.env` to enable real execution
- **Public IP blocking** — external IP ranges are blocked by default. Set `ALLOW_PUBLIC_IPS=true` to enable
- **Audit log** — every action (scan start, phase transitions, exploit attempts, settings changes) is logged with timestamp to `audit.log`. The log is append-only and never truncated

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/scan/start` | Start a scan session |
| GET | `/api/sessions` | List all scan sessions |
| GET | `/api/sessions/{id}/hosts` | Hosts for a session |
| GET | `/api/sessions/{id}/findings` | Findings for a session |
| GET | `/api/findings` | All findings (filter: `?severity=high`) |
| GET | `/api/hosts` | All hosts |
| POST | `/api/ai/summarize` | AI phase summary |
| POST | `/api/ai/test` | Test AI connectivity |
| POST | `/api/reports/generate/{id}` | Generate pentest report |
| GET | `/api/reports/list` | List saved reports |
| GET | `/api/reports/download/{filename}` | Download a report |
| GET | `/api/settings` | Get current AI settings (API key masked) |
| POST | `/api/settings` | Update AI settings |
| GET | `/api/settings/ollama/models` | List installed Ollama models |
| POST | `/api/exploits/lookup` | searchsploit lookup |
| GET | `/api/exploits/metasploit/{cve}` | Metasploit module search |
| POST | `/api/exploits/run` | Run exploit (dry-run by default) |
| GET | `/api/exploits/finding/{id}` | Stored exploits for a finding |
| GET | `/api/exploits/poc/{cve}` | GitHub PoC repositories for a CVE |
| POST | `/api/exploits/tls_probe` | TLS/SSL certificate and cipher inspection |
| POST | `/api/exploits/http_fingerprint` | HTTP header and path fingerprinting |
| POST | `/api/exploits/cred_check` | Default credential testing (HTTP/FTP) |
| POST | `/api/exploits/chain_analysis` | AI kill chain analysis for a host |
| GET | `/api/health` | Backend status and active scans |
| GET | `/api/audit` | Audit log entries |
| GET | `/api/scope` | Authorized scope |
| WS | `/ws` | Live WebSocket feed |

---

## License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/finnmagnuskverndalen/fenrir">finnmagnuskverndalen</a>
</p>
