<p align="center">
  <img src="logo.png" alt="Fenrir" width="720"/>
</p>

<p align="center">
  <em>In Norse mythology, Fenrir is the great wolf — unchained, relentless, and unstoppable.<br/>This tool hunts your network the same way.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12+-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/fastapi-0.115-green?style=flat-square" />
  <img src="https://img.shields.io/badge/react-18-61dafb?style=flat-square" />
  <img src="https://img.shields.io/badge/AI-OpenRouter-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" />
</p>

---

## What is Fenrir?

Fenrir is an AI-powered network security scanner inspired by Armitage — rebuilt from scratch with a modern dark UI, 5-phase war room workflow, live network topology map, and LLM integration at every step. Discover hosts, map services, scan for vulnerabilities, look up exploits, and generate professional pentest reports — all from one interface.

---

## Interface

A **5-phase war room** — phase tabs across the top, live terminal at the bottom, everything streams in real time:

| Phase | Name | What it does |
|---|---|---|
| **01** | Detection | ARP sweep → OS fingerprinting → host cards + network topology map |
| **02** | Port Scan | Select hosts → deep nmap service scan — sequential, one host at a time |
| **03** | Vuln Scan | Select hosts → nuclei templates + NVD CVE enrichment + per-finding AI analysis |
| **04** | Exploitation | Select host + vuln → searchsploit + Metasploit modules + AI recon + agent log |
| **05** | Report | AI writes full pentest report → download .md |

---

## Features

- **ARP sweep** — finds all live hosts in seconds, cannot be blocked by firewall
- **Parallel OS detection** — fingerprints 5 hosts simultaneously after discovery
- **Sequential scanning** — Phase 2 and 3 scan one host at a time to prevent memory overload
- **Deduplication** — findings deduplicated in both UI and database
- **Per-finding AI analysis** — DeepSeek analyzes each critical/high finding individually
- **AI retry logic** — 3 retries with backoff on rate limits and timeouts
- **Singleton WebSocket** — eliminates duplicate terminal messages
- **Network topology map** — SVG visualization, hosts turn red skull when compromised
- **Host cards persist** — hosts load from DB on browser refresh
- **Terminal filtering** — filter by ALL / ERROR / WARN / OK / INFO
- **Agent log** — Phase 4 shows a live AI agent log as it chains searchsploit → MSF → recon
- **Scope guard** — all scans restricted to authorized CIDR ranges
- **Audit log** — every action timestamped and logged append-only

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Zustand |
| Fonts | Orbitron (headers) + Rajdhani (UI) + Share Tech Mono (terminal) |
| Backend | FastAPI + Python 3.12 |
| AI | OpenRouter — DeepSeek Chat (~$0.02 per full scan) |
| Network scanning | nmap (ARP sweep, OS detection, service scan) |
| Vuln scanning | nuclei + NVD API |
| Exploit lookup | searchsploit (exploit-db), Metasploit |
| Database | SQLite |

---

## Project structure

```
fenrir/
├── backend/
│   ├── main.py               # FastAPI — all endpoints
│   ├── config.py             # Settings, scope validation
│   ├── audit.py              # Append-only action logger
│   ├── database.py           # SQLite + SQLAlchemy models
│   ├── websocket.py          # Live WebSocket broadcast
│   └── phases/
│       ├── host_discovery.py # Phase 1 — ARP sweep + parallel OS detection
│       ├── port_scan.py      # Phase 2 — deep nmap, skips ping sweep
│       ├── vuln_scan.py      # Phase 3 — nuclei + NVD, deduplication
│       └── exploit.py        # Phase 4 — searchsploit + Metasploit
├── ai/
│   ├── analyst.py            # Per-finding AI analysis, retry logic
│   └── reporter.py           # Pentest report generation
├── frontend/src/
│   ├── App.jsx               # Phase router
│   ├── index.css             # Global styles, fonts, animations
│   ├── store/fenrirStore.js  # Zustand state
│   ├── hooks/
│   │   └── useWebSocket.js   # Singleton WS — no duplicate messages
│   ├── components/
│   │   ├── Header.jsx        # Phase tabs, live counters
│   │   ├── HostCard.jsx      # Host card — OS icon, ports, severity
│   │   ├── NetworkMap.jsx    # SVG topology map
│   │   └── Terminal.jsx      # Filterable live console
│   └── pages/
│       ├── Phase1Detection.jsx   # ARP sweep, network map, AI summary
│       ├── Phase2PortScan.jsx    # Sequential port scan + progress bar
│       ├── Phase3VulnScan.jsx    # Vuln scan + per-finding AI analysis
│       ├── Phase4Exploitation.jsx # Exploits + agent log + MSF modules
│       └── Phase5Report.jsx      # AI pentest report + .md download
├── reports/           # Generated reports (auto-created)
├── start.sh           # Single command to start everything
├── run.py             # Backend entrypoint
├── scope.txt          # Authorized CIDR ranges
├── audit.log          # Append-only action log
├── logo.png
├── icon.png
├── .env.example
└── requirements.txt
```

---

## Quickstart

### 1. Clone and set up
```bash
git clone https://github.com/finnmagnuskverndalen/fenrir.git
cd fenrir
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Install scan tools
```bash
sudo apt install nmap whois -y
sudo setcap cap_net_raw,cap_net_admin+eip $(which nmap)

sudo apt install golang-go -y
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc && source ~/.bashrc
nuclei -update-templates

sudo git clone https://gitlab.com/exploit-database/exploitdb.git /opt/exploitdb
sudo ln -sf /opt/exploitdb/searchsploit /usr/local/bin/searchsploit
git config --global --add safe.directory /opt/exploitdb

# Fix Linux file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 3. Configure
```bash
cp .env.example .env
nano .env
# OPENROUTER_API_KEY=your_key    — get free at https://openrouter.ai/keys
# OPENROUTER_MODEL=deepseek/deepseek-chat
# DRY_RUN=false
```

### 4. Set scope
```bash
ip route | grep src
echo "192.168.x.0/24" > scope.txt
```

### 5. Launch
```bash
./start.sh
```

Open **http://localhost:5173**

---

## Workflow

```
Phase 1  Enter CIDR → DETECT
         ARP sweep finds all hosts in ~2 seconds
         Parallel OS fingerprinting in batches of 5
         Network map appears with host nodes
         AI summarizes what was found
         ↓
Phase 2  Select hosts → SCAN (one at a time, progress bar)
         Deep nmap: services, versions, banners
         Ports appear on host cards
         ↓
Phase 3  Select hosts → SCAN VULN (one at a time)
         nuclei runs against HTTP services
         NVD enriches findings with CVSS scores
         AI analyzes each critical/high finding
         ↓
Phase 4  Select host + vulnerability
         searchsploit looks up exploit-db matches
         Metasploit searches for modules
         AI runs exploit recon
         Agent log shows each step
         RUN generates dry-run command
         ↓
Phase 5  Select session → GENERATE REPORT
         AI writes full pentest report
         Download as .md
```

---

## Recommended AI models

| Model | Cost/1M tokens | Notes |
|---|---|---|
| `deepseek/deepseek-chat` | $0.32 / $0.89 | **Recommended** |
| `meta-llama/llama-3.3-70b-instruct` | Free | Zero cost |
| `google/gemini-2.0-flash-exp` | Free | Fast |

Full scan with 47 findings ≈ **$0.02** with DeepSeek.

---

## Safety

> **Authorized testing only. Only scan networks you own or have explicit written permission to test.**

- `scope.txt` restricts all targets — out-of-scope returns 403
- Duplicate scans blocked server-side
- All actions logged append-only to `audit.log`
- Exploitation dry-run only by default — set `DRY_RUN=false` in `.env` to enable

---

## Milestones

- [x] M1 — Project scaffold
- [x] M2 — Backend core (FastAPI, SQLite, WebSocket, scope guard, audit log)
- [x] M3 — Scan phases (nmap, nuclei, NVD enrichment)
- [x] M4 — AI analysis (DeepSeek via OpenRouter)
- [x] M5 — Frontend polish (expandable findings, DB-backed)
- [x] M6 — Report generator (structured pentest report, .md download)
- [x] M7 — Exploit layer (searchsploit, Metasploit module search)
- [x] M8 — Fenrir v2 UI (5-phase war room, live terminal, host cards)
- [x] M9 — Stability + UX overhaul (singleton WS, deduplication, sequential scans, network map, terminal filters, per-finding AI, retry logic)
- [ ] M10 — Docker, PDF export, API auth

---

## License

MIT

---

<p align="center">Built by <a href="https://github.com/finnmagnuskverndalen">finnmagnuskverndalen</a></p>
