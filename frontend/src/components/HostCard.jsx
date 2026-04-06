import { useFenrir } from '../store/fenrirStore'

const osIcon = (os) => {
  if (!os) return '◈'
  const o = os.toLowerCase()
  if (o.includes('windows')) return '⊞'
  if (o.includes('linux') || o.includes('ubuntu') || o.includes('debian') || o.includes('sbc')) return '🐧'
  if (o.includes('android') || o.includes('mobile')) return '📱'
  if (o.includes('apple') || o.includes('ios') || o.includes('mac')) return ''
  if (o.includes('router') || o.includes('network') || o.includes('cisco')) return '⬡'
  if (o.includes('camera')) return '📷'
  if (o.includes('iot') || o.includes('esp') || o.includes('embedded')) return '⚡'
  if (o.includes('home assistant')) return '🏠'
  return '◈'
}

const sevColor = { critical: '#e53e3e', high: '#f59e0b', medium: '#ecc94b', low: '#38a169', info: '#3b82f6' }

export default function HostCard({ host, compact = false, onClick }) {
  const { selectedHosts, toggleHostSelect, currentPhase } = useFenrir()
  const selected = selectedHosts.has(host.ip)
  const compromised = host.compromised
  const topVuln = host.vulns?.sort((a, b) => ({ critical:0, high:1, medium:2, low:3 }[a.severity] ?? 4) - ({ critical:0, high:1, medium:2, low:3 }[b.severity] ?? 4))[0]

  function handleClick() {
    if (onClick) { onClick(host); return }
    if (currentPhase >= 2) toggleHostSelect(host.ip)
  }

  return (
    <div onClick={handleClick} style={{
      background: compromised ? 'rgba(229,62,62,0.07)' : selected ? 'rgba(229,62,62,0.04)' : 'var(--bg3)',
      border: `1px solid ${compromised ? 'rgba(229,62,62,0.35)' : selected ? 'var(--border-red)' : 'var(--border)'}`,
      borderRadius: 8, padding: compact ? '9px 12px' : '12px 14px',
      cursor: 'pointer', transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
      animation: 'fade-in 0.25s ease',
    }}>
      {selected && <div style={{ position: 'absolute', top: 0, left: 0, width: 3, bottom: 0, background: 'var(--red)', borderRadius: '8px 0 0 8px' }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: 8,
          background: compromised ? 'rgba(229,62,62,0.15)' : 'var(--bg4)',
          border: `1px solid ${compromised ? 'rgba(229,62,62,0.3)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: compact ? 14 : 18, flexShrink: 0,
          animation: compromised ? 'pulse-red 2s infinite' : 'none',
        }}>
          {compromised ? '💀' : osIcon(host.os_guess)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: compact ? 12 : 13, color: compromised ? 'var(--red)' : 'var(--text)' }}>
              {host.ip}
            </span>
            {compromised && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 2, background: 'rgba(229,62,62,0.2)', color: 'var(--red)', letterSpacing: 1 }}>PWNED</span>}
          </div>
          {host.hostname && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{host.hostname}</div>}
          {host.os_guess && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{host.os_guess.slice(0, 40)}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          {host.ports?.length > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>{host.ports.length} ports</span>}
          {topVuln && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 2, background: (sevColor[topVuln.severity]||'#555')+'22', color: sevColor[topVuln.severity]||'#555' }}>{topVuln.severity.toUpperCase()}</span>}
        </div>
      </div>

      {!compact && host.ports?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {host.ports.slice(0, 6).map((p, i) => (
            <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'var(--bg4)', border: '1px solid var(--border)', color: '#39d353' }}>
              {p.port}/{p.service || p.protocol}
            </span>
          ))}
          {host.ports.length > 6 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>+{host.ports.length - 6}</span>}
        </div>
      )}
    </div>
  )
}
