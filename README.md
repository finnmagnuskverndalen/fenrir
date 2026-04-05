<p align="center">
  <img src="logo.png" alt="Fenrir - Network Security Scanner" width="420"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12+-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/fastapi-0.115-green?style=flat-square" />
  <img src="https://img.shields.io/badge/react-18-61dafb?style=flat-square" />
  <img src="https://img.shields.io/badge/AI-OpenRouter%20%2F%20DeepSeek-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" />
</p>

---

## What is Fenrir?

Fenrir is a modern AI-powered network security scanner inspired by Armitage — built for pentesters and security researchers. It provides a **5-phase war room interface** that walks you through the full attack chain: discover hosts, scan ports, identify vulnerabilities, exploit them, and generate a professional pentest report. An AI assistant (DeepSeek via OpenRouter) summarizes findings at every phase and guides the exploitation process.

---

## Features

| Phase | What it does |
|---|---|
| **01 Detection** | nmap ping sweep across CIDR, OS fingerprinting, host discovery |
| **02 Port Scan** | Select specific hosts → deep nmap service scan, streams results live |
| **03 Vuln Scan** | nuclei templates against HTTP services + NVD CVE enrichment + AI summary |
| **04 Exploitation** | searchsploit lookup, Metasploit module search, AI recon per target, dry-run command generator |
| **05 Report** | AI writes full structured pentest report with exec summary + remediation roadmap |

**UI highlights:**
- Phase-tabbed war room layout — click through phases in sequence
- Host cards with OS icons, port pills, severity badges, red skull when compromised
- Live terminal at the bottom streaming all tool output in real time
- AI summarization at every phase via DeepSeek
- Dark hacker aesthetic — Orbitron display font, Share Tech Mono terminal font, red wolf branding

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Zustand |
| Backend | FastAPI + Python 3.12 |
| AI | OpenRouter — DeepSeek Chat (~$0.02 per full engagement) |
| Scanning | nmap, nuclei, subfinder, whois |
| Exploit lookup | searchsploit (exploit-db), Metasploit |
| Database | SQLite |
| Container | Docker |

---

## Project structure

```
fenrir/
├── backend/
│   ├── main.py            # FastAPI entrypoint, all API endpoints, AI summarize
│   ├── config.py          # Settings, scope validation
│   ├── audit.py           # Append-only action logger
│   ├── database.py        # SQLite + SQLAlchemy models
│   ├── websocket.py       # WebSocket live streaming
│   └── phases/
│       ├── dns_whois.py   # Phase 1 — DNS, WHOIS, subfinder
│       ├── port_scan.py   # Phase 2 — two-phase nmap (ping sweep + deep scan)
│       ├── vuln_scan.py   # Phase 3 — nuclei + NVD API enrichment
│       └── exploit.py     # Phase 4 — searchsploit + Metasploit lookup
├── ai/
│   ├── analyst.py         # OpenRouter finding analysis + prioritization
│   └── reporter.py        # Structured pentest report generation
├── frontend/
│   └── src/
│       ├── App.jsx                    # Phase router + WebSocket init
│       ├── index.css                  # Global dark theme + fonts
│       ├── store/fenrirStore.js       # Zustand global state
│       ├── hooks/useWebSocket.js      # WebSocket connection + message routing
│       ├── components/
│       │   ├── Header.jsx             # Phase tabs, live counters, logo
│       │   ├── HostCard.jsx           # Host card with OS icon, ports, vuln badge
│       │   ├── Terminal.jsx           # Live tool output console
│       │   └── AISummaryPanel.jsx     # AI analysis display per phase
│       └── pages/
│           ├── Phase1Detection.jsx    # Network discovery + host grid
│           ├── Phase2PortScan.jsx     # Host selection + port scanning
│           ├── Phase3VulnScan.jsx     # Vuln scan + findings list + AI summary
│           ├── Phase4Exploitation.jsx # Target/vuln picker + exploits + Metasploit
│           └── Phase5Report.jsx       # Session picker + AI report + download
├── reports/               # Generated pentest reports (auto-created)
├── run.py                 # Backend entrypoint
├── scope.txt              # Authorized CIDR ranges
├── audit.log              # Append-only action log
├── logo.png               # Project logo
├── icon.png               # Project icon (used as favicon)
├── .env.example
├── requirements.txt
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
sudo setcap cap_net_raw,cap_net_admin+eip $(which nmap)

# subfinder and nuclei (requires Go)
sudo apt install golang-go -y
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc && source ~/.bashrc
nuclei -update-templates

# searchsploit
sudo git clone https://gitlab.com/exploit-database/exploitdb.git /opt/exploitdb
sudo ln -sf /opt/exploitdb/searchsploit /usr/local/bin/searchsploit
git config --global --add safe.directory /opt/exploitdb

# increase file watcher limit (required for Vite)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 3. Configure environment
```bash
cp .env.example .env
nano .env
```

Key settings:
```
OPENROUTER_API_KEY=your_key_here     # get free at https://openrouter.ai/keys
OPENROUTER_MODEL=deepseek/deepseek-chat
DRY_RUN=false                        # set true to preview without executing
ALLOW_PUBLIC_IPS=false
```

### 4. Set your authorized scope
```bash
ip route | grep src
echo "192.168.x.0/24" > scope.txt
```

### 5. Start the backend
```bash
python run.py
```

### 6. Start the frontend (new terminal)
```bash
cd ~/fenrir && source venv/bin/activate
cd frontend
npm install
npm run dev
```

### 7. Open the UI
Navigate to **http://localhost:5173**

Work through the phases in order: Detection → Port Scan → Vuln Scan → Exploitation → Report

---

## Phase walkthrough

**Phase 01 — Detection**
Enter your CIDR range (e.g. `192.168.1.0/24`), disable dry-run, hit DETECT. Fenrir runs a fast nmap ping sweep to find live hosts. Each host appears as a card with its OS icon. Takes ~30 seconds for a /24.

**Phase 02 — Port Scan**
Click host cards to select targets (or SELECT ALL). Hit SCAN. Fenrir runs deep nmap service detection on each selected host. Port pills appear on the host cards as results stream in.

**Phase 03 — Vuln Scan**
Select hosts, hit SCAN. nuclei runs its full template library against all HTTP services. Findings appear in the right panel sorted by severity. AI summarizes the risk landscape.

**Phase 04 — Exploitation**
Select a target host on the left, select a critical/high finding. searchsploit looks up matching exploits. Metasploit searches for modules. AI explains the exploit chain. Hit RUN (DRY) to generate the exact command. Set `DRY_RUN=false` in `.env` to execute for real against in-scope targets.

**Phase 05 — Report**
Select your scan session, hit GENERATE REPORT. DeepSeek writes a full professional pentest report in ~30 seconds. Download as `.md`.

---

## Recommended AI models

| Model | Cost per 1M tokens | Notes |
|---|---|---|
| `deepseek/deepseek-chat` | $0.32 / $0.89 | **Recommended** — best value, strong security knowledge |
| `meta-llama/llama-3.3-70b-instruct` | Free | Zero cost, good for testing |
| `google/gemini-2.0-flash-exp` | Free | Zero cost, fast |

A full engagement with 47 findings costs approximately **$0.02** with DeepSeek.

---

## Safety

> **This tool is for authorized testing only. Only scan networks and systems you own or have explicit written permission to test.**

- `scope.txt` restricts all scans to authorized CIDR ranges — out-of-scope targets return 403
- Duplicate scans on same target blocked server-side
- All actions logged append-only to `audit.log`
- Exploitation is **dry-run only** by default
- Set `DRY_RUN=false` in `.env` to enable real execution
- Public IPs blocked unless `ALLOW_PUBLIC_IPS=true`

---

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/scan/start` | POST | Start a scan session |
| `/api/sessions` | GET | List scan sessions |
| `/api/findings` | GET | All findings (filter `?severity=high`) |
| `/api/exploits/lookup` | POST | searchsploit lookup |
| `/api/exploits/metasploit/{cve}` | GET | Metasploit module search |
| `/api/exploits/run` | POST | Run exploit (dry-run by default) |
| `/api/reports/generate/{id}` | POST | Generate AI pentest report |
| `/api/reports/list` | GET | List saved reports |
| `/api/ai/summarize` | POST | AI phase summarization |
| `/api/audit` | GET | Audit log |
| `/api/health` | GET | Health check |

---

## Milestones

- [x] **Milestone 1** — Project scaffold
- [x] **Milestone 2** — Backend core (FastAPI, SQLite, WebSocket, scope guard, audit log)
- [x] **Milestone 3** — Scan phases 1–3 (two-phase nmap, nuclei, NVD enrichment, live log)
- [x] **Milestone 4** — AI analysis layer (DeepSeek via OpenRouter)
- [x] **Milestone 5** — Frontend polish (expandable findings, host drilldown, markdown AI output)
- [x] **Milestone 6** — Report generator (structured pentest report, exec summary, remediation roadmap)
- [x] **Milestone 7** — Exploit layer (searchsploit, Metasploit module search, dry-run generator)
- [x] **Milestone 8** — Fenrir v2 UI (Armitage-inspired 5-phase war room, live terminal, host cards, AI per phase)
- [ ] **Milestone 9** — Docker packaging, API auth, PDF export

---

## License

MIT

---

<p align="center">Built by <a href="https://github.com/finnmagnuskverndalen">finnmagnuskverndalen</a></p>
