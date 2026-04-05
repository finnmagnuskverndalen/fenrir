import { useFenrir } from '../store/fenrirStore'

const PHASES = [
  { id: 1, label: 'Detection',      short: '01' },
  { id: 2, label: 'Port Scan',      short: '02' },
  { id: 3, label: 'Vuln Scan',      short: '03' },
  { id: 4, label: 'Exploitation',   short: '04' },
  { id: 5, label: 'Report',         short: '05' },
]

const statusColor = { idle: '#3a3a4a', running: '#f59e0b', complete: '#39d353', failed: '#e53e3e' }

export default function Header() {
  const { currentPhase, setPhase, phaseStatus, hosts, findings, scanning } = useFenrir()

  const criticals = findings.filter(f => f.severity === 'critical').length
  const highs = findings.filter(f => f.severity === 'high').length

  return (
    <header style={{
      height: 52,
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 0,
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Scan line effect */}
      {scanning && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--red), transparent)',
          animation: 'scan-h 2s linear infinite',
        }} />
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32, flexShrink: 0 }}>
        <img src="/icon.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        <span style={{
          fontFamily: 'var(--display)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--red)',
          letterSpacing: 3,
          textShadow: '0 0 20px rgba(229,62,62,0.4)',
          animation: 'flicker 8s infinite',
        }}>FENRIR</span>
      </div>

      {/* Phase tabs */}
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {PHASES.map(p => {
          const status = phaseStatus[p.id]
          const active = currentPhase === p.id
          const color = statusColor[status] || '#3a3a4a'
          return (
            <button
              key={p.id}
              onClick={() => setPhase(p.id)}
              style={{
                background: active ? 'rgba(229,62,62,0.08)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${active ? 'var(--red)' : 'transparent'}`,
                color: active ? 'var(--text)' : 'var(--text-dim)',
                padding: '0 16px',
                height: 51,
                cursor: 'pointer',
                fontFamily: 'var(--body)',
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: color,
                transition: 'color 0.3s',
              }}>{p.short}</span>
              {p.label}
              {status === 'running' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse-red 1s infinite' }} />
              )}
              {status === 'complete' && (
                <span style={{ color: '#39d353', fontSize: 10 }}>✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginLeft: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--text)', fontWeight: 700 }}>{hosts.length}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>HOSTS</div>
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, color: criticals > 0 ? 'var(--red)' : 'var(--text)', fontWeight: 700 }}>{criticals}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>CRITICAL</div>
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, color: highs > 0 ? '#f59e0b' : 'var(--text)', fontWeight: 700 }}>{highs}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>HIGH</div>
        </div>
      </div>
    </header>
  )
}
