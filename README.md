# Fenrir - Network Security Scanner

> *In Norse mythology, Fenrir is the great wolf — unchained, relentless, and unstoppable. This tool hunts your network the same way.*

An AI-powered network security scanner. Discovers hosts, maps ports and services, identifies vulnerabilities, and uses an LLM to prioritize findings and suggest attack paths — all from a modern web UI.

---

## Features

- **Phase 1 — DNS & WHOIS** — subdomain enumeration via subfinder, dig, whois
- **Phase 2 — Port & service scan** — nmap -sV -sC, banner grabbing
- **Phase 3 — Vulnerability scan** — nuclei templates + CVE enrichment via NVD API
- **Phase 4 — AI analysis** — Claude prioritizes findings and maps CVEs to exploits
- **Phase 5 — Reporting** — auto-generated markdown/PDF pentest report
- **Web UI** — React + FastAPI dashboard with live scan output via WebSocket

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI + Python |
| AI | OpenRouter API (model-agnostic) |
| Scanning | nmap, nuclei, subfinder, masscan |
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
│       ├── port_scan.py   # Phase 2 — port and service scan
│       ├── vuln_scan.py   # Phase 3 — vulnerability scan
│       └── exploit.py     # Phase 4 — exploit suggestions (dry-run)
├── ai/
│   ├── analyst.py         # Claude analysis and prioritization
│   └── reporter.py        # Report generation
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Hosts.jsx
│       │   ├── Findings.jsx
│       │   ├── AIAnalysis.jsx
│       │   ├── Reports.jsx
│       │   └── Scope.jsx
│       └── components/
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

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment
```bash
cp .env.example .env
nano .env
# Add your OpenRouter API key on the OPENROUTER_API_KEY= line
# Save with Ctrl+X → Y → Enter
```

### 5. Define your authorized scope
```bash
echo "192.168.1.0/24" > scope.txt
```

### 6. Start the backend
```bash
python backend/main.py
```

You should see:
```
Fenrir is ready.
INFO:     Uvicorn running on http://127.0.0.1:8765
```

### 7. Start the frontend (open a new terminal)
```bash
cd ~/fenrir
source venv/bin/activate
cd frontend
npm install
npm run dev
```

### 8. Open the UI
Navigate to `http://localhost:5173`

---

## Venv cheatsheet

| Command | What it does |
|---|---|
| `python3 -m venv venv` | Create the virtual environment (once only) |
| `source venv/bin/activate` | Activate it (every new terminal session) |
| `deactivate` | Exit the virtual environment |
| `pip install -r requirements.txt` | Install all dependencies (after activating) |
| `pip freeze` | List all installed packages |

---

## External tools required

| Tool | Install |
|---|---|
| nmap | `sudo apt install nmap` |
| subfinder | `go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest` |
| nuclei | `go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest` |
| masscan | `sudo apt install masscan` |

---

## Safety

This tool is for **authorized testing only**.

- A `scope.txt` file restricts all scans to explicitly allowed CIDR ranges
- Every action is logged with a timestamp to `audit.log`
- Exploitation features are **dry-run only** by default
- Public IP ranges are blocked unless explicitly unlocked in config

---

## Milestones

- [x] Milestone 1 — Project scaffold
- [ ] Milestone 2 — Backend core (FastAPI, SQLite, WebSocket, scope guard)
- [ ] Milestone 3 — Scan phases 1–3 (nmap, subfinder, nuclei, NVD)
- [ ] Milestone 4 — AI analysis layer (Claude API)
- [ ] Milestone 5 — Frontend (React + Vite dashboard)
- [ ] Milestone 6 — Report generator
- [ ] Milestone 7 — Exploit layer (Metasploit RPC, dry-run)
- [ ] Milestone 8 — Polish, auth, Docker

---

## License

MIT