import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'
import AISummaryPanel from '../components/AISummaryPanel'

const sevColor = { critical:'#e53e3e', high:'#f59e0b', medium:'#ecc94b', low:'#38a169', info:'#3b82f6' }
const sevOrder = { critical:0, high:1, medium:2, low:3, info:4 }

export default function Phase3VulnScan() {
  const {
    hosts, selectedHosts, selectAllHosts, clearHostSelect,
    scanning, setScanning, setPhaseStatus,
    addTerminalLine, setAISummary, setHostVulns, setPhase,
  } = useFenrir()

  const [findings, setFindings] = useState([])
  const [error, setError] = useState('')
  const [dryRun, setDryRun] = useState(false)
  const [expanded, setExpanded] = useState(null)

  // Load findings from DB on mount and after scans
  const loadFindings = async () => {
    try {
      const data = await fetch('/api/findings').then(r => r.json())
      // Deduplicate by title + severity + host
      const seen = new Set()
      const deduped = data.filter(f => {
        const key = `${f.title}|${f.severity}|${f.host_id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setFindings(deduped)
    } catch {}
  }

  useEffect(() => { loadFindings() }, [])

  const canRun = selectedHosts.size > 0 && !scanning

  async function runVulnScan() {
    if (!canRun) return
    setError('')
    setScanning(true)
    setPhaseStatus(3, 'running')
    addTerminalLine(`[INFO] [phase3] Starting vuln scan on ${selectedHosts.size} hosts`)

    try {
      for (const ip of [...selectedHosts]) {
        addTerminalLine(`[INFO] [phase3] nuclei → ${ip}`)
        const res = await fetch('/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: ip, phases: ['vulns', 'ai'], dry_run: dryRun }),
        })
        if (!res.ok) {
          const d = await res.json()
          addTerminalLine(`[WARN] [phase3] ${ip}: ${d.detail}`)
        }
      }

      // Poll for results
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        await loadFindings()
        if (attempts > 30) {
          clearInterval(poll)
          setPhaseStatus(3, 'complete')
          setScanning(false)

          // AI summary
          const fresh = await fetch('/api/findings').then(r => r.json()).catch(() => [])
          if (fresh.length > 0) {
            try {
              const aiRes = await fetch('/api/ai/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phase: 'vulnscan', data: fresh.slice(0, 20) }),
              })
              if (aiRes.ok) {
                const d = await aiRes.json()
                setAISummary(3, d.summary)
              }
            } catch {}
          }
          addTerminalLine(`[OK] [phase3] Vuln scan complete`)
        }
      }, 3000)

    } catch {
      setError('Backend error')
      setPhaseStatus(3, 'failed')
      setScanning(false)
    }
  }

  const sorted = [...findings].sort((a, b) =>
    (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5)
  )

  return (
    <div style={{ display: 'flex', gap: 14, height: '100%', overflow: 'hidden' }}>

      {/* Left — host selector */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--purple)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>
              PHASE 03 — VULN SCAN
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={selectAllHosts} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-dim)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>ALL</button>
            <button onClick={clearHostSelect} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>NONE</button>
            <div onClick={() => setDryRun(!dryRun)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <div style={{ width: 28, height: 16, borderRadius: 8, background: dryRun ? 'var(--amber)' : 'var(--bg4)', border: '1px solid var(--border)', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', top: 1, left: dryRun ? 13 : 1, width: 12, height: 12, borderRadius: '50%', background: dryRun ? '#000' : 'var(--text-muted)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: dryRun ? 'var(--amber)' : 'var(--text-muted)' }}>DRY</span>
            </div>
          </div>

          <button
            onClick={runVulnScan}
            disabled={!canRun}
            style={{
              width: '100%',
              background: canRun ? 'rgba(139,92,246,0.15)' : 'var(--bg4)',
              border: `1px solid ${canRun ? 'rgba(139,92,246,0.4)' : 'var(--border)'}`,
              borderRadius: 6, color: canRun ? '#c4b5fd' : 'var(--text-muted)',
              padding: '8px', cursor: canRun ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--display)', fontSize: 10, letterSpacing: 2,
            }}
          >
            {scanning ? 'SCANNING...' : `SCAN ${selectedHosts.size || 0} HOSTS`}
          </button>
          {error && <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)' }}>✗ {error}</div>}
        </div>

        {/* Host list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {hosts.length === 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', padding: '8px 0' }}>
              ← Run phases 1 & 2 first
            </div>
          ) : hosts.map(h => <HostCard key={h.ip} host={h} compact />)}
        </div>
      </div>

      {/* Right — findings */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        <AISummaryPanel phase={3} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            {findings.length} FINDINGS
            {findings.filter(f => f.severity === 'critical').length > 0 && (
              <span style={{ color: 'var(--red)', marginLeft: 10 }}>
                {findings.filter(f => f.severity === 'critical').length} CRITICAL
              </span>
            )}
            {findings.filter(f => f.severity === 'high').length > 0 && (
              <span style={{ color: 'var(--amber)', marginLeft: 10 }}>
                {findings.filter(f => f.severity === 'high').length} HIGH
              </span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadFindings} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
              REFRESH
            </button>
            <button onClick={() => setPhase(4)} style={{ background: 'none', border: '1px solid var(--border-red)', borderRadius: 4, color: 'var(--red)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1 }}>
              PROCEED TO EXPLOITATION →
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {sorted.length === 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 20, textAlign: 'center' }}>
              Select hosts and run vuln scan to discover vulnerabilities
            </div>
          ) : sorted.map((f, i) => {
            const color = sevColor[f.severity] || '#555'
            const isOpen = expanded === i
            return (
              <div
                key={i}
                onClick={() => setExpanded(isOpen ? null : i)}
                style={{
                  background: 'var(--bg3)',
                  borderLeft: `3px solid ${color}`,
                  border: `1px solid var(--border)`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: '0 8px 8px 0',
                  cursor: 'pointer',
                  animation: 'fade-in 0.2s ease',
                  overflow: 'hidden',
                }}
              >
                {/* Header — always visible */}
                <div style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: color+'22', color, flexShrink: 0 }}>
                    {f.severity?.toUpperCase()}
                  </span>
                  {f.cve_id && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3b82f6', flexShrink: 0 }}>{f.cve_id}</span>
                  )}
                  {f.cvss_score && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>CVSS {f.cvss_score}</span>
                  )}
                  <span style={{ color: 'var(--text)', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.title}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {f.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>{f.description}</div>
                    )}
                    {f.ai_analysis && (
                      <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 6, padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#3b82f6', marginBottom: 6, letterSpacing: 1 }}>AI ANALYSIS</div>
                        <div style={{ fontSize: 12, color: 'rgba(59,130,246,0.8)', lineHeight: 1.6 }}>
                          {f.ai_analysis.replace(/#{1,3} /g, '').replace(/\*\*/g, '').slice(0, 400)}
                          {f.ai_analysis.length > 400 ? '...' : ''}
                        </div>
                      </div>
                    )}
                    {f.cve_id && (
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${f.cve_id}`}
                        target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3b82f6', textDecoration: 'none' }}
                      >
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
