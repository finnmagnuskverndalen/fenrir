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
    } catch {
      setError('Backend error'); setPhaseStatus(2, 'failed'); setScanning(false); setProgress({ current: 0, total: 0 })
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'hidden' }}>

      {/* Control bar */}
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--border)',
        borderRadius: 2, padding: '16px', flexShrink: 0,
        boxShadow: '0 0 20px rgba(229,62,62,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 6, height: 6, background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-2)', letterSpacing: '0.15em' }}>
            PHASE_02 // PORT &amp; SERVICE SCAN
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-4)', marginLeft: 8, letterSpacing: '0.08em' }}>SEQUENTIAL — ONE HOST AT A TIME</span>
        </div>

        {hosts.length === 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
            &gt; RUN PHASE_01 FIRST TO DISCOVER HOSTS
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.05em' }}>
              {selectedHosts.size}/{hosts.length} SELECTED
            </span>
            <button onClick={selectAllHosts} style={{
              background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 2,
              color: 'var(--text-2)', padding: '4px 12px', fontSize: 10, fontWeight: 700,
              fontFamily: 'var(--mono)', letterSpacing: '0.08em', cursor: 'pointer',
            }}>ALL</button>
            <button onClick={clearHostSelect} style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 2,
              color: 'var(--text-3)', padding: '4px 12px', fontSize: 10,
              fontFamily: 'var(--mono)', letterSpacing: '0.08em', cursor: 'pointer',
            }}>NONE</button>

            <div onClick={() => !scanning && setDryRun(!dryRun)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginLeft: 8 }}>
              <div style={{
                width: 34, height: 18, borderRadius: 9, position: 'relative',
                background: dryRun ? 'rgba(245,158,11,0.3)' : 'var(--bg-4)',
                border: `1px solid ${dryRun ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ position: 'absolute', top: 2, left: dryRun ? 16 : 2, width: 12, height: 12, borderRadius: '50%', background: dryRun ? 'var(--amber)' : 'var(--text-4)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 10, color: dryRun ? 'var(--amber)' : 'var(--text-3)', letterSpacing: '0.06em' }}>DRY_RUN</span>
            </div>

            <button onClick={run} disabled={!canRun} style={{
              marginLeft: 'auto', height: 36,
              background: canRun ? 'rgba(229,62,62,0.08)' : 'transparent',
              border: `1px solid ${canRun ? 'var(--red-border)' : 'var(--border)'}`,
              borderRadius: 2, color: canRun ? 'var(--red)' : 'var(--text-4)',
              padding: '0 22px', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11,
              cursor: canRun ? 'pointer' : 'not-allowed', letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: canRun ? '0 0 14px rgba(229,62,62,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              {scanning ? (
                <>
                  <div style={{ width: 10, height: 10, border: '1px solid var(--text-3)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {progress.current}/{progress.total}
                </>
              ) : `[ SCAN ${selectedHosts.size} HOST${selectedHosts.size !== 1 ? 'S' : ''} ]`}
            </button>
          </div>
        )}

        {scanning && progress.total > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.1em' }}>PROGRESS</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--amber)', letterSpacing: '0.1em' }}>{pct}%</span>
            </div>
            <div style={{ background: 'var(--bg-3)', borderRadius: 1, height: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--red-dim), var(--amber))',
                width: `${pct}%`, borderRadius: 1, transition: 'width 0.5s ease',
                boxShadow: '0 0 6px var(--amber)',
              }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,32,32,0.06)', border: '1px solid rgba(255,32,32,0.25)', borderRadius: 2, fontSize: 11, color: '#ff2020' }}>
            ERR: {error}
          </div>
        )}
      </div>

      {/* Hosts grid */}
      {hosts.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.1em' }}>
              &gt; CLICK HOSTS TO SELECT FOR SCANNING
            </span>
            <button onClick={() => setPhase(3)} style={{
              background: 'transparent', border: '1px solid var(--red-border)',
              borderRadius: 2, color: 'var(--red)', padding: '6px 14px',
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 10, cursor: 'pointer',
              letterSpacing: '0.1em',
            }}>
              VULN_SCAN &gt;&gt;
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 6, alignContent: 'start' }}>
            {hosts.map(h => <HostCard key={h.ip} host={h} />)}
          </div>
        </div>
      )}
    </div>
  )
}
