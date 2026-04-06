import { useFenrir } from '../store/fenrirStore'

const osIcon = (os) => {
  if (!os) return null
  const o = os.toLowerCase()
  if (o.includes('windows')) return '⊞'
  if (o.includes('linux') || o.includes('ubuntu') || o.includes('debian')) return 'Ⅎ'
  if (o.includes('android') || o.includes('mobile') || o.includes('pixel')) return '▣'
  if (o.includes('apple') || o.includes('ios') || o.includes('mac')) return ''
  if (o.includes('router') || o.includes('network') || o.includes('cisco') || o.includes('zyxel')) return '⬡'
  if (o.includes('camera') || o.includes('c200')) return '◉'
  if (o.includes('iot') || o.includes('esp') || o.includes('embedded') || o.includes('lwip')) return '⚡'
  if (o.includes('home assistant')) return '⌂'
  if (o.includes('sbc') || o.includes('lepotato') || o.includes('raspberry')) return '◈'
  return '○'
}

const sevBg = {
  critical: 'rgba(255,59,59,0.15)',
  high:     'rgba(249,115,22,0.15)',
  medium:   'rgba(245,158,11,0.12)',
  low:      'rgba(34,197,94,0.12)',
}
const sevColor = {
  critical: '#ff3b3b',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#22c55e',
  info:     '#3b82f6',
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

  return (
    <div
      onClick={handleClick}
      style={{
        background: selected ? 'rgba(255,59,59,0.06)' : compromised ? 'rgba(255,59,59,0.08)' : 'var(--bg-2)',
        border: `1px solid ${compromised ? 'rgba(255,59,59,0.3)' : selected ? 'rgba(255,59,59,0.2)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: compact ? '10px 12px' : '14px 16px',
        cursor: currentPhase >= 2 ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
        animation: 'fadeUp 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar when selected */}
      {selected && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: 'var(--red)', borderRadius: '10px 0 0 10px',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Icon */}
        <div style={{
          width: compact ? 32 : 38, height: compact ? 32 : 38,
          borderRadius: 8,
          background: compromised ? 'rgba(255,59,59,0.15)' : topVuln ? (sevBg[topVuln.severity] || 'var(--bg-3)') : 'var(--bg-3)',
          border: `1px solid ${compromised ? 'rgba(255,59,59,0.25)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: compact ? 14 : 16, flexShrink: 0, color: 'var(--text-2)',
        }}>
          {compromised ? '💀' : (icon || lastOctet)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: compact ? 12 : 13,
              color: compromised ? 'var(--red)' : 'var(--text)',
              fontWeight: 500,
            }}>
              {host.ip}
            </span>
            {compromised && (
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 4,
                background: 'rgba(255,59,59,0.2)', color: 'var(--red)',
                fontWeight: 600, letterSpacing: '0.05em',
              }}>PWNED</span>
            )}
          </div>
          {host.hostname && (
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {host.hostname}
            </div>
          )}
          {host.os_guess && (
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {host.os_guess.slice(0, 35)}
            </div>
          )}
        </div>

        {/* Right badges */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {host.ports?.length > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)' }}>
              {host.ports.length} ports
            </span>
          )}
          {topVuln && (
            <span style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
              background: sevBg[topVuln.severity] || 'var(--bg-3)',
              color: sevColor[topVuln.severity] || 'var(--text-3)',
              letterSpacing: '0.05em',
            }}>
              {topVuln.severity.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Port pills */}
      {!compact && host.ports?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {host.ports.slice(0, 6).map((p, i) => (
            <span key={i} style={{
              fontFamily: 'var(--mono)', fontSize: 9,
              padding: '2px 7px', borderRadius: 4,
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              color: 'var(--green)',
            }}>
              {p.port}{p.service ? ` ${p.service}` : ''}
            </span>
          ))}
          {host.ports.length > 6 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', padding: '2px 4px' }}>
              +{host.ports.length - 6} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
