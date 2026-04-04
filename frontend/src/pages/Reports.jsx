import { useState } from 'react'

export default function Reports() {
  const [sessionId, setSessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')

  async function generate() {
    if (!sessionId.trim()) return
    setLoading(true)
    setError('')
    setReport('')
    try {
      const res = await fetch(`/api/reports/generate/${sessionId.trim()}`, { method: 'POST' })
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
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          placeholder="Session ID"
          style={{
            background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4,
            color: '#e5e5e5', padding: '5px 10px', fontSize: 12, outline: 'none', width: 320,
          }}
        />
        <button onClick={generate} disabled={loading} style={{
          background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 4,
          padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {loading ? 'generating...' : 'generate report'}
        </button>
        {report && (
          <button onClick={download} style={{
            background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #2a2a2a',
            borderRadius: 4, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            download .md
          </button>
        )}
      </div>

      {error && <div style={{ color: '#e53e3e', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {report && (
        <div style={{
          background: '#111', border: '1px solid #1f1f1f', borderRadius: 6,
          padding: '16px', color: '#aaa', fontSize: 12, lineHeight: 1.8,
          whiteSpace: 'pre-wrap', fontFamily: 'monospace',
        }}>
          {report}
        </div>
      )}
    </div>
  )
}
