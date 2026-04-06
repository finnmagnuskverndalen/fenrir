import { useEffect, useState } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'
import NetworkMap from '../components/NetworkMap'

export default function Phase1Detection() {
  const { scanTarget, setScanTarget, hosts, setHosts, scanning, setScanning, clearHosts, setPhaseStatus, addTerminalLine, setAISummary, setPhase } = useFenrir()
  const [error, setError] = useState('')
  const [dryRun, setDryRun] = useState(false)
  const [aiSummary, setLocalAI] = useState('')

  // Load hosts from DB on mount
  useEffect(() => {
    fetch('/api/hosts').then(r => r.json()).then(data => {
      if (data.length > 0) setHosts(data)
    }).catch(() => {})
  }, [])

  async function runDetection() {
    if (!scanTarget.trim() || scanning) return
    setError('')
    setScanning(true)
    clearHosts()
    setLocalAI('')
    setPhaseStatus(1, 'running')
    addTerminalLine(`[INFO] [phase1] Starting detection on ${scanTarget}`)

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: scanTarget.trim(), phases: ['discovery'], dry_run: dryRun }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Scan failed'); setPhaseStatus(1, 'failed'); setScanning(false); return }

      addTerminalLine(`[OK] [phase1] Session ${data.session_id?.slice(0,8)} — ARP sweep starting`)

      // Poll until scan completes
      let done = false
      for (let i = 0; i < 60 && !done; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const health = await fetch('/api/health').then(r => r.json()).catch(() => ({}))
        if (!health.active_scans?.includes(scanTarget.trim())) done = true
      }

      // Load hosts from DB
      const fresh = await fetch('/api/hosts').then(r => r.json()).catch(() => [])
      setHosts(fresh)
      setPhaseStatus(1, 'complete')
      setScanning(false)

      // AI summary
      if (fresh.length > 0) {
        try {
          const aiRes = await fetch('/api/ai/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phase: 'detection', data: fresh.map(h => ({ ip: h.ip, hostname: h.hostname, os: h.os_guess })) }),
          })
          if (aiRes.ok) { const d = await aiRes.json(); setLocalAI(d.summary || '') }
        } catch {}
      }
    } catch { setError('Cannot connect to backend'); setPhaseStatus(1, 'failed'); setScanning(false) }
  }

  return (
    <div style={{ display: 'flex', gap: 14, height: '100%', overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

        {/* Control */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>PHASE 01 — HOST DETECTION & OS FINGERPRINTING</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={scanTarget} onChange={e => setScanTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runDetection()}
              placeholder="192.168.1.0/24" disabled={scanning}
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '9px 12px', fontFamily: 'var(--mono)', fontSize: 12, outline: 'none' }}
            />
            <button onClick={runDetection} disabled={scanning || !scanTarget.trim()} style={{
              background: scanning ? 'var(--bg4)' : 'var(--red)', border: 'none', borderRadius: 6,
              color: scanning ? 'var(--text-muted)' : '#fff', padding: '9px 20px',
              cursor: scanning ? 'not-allowed' : 'pointer', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: 2,
            }}>
              {scanning ? 'SCANNING...' : 'DETECT'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={() => !scanning && setDryRun(!dryRun)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: dryRun ? 'var(--amber)' : 'var(--bg4)', border: '1px solid var(--border)', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: dryRun ? 16 : 2, width: 12, height: 12, borderRadius: '50%', background: dryRun ? '#000' : 'var(--text-muted)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: dryRun ? 'var(--amber)' : 'var(--text-muted)' }}>DRY RUN</span>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>nmap ARP sweep → OS fingerprint</span>
          </div>
          {error && <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)' }}>✗ {error}</div>}
        </div>

        {/* Network Map */}
        <NetworkMap />

        {/* AI summary */}
        {aiSummary && (
          <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#3b82f6', marginBottom: 6, letterSpacing: 1 }}>AI NETWORK SUMMARY</div>
            <div style={{ fontSize: 12, color: 'rgba(59,130,246,0.8)', lineHeight: 1.7 }}>{aiSummary}</div>
          </div>
        )}
      </div>

      {/* Right — host grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        {hosts.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>{hosts.length} HOST{hosts.length !== 1 ? 'S' : ''} DISCOVERED</span>
              <button onClick={() => setPhase(2)} style={{ background: 'none', border: '1px solid var(--border-red)', borderRadius: 4, color: 'var(--red)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1 }}>
                PROCEED TO PORT SCAN →
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, alignContent: 'start' }}>
              {hosts.map(h => <HostCard key={h.ip} host={h} />)}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 52, opacity: 0.06 }}>⬡</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>Enter a CIDR range and run detection</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5 }}>ARP sweep finds hosts in seconds — no port scanning yet</div>
          </div>
        )}
      </div>
    </div>
  )
}
