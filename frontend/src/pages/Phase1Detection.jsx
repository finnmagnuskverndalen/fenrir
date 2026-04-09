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
  const [sessionId, setSessionId] = useState(null)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(sessions => {
        if (sessions.length === 0) return
        const latest = sessions[0]
        setSessionId(latest.id)
        return fetch(`/api/sessions/${latest.id}/hosts`).then(r => r.json())
      })
      .then(h => { if (h?.length > 0) setHosts(h) })
      .catch(() => {})
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

      const sid = data.session_id
      setSessionId(sid)
      addTerminalLine(`[OK] [phase1] Session ${sid?.slice(0,8)} — ARP sweep running`)

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const h = await fetch('/api/health').then(r => r.json()).catch(() => ({}))
        if (!h.active_scans?.includes(scanTarget.trim())) break
      }

      const fresh = await fetch(`/api/sessions/${sid}/hosts`).then(r => r.json()).catch(() => [])
      setHosts(fresh)
      setPhaseStatus(1, 'complete')
      setScanning(false)
      addTerminalLine(`[OK] [phase1] Found ${fresh.length} hosts`)

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
    !search ||
    h.ip?.includes(search) ||
    h.hostname?.toLowerCase().includes(search.toLowerCase()) ||
    h.os_guess?.toLowerCase().includes(search.toLowerCase())
  )

  const inputStyle = {
    width: '100%', background: 'var(--bg-1)',
    border: '1px solid var(--border)',
    borderRadius: 2, color: 'var(--text)',
    padding: '9px 12px',
    fontFamily: 'var(--mono)', fontSize: 12, outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ display: 'flex', gap: 14, height: '100%', overflow: 'hidden' }}>

      {/* Left sidebar */}
      <div style={{ width: 356, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--border)',
          borderRadius: 2, padding: '16px',
          boxShadow: '0 0 20px rgba(229,62,62,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, background: 'var(--red)', boxShadow: '0 0 8px var(--red)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-2)', letterSpacing: '0.15em' }}>
              PHASE_01 // HOST DETECTION
            </span>
          </div>

          <div style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.1em', marginBottom: 6 }}>TARGET CIDR</div>
          <input
            value={scanTarget} onChange={e => setScanTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runDetection()}
            placeholder="192.168.1.0/24" disabled={scanning}
            style={{ ...inputStyle, marginBottom: 12 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div onClick={() => !scanning && setDryRun(!dryRun)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={{
                width: 34, height: 18, borderRadius: 9, position: 'relative',
                background: dryRun ? 'rgba(245,158,11,0.3)' : 'var(--bg-4)',
                border: `1px solid ${dryRun ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ position: 'absolute', top: 2, left: dryRun ? 16 : 2, width: 12, height: 12, borderRadius: '50%', background: dryRun ? 'var(--amber)' : 'var(--text-4)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 11, color: dryRun ? 'var(--amber)' : 'var(--text-3)', letterSpacing: '0.05em' }}>DRY_RUN</span>
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-4)', marginLeft: 'auto', letterSpacing: '0.06em' }}>ARP + OS FINGERPRINT</span>
          </div>

          <button onClick={runDetection} disabled={scanning || !scanTarget.trim()} style={{
            width: '100%', height: 38,
            background: scanning ? 'transparent' : 'rgba(229,62,62,0.08)',
            border: `1px solid ${scanning ? 'var(--border)' : 'var(--red-border)'}`,
            borderRadius: 2,
            color: scanning ? 'var(--text-3)' : 'var(--red)',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
            letterSpacing: '0.12em',
            cursor: scanning ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
            boxShadow: scanning ? 'none' : '0 0 16px rgba(229,62,62,0.08)',
          }}>
            {scanning ? (
              <><div style={{ width: 10, height: 10, border: '1px solid var(--text-3)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />DETECTING...</>
            ) : '[ RUN DETECTION ]'}
          </button>

          {error && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,32,32,0.06)', border: '1px solid rgba(255,32,32,0.25)', borderRadius: 2, fontSize: 11, color: '#ff2020', letterSpacing: '0.03em' }}>
              ERR: {error}
            </div>
          )}
        </div>

        <NetworkMap />

        {aiSummary && (
          <div style={{
            background: 'rgba(229,62,62,0.04)', border: '1px solid var(--border)',
            borderLeft: '2px solid var(--red)',
            borderRadius: 2, padding: '12px 14px', animation: 'fadeUp 0.3s ease',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.15em', marginBottom: 8 }}>// AI ANALYSIS</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>{aiSummary}</div>
          </div>
        )}
      </div>

      {/* Right — host grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

        {hosts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="filter // ip, hostname, os..."
                style={{
                  ...inputStyle,
                  paddingLeft: 32,
                }}
              />
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', fontSize: 13, fontFamily: 'var(--mono)' }}>_</span>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-4)', flexShrink: 0, letterSpacing: '0.08em' }}>
              {filtered.length}{search ? `/${hosts.length}` : ''} HOSTS
            </span>
            <button onClick={() => setPhase(2)} style={{
              background: 'transparent', border: '1px solid var(--red-border)',
              borderRadius: 2, color: 'var(--red)', padding: '7px 14px',
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11, cursor: 'pointer', flexShrink: 0,
              letterSpacing: '0.1em',
              transition: 'box-shadow 0.15s',
            }}>PORT_SCAN &gt;&gt;</button>
          </div>
        )}

        {filtered.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 6, alignContent: 'start' }}>
            {filtered.map(h => <HostCard key={h.ip} host={h} />)}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 36, color: 'var(--text-4)', letterSpacing: '0.05em', lineHeight: 1 }}>
              {hosts.length > 0 ? '[FILTERED]' : '[OFFLINE]'}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
              {hosts.length > 0 ? 'NO HOSTS MATCH FILTER' : 'ENTER CIDR RANGE AND INITIATE SWEEP'}
            </div>
            {hosts.length === 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.05em' }}>
                ARP sweep // detects all live hosts in &lt;3s
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
