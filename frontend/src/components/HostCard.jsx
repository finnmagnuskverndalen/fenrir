import { useFenrir } from '../store/fenrirStore'

const osIcon = (os) => {
  if (!os) return '?'
  const o = os.toLowerCase()
  if (o.includes('windows')) return '⊞'
  if (o.includes('linux') || o.includes('ubuntu') || o.includes('debian')) return '🐧'
  if (o.includes('mac') || o.includes('darwin')) return ''
  if (o.includes('cisco') || o.includes('router')) return '⬡'
  return '◈'
}

const sevColor = { critical: '#e53e3e', high: '#f59e0b', medium: '#ecc94b', low: '#38a169', info: '#3b82f6' }

export default function HostCard({ host, compact = false }) {
  const { selectedHosts, toggleHostSelect, setActiveHost, activeHostId, currentPhase } = useFenrir()
  const selected = selectedHosts.has(host.ip)
  const active = activeHostId === host.ip
  const compromised = host.compromised

  const topFinding = host.vulns?.sort((a, b) => {
    const o = { critical: 0, high: 1, medium: 2, low: 3 }
    return (o[a.severity] ?? 4) - (o[b.severity] ?? 4)
  })[0]

  return (
    <div
      onClick={() => { setActiveHost(host.ip); if (currentPhase >= 2) toggleHostSelect(host.ip) }}
      style={{
        background: compromised
          ? 'rgba(229,62,62,0.06)'
          : selected
          ? 'rgba(229,62,62,0.04)'
          : 'var(--bg3)',
        border: `1px solid ${compromised ? 'rgba(229,62,62,0.4)' : selected ? 'var(--border-red)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: compact ? '10px 12px' : '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fade-in 0.3s ease',
      }}
    >
      {/* Compromised glow */}
      {compromised && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(229,62,62,0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Selection indicator */}
      {selected && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 3, bottom: 0,
          background: 'var(--red)', borderRadius: '8px 0 0 8px',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* OS icon / status */}
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: compromised ? 'rgba(229,62,62,0.15)' : 'var(--bg4)',
          border: `1px solid ${compromised ? 'rgba(229,62,62,0.3)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          animation: compromised ? 'pulse-red 2s infinite' : 'none',
        }}>
          {compromised ? '💀' : osIcon(host.os_guess)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 13,
              color: compromised ? 'var(--red)' : 'var(--text)',
              fontWeight: compromised ? 700 : 400,
            }}>{host.ip}</span>
            {compromised && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'rgba(229,62,62,0.2)', color: 'var(--red)', letterSpacing: 1 }}>
                PWNED
              </span>
            )}
          </div>
          {host.hostname && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{host.hostname}</div>
          )}
          {host.os_guess && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{host.os_guess}</div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {host.ports?.length > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {host.ports.length} ports
            </span>
          )}
          {topFinding && (
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 3,
              background: (sevColor[topFinding.severity] || '#555') + '22',
              color: sevColor[topFinding.severity] || '#555',
              letterSpacing: 0.5,
            }}>
              {topFinding.severity.toUpperCase()}
            </span>
          )}
          {host.vulns?.length > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {host.vulns.length} vulns
            </span>
          )}
        </div>
      </div>

      {/* Port pills */}
      {!compact && host.ports?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {host.ports.slice(0, 8).map((p, i) => (
            <span key={i} style={{
              fontFamily: 'var(--mono)', fontSize: 9,
              padding: '2px 6px', borderRadius: 3,
              background: 'var(--bg4)', border: '1px solid var(--border)',
              color: p.state === 'open' ? '#39d353' : 'var(--text-muted)',
            }}>
              {p.port}/{p.service || p.protocol}
            </span>
          ))}
          {host.ports.length > 8 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>
              +{host.ports.length - 8}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
