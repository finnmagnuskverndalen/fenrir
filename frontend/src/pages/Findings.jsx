import { useState } from 'react'
import { useWS } from '../components/WebSocketProvider'

const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low']

const severityColor = {
  critical: '#e53e3e',
  high: '#dd6b20',
  medium: '#d69e2e',
  low: '#38a169',
  info: '#555',
}

export default function Findings() {
  const { findings } = useWS()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = findings.filter(f => {
    if (filter !== 'all' && f.severity !== filter) return false
    if (search && !f.title?.toLowerCase().includes(search.toLowerCase()) &&
        !f.cve_id?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search CVE, title..."
          style={{
            background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4,
            color: '#e5e5e5', padding: '5px 10px', fontSize: 12, outline: 'none', width: 200,
          }}
        />
        {SEVERITIES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: filter === s ? (severityColor[s] || '#4a9eff') + '22' : 'transparent',
            border: `1px solid ${filter === s ? (severityColor[s] || '#4a9eff') : '#2a2a2a'}`,
            borderRadius: 4, color: filter === s ? (severityColor[s] || '#4a9eff') : '#555',
            padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {s} {s !== 'all' ? `(${findings.filter(f => f.severity === s).length})` : `(${findings.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: '#333', fontSize: 12 }}>no findings match filter</div>
      ) : (
        filtered.map((f, i) => (
          <div key={i} style={{
            background: '#111',
            borderLeft: `3px solid ${severityColor[f.severity] || '#333'}`,
            borderTop: '1px solid #1f1f1f', borderRight: '1px solid #1f1f1f', borderBottom: '1px solid #1f1f1f',
            borderRadius: '0 6px 6px 0', padding: '12px 16px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 3,
                background: severityColor[f.severity] + '22', color: severityColor[f.severity],
              }}>{f.severity}</span>
              {f.cve_id && <span style={{ color: '#4a9eff', fontSize: 11, fontFamily: 'monospace' }}>{f.cve_id}</span>}
              {f.cvss_score && <span style={{ color: '#444', fontSize: 11 }}>CVSS {f.cvss_score}</span>}
              <span style={{ color: '#444', fontSize: 10, marginLeft: 'auto' }}>{f.detected_by}</span>
            </div>
            <div style={{ color: '#e5e5e5', fontSize: 13, marginBottom: 6 }}>{f.title}</div>
            {f.description && (
              <div style={{ color: '#666', fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                {f.description.slice(0, 300)}{f.description.length > 300 ? '...' : ''}
              </div>
            )}
            {f.ai_analysis && (
              <div style={{
                background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4,
                padding: '8px 10px', marginTop: 8,
              }}>
                <div style={{ color: '#4a9eff', fontSize: 9, marginBottom: 4 }}>AI analysis</div>
                <div style={{ color: '#8888cc', fontSize: 11, lineHeight: 1.5 }}>
                  {f.ai_analysis.slice(0, 400)}{f.ai_analysis.length > 400 ? '...' : ''}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
