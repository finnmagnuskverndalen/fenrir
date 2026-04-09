import { useEffect, useState } from 'react'

export default function Scope() {
  const [scope, setScope] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/scope')
      .then(r => r.json())
      .then(d => { setScope(d.scope || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ color: '#444', fontSize: 10, marginBottom: 6 }}>authorized scan targets</div>
      <div style={{ color: '#333', fontSize: 11, marginBottom: 16 }}>
        Edit scope.txt in the project root to add or remove CIDR ranges.
        Only these ranges will be allowed to scan.
      </div>

      {loading ? (
        <div style={{ color: '#333', fontSize: 12 }}>loading...</div>
      ) : scope.length === 0 ? (
        <div style={{ color: '#e53e3e', fontSize: 12 }}>
          no scope defined — add CIDR ranges to scope.txt
        </div>
      ) : (
        scope.map((cidr, i) => (
          <div key={i} style={{
            background: '#111', border: '1px solid #1f1f1f', borderRadius: 4,
            padding: '8px 12px', marginBottom: 6, color: '#c8c8c8',
            fontFamily: 'monospace', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: '#2a2a2a' }}>✓</span>
            {cidr}
          </div>
        ))
      )}

      <div style={{ marginTop: 20, color: '#333', fontSize: 11, lineHeight: 1.6 }}>
        To add a target:<br />
        <span style={{ color: '#555', fontFamily: 'monospace' }}>echo "192.168.1.0/24" &gt;&gt; scope.txt</span>
      </div>
    </div>
  )
}
