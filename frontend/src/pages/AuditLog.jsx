import { useEffect, useState } from 'react'

export default function AuditLog() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/audit')
      .then(r => r.json())
      .then(d => { setEntries(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ color: '#444', fontSize: 10, marginBottom: 14 }}>
        {entries.length} audit entries (append-only)
      </div>

      {loading ? (
        <div style={{ color: '#333', fontSize: 12 }}>loading...</div>
      ) : entries.length === 0 ? (
        <div style={{ color: '#333', fontSize: 12 }}>no audit entries yet</div>
      ) : (
        entries.map((e, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '5px 0',
            borderBottom: '1px solid #111', fontSize: 11,
          }}>
            <span style={{ color: '#333', flexShrink: 0 }}>{e.timestamp?.slice(0, 19).replace('T', ' ')}</span>
            <span style={{ color: e.dry_run ? '#555' : '#e53e3e', flexShrink: 0 }}>
              {e.dry_run ? '[dry]' : '[live]'}
            </span>
            <span style={{ color: '#4a9eff', flexShrink: 0 }}>{e.action}</span>
            <span style={{ color: '#666' }}>{e.target}</span>
            {e.detail && <span style={{ color: '#444' }}>{e.detail}</span>}
          </div>
        ))
      )}
    </div>
  )
}
