import { useEffect, useRef } from 'react'
import { useWS } from '../components/WebSocketProvider'

const PHASES = ['dns', 'ports', 'vulns', 'ai', 'report']

const severityColor = {
  critical: '#e53e3e',
  high: '#dd6b20',
  medium: '#d69e2e',
  low: '#38a169',
  info: '#555',
}

const levelColor = {
  ok:    '#c8c8c8',
  warn:  '#d69e2e',
  error: '#e53e3e',
  info:  '#4a9eff',
}

const levelPrefix = {
  ok:    '✓',
  warn:  '!',
  error: '✗',
  info:  '›',
}

export default function Dashboard() {
  const { logs, hosts, findings, phases } = useWS()
  const logRef = useRef(null)

  const criticals = findings.filter(f => f.severity === 'critical').length
  const highs     = findings.filter(f => f.severity === 'high').length

  // Auto-scroll live log to bottom on new messages
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'hosts found',  value: hosts.length,    color: null },
          { label: 'findings',     value: findings.length, color: null },
          { label: 'critical',     value: criticals,       color: criticals > 0 ? '#e53e3e' : null },
          { label: 'high',         value: highs,           color: highs > 0 ? '#dd6b20' : null },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
            <div style={{ color: '#333', fontSize: 10, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: color || '#e5e5e5' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Phase progress */}
      <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
        <div style={{ color: '#333', fontSize: 10, marginBottom: 10 }}>scan progress</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PHASES.map(phase => {
            const status = phases[phase]
            const barColor =
              status === 'complete' ? '#c8c8c8' :
              status === 'running'  ? '#4a9eff' :
              status === 'failed'   ? '#e53e3e' : '#1f1f1f'
            const labelColor =
              status === 'running'  ? '#4a9eff' :
              status === 'complete' ? '#c8c8c8' :
              status === 'failed'   ? '#e53e3e' : '#2a2a2a'
            return (
              <div key={phase} style={{ flex: 1 }}>
                <div style={{ height: 4, borderRadius: 2, background: barColor, marginBottom: 5,
                  transition: 'background 0.3s',
                  boxShadow: status === 'running' ? `0 0 6px ${barColor}` : 'none',
                }} />
                <div style={{ color: labelColor, fontSize: 10, textAlign: 'center', transition: 'color 0.3s' }}>
                  {status === 'running' ? `${phase}...` : phase}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Recent hosts */}
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ color: '#333', fontSize: 10, marginBottom: 10 }}>
            hosts — {hosts.length} found
          </div>
          {hosts.length === 0
            ? <div style={{ color: '#2a2a2a', fontSize: 11 }}>no hosts discovered yet</div>
            : hosts.slice(0, 8).map((h, i) => (
              <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid #161616' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#e5e5e5', fontFamily: 'monospace', fontSize: 12 }}>{h.ip}</span>
                  <span style={{ color: '#333', fontSize: 10 }}>{h.ports?.length || 0} ports</span>
                </div>
                {h.ports?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {h.ports.slice(0, 6).map((p, j) => (
                      <span key={j} style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 2,
                        background: '#1a1a1a', border: '1px solid #252525', color: '#555',
                      }}>
                        {p.port}{p.service ? `/${p.service}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          }
        </div>

        {/* Recent findings */}
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ color: '#333', fontSize: 10, marginBottom: 10 }}>
            findings — {findings.length} total
          </div>
          {findings.length === 0
            ? <div style={{ color: '#2a2a2a', fontSize: 11 }}>no findings yet</div>
            : findings.slice(0, 8).map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #161616' }}>
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                  background: (severityColor[f.severity] || '#555') + '22',
                  color: severityColor[f.severity] || '#555',
                }}>{f.severity}</span>
                <span style={{ color: '#888', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.title}
                </span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Live log — auto-scrolling */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ color: '#333', fontSize: 10 }}>live log</div>
          <div style={{ color: '#2a2a2a', fontSize: 10 }}>{logs.length} events</div>
        </div>
        <div
          ref={logRef}
          style={{ height: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}
        >
          {logs.length === 0
            ? <div style={{ color: '#2a2a2a', fontSize: 11 }}>waiting for scan output...</div>
            : [...logs].reverse().map((log, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '52px 14px 48px 60px 1fr',
                gap: 6,
                padding: '1px 0',
                fontSize: 11,
                fontFamily: 'monospace',
                borderBottom: i < logs.length - 1 ? '1px solid #111' : 'none',
              }}>
                <span style={{ color: '#2a2a2a' }}>{log.timestamp?.slice(11, 19)}</span>
                <span style={{ color: levelColor[log.level] || '#555' }}>
                  {levelPrefix[log.level] || '·'}
                </span>
                <span style={{ color: '#2a4a2a', textAlign: 'right' }}>{log.phase}</span>
                <span style={{ color: levelColor[log.level] + '88' || '#333', fontSize: 10, alignSelf: 'center' }}>
                  [{log.level}]
                </span>
                <span style={{ color: log.level === 'error' ? '#e53e3e' : log.level === 'warn' ? '#d69e2e88' : '#555' }}>
                  {log.message}
                </span>
              </div>
            ))
          }
        </div>
      </div>

    </div>
  )
}
