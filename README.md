# Fenrir - Network Security Scanner

> *In Norse mythology, Fenrir is the great wolf — unchained, relentless, and unstoppable. This tool hunts your network the same way.*

An AI-powered network security scanner. Discovers hosts, maps ports and services, identifies vulnerabilities, and uses an LLM to prioritize findings and suggest attack paths — all from a modern web UI.

---

## Features

- **Phase 1 — DNS & WHOIS** — subdomain enumeration via subfinder, dig, whois
- **Phase 2 — Port & service scan** — two-phase nmap: fast ping sweep then deep scan per live host, results stream live to UI
- **Phase 3 — Vulnerability scan** — nuclei templates + CVE enrichment via NVD API
- **Phase 4 — AI analysis** — OpenRouter LLM prioritizes findings and maps CVEs to exploits
- **Phase 5 — Reporting** — auto-generated markdown/PDF pentest report
- **Web UI** — React + FastAPI dashboard with live auto-scrolling log via WebSocket

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI + Python |
| AI | OpenRouter API (model-agnostic — use any LLM) |
| Scanning | nmap, nuclei, subfinder |
| Database | SQLite |
| Container | Docker |

---

## Project structure

```
fenrir/
├── backend/
│   ├── main.py            # FastAPI entrypoint
│   ├── config.py          # Settings and scope loading
│   ├── audit.py           # Append-only action logger
│   ├── database.py        # SQLite + SQLAlchemy models
│   ├── websocket.py       # Live streaming endpoint
│   └── phases/
│       ├── dns_whois.py   # Phase 1 — DNS and WHOIS
│       ├── port_scan.py   # Phase 2 — two-phase nmap scan
│       ├── vuln_scan.py   # Phase 3 — nuclei + NVD enrichment
│       └── exploit.py     # Phase 4 — exploit suggestions (dry-run)
├── ai/
│   ├── analyst.py         # OpenRouter analysis and prioritization
│   └── reporter.py        # Report generation
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx   # Live stats, phase progress, log
│       │   ├── Hosts.jsx       # Discovered hosts and ports
│       │   ├── Findings.jsx    # CVE findings with severity filter
│       │   ├── AIAnalysis.jsx  # AI-generated analysis per finding
│       │   ├── Reports.jsx     # Generate and download reports
│       │   ├── Scope.jsx       # Authorized targets
│       │   └── AuditLog.jsx    # Append-only action log
│       └── components/
│           ├── Sidebar.jsx
│           ├── Topbar.jsx              # Scan input with debounce
│           └── WebSocketProvider.jsx
├── run.py                 # Entrypoint — use this to start the backend
├── scope.txt              # Authorized CIDR ranges (edit before scanning)
├── audit.log              # Append-only action log (auto-generated)
├── .env.example           # Environment variable template
├── requirements.txt       # Python dependencies
├── Dockerfile
└── README.md
```

---

## Quickstart

### 1. Clone
```bash
git clone https://github.com/finnmagnuskverndalen/fenrir.git
cd fenrir
```

### 2. Create and activate a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

> You will see `(venv)` in your terminal prompt when it is active.
> Every time you open a new terminal to work on Fenrir, run `source venv/bin/activate` first.

### 3. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 4. Install external scan tools
```bash
# nmap and whois
sudo apt install nmap whois -y

# Give nmap network capabilities so it runs without sudo
sudo setcap cap_net_raw,cap_net_admin+eip $(which nmap)

# subfinder and nuclei (requires Go)
sudo apt install golang-go -y
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Add Go binaries to PATH
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
source ~/.bashrc

# Download nuclei templates
nuclei -update-templates
```

### 5. Configure environment
```bash
cp .env.example .env
nano .env
# Add your OpenRouter API key on the OPENROUTER_API_KEY= line
# Get a free key at https://openrouter.ai/keys
# Save with Ctrl+X → Y → Enter
```

### 6. Define your authorized scope
```bash
# Find your network range
ip route | grep src

# Add it to scope.txt
echo "192.168.x.0/24" > scope.txt
```

### 7. Start the backend
```bash
python run.py
```

You should see:
```
Fenrir is ready.
INFO:     Uvicorn running on http://127.0.0.1:8765
```

### 8. Start the frontend (open a new terminal)
```bash
cd ~/fenrir
source venv/bin/activate
cd frontend
npm install
npm run dev
```

### 9. Open the UI
Navigate to `http://localhost:5173`

Enter a target (e.g. `192.168.1.0/24`), check **dry run** first to verify, then uncheck and scan for real.

---

## Venv cheatsheet

| Command | What it does |
|---|---|
| `python3 -m venv venv` | Create the virtual environment (once only) |
| `source venv/bin/activate` | Activate it (every new terminal session) |
| `deactivate` | Exit the virtual environment |
| `pip install -r requirements.txt` | Install all dependencies (after activating) |

---

## External tools required

| Tool | Purpose | Install |
|---|---|---|
| `nmap` | Port and service scanning | `sudo apt install nmap` |
| `whois` | Domain registration lookup | `sudo apt install whois` |
| `subfinder` | Subdomain enumeration | `go install github.com/projectdiscovery/subfinder/...` |
| `nuclei` | Template-based vulnerability scanning | `go install github.com/projectdiscovery/nuclei/...` |

---

## Safety

This tool is for **authorized testing only**.

- `scope.txt` restricts all scans to explicitly allowed CIDR ranges — targets outside scope get a 403
- Every action is logged with a timestamp to `audit.log`
- Exploitation features are **dry-run only** by default — set `DRY_RUN=false` in `.env` to enable
- Public IP ranges are blocked unless `ALLOW_PUBLIC_IPS=true` is set in `.env`

---

## Milestones

- [x] Milestone 1 — Project scaffold
- [x] Milestone 2 — Backend core (FastAPI, SQLite, WebSocket, scope guard, audit log)
- [x] Milestone 3 — Scan phases 1–3 (two-phase nmap, subfinder, nuclei, NVD, live log)
- [ ] Milestone 4 — AI analysis layer (OpenRouter findings prioritization)
- [ ] Milestone 5 — Frontend polish (findings detail, host drilldown)
- [ ] Milestone 6 — Report generator
- [ ] Milestone 7 — Exploit layer (Metasploit RPC, dry-run)
- [ ] Milestone 8 — Docker, auth, rate limiting

---

## License

MIT