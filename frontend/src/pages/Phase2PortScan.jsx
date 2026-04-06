import { useState } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'

export default function Phase2PortScan() {
  const { hosts, selectedHosts, selectAllHosts, clearHostSelect, scanning, setScanning, setPhaseStatus, addTerminalLine, setPhase } = useFenrir()
  const [dryRun, setDryRun] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')

  const canRun = selectedHosts.size > 0 && !scanning

  async function run() {
    if (!canRun) return
    setError(''); setScanning(true); setPhaseStatus(2, 'running')
    const targets = [...selectedHosts]
    setProgress({ current: 0, total: targets.length })
    addTerminalLine(`[INFO] [phase2] Port scanning ${targets.length} host(s) sequentially`)

    try {
      for (let i = 0; i < targets.length; i++) {
        const ip = targets[i]
        setProgress({ current: i + 1, total: targets.length })
        addTerminalLine(`[INFO] [phase2] Scanning ${ip} (${i+1}/${targets.length})`)

        const res = await fetch('/api/scan/start', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: ip, phases: ['ports'], dry_run: dryRun }),
        })
        if (!res.ok) { const d = await res.json(); addTerminalLine(`[WARN] [phase2] ${ip}: ${d.detail}`) }

        for (let w = 0; w < 60; w++) {
          await new Promise(r => setTimeout(r, 2000))
          const h = await fetch('/api/health').then(r => r.json()).catch(() => ({}))
          if (!h.active_scans?.includes(ip)) break
        }
        if (i < targets.length - 1) await new Promise(r => setTimeout(r, 500))
      }
      setPhaseStatus(2, 'complete'); setScanning(false); setProgress({ current: 0, total: 0 })
      addTerminalLine(`[OK] [phase2] Port scan complete`)
    } catch (e) {
      setError('Backend error'); setPhaseStatus(2, 'failed'); setScanning(false); setProgress({ current: 0, total: 0 })
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* Control bar */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.1em' }}>
            PHASE 02 — PORT & SERVICE SCAN
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>Sequential — one host at a time</span>
        </div>

        {hosts.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Run Phase 1 detection first to discover hosts.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
              {selectedHosts.size} of {hosts.length} selected
            </span>
            <button onClick={selectAllHosts} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-2)', padding: '5px 12px', fontSize: 12, fontWeight: 500 }}>Select all</button>
            <button onClick={clearHostSelect} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-3)', padding: '5px 12px', fontSize: 12 }}>Clear</button>

            <div onClick={() => !scanning && setDryRun(!dryRun)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginLeft: 8 }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, position: 'relative', background: dryRun ? 'var(--amber)' : 'var(--bg-4)', border: '1px solid var(--border)', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: dryRun ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: dryRun ? '#000' : 'var(--text-3)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 12, color: dryRun ? 'var(--amber)' : 'var(--text-3)', fontWeight: 500 }}>Dry run</span>
            </div>

            <button onClick={run} disabled={!canRun} style={{
              marginLeft: 'auto', height: 38,
              background: canRun ? 'var(--amber)' : 'var(--bg-3)',
              border: `1px solid ${canRun ? 'var(--amber)' : 'var(--border)'}`,
              borderRadius: 8, color: canRun ? '#000' : 'var(--text-3)',
              padding: '0 24px', fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              cursor: canRun ? 'pointer' : 'not-allowed', letterSpacing: '0.03em',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {scanning ? (
                <>
                  <div style={{ width: 12, height: 12, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {progress.current}/{progress.total}
                </>
              ) : `Scan ${selectedHosts.size} host${selectedHosts.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {scanning && progress.total > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)' }}>Progress</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--amber)' }}>{pct}%</span>
            </div>
            <div style={{ background: 'var(--bg-3)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--amber)', width: `${pct}%`, borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        {error && <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 6, fontSize: 12, color: 'var(--red)' }}>{error}</div>}
      </div>

      {/* Hosts grid */}
      {hosts.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Click hosts to select for scanning</span>
            <button onClick={() => setPhase(3)} style={{ background: 'transparent', border: '1px solid var(--red-border)', borderRadius: 8, color: 'var(--red)', padding: '6px 16px', fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              Vuln Scan →
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, alignContent: 'start' }}>
            {hosts.map(h => <HostCard key={h.ip} host={h} />)}
          </div>
        </div>
      )}
    </div>
  )
}
