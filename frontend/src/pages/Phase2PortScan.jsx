import { useState } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'
import AISummaryPanel from '../components/AISummaryPanel'

export default function Phase2PortScan() {
  const {
    hosts, selectedHosts, selectAllHosts, clearHostSelect,
    scanning, setScanning, setPhaseStatus, addTerminalLine,
    setAISummary, setPhase, scanTarget,
  } = useFenrir()
  const [error, setError] = useState('')
  const [dryRun, setDryRun] = useState(false)

  const canRun = selectedHosts.size > 0 && !scanning

  async function runPortScan() {
    if (!canRun) return
    setError('')
    setScanning(true)
    setPhaseStatus(2, 'running')
    const targets = [...selectedHosts]
    addTerminalLine(`[INFO] [phase2] Port scanning ${targets.length} host(s)`)

    try {
      for (const ip of targets) {
        addTerminalLine(`[INFO] [phase2] Deep scan: ${ip}`)
        const res = await fetch('/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: ip, phases: ['ports'], dry_run: dryRun }),
        })
        if (!res.ok) {
          const d = await res.json()
          addTerminalLine(`[WARN] [phase2] ${ip}: ${d.detail}`)
        }
      }
      setPhaseStatus(2, 'complete')
      addTerminalLine(`[OK] [phase2] Port scan complete`)
      setTimeout(() => { setScanning(false) }, 2000)
    } catch (e) {
      setError('Backend error')
      setPhaseStatus(2, 'failed')
      setScanning(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>

      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>
            PHASE 02 — PORT & SERVICE SCAN
          </span>
        </div>

        {hosts.length === 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            ← Run Phase 1 detection first to discover hosts
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              {selectedHosts.size}/{hosts.length} selected
            </span>
            <button onClick={selectAllHosts} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-dim)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
              SELECT ALL
            </button>
            <button onClick={clearHostSelect} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
              CLEAR
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 8 }}>
              <div onClick={() => setDryRun(!dryRun)} style={{ width: 36, height: 20, borderRadius: 10, background: dryRun ? 'var(--amber)' : 'var(--bg4)', border: '1px solid var(--border)', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: dryRun ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: dryRun ? '#000' : 'var(--text-muted)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: dryRun ? 'var(--amber)' : 'var(--text-muted)' }}>DRY RUN</span>
            </label>

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
              {scanning ? 'SCANNING...' : `SCAN ${selectedHosts.size} HOST${selectedHosts.size !== 1 ? 'S' : ''}`}
            </button>
          </div>
        )}
        {error && <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)' }}>✗ {error}</div>}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>nmap -sV -sC -T4 -Pn — service detection + version grabbing</div>
      </div>

      <AISummaryPanel phase={2} />

      {hosts.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              CLICK HOSTS TO SELECT — then run port scan
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
