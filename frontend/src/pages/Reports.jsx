import { useState, useEffect } from 'react'

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# '))  return <div key={i} style={{ color: '#e5e5e5', fontSize: 16, fontWeight: 500, marginTop: 20, marginBottom: 6 }}>{line.replace(/^# /, '')}</div>
    if (line.startsWith('## ')) return <div key={i} style={{ color: '#ccc', fontSize: 14, fontWeight: 500, marginTop: 14, marginBottom: 4 }}>{line.replace(/^## /, '')}</div>
    if (line.startsWith('### ')) return <div key={i} style={{ color: '#aaa', fontSize: 13, fontWeight: 500, marginTop: 10, marginBottom: 3 }}>{line.replace(/^### /, '')}</div>
    if (line.startsWith('- ') || line.startsWith('* ')) return (
      <div key={i} style={{ color: '#777', fontSize: 12, lineHeight: 1.7, paddingLeft: 12, display: 'flex', gap: 6 }}>
        <span style={{ color: '#e53e3e', flexShrink: 0 }}>›</span>
        <span>{line.replace(/^[-*] /, '')}</span>
      </div>
    )
    if (line.trim() === '') return <div key={i} style={{ height: 8 }} />
    if (line.startsWith('---')) return <div key={i} style={{ borderTop: '1px solid #1f1f1f', margin: '10px 0' }} />
    return <div key={i} style={{ color: '#777', fontSize: 12, lineHeight: 1.7 }}>{line}</div>
  })
}

export default function Reports() {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => {
        setSessions(d)
        if (d.length > 0) setSessionId(d[0].id)
      })
      .catch(() => {})
  }, [])

  async function generate() {
    if (!sessionId) return
    setLoading(true)
    setError('')
    setReport('')
    try {
      const res = await fetch(`/api/reports/generate/${sessionId}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setReport(data.report)
      else setError(data.detail || 'Failed to generate report')
    } catch {
      setError('Could not connect to backend')
    } finally {
      setLoading(false)
    }
  }

  function download() {
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fenrir-report-${sessionId.slice(0, 8)}.md`
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          style={{
            background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4,
            color: '#e5e5e5', padding: '5px 10px', fontSize: 12, outline: 'none',
            fontFamily: 'inherit', minWidth: 280,
          }}
        >
          {sessions.length === 0 && <option value="">no sessions available</option>}
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.target} — {s.started_at?.slice(0, 16).replace('T', ' ')} {s.dry_run ? '[dry]' : ''}
            </option>
          ))}
        </select>

        <button onClick={generate} disabled={loading || !sessionId} style={{
          background: loading ? '#1a1a1a' : '#e53e3e',
          color: loading ? '#444' : '#fff',
          border: 'none', borderRadius: 4,
          padding: '5px 14px', fontSize: 12,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}>
          {loading ? 'generating...' : 'generate report'}
        </button>

        {report && (
          <button onClick={download} style={{
            background: 'transparent', color: '#4a9eff',
            border: '1px solid #1a2a3a', borderRadius: 4,
            padding: '5px 14px', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            download .md
          </button>
        )}
      </div>

      {error && <div style={{ color: '#e53e3e', fontSize: 12 }}>{error}</div>}

      {loading && (
        <div style={{ color: '#444', fontSize: 12 }}>
          AI is writing your report — this takes 15-30 seconds...
        </div>
      )}

      {report && (
        <div style={{
          background: '#0a0a0a', border: '1px solid #1a1a1a',
          borderRadius: 6, padding: '20px 24px',
        }}>
          {renderMarkdown(report)}
        </div>
      )}
    </div>
  )
}
