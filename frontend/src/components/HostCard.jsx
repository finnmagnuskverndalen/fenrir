import { useFenrir } from '../store/fenrirStore'

const osIcon = (os) => {
  if (!os) return null
  const o = os.toLowerCase()
  if (o.includes('windows')) return '[WIN]'
  if (o.includes('linux') || o.includes('ubuntu') || o.includes('debian')) return '[LNX]'
  if (o.includes('android') || o.includes('mobile') || o.includes('pixel')) return '[MOB]'
  if (o.includes('apple') || o.includes('ios') || o.includes('mac')) return '[MAC]'
  if (o.includes('router') || o.includes('network') || o.includes('cisco') || o.includes('zyxel')) return '[RTR]'
  if (o.includes('camera') || o.includes('c200')) return '[CAM]'
  if (o.includes('iot') || o.includes('esp') || o.includes('embedded') || o.includes('lwip')) return '[IOT]'
  if (o.includes('home assistant')) return '[HAS]'
  if (o.includes('sbc') || o.includes('lepotato') || o.includes('raspberry')) return '[SBC]'
  return '[???]'
}

const sevColor = {
  critical: '#ff2020',
  high:     '#ff5500',
  medium:   '#f59e0b',
  low:      '#883333',
  info:     'rgba(229,62,62,0.5)',
}
const sevBg = {
  critical: 'rgba(255,32,32,0.12)',
  high:     'rgba(255,85,0,0.1)',
  medium:   'rgba(245,158,11,0.1)',
  low:      'rgba(136,51,51,0.12)',
  info:     'rgba(229,62,62,0.06)',
}

export default function HostCard({ host, compact = false, onClick }) {
  const { selectedHosts, toggleHostSelect, currentPhase } = useFenrir()
  const selected = selectedHosts.has(host.ip)
  const compromised = host.compromised

  const topVuln = host.vulns?.sort((a, b) =>
    ({ critical:0, high:1, medium:2, low:3 }[a.severity] ?? 4) -
    ({ critical:0, high:1, medium:2, low:3 }[b.severity] ?? 4)
  )[0]

  function handleClick() {
    if (onClick) { onClick(host); return }
    if (currentPhase >= 2) toggleHostSelect(host.ip)
  }

  const icon = osIcon(host.os_guess)
  const lastOctet = host.ip?.split('.').pop()

  const borderColor = compromised
    ? 'rgba(255,32,32,0.6)'
    : selected
    ? 'rgba(229,62,62,0.5)'
    : 'var(--border)'

  return (
    <div
      onClick={handleClick}
      style={{
        background: selected
          ? 'rgba(229,62,62,0.05)'
          : compromised
          ? 'rgba(255,32,32,0.07)'
          : 'var(--bg-2)',
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${compromised ? '#ff2020' : selected ? 'var(--red)' : 'var(--border)'}`,
        borderRadius: 2,
        padding: compact ? '8px 10px' : '12px 14px',
        cursor: currentPhase >= 2 ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
        animation: 'fadeUp 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: compromised ? '0 0 16px rgba(255,32,32,0.08)' : selected ? '0 0 10px rgba(229,62,62,0.05)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Icon */}
        <div style={{
          width: compact ? 30 : 36, height: compact ? 30 : 36,
          borderRadius: 2,
          background: 'var(--bg-3)',
          border: `1px solid ${compromised ? 'rgba(255,32,32,0.4)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: compact ? 8 : 9, flexShrink: 0,
          fontFamily: 'var(--mono)', fontWeight: 700,
          color: compromised ? '#ff2020' : 'var(--text-3)',
          letterSpacing: '-0.02em',
        }}>
          {compromised ? '[PWN]' : (icon || `.${lastOctet}`)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: compact ? 11 : 12,
              color: compromised ? '#ff2020' : 'var(--text)',
              fontWeight: 700,
              textShadow: compromised ? '0 0 10px rgba(255,32,32,0.5)' : 'none',
            }}>
              {host.ip}
            </span>
            {compromised && (
              <span style={{
                fontSize: 8, padding: '1px 5px', borderRadius: 2,
                background: 'rgba(255,32,32,0.15)', color: '#ff2020',
                fontWeight: 700, letterSpacing: '0.08em',
                boxShadow: '0 0 8px rgba(255,32,32,0.3)',
              }}>PWNED</span>
            )}
          </div>
          {host.hostname && (
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {host.hostname}
            </div>
          )}
          {host.os_guess && (
            <div style={{ fontSize: 9, color: '#777', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
              {host.os_guess.slice(0, 35)}
            </div>
          )}
        </div>

        {/* Right badges */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          {host.ports?.length > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#777', letterSpacing: '0.05em' }}>
              {host.ports.length}p
            </span>
          )}
          {topVuln && (
            <span style={{
              fontSize: 8, padding: '2px 6px', borderRadius: 2, fontWeight: 700,
              background: sevBg[topVuln.severity] || 'var(--bg-3)',
              color: sevColor[topVuln.severity] || 'var(--text-3)',
              letterSpacing: '0.08em',
            }}>
              {topVuln.severity.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Port pills */}
      {!compact && host.ports?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 8 }}>
          {host.ports.slice(0, 6).map((p, i) => (
            <span key={i} style={{
              fontFamily: 'var(--mono)', fontSize: 8,
              padding: '2px 6px', borderRadius: 2,
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              color: '#999',
              letterSpacing: '0.04em',
            }}>
              {p.port}{p.service ? `/${p.service}` : ''}
            </span>
          ))}
          {host.ports.length > 6 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#666', padding: '2px 3px' }}>
              +{host.ports.length - 6}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
