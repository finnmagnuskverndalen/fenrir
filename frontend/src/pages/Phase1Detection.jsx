import { useEffect, useState } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'
import NetworkMap from '../components/NetworkMap'

export default function Phase1Detection() {
  const { scanTarget, setScanTarget, hosts, setHosts, scanning, setScanning, clearHosts, setPhaseStatus, addTerminalLine, setPhase } = useFenrir()
  const [error, setError] = useState('')
  const [dryRun, setDryRun] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/hosts').then(r => r.json()).then(d => { if (d.length > 0) setHosts(d) }).catch(() => {})
  }, [])

  async function runDetection() {
    if (!scanTarget.trim() || scanning) return
    setError(''); setScanning(true); clearHosts(); setAiSummary('')
    setPhaseStatus(1, 'running')
    addTerminalLine(`[INFO] [phase1] Starting detection on ${scanTarget}`)

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: scanTarget.trim(), phases: ['discovery'], dry_run: dryRun }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Scan failed'); setPhaseStatus(1, 'failed'); setScanning(false); return }

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const h = await fetch('/api/health').then(r => r.json()).catch(() => ({}))
        if (!h.active_scans?.includes(scanTarget.trim())) break
      }

      const fresh = await fetch('/api/hosts').then(r => r.json()).catch(() => [])
      setHosts(fresh)
      setPhaseStatus(1, 'complete')
      setScanning(false)

      if (fresh.length > 0) {
        try {
          const aiRes = await fetch('/api/ai/summarize', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phase: 'detection', data: fresh.slice(0, 20).map(h => ({ ip: h.ip, hostname: h.hostname, os: h.os_guess })) }),
          })
          if (aiRes.ok) { const d = await aiRes.json(); setAiSummary(d.summary || '') }
        } catch {}
      }
    } catch { setError('Cannot connect to backend'); setPhaseStatus(1, 'failed'); setScanning(false) }
  }

  const filtered = hosts.filter(h =>
    !search || h.ip.includes(search) || h.hostname?.toLowerCase().includes(search.toLowerCase()) || h.os_guess?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* Left sidebar */}
      <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>

        {/* Scan control */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.1em' }}>
              PHASE 01 — HOST DETECTION
            </span>
          </div>

          <input
            value={scanTarget} onChange={e => setScanTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runDetection()}
            placeholder="192.168.1.0/24" disabled={scanning}
            style={{
              width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', padding: '10px 14px',
              fontFamily: 'var(--mono)', fontSize: 13, outline: 'none',
              marginBottom: 10,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div onClick={() => !scanning && setDryRun(!dryRun)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={{
                width: 36, height: 20, borderRadius: 10, position: 'relative',
                background: dryRun ? 'var(--amber)' : 'var(--bg-4)',
                border: '1px solid var(--border)', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 2, left: dryRun ? 17 : 2,
                  width: 14, height: 14, borderRadius: '50%',
                  background: dryRun ? '#000' : 'var(--text-3)', transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: 12, color: dryRun ? 'var(--amber)' : 'var(--text-3)', fontWeight: 500 }}>
                Dry run
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
              ARP sweep + OS fingerprint
            </span>
          </div>

          <button
            onClick={runDetection}
            disabled={scanning || !scanTarget.trim()}
            style={{
              width: '100%', height: 40,
              background: scanning ? 'var(--bg-3)' : 'var(--red)',
              border: `1px solid ${scanning ? 'var(--border)' : 'var(--red)'}`,
              borderRadius: 8, color: scanning ? 'var(--text-3)' : '#fff',
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              letterSpacing: '0.05em', cursor: scanning ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
          >
            {scanning ? (
              <>
                <div style={{ width: 12, height: 12, border: '2px solid var(--text-3)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Detecting...
              </>
            ) : 'Run Detection'}
          </button>

          {error && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 6, fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Network map */}
        <NetworkMap />

        {/* AI summary */}
        {aiSummary && (
          <div style={{
            background: 'var(--blue-soft)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 10, padding: '14px 16px',
            animation: 'fadeUp 0.3s ease',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '0.1em', marginBottom: 8 }}>
              AI ANALYSIS
            </div>
            <div style={{ fontSize: 12, color: 'rgba(147,197,253,0.9)', lineHeight: 1.7 }}>{aiSummary}</div>
          </div>
        )}
      </div>

      {/* Right — host grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>

        {hosts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter hosts by IP, hostname or OS..."
                style={{
                  width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', padding: '8px 12px 8px 36px',
                  fontFamily: 'var(--sans)', fontSize: 12, outline: 'none',
                }}
              />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 13 }}>⌕</span>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
              {filtered.length}{search ? `/${hosts.length}` : ''} hosts
            </span>
            <button onClick={() => setPhase(2)} style={{
              background: 'transparent', border: '1px solid var(--red-border)',
              borderRadius: 8, color: 'var(--red)', padding: '8px 16px',
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12,
              cursor: 'pointer', flexShrink: 0, letterSpacing: '0.03em',
            }}>
              Port Scan →
            </button>
          </div>
        )}

        {filtered.length > 0 ? (
          <div style={{
            flex: 1, overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 8, alignContent: 'start',
          }}>
            {filtered.map((h, i) => (
              <div key={h.ip} style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                <HostCard host={h} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 40, opacity: 0.08 }}>⬡</div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
              {hosts.length > 0 ? 'No hosts match your filter' : 'Enter a CIDR range and run detection'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              ARP sweep discovers hosts in seconds
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
