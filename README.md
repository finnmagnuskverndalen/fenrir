# Fenrir - Network Security Scanner

> *In Norse mythology, Fenrir is the great wolf — unchained, relentless, and unstoppable. This tool hunts your network the same way.*

An AI-powered network security scanner. Discovers hosts, maps ports and services, identifies vulnerabilities, and uses an LLM to prioritize findings, explain exploits, and write a professional pentest report — all from a modern web UI.

---

## Features

- **Phase 1 — DNS & WHOIS** — subdomain enumeration via subfinder, dig, whois
- **Phase 2 — Port & service scan** — two-phase nmap: fast ping sweep then deep scan per live host, streams results live
- **Phase 3 — Vulnerability scan** — nuclei templates + CVE enrichment via NVD API, auto-targets HTTP services
- **Phase 4 — AI analysis** — DeepSeek via OpenRouter prioritizes findings, explains exploits, suggests remediations
- **Phase 5 — Report generation** — AI writes a full structured pentest report with executive summary, findings, and remediation roadmap
- **Web UI** — React + FastAPI dashboard with live log, expandable findings, host drilldown, markdown report viewer

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI + Python |
| AI | OpenRouter — DeepSeek Chat (~$0.01 per full scan) |
| Scanning | nmap, nuclei, subfinder, whois |
| Database | SQLite |
| Container | Docker |

---

## Project structure

```
fenrir/
├── backend/
│   ├── main.py            # FastAPI entrypoint, scan orchestration, report endpoints
│   ├── config.py          # Settings and scope loading
│   ├── audit.py           # Append-only action logger
│   ├── database.py        # SQLite + SQLAlchemy models
│   ├── websocket.py       # Live streaming endpoint
│   └── phases/
│       ├── dns_whois.py   # Phase 1 — DNS and WHOIS
│       ├── port_scan.py   # Phase 2 — two-phase nmap
│       ├── vuln_scan.py   # Phase 3 — nuclei + NVD
│       └── exploit.py     # Phase 4 — exploit suggestions (dry-run)
├── ai/
│   ├── analyst.py         # OpenRouter finding analysis
│   └── reporter.py        # Structured pentest report generation
├── frontend/src/pages/
│   ├── Dashboard.jsx      # Live stats, phase progress, auto-scroll log
│   ├── Hosts.jsx          # Expandable host + port table
│   ├── Findings.jsx       # Expandable CVE cards with AI analysis inline
│   ├── AIAnalysis.jsx     # Full AI analysis with markdown rendering
│   ├── Reports.jsx        # Session picker, AI report, download .md
│   ├── Scope.jsx          # Authorized targets
│   └── AuditLog.jsx       # Append-only action log
├── reports/               # Generated pentest reports (auto-created)
├── run.py                 # Backend entrypoint
├── scope.txt              # Authorized CIDR ranges
├── .env.example
├── requirements.txt
├── Dockerfile
└── README.md
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
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc && source ~/.bashrc
nuclei -update-templates
```

### 3. Configure
```bash
cp .env.example .env
nano .env
# Set OPENROUTER_API_KEY  — get free at https://openrouter.ai/keys
# Set OPENROUTER_MODEL=deepseek/deepseek-chat
# Set DRY_RUN=false when ready to scan
```

### 4. Set scope
```bash
ip route | grep src        # find your network
echo "192.168.x.0/24" > scope.txt
```

### 5. Run
```bash
# Terminal 1 — backend
python run.py

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173**

---

## Recommended models

| Model | Cost/1M tokens (in/out) | Notes |
|---|---|---|
| `deepseek/deepseek-chat` | $0.32 / $0.89 | **Recommended** — best value, strong security knowledge |
| `meta-llama/llama-3.3-70b-instruct` | Free | Zero cost, good for testing |
| `google/gemini-2.0-flash-exp` | Free | Zero cost, fast |
| `mistralai/mistral-small-3.1` | ~$0.10 / $0.30 | Cheap, solid |

A full scan with 47 findings + report costs approximately **$0.02** with DeepSeek.

---

## Venv cheatsheet

```bash
python3 -m venv venv          # create (once)
source venv/bin/activate       # activate (every session)
deactivate                     # exit
pip install -r requirements.txt
```

---

## Safety

- `scope.txt` restricts scans to authorized CIDR ranges — out-of-scope targets get 403
- Duplicate scans on the same target are blocked server-side
- All actions logged append-only to `audit.log`
- Exploit features are dry-run only by default
- Public IPs blocked unless `ALLOW_PUBLIC_IPS=true`

---

## Milestones

- [x] Milestone 1 — Project scaffold
- [x] Milestone 2 — Backend core (FastAPI, SQLite, WebSocket, scope guard, audit log)
- [x] Milestone 3 — Scan phases 1–3 (two-phase nmap, nuclei, NVD enrichment, live log)
- [x] Milestone 4 — AI analysis (DeepSeek via OpenRouter, 47 findings analyzed)
- [x] Milestone 5 — Frontend polish (expandable findings/hosts, markdown AI output, duplicate scan fix)
- [x] Milestone 6 — Report generator (structured pentest report, executive summary, remediation roadmap, .md download)
- [ ] Milestone 7 — Exploit layer (Metasploit RPC, searchsploit, dry-run)
- [ ] Milestone 8 — Docker, auth, rate limiting

---

## License

MIT
