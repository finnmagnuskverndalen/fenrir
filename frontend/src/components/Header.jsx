import { useFenrir } from '../store/fenrirStore'

const PHASES = [
  { id: 1, label: 'Detection',    code: '01' },
  { id: 2, label: 'Port Scan',    code: '02' },
  { id: 3, label: 'Vuln Scan',    code: '03' },
  { id: 4, label: 'Exploitation', code: '04' },
  { id: 5, label: 'Report',       code: '05' },
]

const statusDot = { idle: '#2a2a3a', running: '#f59e0b', complete: '#39d353', failed: '#e53e3e' }

export default function Header() {
  const { currentPhase, setPhase, phaseStatus, hosts, findings, scanning } = useFenrir()
  const crits = findings.filter(f => f.severity === 'critical').length
  const highs = findings.filter(f => f.severity === 'high').length

  return (
    <header style={{
      height: 52, background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 0,
      flexShrink: 0, position: 'relative',
    }}>
      {scanning && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, var(--red) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 28, flexShrink: 0 }}>
        <img src="/icon.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
        <span style={{
          fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700,
          color: 'var(--red)', letterSpacing: 4,
          textShadow: '0 0 20px rgba(229,62,62,0.5)',
        }}>FENRIR</span>
      </div>

      {/* Phase tabs */}
      <nav style={{ display: 'flex', flex: 1 }}>
        {PHASES.map(p => {
          const st = phaseStatus[p.id] || 'idle'
          const active = currentPhase === p.id
          return (
            <button key={p.id} onClick={() => setPhase(p.id)} style={{
              background: active ? 'rgba(229,62,62,0.07)' : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${active ? 'var(--red)' : 'transparent'}`,
              color: active ? 'var(--text)' : 'var(--text-dim)',
              padding: '0 18px', height: 51, cursor: 'pointer',
              fontFamily: 'var(--body)', fontWeight: active ? 600 : 400, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: statusDot[st], transition: 'color 0.3s' }}>
                {p.code}
              </span>
              {p.label}
              {st === 'running' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', animation: 'pulse-red 1s infinite', flexShrink: 0 }} />}
              {st === 'complete' && <span style={{ color: '#39d353', fontSize: 10, flexShrink: 0 }}>✓</span>}
              {st === 'failed' && <span style={{ color: 'var(--red)', fontSize: 10, flexShrink: 0 }}>✗</span>}
            </button>
          )
        })}
      </nav>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {[
          { label: 'HOSTS', val: hosts.length, color: hosts.length > 0 ? 'var(--text)' : 'var(--text-muted)' },
          { label: 'CRITICAL', val: crits, color: crits > 0 ? 'var(--red)' : 'var(--text-muted)' },
          { label: 'HIGH', val: highs, color: highs > 0 ? 'var(--amber)' : 'var(--text-muted)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
      </div>
    </header>
  )
}
