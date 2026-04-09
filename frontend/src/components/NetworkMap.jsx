import { useFenrir } from '../store/fenrirStore'

const sevColor = { critical:'#ff2020', high:'#ff5500', medium:'#f59e0b', low:'#883333' }

export default function NetworkMap() {
  const { hosts, selectedHosts, toggleHostSelect, currentPhase } = useFenrir()

  const displayHosts = hosts.slice(0, 24)
  if (displayHosts.length === 0) return null

  const W = 340, H = 260
  const cx = W / 2, cy = H / 2
  const r = Math.min(cx, cy) - 42
  const step = (2 * Math.PI) / Math.max(displayHosts.length, 1)

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 2,
      padding: '12px 14px',
      boxShadow: '0 0 20px rgba(229,62,62,0.03)',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', marginBottom: 10, letterSpacing: '0.15em' }}>
        // NETWORK TOPOLOGY — {hosts.length} HOSTS{hosts.length > 24 ? ` (SHOWING 24)` : ''}
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Grid rings */}
        <circle cx={cx} cy={cy} r={r}       fill="none" stroke="rgba(229,62,62,0.08)" strokeWidth={0.5} strokeDasharray="3 5" />
        <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke="rgba(229,62,62,0.05)" strokeWidth={0.5} strokeDasharray="2 4" />

        {/* Cross-hairs */}
        <line x1={cx} y1={cy - r - 8} x2={cx} y2={cy + r + 8} stroke="rgba(229,62,62,0.04)" strokeWidth={0.5} />
        <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="rgba(229,62,62,0.04)" strokeWidth={0.5} />

        {/* Center gateway */}
        <circle cx={cx} cy={cy} r={14} fill="var(--bg-3)" stroke="rgba(229,62,62,0.4)" strokeWidth={1} filter="url(#glow)" />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="var(--red)" fontFamily="var(--mono)" fontWeight="700">GW</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fontSize={7} fill="var(--text-4)" fontFamily="var(--mono)" letterSpacing="2">GATEWAY</text>

        {displayHosts.map((host, i) => {
          const angle = i * step - Math.PI / 2
          const hx = cx + r * Math.cos(angle)
          const hy = cy + r * Math.sin(angle)
          const selected = selectedHosts.has(host.ip)
          const topVuln = host.vulns?.[0]
          const nodeColor = host.compromised
            ? '#ff2020'
            : selected
            ? 'var(--amber)'
            : topVuln
            ? (sevColor[topVuln.severity] || 'var(--text-3)')
            : 'rgba(229,62,62,0.45)'
          const lastOctet = host.ip?.split('.').pop()

          return (
            <g
              key={host.ip}
              onClick={() => currentPhase >= 2 && toggleHostSelect(host.ip)}
              style={{ cursor: currentPhase >= 2 ? 'pointer' : 'default' }}
            >
              {/* Connector line */}
              <line
                x1={cx} y1={cy} x2={hx} y2={hy}
                stroke={host.compromised ? 'rgba(255,32,32,0.25)' : 'rgba(229,62,62,0.07)'}
                strokeWidth={1}
                strokeDasharray={host.compromised ? 'none' : '2 3'}
              />
              {/* Node */}
              <circle
                cx={hx} cy={hy} r={10}
                fill={selected ? 'rgba(229,62,62,0.12)' : host.compromised ? 'rgba(255,32,32,0.18)' : 'var(--bg-3)'}
                stroke={nodeColor}
                strokeWidth={selected ? 1.5 : 1}
              />
              {/* Pulse for compromised */}
              {host.compromised && (
                <circle cx={hx} cy={hy} r={10} fill="none" stroke="rgba(255,32,32,0.4)" strokeWidth={1}>
                  <animate attributeName="r" values="10;18;10" dur="1.8s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1.8s" repeatCount="indefinite"/>
                </circle>
              )}
              {/* IP last octet */}
              <text x={hx} y={hy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill={nodeColor} fontFamily="var(--mono)" fontWeight="700">
                {lastOctet}
              </text>
              {/* Port count */}
              {host.ports?.length > 0 && (
                <text x={hx + 12} y={hy - 8} fontSize={6} fill="var(--text-3)" fontFamily="var(--mono)">{host.ports.length}p</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
