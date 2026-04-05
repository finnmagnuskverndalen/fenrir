import { create } from 'zustand'

export const useFenrir = create((set, get) => ({
  currentPhase: 1,
  phaseStatus: { 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle', 5: 'idle' },
  hosts: [],
  selectedHosts: new Set(),
  findings: [],
  sessions: [],
  logs: [],
  aiSummary: {},
  activeHostId: null,
  scanTarget: '',
  scanning: false,
  terminalLines: [],

  setPhase: (phase) => set({ currentPhase: phase }),
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
    return { hosts: [...s.hosts, { ...host, status: 'alive', compromised: false }] }
  }),
  markCompromised: (ip) => set(s => ({
    hosts: s.hosts.map(h => h.ip === ip ? { ...h, compromised: true, status: 'compromised' } : h)
  })),
  clearHosts: () => set({ hosts: [], selectedHosts: new Set(), findings: [] }),

  addFinding: (f) => set(s => ({ findings: [f, ...s.findings] })),
  setFindings: (fs) => set({ findings: fs }),

  addLog: (log) => set(s => ({ logs: [log, ...s.logs].slice(0, 500) })),
  addTerminalLine: (line) => set(s => ({
    terminalLines: [...s.terminalLines, { text: line, ts: new Date().toISOString() }].slice(-300)
  })),
  clearTerminal: () => set({ terminalLines: [] }),

  setAISummary: (phase, text) => set(s => ({ aiSummary: { ...s.aiSummary, [phase]: text } })),
  setSessions: (s) => set({ sessions: s }),
}))
