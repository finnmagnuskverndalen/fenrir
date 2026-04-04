import { useWS } from '../components/WebSocketProvider'

export default function Hosts() {
  const { hosts } = useWS()

  return (
    <div>
      <div style={{ color: '#444', fontSize: 10, marginBottom: 14 }}>
        {hosts.length} host{hosts.length !== 1 ? 's' : ''} discovered
      </div>

      {hosts.length === 0 ? (
        <div style={{ color: '#333', fontSize: 12 }}>no hosts discovered yet — start a scan</div>
      ) : (
        hosts.map((host, i) => (
          <div key={i} style={{
            background: '#111', border: '1px solid #1f1f1f', borderRadius: 6,
            padding: '12px 16px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#e5e5e5', fontWeight: 500, fontSize: 14 }}>{host.ip}</span>
              {host.hostname && <span style={{ color: '#555', fontSize: 11 }}>{host.hostname}</span>}
              {host.os && <span style={{ color: '#444', fontSize: 11 }}>{host.os}</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {host.ports?.map((p, j) => (
                <span key={j} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 3,
                  background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
                }}>
                  {p.port}/{p.protocol} {p.service ? `(${p.service})` : ''}
                </span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
