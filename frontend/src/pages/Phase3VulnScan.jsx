import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'
import AISummaryPanel from '../components/AISummaryPanel'

const sevColor = { critical:'#e53e3e', high:'#f59e0b', medium:'#ecc94b', low:'#38a169', info:'#3b82f6' }
const sevOrder = { critical:0, high:1, medium:2, low:3, info:4 }

export default function Phase3VulnScan() {
  const {
    hosts, selectedHosts, selectAllHosts, clearHostSelect,
    findings, setFindings, scanning, setScanning, setPhaseStatus,
    addTerminalLine, setAISummary, setHostVulns, setPhase,
  } = useFenrir()
  const [error, setError] = useState('')
  const [dryRun, setDryRun] = useState(false)
  const [activeHost, setActiveHost] = useState(null)

  useEffect(() => {
    fetch('/api/findings').then(r => r.json()).then(d => setFindings(d)).catch(() => {})
  }, [])

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

      setTimeout(async () => {
        const fresh = await fetch('/api/findings').then(r => r.json()).catch(() => [])
        setFindings(fresh)

        // Group findings per host
        hosts.forEach(h => {
          const hf = fresh.filter(f => f.host_id === h.id || f.host === h.ip)
          if (hf.length) setHostVulns(h.ip, hf)
        })

        // AI summary
        if (fresh.length > 0) {
          try {
            const aiRes = await fetch('/api/ai/summarize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phase: 'vulnscan', data: fresh.slice(0, 30) }),
            })
            if (aiRes.ok) {
              const aiData = await aiRes.json()
              setAISummary(3, aiData.summary)
            }
          } catch {}
        }

        setPhaseStatus(3, 'complete')
        setScanning(false)
        addTerminalLine(`[OK] [phase3] Found ${fresh.length} findings`)
      }, 4000)
    } catch {
      setError('Backend error')
      setPhaseStatus(3, 'failed')
      setScanning(false)
    }
  }

  const sorted = [...findings].sort((a, b) => (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5))
  const hostFindings = activeHost ? sorted.filter(f => f.host?.includes(activeHost) || f.host_id) : sorted

  return (
    <div style={{ display: 'flex', gap: 14, height: '100%', overflow: 'hidden' }}>

      {/* Left — host selector */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>
              PHASE 03 — VULN SCAN
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={selectAllHosts} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-dim)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>ALL</button>
            <button onClick={clearHostSelect} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>NONE</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <div onClick={() => setDryRun(!dryRun)} style={{ width: 28, height: 16, borderRadius: 8, background: dryRun ? 'var(--amber)' : 'var(--bg4)', border: '1px solid var(--border)', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', top: 1, left: dryRun ? 13 : 1, width: 12, height: 12, borderRadius: '50%', background: dryRun ? '#000' : 'var(--text-muted)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: dryRun ? 'var(--amber)' : 'var(--text-muted)' }}>DRY</span>
            </label>
          </div>
          <button
            onClick={runVulnScan}
            disabled={!canRun}
            style={{
              width: '100%', background: canRun ? 'rgba(139,92,246,0.2)' : 'var(--bg4)',
              border: `1px solid ${canRun ? 'rgba(139,92,246,0.4)' : 'var(--border)'}`,
              borderRadius: 6, color: canRun ? '#c4b5fd' : 'var(--text-muted)',
              padding: '8px', cursor: canRun ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--display)', fontSize: 10, letterSpacing: 2,
            }}
          >
            {scanning ? 'SCANNING...' : `SCAN ${selectedHosts.size || 0}`}
          </button>
          {error && <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)' }}>✗ {error}</div>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hosts.map(h => <HostCard key={h.ip} host={h} compact />)}
        </div>
      </div>

      {/* Right — findings */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        <AISummaryPanel phase={3} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            {findings.length} FINDINGS
            {findings.filter(f=>f.severity==='critical').length > 0 && (
              <span style={{ color: 'var(--red)', marginLeft: 8 }}>
                {findings.filter(f=>f.severity==='critical').length} CRITICAL
              </span>
            )}
          </span>
          <button onClick={() => setPhase(4)} style={{ background: 'none', border: '1px solid var(--border-red)', borderRadius: 4, color: 'var(--red)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1 }}>
            PROCEED TO EXPLOITATION →
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.length === 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 20, textAlign: 'center' }}>
              Select hosts and run vuln scan to discover vulnerabilities
            </div>
          ) : sorted.map((f, i) => {
            const color = sevColor[f.severity] || '#555'
            return (
              <div key={i} style={{
                background: 'var(--bg3)', borderLeft: `3px solid ${color}`,
                border: `1px solid var(--border)`, borderLeft: `3px solid ${color}`,
                borderRadius: '0 8px 8px 0', padding: '10px 14px',
                animation: 'fade-in 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: color+'22', color, flexShrink: 0 }}>
                    {f.severity?.toUpperCase()}
                  </span>
                  {f.cve_id && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3b82f6' }}>{f.cve_id}</span>}
                  {f.cvss_score && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>CVSS {f.cvss_score}</span>}
                  <span style={{ color: 'var(--text)', fontSize: 12, flex: 1 }}>{f.title}</span>
                </div>
                {f.ai_analysis && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(59,130,246,0.7)', lineHeight: 1.5 }}>
                    {f.ai_analysis.slice(0, 200)}{f.ai_analysis.length > 200 ? '...' : ''}
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
