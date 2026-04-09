import { useFenrir } from '../store/fenrirStore'

const PHASES = [
  { id: 1, label: 'DETECTION' },
  { id: 2, label: 'PORT SCAN' },
  { id: 3, label: 'VULN SCAN' },
  { id: 4, label: 'EXPLOITATION' },
  { id: 5, label: 'REPORT' },
]

export default function Header() {
  const { currentPhase, setPhase, phaseStatus, hosts, findings, scanning } = useFenrir()
  const crits = findings.filter(f => f.severity === 'critical').length
  const highs  = findings.filter(f => f.severity === 'high').length

  return (
    <header style={{
      height: 52,
      background: 'var(--bg-1)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 0, flexShrink: 0,
      position: 'relative',
      boxShadow: '0 0 24px rgba(229,62,62,0.06)',
    }}>
      {/* Scan progress bar */}
      {scanning && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, var(--red-bright) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s linear infinite',
        }} />
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 28, flexShrink: 0 }}>
        <img src="/icon.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(229,62,62,0.5))' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
            color: 'var(--red-bright)', letterSpacing: '0.25em',
            textShadow: '0 0 12px rgba(229,62,62,0.7)',
            animation: 'glitch 8s infinite',
          }}>FENRIR</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.15em' }}>v2.0 // WAR ROOM</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border)', marginRight: 24, flexShrink: 0 }} />

      {/* Phase tabs */}
      <nav style={{ display: 'flex', flex: 1, height: '100%', gap: 2 }}>
        {PHASES.map(p => {
          const st = phaseStatus[p.id] || 'idle'
          const active = currentPhase === p.id
          const stColor = st === 'complete' ? '#22c55e' : st === 'running' ? 'var(--amber)' : st === 'failed' ? 'var(--red-bright)' : 'var(--text-4)'
          return (
            <button key={p.id} onClick={() => setPhase(p.id)} style={{
              background: active ? 'rgba(229,62,62,0.06)' : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${active ? 'var(--red-bright)' : 'transparent'}`,
              borderTop: `2px solid ${active ? 'rgba(229,62,62,0.2)' : 'transparent'}`,
              color: active ? 'var(--red)' : 'var(--text-3)',
              padding: '0 16px',
              height: '100%',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontWeight: active ? 700 : 400,
              fontSize: 11,
              letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'color 0.15s, background 0.15s',
              whiteSpace: 'nowrap',
              boxShadow: active ? '0 0 16px rgba(229,62,62,0.08) inset' : 'none',
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: stColor, letterSpacing: 0 }}>
                {p.id.toString().padStart(2, '0')}
              </span>
              {p.label}
              {st === 'running' && (
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--amber)', animation: 'pulse 0.8s infinite', flexShrink: 0, boxShadow: '0 0 6px var(--amber)' }} />
              )}
              {st === 'complete' && <span style={{ color: '#22c55e', fontSize: 10, lineHeight: 1 }}>✓</span>}
              {st === 'failed'   && <span style={{ color: 'var(--red-bright)', fontSize: 10, lineHeight: 1 }}>✗</span>}
            </button>
          )
        })}
      </nav>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', height: '100%' }}>
        {[
          { label: 'HOSTS',    val: hosts.length, color: 'var(--text-2)' },
          { label: 'CRITICAL', val: crits,        color: crits > 0 ? 'var(--red-bright)' : 'var(--text-4)' },
          { label: 'HIGH',     val: highs,        color: highs > 0 ? '#ff5500'           : 'var(--text-4)' },
        ].map(({ label, val, color }, i) => (
          <div key={label} style={{
            padding: '0 18px',
            borderLeft: '1px solid var(--border)',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2,
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color, lineHeight: 1, textShadow: val > 0 ? `0 0 10px ${color}` : 'none' }}>{val}</div>
            <div style={{ fontSize: 8, color: 'var(--text-4)', letterSpacing: '0.12em' }}>{label}</div>
          </div>
        ))}
      </div>
    </header>
  )
}
