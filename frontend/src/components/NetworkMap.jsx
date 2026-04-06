import { useFenrir } from '../store/fenrirStore'

const sevColor = { critical:'#ff3b3b', high:'#f97316', medium:'#f59e0b', low:'#22c55e' }

export default function NetworkMap() {
  const { hosts, selectedHosts, toggleHostSelect, currentPhase } = useFenrir()

  // Only render with reasonable number of hosts for readability
  const displayHosts = hosts.slice(0, 24)
  if (displayHosts.length === 0) return null

  const W = 340, H = 260
  const cx = W / 2, cy = H / 2
  const r = Math.min(cx, cy) - 42
  const step = (2 * Math.PI) / Math.max(displayHosts.length, 1)

  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', marginBottom: 10, letterSpacing: '0.08em' }}>
        NETWORK TOPOLOGY — {hosts.length} hosts{hosts.length > 24 ? ` (showing 24)` : ''}
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {/* Subtle grid */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4" />
        <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="2 4" />

        {/* Center gateway */}
        <circle cx={cx} cy={cy} r={16} fill="var(--bg-3)" stroke="rgba(255,59,59,0.3)" strokeWidth={1.5} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14} fill="var(--red)">⬡</text>
        <text x={cx} y={cy + 28} textAnchor="middle" fontSize={8} fill="var(--text-3)" fontFamily="var(--mono)">GATEWAY</text>

        {displayHosts.map((host, i) => {
          const angle = i * step - Math.PI / 2
          const hx = cx + r * Math.cos(angle)
          const hy = cy + r * Math.sin(angle)
          const selected = selectedHosts.has(host.ip)
          const topVuln = host.vulns?.[0]
          const nodeColor = host.compromised ? '#ff3b3b' : selected ? 'var(--amber)' : topVuln ? (sevColor[topVuln.severity] || 'var(--text-3)') : '#22c55e'
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
                stroke={host.compromised ? 'rgba(255,59,59,0.2)' : 'rgba(255,255,255,0.04)'}
                strokeWidth={1}
              />
              {/* Node */}
              <circle
                cx={hx} cy={hy} r={11}
                fill={selected ? 'rgba(255,59,59,0.15)' : host.compromised ? 'rgba(255,59,59,0.2)' : 'var(--bg-3)'}
                stroke={nodeColor}
                strokeWidth={selected ? 2 : 1.5}
              />
              {/* Pulse for compromised */}
              {host.compromised && (
                <circle cx={hx} cy={hy} r={11} fill="none" stroke="rgba(255,59,59,0.3)" strokeWidth={1}>
                  <animate attributeName="r" values="11;18;11" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}
              {/* IP last octet */}
              <text x={hx} y={hy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill={nodeColor} fontFamily="var(--mono)" fontWeight="700">
                {lastOctet}
              </text>
              {/* Port count */}
              {host.ports?.length > 0 && (
                <text x={hx + 13} y={hy - 8} fontSize={7} fill="var(--green)" fontFamily="var(--mono)">{host.ports.length}</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
