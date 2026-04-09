import { useState } from 'react'
import { useWS } from '../components/WebSocketProvider'

const stateColor = { open: '#c8c8c8', filtered: '#d69e2e', closed: '#444' }

export default function Hosts() {
  const { hosts } = useWS()
  const [expanded, setExpanded] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ color: '#333', fontSize: 10, marginBottom: 6 }}>
        {hosts.length} host{hosts.length !== 1 ? 's' : ''} discovered
      </div>

      {hosts.length === 0 ? (
        <div style={{ color: '#2a2a2a', fontSize: 12 }}>no hosts discovered yet — start a scan</div>
      ) : (
        hosts.map((host, i) => {
          const isOpen = expanded === i
          return (
            <div
              key={i}
              style={{
                background: '#111', border: '1px solid #1f1f1f',
                borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
              }}
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              {/* Host header */}
              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c8c8c8', flexShrink: 0 }} />
                <span style={{ color: '#e5e5e5', fontFamily: 'monospace', fontSize: 14, fontWeight: 500 }}>
                  {host.ip}
                </span>
                {host.hostname && (
                  <span style={{ color: '#444', fontSize: 11 }}>{host.hostname}</span>
                )}
                {host.os && (
                  <span style={{ color: '#333', fontSize: 10, marginLeft: 4 }}>{host.os}</span>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ color: '#2a2a2a', fontSize: 11 }}>
                  {host.ports?.length || 0} ports
                </span>
                <span style={{ color: '#2a2a2a', fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Port pills preview (collapsed) */}
              {!isOpen && host.ports?.length > 0 && (
                <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {host.ports.slice(0, 8).map((p, j) => (
                    <span key={j} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 3,
                      background: '#1a1a1a', border: '1px solid #252525',
                      color: stateColor[p.state] || '#555',
                    }}>
                      {p.port}/{p.protocol}
                      {p.service ? ` ${p.service}` : ''}
                    </span>
                  ))}
                  {host.ports.length > 8 && (
                    <span style={{ fontSize: 10, color: '#333' }}>+{host.ports.length - 8} more</span>
                  )}
                </div>
              )}

              {/* Expanded port table */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #1a1a1a', padding: '12px 16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['port', 'protocol', 'state', 'service', 'version'].map(h => (
                          <th key={h} style={{
                            textAlign: 'left', color: '#333', fontSize: 10,
                            padding: '4px 8px', borderBottom: '1px solid #1a1a1a', fontWeight: 400,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {host.ports?.map((p, j) => (
                        <tr key={j} style={{ borderBottom: '1px solid #111' }}>
                          <td style={{ padding: '5px 8px', color: '#e5e5e5', fontFamily: 'monospace' }}>{p.port}</td>
                          <td style={{ padding: '5px 8px', color: '#555' }}>{p.protocol}</td>
                          <td style={{ padding: '5px 8px' }}>
                            <span style={{
                              fontSize: 10, padding: '1px 6px', borderRadius: 3,
                              background: (stateColor[p.state] || '#555') + '22',
                              color: stateColor[p.state] || '#555',
                            }}>{p.state}</span>
                          </td>
                          <td style={{ padding: '5px 8px', color: '#888' }}>{p.service || '—'}</td>
                          <td style={{ padding: '5px 8px', color: '#555', fontSize: 11 }}>{p.version || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
