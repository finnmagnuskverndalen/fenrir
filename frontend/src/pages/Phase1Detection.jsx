import { useState } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'
import AISummaryPanel from '../components/AISummaryPanel'

export default function Phase1Detection() {
  const {
    scanTarget, setScanTarget, hosts, scanning, setScanning,
    clearHosts, setPhaseStatus, addTerminalLine, setAISummary, setPhase
  } = useFenrir()
  const [error, setError] = useState('')
  const [dryRun, setDryRun] = useState(false)

  async function runDetection() {
    if (!scanTarget.trim()) return
    setError('')
    setScanning(true)
    clearHosts()
    setPhaseStatus(1, 'running')
    addTerminalLine(`[INFO] [phase1] Starting detection on ${scanTarget}`)

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: scanTarget.trim(),
          phases: ['dns', 'ports'],
          dry_run: dryRun,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Scan failed')
        setPhaseStatus(1, 'failed')
        setScanning(false)
      } else {
        addTerminalLine(`[OK] [phase1] Session ${data.session_id.slice(0,8)} started`)
        setTimeout(async () => {
          try {
            const findings = await fetch('/api/findings').then(r => r.json())
            if (findings.length > 0) {
              const aiRes = await fetch('/api/ai/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phase: 'detection', data: findings }),
              })
              if (aiRes.ok) {
                const aiData = await aiRes.json()
                setAISummary(1, aiData.summary)
              }
            }
          } catch {}
          setPhaseStatus(1, 'complete')
          setScanning(false)
        }, 3000)
      }
    } catch (e) {
      setError('Cannot connect to backend')
      setPhaseStatus(1, 'failed')
      setScanning(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* Control panel */}
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>
            PHASE 01 — NETWORK DETECTION
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={scanTarget}
            onChange={e => setScanTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !scanning && runDetection()}
            placeholder="192.168.1.0/24"
            style={{
              flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text)', padding: '10px 14px',
              fontFamily: 'var(--mono)', fontSize: 13, outline: 'none',
            }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
            <div
              onClick={() => setDryRun(!dryRun)}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: dryRun ? 'var(--amber)' : 'var(--bg4)',
                border: '1px solid var(--border)',
                position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: dryRun ? 18 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: dryRun ? '#000' : 'var(--text-muted)',
                transition: 'left 0.2s',
              }} />
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: dryRun ? 'var(--amber)' : 'var(--text-muted)' }}>
              DRY RUN
            </span>
          </label>

          <button
            onClick={runDetection}
            disabled={scanning || !scanTarget.trim()}
            style={{
              background: scanning ? 'var(--bg4)' : 'var(--red)',
              border: 'none', borderRadius: 6,
              color: scanning ? 'var(--text-muted)' : '#fff',
              padding: '10px 24px', cursor: scanning ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--display)', fontSize: 11, letterSpacing: 2,
              transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            {scanning ? 'SCANNING...' : 'DETECT'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)' }}>
            ✗ {error}
          </div>
        )}

        <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>nmap -sn (ping sweep) → OS detection → service banner grab</span>
        </div>
      </div>

      {/* AI summary */}
      <AISummaryPanel phase={1} />

      {/* Host grid */}
      {hosts.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              {hosts.length} HOST{hosts.length !== 1 ? 'S' : ''} DISCOVERED
            </span>
            {hosts.length > 0 && (
              <button
                onClick={() => setPhase(2)}
                style={{
                  background: 'none', border: '1px solid var(--border-red)',
                  borderRadius: 4, color: 'var(--red)',
                  padding: '4px 12px', cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
                }}
              >
                PROCEED TO PORT SCAN →
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, alignContent: 'start' }}>
            {hosts.map(h => <HostCard key={h.ip} host={h} />)}
          </div>
        </div>
      )}

      {hosts.length === 0 && !scanning && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 48, opacity: 0.1 }}>⬡</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            Enter a CIDR range and run detection
          </div>
        </div>
      )}
    </div>
  )
}
