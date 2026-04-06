import { useFenrir } from '../store/fenrirStore'

const PHASES = [
  { id: 1, label: 'Detection' },
  { id: 2, label: 'Port Scan' },
  { id: 3, label: 'Vuln Scan' },
  { id: 4, label: 'Exploitation' },
  { id: 5, label: 'Report' },
]

export default function Header() {
  const { currentPhase, setPhase, phaseStatus, hosts, findings, scanning } = useFenrir()
  const crits = findings.filter(f => f.severity === 'critical').length
  const highs = findings.filter(f => f.severity === 'high').length

  return (
    <header style={{
      height: 56, background: 'var(--bg-1)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 0, flexShrink: 0,
      position: 'relative',
    }}>
      {/* Scan progress bar */}
      {scanning && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--red), transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.8s linear infinite',
        }} />
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32, flexShrink: 0 }}>
        <img src="/icon.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700,
          color: 'var(--red)', letterSpacing: '0.15em',
        }}>FENRIR</span>
      </div>

      {/* Phase tabs */}
      <nav style={{ display: 'flex', flex: 1, height: '100%' }}>
        {PHASES.map(p => {
          const st = phaseStatus[p.id] || 'idle'
          const active = currentPhase === p.id
          return (
            <button key={p.id} onClick={() => setPhase(p.id)} style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${active ? 'var(--red)' : 'transparent'}`,
              color: active ? 'var(--text)' : 'var(--text-3)',
              padding: '0 20px',
              height: '100%',
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: st === 'complete' ? 'var(--green)' : st === 'running' ? 'var(--amber)' : st === 'failed' ? 'var(--red)' : 'var(--text-4)',
              }}>
                {p.id.toString().padStart(2, '0')}
              </span>
              {p.label}
              {st === 'running' && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', animation: 'pulse 1s infinite', flexShrink: 0 }} />
              )}
              {st === 'complete' && <span style={{ color: 'var(--green)', fontSize: 11 }}>✓</span>}
            </button>
          )
        })}
      </nav>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {[
          { label: 'Hosts', val: hosts.length, color: 'var(--text-2)' },
          { label: 'Critical', val: crits, color: crits > 0 ? 'var(--red)' : 'var(--text-3)' },
          { label: 'High', val: highs, color: highs > 0 ? '#f97316' : 'var(--text-3)' },
        ].map(({ label, val, color }, i) => (
          <div key={label} style={{
            padding: '6px 16px',
            borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, letterSpacing: '0.05em' }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </header>
  )
}
