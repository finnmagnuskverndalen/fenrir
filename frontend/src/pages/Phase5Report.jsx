import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'

function renderMd(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# '))   return <div key={i} style={{color:'var(--text)',fontSize:17,fontFamily:'var(--display)',fontWeight:700,marginTop:24,marginBottom:8,borderBottom:'1px solid var(--border)',paddingBottom:8,letterSpacing:1}}>{line.replace(/^# /,'')}</div>
    if (line.startsWith('## '))  return <div key={i} style={{color:'#c4b5fd',fontSize:14,fontWeight:600,marginTop:16,marginBottom:6,fontFamily:'var(--body)'}}>{line.replace(/^## /,'')}</div>
    if (line.startsWith('### ')) return <div key={i} style={{color:'var(--text-dim)',fontSize:13,fontWeight:600,marginTop:12,marginBottom:4}}>{line.replace(/^### /,'')}</div>
    if (line.startsWith('- ') || line.startsWith('* ')) return (
      <div key={i} style={{display:'flex',gap:8,paddingLeft:12,color:'var(--text-dim)',fontSize:12,lineHeight:1.7}}>
        <span style={{color:'var(--red)',flexShrink:0}}>›</span>
        <span dangerouslySetInnerHTML={{__html:line.replace(/^[-*] /,'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text)">$1</strong>')}}/>
      </div>
    )
    if (/^\d+\. /.test(line)) return (
      <div key={i} style={{display:'flex',gap:8,paddingLeft:12,color:'var(--text-dim)',fontSize:12,lineHeight:1.7}}>
        <span style={{color:'var(--text-muted)',flexShrink:0,minWidth:16}}>{line.match(/^\d+/)[0]}.</span>
        <span dangerouslySetInnerHTML={{__html:line.replace(/^\d+\. /,'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text)">$1</strong>')}}/>
      </div>
    )
    if (line.startsWith('|')) return <div key={i} style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text-muted)',lineHeight:1.8,borderBottom:'1px solid var(--border)',padding:'2px 0'}}>{line}</div>
    if (line.match(/^---+$/)) return <div key={i} style={{borderTop:'1px solid var(--border)',margin:'12px 0'}}/>
    if (line.trim()==='') return <div key={i} style={{height:8}}/>
    return <div key={i} style={{color:'var(--text-dim)',fontSize:12,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:line.replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text)">$1</strong>').replace(/`(.*?)`/g,'<code style="background:var(--bg4);color:var(--text-dim);padding:1px 5px;border-radius:3px;font-family:var(--mono);font-size:11px">$1</code>')}}/>
  })
}

export default function Phase5Report() {
  const { sessions, setSessions, findings, hosts } = useFenrir()
  const [sessionId, setSessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [savedReports, setSavedReports] = useState([])

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => { setSessions(d); if (d.length > 0) setSessionId(d[0].id) }).catch(() => {})
    fetch('/api/reports/list').then(r => r.json()).then(setSavedReports).catch(() => {})
  }, [])

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
        fetch('/api/reports/list').then(r => r.json()).then(setSavedReports).catch(() => {})
      } else setError(data.detail || 'Failed')
    } catch { setError('Backend error') }
    finally { setLoading(false) }
  }

  function download() {
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `fenrir-report-${sessionId.slice(0,8)}.md`; a.click()
  }

  const sessionFindings = findings.filter(f => f.session_id === sessionId)

  return (
    <div style={{ display: 'flex', gap: 14, height: '100%', overflow: 'hidden' }}>

      {/* Left sidebar */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 1 }}>PHASE 05 — REPORTING</div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Select scan session:</div>
          <select
            value={sessionId}
            onChange={e => setSessionId(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text)', padding: '7px 10px',
              fontFamily: 'var(--mono)', fontSize: 11, outline: 'none', marginBottom: 10,
            }}
          >
            {sessions.length === 0 && <option value="">No sessions</option>}
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.target} — {s.started_at?.slice(0,16).replace('T',' ')}
              </option>
            ))}
          </select>

          <button
            onClick={generate}
            disabled={loading || !sessionId}
            style={{
              width: '100%', background: loading ? 'var(--bg4)' : 'rgba(139,92,246,0.15)',
              border: `1px solid ${loading ? 'var(--border)' : 'rgba(139,92,246,0.3)'}`,
              borderRadius: 6, color: loading ? 'var(--text-muted)' : '#c4b5fd',
              padding: '9px', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--display)', fontSize: 10, letterSpacing: 2,
            }}
          >
            {loading ? 'GENERATING...' : 'GENERATE REPORT'}
          </button>

          {report && (
            <button onClick={download} style={{
              width: '100%', background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text-dim)', padding: '7px',
              cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, marginTop: 6,
            }}>
              DOWNLOAD .MD
            </button>
          )}

          {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', marginTop: 8 }}>✗ {error}</div>}
        </div>

        {/* Scan stats */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 1 }}>ENGAGEMENT SUMMARY</div>
          {[
            { label: 'Hosts', value: hosts.length },
            { label: 'Total findings', value: findings.length },
            { label: 'Critical', value: findings.filter(f=>f.severity==='critical').length, color: 'var(--red)' },
            { label: 'High', value: findings.filter(f=>f.severity==='high').length, color: 'var(--amber)' },
            { label: 'Medium', value: findings.filter(f=>f.severity==='medium').length, color: '#ecc94b' },
          ].map(({label, value, color}) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: color || 'var(--text)', fontWeight: color ? 700 : 400 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Saved reports */}
        {savedReports.length > 0 && (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>SAVED REPORTS</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {savedReports.map((r, i) => (
                <a key={i} href={`/api/reports/download/${r.filename}`} style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  {r.filename.slice(0, 32)}...
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report viewer */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: 2 }}>GENERATING REPORT</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#8b5cf6' }}>DeepSeek is writing your pentest report...</div>
          </div>
        )}

        {!report && !loading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 48, opacity: 0.06 }}>📋</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>Select a session and generate report</div>
          </div>
        )}

        {report && (
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px', animation: 'fade-in 0.4s ease' }}>
            {renderMd(report)}
          </div>
        )}
      </div>
    </div>
  )
}
