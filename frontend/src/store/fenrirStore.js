import { create } from 'zustand'

export const useFenrir = create((set) => ({
  currentPhase: 1,
  phaseStatus: { 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle', 5: 'idle' },
  hosts: [],
  selectedHosts: new Set(),
  findings: [],
  sessions: [],
  logs: [],
  aiSummary: {},
  activeHostId: null,
  scanTarget: '192.168.10.0/24',
  scanning: false,
  terminalLines: [],
  showSettings: false,
  settings: {
    provider: 'openrouter',
    openrouter_api_key: '',
    openrouter_model: 'meta-llama/llama-3.3-70b-instruct',
    ollama_base_url: 'http://localhost:11434',
    ollama_model: 'llama3.2',
    ai_max_tokens: 4096,
  },
  settingsLoaded: false,

  setPhase: (p) => set({ currentPhase: p }),
  setPhaseStatus: (phase, status) => set(s => ({ phaseStatus: { ...s.phaseStatus, [phase]: status } })),
  setScanTarget: (t) => set({ scanTarget: t }),
  setScanning: (v) => set({ scanning: v }),
  setActiveHost: (id) => set({ activeHostId: id }),

  toggleHostSelect: (ip) => set(s => {
    const next = new Set(s.selectedHosts)
    next.has(ip) ? next.delete(ip) : next.add(ip)
    return { selectedHosts: next }
  }),
  selectAllHosts: () => set(s => ({ selectedHosts: new Set(s.hosts.map(h => h.ip)) })),
  clearHostSelect: () => set({ selectedHosts: new Set() }),

  addHost: (host) => set(s => {
    const exists = s.hosts.find(h => h.ip === host.ip)
    if (exists) return { hosts: s.hosts.map(h => h.ip === host.ip ? { ...h, ...host } : h) }
    return { hosts: [...s.hosts, { ...host, compromised: false }] }
  }),
  setHosts: (hosts) => set({ hosts }),
  clearHosts: () => set({ hosts: [], selectedHosts: new Set(), findings: [] }),
  markCompromised: (ip) => set(s => ({
    hosts: s.hosts.map(h => h.ip === ip ? { ...h, compromised: true } : h)
  })),

  addFinding: (f) => set(s => {
    const exists = s.findings.find(x => x.title === f.title && x.host === f.host)
    if (exists) return {}
    return { findings: [f, ...s.findings] }
  }),
  setFindings: (findings) => set({ findings }),

  addLog: (log) => set(s => ({ logs: [log, ...s.logs].slice(0, 500) })),
  addTerminalLine: (line) => set(s => ({
    terminalLines: [...s.terminalLines, { text: line, ts: new Date().toLocaleTimeString() }].slice(-300)
  })),
  clearTerminal: () => set({ terminalLines: [] }),

  setAISummary: (phase, text) => set(s => ({ aiSummary: { ...s.aiSummary, [phase]: text } })),
  setSessions: (sessions) => set({ sessions }),

  setShowSettings: (v) => set({ showSettings: v }),
  setSettings: (s) => set({ settings: s, settingsLoaded: true }),
  loadSettingsFromBackend: async () => {
    try {
      const r = await fetch('/api/settings')
      const data = await r.json()
      set({ settings: data, settingsLoaded: true })
    } catch {}
  },
}))
