import { useState } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'

export default function Phase2PortScan() {
  const {
    hosts, selectedHosts, selectAllHosts, clearHostSelect,
    scanning, setScanning, setPhaseStatus, addTerminalLine, setPhase,
  } = useFenrir()
  const [error, setError] = useState('')
  const [dryRun, setDryRun] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const canRun = selectedHosts.size > 0 && !scanning

  async function runPortScan() {
    if (!canRun) return
    setError('')
    setScanning(true)
    setPhaseStatus(2, 'running')
    const targets = [...selectedHosts]
    setProgress({ current: 0, total: targets.length })
    addTerminalLine(`[INFO] [phase2] Port scanning ${targets.length} host(s) — sequential to avoid overload`)

    try {
      // Sequential — one host at a time
      for (let i = 0; i < targets.length; i++) {
        const ip = targets[i]
        setProgress({ current: i + 1, total: targets.length })
        addTerminalLine(`[INFO] [phase2] Scanning ${ip} (${i + 1}/${targets.length})...`)

        const res = await fetch('/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: ip, phases: ['ports'], dry_run: dryRun }),
        })

        if (!res.ok) {
          const d = await res.json()
          addTerminalLine(`[WARN] [phase2] ${ip}: ${d.detail}`)
        }

        // Wait for this scan to complete before starting the next
        await waitForScanComplete(ip)

        // Small pause between hosts
        if (i < targets.length - 1) await sleep(500)
      }

      setPhaseStatus(2, 'complete')
      setScanning(false)
      setProgress({ current: 0, total: 0 })
      addTerminalLine(`[OK] [phase2] Port scan complete for all ${targets.length} hosts`)
    } catch (e) {
      setError('Backend error: ' + e.message)
      setPhaseStatus(2, 'failed')
      setScanning(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  async function waitForScanComplete(ip) {
    // Poll health endpoint to wait for the scan to clear from active_scans
    for (let i = 0; i < 60; i++) {
      await sleep(2000)
      try {
        const health = await fetch('/api/health').then(r => r.json())
        if (!health.active_scans?.includes(ip)) return
      } catch {}
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>

      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>
            PHASE 02 — PORT & SERVICE SCAN
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
            sequential — one host at a time
          </span>
        </div>

        {hosts.length === 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            ← Run Phase 1 detection first
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              {selectedHosts.size}/{hosts.length} selected
            </span>
            <button onClick={selectAllHosts} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-dim)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>SELECT ALL</button>
            <button onClick={clearHostSelect} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>CLEAR</button>

            <div onClick={() => !scanning && setDryRun(!dryRun)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: scanning ? 'not-allowed' : 'pointer', marginLeft: 8 }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: dryRun ? 'var(--amber)' : 'var(--bg4)', border: '1px solid var(--border)', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: dryRun ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: dryRun ? '#000' : 'var(--text-muted)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: dryRun ? 'var(--amber)' : 'var(--text-muted)' }}>DRY RUN</span>
            </div>

            <button
              onClick={runPortScan}
              disabled={!canRun}
              style={{
                background: canRun ? 'var(--amber)' : 'var(--bg4)',
                border: 'none', borderRadius: 6,
                color: canRun ? '#000' : 'var(--text-muted)',
                padding: '8px 20px', cursor: canRun ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--display)', fontSize: 11, letterSpacing: 2,
                marginLeft: 'auto',
              }}
            >
              {scanning
                ? `SCANNING ${progress.current}/${progress.total}...`
                : `SCAN ${selectedHosts.size} HOST${selectedHosts.size !== 1 ? 'S' : ''}`}
            </button>
          </div>
        )}

        {/* Progress bar */}
        {scanning && progress.total > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ background: 'var(--bg4)', borderRadius: 3, height: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'var(--amber)',
                width: `${(progress.current / progress.total) * 100}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {progress.current}/{progress.total} hosts — scanning one at a time to prevent memory overload
            </div>
          </div>
        )}

        {error && <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)' }}>✗ {error}</div>}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          nmap -sV -sC -T4 -Pn — service detection + version grabbing
        </div>
      </div>

      {hosts.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              CLICK HOSTS TO SELECT
            </span>
            <button onClick={() => setPhase(3)} style={{ background: 'none', border: '1px solid var(--border-red)', borderRadius: 4, color: 'var(--red)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1 }}>
              PROCEED TO VULN SCAN →
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, alignContent: 'start' }}>
            {hosts.map(h => <HostCard key={h.ip} host={h} />)}
          </div>
        </div>
      )}
    </div>
  )
}
