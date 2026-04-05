<p align="center">
  <img src="icon.png" alt="Fenrir - Network Security Scanner" width="400"/>
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

Fenrir is an AI-powered network security scanner built for pentesters and security researchers. It discovers hosts, maps ports and services, identifies vulnerabilities using nuclei, enriches findings with NVD CVE data, and uses an LLM to prioritize findings, explain exploits, suggest attack paths, and write a professional pentest report — all from a modern dark-themed web UI.

---

## Features

| Phase | What it does |
|---|---|
| **DNS & WHOIS** | Subdomain enumeration via subfinder, dig, whois |
| **Port scan** | Two-phase nmap: fast ping sweep → deep service scan per live host |
| **Vuln scan** | nuclei templates against discovered HTTP services + NVD CVE enrichment |
| **AI analysis** | DeepSeek via OpenRouter prioritizes findings, explains exploits, suggests remediations |
| **Exploit lookup** | searchsploit auto-lookup + Metasploit module search per finding |
| **Report** | AI writes a full structured pentest report with exec summary + remediation roadmap |
| **Live UI** | React dashboard with WebSocket live log, expandable findings, host drilldown |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI + Python 3.12 |
| AI | OpenRouter — DeepSeek Chat (~$0.02 per full scan) |
| Scanning | nmap, nuclei, subfinder, whois |
| Exploit lookup | searchsploit (exploit-db), Metasploit |
| Database | SQLite |
| Container | Docker |

---

## Screenshots

> Dashboard with live scan progress, host discovery, and findings streaming in real time.

---

## Project structure

```
fenrir/
├── backend/
│   ├── main.py            # FastAPI entrypoint, scan orchestration, all API endpoints
│   ├── config.py          # Settings, scope validation
│   ├── audit.py           # Append-only action logger
│   ├── database.py        # SQLite + SQLAlchemy models
│   ├── websocket.py       # WebSocket live streaming
│   └── phases/
│       ├── dns_whois.py   # Phase 1 — DNS, WHOIS, subfinder
│       ├── port_scan.py   # Phase 2 — two-phase nmap
│       ├── vuln_scan.py   # Phase 3 — nuclei + NVD API
│       └── exploit.py     # Phase 5 — searchsploit + Metasploit lookup
├── ai/
│   ├── analyst.py         # OpenRouter finding analysis + prioritization
│   └── reporter.py        # Structured pentest report generation
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx   # Live stats, phase progress bar, auto-scroll log
│       │   ├── Hosts.jsx       # Expandable host cards with port tables
│       │   ├── Findings.jsx    # Expandable CVE cards with inline AI analysis
│       │   ├── Exploits.jsx    # searchsploit results + Metasploit modules per finding
│       │   ├── AIAnalysis.jsx  # Full AI analysis with markdown rendering
│       │   ├── Reports.jsx     # Session picker, AI pentest report, .md download
│       │   ├── Scope.jsx       # Authorized CIDR targets
│       │   └── AuditLog.jsx    # Append-only timestamped action log
│       └── components/
│           ├── Sidebar.jsx
│           ├── Topbar.jsx              # Target input, dry-run toggle, debounced scan
│           └── WebSocketProvider.jsx   # Global WebSocket state
├── reports/               # Generated pentest reports (auto-created)
├── run.py                 # Backend entrypoint
├── scope.txt              # Authorized CIDR ranges — edit before scanning
├── audit.log              # Auto-generated append-only log
├── logo.png               # Project logo
├── icon.png               # Project icon
├── .env.example           # Environment variable template
├── requirements.txt       # Python dependencies
├── Dockerfile
└── README.md
```

---

## Quickstart

### 1. Clone and set up Python environment
```bash
git clone https://github.com/finnmagnuskverndalen/fenrir.git
cd fenrir
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> Run `source venv/bin/activate` every time you open a new terminal.

### 2. Install scan tools
```bash
# nmap and whois
sudo apt install nmap whois -y

# Allow nmap to run without sudo
sudo setcap cap_net_raw,cap_net_admin+eip $(which nmap)

# subfinder and nuclei (requires Go)
sudo apt install golang-go -y
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc && source ~/.bashrc
nuclei -update-templates

# searchsploit (exploit-db)
sudo git clone https://gitlab.com/exploit-database/exploitdb.git /opt/exploitdb
sudo ln -sf /opt/exploitdb/searchsploit /usr/local/bin/searchsploit
git config --global --add safe.directory /opt/exploitdb
```

### 3. Configure environment
```bash
cp .env.example .env
nano .env
```

Key settings:
```bash
OPENROUTER_API_KEY=your_key_here     # get free at https://openrouter.ai/keys
OPENROUTER_MODEL=deepseek/deepseek-chat
DRY_RUN=true                         # set false to enable real scanning
ALLOW_PUBLIC_IPS=false               # set true for external targets (use with caution)
```

### 4. Set your authorized scope
```bash
ip route | grep src          # find your network
echo "192.168.x.0/24" > scope.txt
```

### 5. Start the backend
```bash
python run.py
```

Expected output:
```
Fenrir is ready.
INFO:     Uvicorn running on http://127.0.0.1:8765
```

### 6. Start the frontend (new terminal)
```bash
cd ~/fenrir && source venv/bin/activate
cd frontend && npm install && npm run dev
```

### 7. Open the UI
Navigate to **http://localhost:5173**

Enter a target, check dry-run first, then uncheck and scan for real.

---

## Recommended AI models

| Model | Cost per 1M tokens | Notes |
|---|---|---|
| `deepseek/deepseek-chat` | $0.32 / $0.89 | **Recommended** — best value, strong security knowledge |
| `meta-llama/llama-3.3-70b-instruct` | Free | Zero cost, good for testing |
| `google/gemini-2.0-flash-exp` | Free | Zero cost, fast |
| `mistralai/mistral-small-3.1` | ~$0.10 / $0.30 | Cheap, solid reasoning |

A full scan with 47 findings + AI analysis + report costs approximately **$0.02** with DeepSeek.

---

## Venv reference

```bash
python3 -m venv venv          # create (once)
source venv/bin/activate       # activate every session
deactivate                     # exit venv
pip install -r requirements.txt
```

---

## Safety and authorization

> **This tool is for authorized testing only. Only scan networks and systems you own or have explicit written permission to test.**

- `scope.txt` restricts all scans to explicitly authorized CIDR ranges — targets outside scope return 403
- Duplicate scans on the same target are blocked server-side
- All actions logged with timestamps to `audit.log` (append-only, never truncated)
- Exploitation features are **dry-run only** by default — shows commands without executing
- Set `DRY_RUN=false` in `.env` to enable real execution against in-scope targets
- Public IP scanning blocked unless `ALLOW_PUBLIC_IPS=true`

---

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/scan/start` | POST | Start a scan against a target |
| `/api/sessions` | GET | List all scan sessions |
| `/api/sessions/{id}/findings` | GET | Findings for a session |
| `/api/sessions/{id}/hosts` | GET | Hosts for a session |
| `/api/findings` | GET | All findings (filter by `?severity=high`) |
| `/api/exploits/lookup` | POST | searchsploit lookup for a CVE/title |
| `/api/exploits/metasploit/{cve}` | GET | Metasploit module search |
| `/api/exploits/run` | POST | Run exploit (dry-run by default) |
| `/api/reports/generate/{id}` | POST | Generate AI pentest report |
| `/api/reports/list` | GET | List saved reports |
| `/api/audit` | GET | Audit log entries |
| `/api/scope` | GET | Current authorized scope |
| `/api/health` | GET | Backend health check |

---

## Milestones

- [x] **Milestone 1** — Project scaffold, folder structure, .env, gitignore
- [x] **Milestone 2** — Backend core (FastAPI, SQLite, WebSocket, scope guard, audit log, dry-run mode)
- [x] **Milestone 3** — Scan phases 1–3 (two-phase nmap, subfinder, nuclei, NVD enrichment, live WebSocket log)
- [x] **Milestone 4** — AI analysis layer (DeepSeek via OpenRouter, 47 findings analyzed end-to-end)
- [x] **Milestone 5** — Frontend polish (expandable findings/hosts, markdown AI output, duplicate scan fix, DB-backed findings)
- [x] **Milestone 6** — Report generator (structured pentest report, exec summary, remediation roadmap, .md download)
- [x] **Milestone 7** — Exploit layer (searchsploit auto-lookup, Metasploit module search, dry-run command generator)
- [ ] **Milestone 8** — Docker, API auth, rate limiting, PDF export

---

## License

MIT

---

<p align="center">Built by <a href="https://github.com/finnmagnuskverndalen">finnmagnuskverndalen</a></p>
