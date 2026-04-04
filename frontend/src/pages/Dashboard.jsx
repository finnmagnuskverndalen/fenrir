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
  ok: '#39d353',
  warn: '#d69e2e',
  error: '#e53e3e',
  info: '#4a9eff',
}

export default function Dashboard() {
  const { logs, hosts, findings, phases } = useWS()

  const criticals = findings.filter(f => f.severity === 'critical').length
  const highs = findings.filter(f => f.severity === 'high').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'hosts found', value: hosts.length },
          { label: 'findings', value: findings.length },
          { label: 'critical', value: criticals, color: criticals > 0 ? '#e53e3e' : undefined },
          { label: 'high', value: highs, color: highs > 0 ? '#dd6b20' : undefined },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
            <div style={{ color: '#444', fontSize: 10, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: color || '#e5e5e5' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Phase progress */}
      <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
        <div style={{ color: '#444', fontSize: 10, marginBottom: 10 }}>scan progress</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PHASES.map(phase => {
            const status = phases[phase]
            const bg = status === 'complete' ? '#39d353' : status === 'running' ? '#4a9eff' : status === 'failed' ? '#e53e3e' : '#1f1f1f'
            return (
              <div key={phase} style={{ flex: 1 }}>
                <div style={{ height: 4, borderRadius: 2, background: bg, marginBottom: 4 }} />
                <div style={{ color: status === 'running' ? '#4a9eff' : '#333', fontSize: 10, textAlign: 'center' }}>{phase}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Recent hosts */}
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ color: '#444', fontSize: 10, marginBottom: 10 }}>recent hosts</div>
          {hosts.length === 0
            ? <div style={{ color: '#333', fontSize: 11 }}>no hosts discovered yet</div>
            : hosts.slice(0, 6).map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ color: '#e5e5e5', fontFamily: 'monospace' }}>{h.ip}</span>
                <span style={{ color: '#444', fontSize: 11 }}>{h.ports?.length || 0} ports</span>
              </div>
            ))
          }
        </div>

        {/* Recent findings */}
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ color: '#444', fontSize: 10, marginBottom: 10 }}>recent findings</div>
          {findings.length === 0
            ? <div style={{ color: '#333', fontSize: 11 }}>no findings yet</div>
            : findings.slice(0, 6).map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 3,
                  background: severityColor[f.severity] + '22',
                  color: severityColor[f.severity],
                  flexShrink: 0,
                }}>{f.severity}</span>
                <span style={{ color: '#aaa', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Live log */}
      <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 6, padding: '12px 14px' }}>
        <div style={{ color: '#444', fontSize: 10, marginBottom: 10 }}>live log</div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {logs.length === 0
            ? <div style={{ color: '#333', fontSize: 11 }}>waiting for scan output...</div>
            : logs.slice(0, 50).map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '2px 0', fontSize: 11 }}>
                <span style={{ color: '#333', flexShrink: 0 }}>{log.timestamp?.slice(11, 19)}</span>
                <span style={{ color: levelColor[log.level] || '#555', flexShrink: 0 }}>[{log.level}]</span>
                <span style={{ color: '#666', flexShrink: 0 }}>{log.phase}</span>
                <span style={{ color: '#999' }}>{log.message}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
