import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'

const sevColor = { critical:'#ff2020', high:'#ff5500', medium:'#f59e0b', low:'#883333', info:'rgba(229,62,62,0.5)' }

function Markdown({ text }) {
  if (!text) return null
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('# '))   return <h1 key={i} style={{ fontFamily:'var(--mono)', color:'var(--red)', fontSize:16, fontWeight:700, marginTop:24, marginBottom:10, paddingBottom:8, borderBottom:'1px solid var(--border)', letterSpacing:'0.08em' }}>{line.replace(/^# /,'')}</h1>
        if (line.startsWith('## '))  return <h2 key={i} style={{ fontFamily:'var(--mono)', color:'#e0e0e0', fontSize:13, fontWeight:700, marginTop:18, marginBottom:6, letterSpacing:'0.08em' }}>{line.replace(/^## /,'')}</h2>
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontFamily:'var(--mono)', color:'#c8c8c8', fontSize:12, fontWeight:700, marginTop:12, marginBottom:4, letterSpacing:'0.06em' }}>{line.replace(/^### /,'')}</h3>
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <div key={i} style={{ display:'flex', gap:10, paddingLeft:12, color:'#c0c0c0', fontSize:12, lineHeight:1.8 }}>
            <span style={{ color:'var(--red)', flexShrink:0 }}>&gt;</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-*] /,'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text)">$1</strong>') }} />
          </div>
        )
        if (/^\d+\. /.test(line)) return (
          <div key={i} style={{ display:'flex', gap:10, paddingLeft:12, color:'#c0c0c0', fontSize:12, lineHeight:1.8 }}>
            <span style={{ color:'#888', flexShrink:0 }}>{line.match(/^\d+/)[0]}.</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\. /,'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text)">$1</strong>') }} />
          </div>
        )
        if (line.startsWith('|')) return <div key={i} style={{ fontFamily:'var(--mono)', fontSize:10, color:'#b0b0b0', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>{line}</div>
        if (line.match(/^---+$/)) return <hr key={i} style={{ border:'none', borderTop:'1px solid var(--border)', margin:'12px 0' }} />
        if (!line.trim()) return <div key={i} style={{ height:8 }} />
        return <div key={i} style={{ color:'#c0c0c0', fontSize:12, lineHeight:1.9 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#e8e8e8">$1</strong>').replace(/`(.*?)`/g,'<code style="background:var(--bg-3);color:var(--red);padding:1px 6px;border-radius:2px;font-family:var(--mono);font-size:10px">$1</code>') }} />
      })}
    </div>
  )
}

export default function Phase5Report() {
  const { findings, hosts, sessions, setSessions } = useFenrir()
  const [sessionId, setSessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [savedReports, setSavedReports] = useState([])

  useEffect(() => {
    fetch('/api/sessions').then(r=>r.json()).then(d=>{ setSessions(d); if (d.length>0) setSessionId(d[0].id) }).catch(()=>{})
    fetch('/api/reports/list').then(r=>r.json()).then(setSavedReports).catch(()=>{})
  }, [])

  async function generate() {
    if (!sessionId) return
    setLoading(true); setError(''); setReport('')
    try {
      const res = await fetch(`/api/reports/generate/${sessionId}`, { method:'POST' })
      const data = await res.json()
      if (res.ok) {
        setReport(data.report)
        fetch('/api/reports/list').then(r=>r.json()).then(setSavedReports).catch(()=>{})
      } else setError(data.detail || 'Failed')
    } catch { setError('Backend error') }
    finally { setLoading(false) }
  }

  function download() {
    const blob = new Blob([report], { type:'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fenrir-report-${sessionId.slice(0,8)}.md`; a.click()
  }

  const counts = ['critical','high','medium','low'].reduce((acc,s) => ({ ...acc, [s]: findings.filter(f=>f.severity===s).length }), {})

  const panelStyle = {
    background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 2, padding: '16px',
  }

  return (
    <div style={{ display:'flex', gap:14, height:'100%', overflow:'hidden' }}>

      {/* Sidebar */}
      <div style={{ width:270, flexShrink:0, display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>

        <div style={panelStyle}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:6, height:6, background:'var(--red)', boxShadow:'0 0 8px var(--red)', animation:'pulse 2s infinite' }} />
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-2)', letterSpacing:'0.15em' }}>PHASE_05 // REPORT</span>
          </div>

          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text-4)', letterSpacing:'0.1em', marginBottom:5 }}>SESSION</div>
          <select value={sessionId} onChange={e=>setSessionId(e.target.value)} style={{
            width:'100%', background:'#0d0d0d', border:'1px solid rgba(229,62,62,0.35)', borderRadius:2,
            color:'#e8e8e8', padding:'8px 10px', fontFamily:'var(--mono)', fontSize:11, outline:'none', marginBottom:12,
            cursor:'pointer',
          }}>
            {sessions.length===0 && <option value="">NO SESSIONS</option>}
            {sessions.map(s=><option key={s.id} value={s.id}>{s.target} — {s.started_at?.slice(0,16).replace('T',' ')}</option>)}
          </select>

          <button onClick={generate} disabled={loading || !sessionId} style={{
            width:'100%', height:38,
            background: loading ? 'transparent' : 'rgba(229,62,62,0.08)',
            border: `1px solid ${loading ? 'var(--border)' : 'var(--red-border)'}`,
            borderRadius:2, color: loading ? 'var(--text-3)' : 'var(--red)',
            fontFamily:'var(--mono)', fontWeight:700, fontSize:11,
            letterSpacing:'0.12em',
            cursor: loading ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow: loading ? 'none' : '0 0 14px rgba(229,62,62,0.08)',
            transition:'all 0.15s',
          }}>
            {loading ? (
              <><div style={{ width:10, height:10, border:'1px solid var(--text-3)', borderTopColor:'var(--red)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>GENERATING...</>
            ) : '[ GENERATE REPORT ]'}
          </button>

          {report && (
            <button onClick={download} style={{
              width:'100%', height:34, marginTop:8,
              background:'transparent', border:'1px solid var(--border)', borderRadius:2,
              color:'var(--text-3)', fontFamily:'var(--mono)', fontWeight:700, fontSize:10, cursor:'pointer',
              letterSpacing:'0.1em',
            }}>DOWNLOAD .MD</button>
          )}
          {error && (
            <div style={{ marginTop:10, padding:'8px 10px', background:'rgba(255,32,32,0.06)', border:'1px solid rgba(255,32,32,0.25)', borderRadius:2, fontSize:10, color:'#ff2020', fontFamily:'var(--mono)' }}>
              ERR: {error}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={panelStyle}>
          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text-4)', letterSpacing:'0.15em', marginBottom:12 }}>// ENGAGEMENT SUMMARY</div>
          {[
            { label:'HOSTS DISCOVERED', val:hosts.length,      color:'var(--text-2)' },
            { label:'TOTAL FINDINGS',   val:findings.length,   color:'var(--text-2)' },
            { label:'CRITICAL',         val:counts.critical,   color:counts.critical>0?'#ff2020':'var(--text-4)' },
            { label:'HIGH',             val:counts.high,       color:counts.high>0?'#ff5500':'var(--text-4)' },
            { label:'MEDIUM',           val:counts.medium,     color:counts.medium>0?'var(--amber)':'var(--text-4)' },
            { label:'LOW',              val:counts.low,        color:counts.low>0?'#883333':'var(--text-4)' },
          ].map(({label,val,color})=>(
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-4)', letterSpacing:'0.06em' }}>{label}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, color, fontWeight:700 }}>{val}</span>
            </div>
          ))}
        </div>

        {savedReports.length > 0 && (
          <div style={{ ...panelStyle, flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text-4)', letterSpacing:'0.15em', marginBottom:10 }}>// SAVED REPORTS</div>
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
              {savedReports.map((r,i)=>(
                <a key={i} href={`/api/reports/download/${r.filename}`} style={{
                  fontFamily:'var(--mono)', fontSize:9, color:'#aaa',
                  padding:'4px 0', borderBottom:'1px solid var(--border)',
                  display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  letterSpacing:'0.04em',
                  transition:'color 0.12s',
                }}>
                  &gt; {r.filename}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report viewer */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {loading && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
            <div style={{ width:28, height:28, border:'1px solid rgba(229,62,62,0.3)', borderTopColor:'var(--red)', borderRadius:'50%', animation:'spin 1s linear infinite', boxShadow:'0 0 20px rgba(229,62,62,0.2)' }} />
            <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-2)', letterSpacing:'0.08em' }}>GENERATING PENTEST REPORT...</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-4)', letterSpacing:'0.06em' }}>AI ANALYZING FINDINGS — ~20-40s</div>
          </div>
        )}
        {!report && !loading && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:32, color:'var(--text-4)', letterSpacing:'0.08em' }}>[NO_REPORT]</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-3)', letterSpacing:'0.08em' }}>SELECT A SESSION AND GENERATE REPORT</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-4)', letterSpacing:'0.06em' }}>AI WRITES EXECUTIVE SUMMARY, TECHNICAL FINDINGS, REMEDIATION ROADMAP</div>
          </div>
        )}
        {report && (
          <div style={{
            flex:1, overflowY:'auto',
            background:'var(--bg-1)', border:'1px solid var(--border)',
            borderRadius:2, padding:'28px 32px', animation:'fadeUp 0.3s ease',
          }}>
            <Markdown text={report} />
          </div>
        )}
      </div>
    </div>
  )
}
