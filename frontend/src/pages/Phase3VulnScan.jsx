import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'

const sevColor  = { critical:'#ff3b3b', high:'#f97316', medium:'#f59e0b', low:'#22c55e', info:'#3b82f6' }
const sevBg     = { critical:'rgba(255,59,59,0.1)', high:'rgba(249,115,22,0.1)', medium:'rgba(245,158,11,0.1)', low:'rgba(34,197,94,0.1)', info:'rgba(59,130,246,0.1)' }
const sevOrder  = { critical:0, high:1, medium:2, low:3, info:4 }

export default function Phase3VulnScan() {
  const { hosts, selectedHosts, selectAllHosts, clearHostSelect, scanning, setScanning, setPhaseStatus, addTerminalLine, setAISummary, setPhase } = useFenrir()
  const [findings, setFindings] = useState([])
  const [dryRun, setDryRun] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [aiSummary, setLocalAI] = useState('')

  const loadFindings = () =>
    fetch('/api/findings').then(r => r.json()).then(d => {
      const seen = new Set()
      setFindings(d.filter(f => { const k = `${f.title}|${f.host_id}`; if (seen.has(k)) return false; seen.add(k); return true }))
    }).catch(() => {})

  useEffect(() => { loadFindings() }, [])

  const canRun = selectedHosts.size > 0 && !scanning

  async function run() {
    if (!canRun) return
    setScanning(true); setPhaseStatus(3, 'running')
    const targets = [...selectedHosts]
    addTerminalLine(`[INFO] [phase3] Vuln scanning ${targets.length} host(s)`)

    for (let i = 0; i < targets.length; i++) {
      const ip = targets[i]
      addTerminalLine(`[INFO] [phase3] nuclei → ${ip} (${i+1}/${targets.length})`)
      const res = await fetch('/api/scan/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: ip, phases: ['vulns', 'ai'], dry_run: dryRun }),
      })
      if (!res.ok) { const d = await res.json(); addTerminalLine(`[WARN] [phase3] ${ip}: ${d.detail}`) }
      for (let w = 0; w < 90; w++) {
        await new Promise(r => setTimeout(r, 2000))
        const h = await fetch('/api/health').then(r => r.json()).catch(() => ({}))
        if (!h.active_scans?.includes(ip)) break
      }
      await loadFindings()
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 1000))
    }

    setPhaseStatus(3, 'complete'); setScanning(false)
    const fresh = await fetch('/api/findings').then(r => r.json()).catch(() => [])
    if (fresh.length > 0) {
      try {
        const aiRes = await fetch('/api/ai/summarize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'vulnscan', data: fresh.slice(0, 20) }),
        })
        if (aiRes.ok) { const d = await aiRes.json(); setLocalAI(d.summary || '') }
      } catch {}
    }
    addTerminalLine(`[OK] [phase3] Scan complete — ${fresh.length} findings`)
  }

  const sorted = [...findings].sort((a, b) => (sevOrder[a.severity]??5) - (sevOrder[b.severity]??5))
  const filtered = severityFilter === 'all' ? sorted : sorted.filter(f => f.severity === severityFilter)
  const counts = ['critical','high','medium','low','info'].reduce((acc, s) => ({ ...acc, [s]: findings.filter(f=>f.severity===s).length }), {})

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* Left */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.1em' }}>PHASE 03 — VULN SCAN</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={selectAllHosts} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-2)', padding: '5px 10px', fontSize: 11, fontWeight: 500 }}>All</button>
            <button onClick={clearHostSelect} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-3)', padding: '5px 10px', fontSize: 11 }}>None</button>
            <div onClick={() => setDryRun(!dryRun)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 4 }}>
              <div style={{ width: 28, height: 16, borderRadius: 8, position: 'relative', background: dryRun ? 'var(--amber)' : 'var(--bg-4)', border: '1px solid var(--border)', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 1, left: dryRun ? 13 : 1, width: 12, height: 12, borderRadius: '50%', background: dryRun ? '#000' : 'var(--text-3)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 11, color: dryRun ? 'var(--amber)' : 'var(--text-3)' }}>Dry</span>
            </div>
          </div>
          <button onClick={run} disabled={!canRun} style={{
            width: '100%', height: 38,
            background: canRun ? 'rgba(139,92,246,0.2)' : 'var(--bg-3)',
            border: `1px solid ${canRun ? 'rgba(139,92,246,0.4)' : 'var(--border)'}`,
            borderRadius: 8, color: canRun ? '#c4b5fd' : 'var(--text-3)',
            fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, cursor: canRun ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {scanning ? (
              <><div style={{ width: 12, height: 12, border: '2px solid #c4b5fd', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Scanning...</>
            ) : `Scan ${selectedHosts.size} host${selectedHosts.size !== 1 ? 's' : ''}`}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hosts.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>Run phases 1 & 2 first.</div>
          ) : hosts.map(h => <HostCard key={h.ip} host={h} compact />)}
        </div>
      </div>

      {/* Right — findings */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>

        {/* AI summary */}
        {aiSummary && (
          <div style={{ background: 'var(--blue-soft)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '14px 16px', flexShrink: 0, animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.1em', marginBottom: 6 }}>AI ANALYSIS</div>
            <div style={{ fontSize: 12, color: 'rgba(147,197,253,0.9)', lineHeight: 1.7 }}>{aiSummary}</div>
          </div>
        )}

        {/* Severity filter + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{findings.length} findings</span>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {['all','critical','high','medium','low','info'].map(s => (
              <button key={s} onClick={() => setSeverityFilter(s)} style={{
                background: severityFilter === s ? (sevBg[s] || 'var(--bg-3)') : 'transparent',
                border: `1px solid ${severityFilter === s ? (sevColor[s] ? sevColor[s]+'44' : 'var(--border)') : 'transparent'}`,
                borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: severityFilter === s ? 600 : 400,
                color: severityFilter === s ? (sevColor[s] || 'var(--text-2)') : 'var(--text-3)', cursor: 'pointer',
              }}>
                {s === 'all' ? `All (${findings.length})` : `${s} (${counts[s] || 0})`}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={loadFindings} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-2)', padding: '5px 12px', fontSize: 11, fontWeight: 500 }}>Refresh</button>
            <button onClick={() => setPhase(4)} style={{ background: 'transparent', border: '1px solid var(--red-border)', borderRadius: 8, color: 'var(--red)', padding: '5px 14px', fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              Exploitation →
            </button>
          </div>
        </div>

        {/* Findings list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 24, textAlign: 'center' }}>
              {findings.length === 0 ? 'Select hosts and run vuln scan to discover vulnerabilities.' : 'No findings match this filter.'}
            </div>
          ) : filtered.map((f, i) => {
            const color = sevColor[f.severity] || 'var(--text-3)'
            const bg = sevBg[f.severity] || 'var(--bg-2)'
            const isOpen = expanded === i
            return (
              <div key={i} onClick={() => setExpanded(isOpen ? null : i)} style={{
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${color}`,
                borderRadius: '0 10px 10px 0', overflow: 'hidden', cursor: 'pointer',
                transition: 'border-color 0.15s',
                animation: 'fadeUp 0.15s ease',
              }}>
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: bg, color, fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0 }}>
                    {f.severity?.toUpperCase()}
                  </span>
                  {f.cve_id && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--blue)', flexShrink: 0 }}>{f.cve_id}</span>}
                  {f.cvss_score && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>CVSS {f.cvss_score}</span>}
                  <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 10, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {f.description && <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{f.description}</div>}
                    {f.ai_analysis && (
                      <div style={{ background: 'var(--blue-soft)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.08em', marginBottom: 6 }}>AI ANALYSIS</div>
                        <div style={{ fontSize: 12, color: 'rgba(147,197,253,0.9)', lineHeight: 1.7 }}>
                          {f.ai_analysis.replace(/#{1,3} /g, '').replace(/\*\*/g, '')}
                        </div>
                      </div>
                    )}
                    {f.cve_id && (
                      <a href={`https://nvd.nist.gov/vuln/detail/${f.cve_id}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: 'var(--blue)' }}>
                        View on NVD →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
