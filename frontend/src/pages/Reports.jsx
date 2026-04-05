import { useState, useEffect } from 'react'

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# '))   return <h1 key={i} style={{color:'#e5e5e5',fontSize:18,fontWeight:500,marginTop:24,marginBottom:8,borderBottom:'1px solid #1f1f1f',paddingBottom:8}}>{line.replace(/^# /,'')}</h1>
    if (line.startsWith('## '))  return <h2 key={i} style={{color:'#ccc',fontSize:15,fontWeight:500,marginTop:18,marginBottom:6}}>{line.replace(/^## /,'')}</h2>
    if (line.startsWith('### ')) return <h3 key={i} style={{color:'#aaa',fontSize:13,fontWeight:500,marginTop:12,marginBottom:4}}>{line.replace(/^### /,'')}</h3>
    if (line.startsWith('- ') || line.startsWith('* ')) return (
      <div key={i} style={{color:'#777',fontSize:12,lineHeight:1.7,paddingLeft:16,display:'flex',gap:8}}>
        <span style={{color:'#e53e3e',flexShrink:0}}>›</span>
        <span dangerouslySetInnerHTML={{__html: line.replace(/^[-*] /,'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:#aaa">$1</strong>')}}/>
      </div>
    )
    if (/^\d+\. /.test(line)) return (
      <div key={i} style={{color:'#777',fontSize:12,lineHeight:1.7,paddingLeft:16,display:'flex',gap:8}}>
        <span style={{color:'#555',flexShrink:0,minWidth:16}}>{line.match(/^\d+/)[0]}.</span>
        <span dangerouslySetInnerHTML={{__html: line.replace(/^\d+\. /,'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:#aaa">$1</strong>')}}/>
      </div>
    )
    if (line.startsWith('|')) return (
      <div key={i} style={{fontFamily:'monospace',fontSize:11,color:'#555',lineHeight:1.8,borderBottom:'1px solid #111',padding:'2px 0'}}>
        {line}
      </div>
    )
    if (line.startsWith('---') || line.startsWith('===')) return <div key={i} style={{borderTop:'1px solid #1f1f1f',margin:'10px 0'}}/>
    if (line.trim() === '') return <div key={i} style={{height:8}}/>
    return (
      <div key={i} style={{color:'#777',fontSize:12,lineHeight:1.7}}
        dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#aaa">$1</strong>').replace(/`(.*?)`/g,'<code style="background:#1a1a1a;color:#aaa;padding:1px 4px;border-radius:3px;font-family:monospace">$1</code>')}}
      />
    )
  })
}

const severityBadge = sev => {
  const colors = { critical:'#e53e3e', high:'#dd6b20', medium:'#d69e2e', low:'#38a169', info:'#4a9eff' }
  const c = colors[sev?.toLowerCase()] || '#555'
  return <span style={{fontSize:9,padding:'2px 7px',borderRadius:3,background:c+'22',color:c,marginRight:6}}>{sev}</span>
}

export default function Reports() {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [sessionFindings, setSessionFindings] = useState([])
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [savedReports, setSavedReports] = useState([])

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => { setSessions(d); if (d.length > 0) setSessionId(d[0].id) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/sessions/${sessionId}/findings`)
      .then(r => r.json())
      .then(d => setSessionFindings(d))
      .catch(() => {})
  }, [sessionId])

  async function generate() {
    if (!sessionId) return
    setLoading(true)
    setError('')
    setReport('')
    try {
      const res = await fetch(`/api/reports/generate/${sessionId}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setReport(data.report)
        setSavedReports(prev => [{ id: sessionId, ts: new Date().toISOString(), report: data.report }, ...prev])
      } else {
        setError(data.detail || 'Failed to generate report')
      }
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
    a.download = `fenrir-report-${sessionId.slice(0,8)}.md`
    a.click()
  }

  const sevCounts = sessionFindings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity]||0)+1; return acc }, {})

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>

      {/* Session picker */}
      <div style={{background:'#111',border:'1px solid #1f1f1f',borderRadius:6,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
        <div style={{color:'#333',fontSize:10,marginBottom:2}}>select scan session</div>
        <select
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          style={{background:'#0d0d0d',border:'1px solid #2a2a2a',borderRadius:4,color:'#e5e5e5',padding:'6px 10px',fontSize:12,outline:'none',fontFamily:'inherit'}}
        >
          {sessions.length === 0 && <option value="">no sessions available</option>}
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.target} — {s.started_at?.slice(0,16).replace('T',' ')} {s.dry_run ? '[dry-run]' : ''}
            </option>
          ))}
        </select>

        {/* Session summary */}
        {sessionFindings.length > 0 && (
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <span style={{color:'#333',fontSize:11}}>{sessionFindings.length} findings:</span>
            {['critical','high','medium','low','info'].filter(s => sevCounts[s]).map(s => (
              <span key={s}>{severityBadge(s)}<span style={{color:'#444',fontSize:11}}>{sevCounts[s]}</span></span>
            ))}
          </div>
        )}

        <div style={{display:'flex',gap:8}}>
          <button onClick={generate} disabled={loading || !sessionId || sessionFindings.length === 0} style={{
            background: loading ? '#1a1a1a' : '#e53e3e',
            color: loading ? '#444' : '#fff',
            border:'none',borderRadius:4,padding:'6px 16px',fontSize:12,
            cursor: loading || sessionFindings.length === 0 ? 'not-allowed' : 'pointer',
            fontFamily:'inherit',
          }}>
            {loading ? 'generating report...' : 'generate AI report'}
          </button>
          {report && (
            <button onClick={download} style={{background:'transparent',color:'#4a9eff',border:'1px solid #1a2a3a',borderRadius:4,padding:'6px 14px',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              download .md
            </button>
          )}
        </div>

        {sessionFindings.length === 0 && sessionId && (
          <div style={{color:'#444',fontSize:11}}>this session has no findings — run a real scan first</div>
        )}
      </div>

      {error && <div style={{color:'#e53e3e',fontSize:12,padding:'8px 12px',background:'#1a0a0a',borderRadius:4,border:'1px solid #3a1a1a'}}>{error}</div>}

      {loading && (
        <div style={{color:'#444',fontSize:12,padding:'12px',background:'#0d0d1a',borderRadius:4,border:'1px solid #1a1a3a'}}>
          DeepSeek is writing your pentest report — this takes 20-40 seconds...
        </div>
      )}

      {/* Rendered report */}
      {report && (
        <div style={{background:'#0a0a0a',border:'1px solid #1a1a1a',borderRadius:6,padding:'24px 28px'}}>
          {renderMarkdown(report)}
        </div>
      )}
    </div>
  )
}
