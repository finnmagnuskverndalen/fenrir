import { useFenrir } from '../store/fenrirStore'

const sevColor = { critical: '#e53e3e', high: '#f59e0b', medium: '#ecc94b', low: '#38a169' }

export default function NetworkMap() {
  const { hosts, selectedHosts, toggleHostSelect, currentPhase } = useFenrir()

  if (hosts.length === 0) return null

  // Layout hosts in a circle around a central router node
  const cx = 200, cy = 160, r = 110
  const angleStep = (2 * Math.PI) / Math.max(hosts.length, 1)

  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px', flexShrink: 0 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
        NETWORK MAP — {hosts.length} hosts
      </div>
      <svg width="400" height="320" style={{ display: 'block', margin: '0 auto' }}>
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="400" height="320" fill="url(#grid)" />

        {/* Center node — router/gateway */}
        <circle cx={cx} cy={cy} r={18} fill="rgba(229,62,62,0.1)" stroke="rgba(229,62,62,0.4)" strokeWidth={1.5} />
        <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize={14}>⬡</text>
        <text x={cx} y={cy+26} textAnchor="middle" fontSize={8} fill="rgba(229,62,62,0.6)" fontFamily="monospace">GATEWAY</text>

        {/* Host nodes */}
        {hosts.map((host, i) => {
          const angle = i * angleStep - Math.PI / 2
          const hx = cx + r * Math.cos(angle)
          const hy = cy + r * Math.sin(angle)
          const selected = selectedHosts.has(host.ip)
          const topVuln = host.vulns?.[0]
          const nodeColor = host.compromised ? '#e53e3e' : selected ? '#f59e0b' : topVuln ? (sevColor[topVuln.severity] || '#555') : '#39d353'

          return (
            <g key={host.ip} onClick={() => currentPhase >= 2 && toggleHostSelect(host.ip)} style={{ cursor: currentPhase >= 2 ? 'pointer' : 'default' }}>
              {/* Line to center */}
              <line
                x1={cx} y1={cy} x2={hx} y2={hy}
                stroke={host.compromised ? 'rgba(229,62,62,0.3)' : 'rgba(255,255,255,0.06)'}
                strokeWidth={host.compromised ? 1.5 : 1}
                strokeDasharray={host.compromised ? '4,2' : '3,3'}
              />
              {/* Node circle */}
              <circle
                cx={hx} cy={hy} r={14}
                fill={selected ? 'rgba(229,62,62,0.15)' : host.compromised ? 'rgba(229,62,62,0.2)' : 'rgba(255,255,255,0.04)'}
                stroke={nodeColor}
                strokeWidth={selected ? 2 : 1.5}
              />
              {/* Pulse for compromised */}
              {host.compromised && (
                <circle cx={hx} cy={hy} r={20} fill="none" stroke="rgba(229,62,62,0.2)" strokeWidth={1}>
                  <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}
              {/* OS emoji */}
              <text x={hx} y={hy+1} textAnchor="middle" dominantBaseline="middle" fontSize={10}>
                {host.compromised ? '💀' : host.ports?.length > 0 ? '◉' : '○'}
              </text>
              {/* IP label */}
              <text
                x={hx} y={hy + 22}
                textAnchor="middle"
                fontSize={8}
                fill={selected ? '#f59e0b' : host.compromised ? '#e53e3e' : 'rgba(255,255,255,0.5)'}
                fontFamily="monospace"
              >
                {host.ip.split('.').slice(-1)[0]}
              </text>
              {/* Port count badge */}
              {host.ports?.length > 0 && (
                <text x={hx + 12} y={hy - 10} fontSize={7} fill="#39d353" fontFamily="monospace">
                  {host.ports.length}p
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
