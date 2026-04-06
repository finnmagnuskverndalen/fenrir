import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'

const sevColor = { critical:'#ff3b3b', high:'#f97316', medium:'#f59e0b', low:'#22c55e', info:'#3b82f6' }
const sevBg    = { critical:'rgba(255,59,59,0.1)', high:'rgba(249,115,22,0.1)', medium:'rgba(245,158,11,0.1)', low:'rgba(34,197,94,0.1)', info:'rgba(59,130,246,0.1)' }

function Markdown({ text }) {
  if (!text) return null
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('# '))   return <h1 key={i} style={{ color:'var(--text)', fontSize:18, fontWeight:700, marginTop:24, marginBottom:10, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>{line.replace(/^# /,'')}</h1>
        if (line.startsWith('## '))  return <h2 key={i} style={{ color:'var(--text-2)', fontSize:14, fontWeight:600, marginTop:18, marginBottom:6 }}>{line.replace(/^## /,'')}</h2>
        if (line.startsWith('### ')) return <h3 key={i} style={{ color:'var(--text-2)', fontSize:13, fontWeight:600, marginTop:12, marginBottom:4 }}>{line.replace(/^### /,'')}</h3>
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <div key={i} style={{ display:'flex', gap:10, paddingLeft:12, color:'var(--text-2)', fontSize:13, lineHeight:1.7 }}>
            <span style={{ color:'var(--red)', flexShrink:0 }}>›</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-*] /,'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text)">$1</strong>') }} />
          </div>
        )
        if (/^\d+\. /.test(line)) return (
          <div key={i} style={{ display:'flex', gap:10, paddingLeft:12, color:'var(--text-2)', fontSize:13, lineHeight:1.7 }}>
            <span style={{ color:'var(--text-3)', flexShrink:0 }}>{line.match(/^\d+/)[0]}.</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\. /,'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text)">$1</strong>') }} />
          </div>
        )
        if (line.startsWith('|')) return <div key={i} style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-2)', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>{line}</div>
        if (line.match(/^---+$/)) return <hr key={i} style={{ border:'none', borderTop:'1px solid var(--border)', margin:'12px 0' }} />
        if (!line.trim()) return <div key={i} style={{ height:8 }} />
        return <div key={i} style={{ color:'var(--text-2)', fontSize:13, lineHeight:1.8 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text)">$1</strong>').replace(/`(.*?)`/g,'<code style="background:var(--bg-3);color:var(--text-2);padding:1px 6px;border-radius:4px;font-family:var(--mono);font-size:11px">$1</code>') }} />
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
      const res = await fetch(`/api/reports/generate/${sessionId}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setReport(data.report)
        fetch('/api/reports/list').then(r=>r.json()).then(setSavedReports).catch(()=>{})
      } else setError(data.detail || 'Failed')
    } catch { setError('Backend error') }
    finally { setLoading(false) }
  }

  function download() {
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fenrir-report-${sessionId.slice(0,8)}.md`; a.click()
  }

  const counts = ['critical','high','medium','low'].reduce((acc,s) => ({ ...acc, [s]: findings.filter(f=>f.severity===s).length }), {})

  return (
    <div style={{ display:'flex', gap:16, height:'100%', overflow:'hidden' }}>

      {/* Sidebar */}
      <div style={{ width:280, flexShrink:0, display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}>

        <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:12, padding:'18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#8b5cf6', boxShadow:'0 0 8px #8b5cf6' }} />
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-2)', letterSpacing:'0.1em' }}>PHASE 05 — REPORT</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6 }}>Session</div>
          <select value={sessionId} onChange={e=>setSessionId(e.target.value)} style={{
            width:'100%', background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:8,
            color:'var(--text)', padding:'8px 10px', fontFamily:'var(--sans)', fontSize:12, outline:'none', marginBottom:12,
          }}>
            {sessions.length===0 && <option value="">No sessions</option>}
            {sessions.map(s=><option key={s.id} value={s.id}>{s.target} — {s.started_at?.slice(0,16).replace('T',' ')}</option>)}
          </select>
          <button onClick={generate} disabled={loading || !sessionId} style={{
            width:'100%', height:40,
            background: loading ? 'var(--bg-3)' : 'rgba(139,92,246,0.2)',
            border: `1px solid ${loading ? 'var(--border)' : 'rgba(139,92,246,0.4)'}`,
            borderRadius:8, color: loading ? 'var(--text-3)' : '#c4b5fd',
            fontFamily:'var(--sans)', fontWeight:600, fontSize:13,
            cursor: loading ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            {loading ? (
              <><div style={{ width:12, height:12, border:'2px solid #c4b5fd', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>Generating...</>
            ) : 'Generate Report'}
          </button>
          {report && (
            <button onClick={download} style={{ width:'100%', height:36, marginTop:8, background:'transparent', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-2)', fontFamily:'var(--sans)', fontWeight:500, fontSize:12, cursor:'pointer' }}>
              Download .md
            </button>
          )}
          {error && <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(255,59,59,0.08)', border:'1px solid rgba(255,59,59,0.2)', borderRadius:6, fontSize:12, color:'var(--red)' }}>{error}</div>}
        </div>

        {/* Stats */}
        <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:12, padding:'16px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)', letterSpacing:'0.08em', marginBottom:12 }}>ENGAGEMENT SUMMARY</div>
          {[
            { label:'Hosts discovered', val:hosts.length, color:'var(--text-2)' },
            { label:'Total findings', val:findings.length, color:'var(--text-2)' },
            { label:'Critical', val:counts.critical, color:counts.critical>0?'var(--red)':'var(--text-3)' },
            { label:'High', val:counts.high, color:counts.high>0?'#f97316':'var(--text-3)' },
            { label:'Medium', val:counts.medium, color:counts.medium>0?'var(--amber)':'var(--text-3)' },
            { label:'Low', val:counts.low, color:counts.low>0?'var(--green)':'var(--text-3)' },
          ].map(({label,val,color})=>(
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:12, color:'var(--text-3)' }}>{label}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:13, color, fontWeight:600 }}>{val}</span>
            </div>
          ))}
        </div>

        {savedReports.length > 0 && (
          <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:12, padding:'16px', flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)', letterSpacing:'0.08em', marginBottom:10 }}>SAVED REPORTS</div>
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
              {savedReports.map((r,i)=>(
                <a key={i} href={`/api/reports/download/${r.filename}`} style={{ fontSize:11, color:'var(--blue)', padding:'4px 0', borderBottom:'1px solid var(--border)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {r.filename}
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
            <div style={{ width:32, height:32, border:'3px solid rgba(139,92,246,0.3)', borderTopColor:'#8b5cf6', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            <div style={{ fontSize:14, color:'var(--text-2)', fontWeight:500 }}>Generating pentest report...</div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>DeepSeek is analyzing your findings — usually 20–40 seconds</div>
          </div>
        )}
        {!report && !loading && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
            <div style={{ fontSize:40, opacity:0.06 }}>📋</div>
            <div style={{ fontSize:14, color:'var(--text-3)', fontWeight:500 }}>Select a session and generate a report</div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>AI writes an executive summary, technical findings, and remediation roadmap</div>
          </div>
        )}
        {report && (
          <div style={{ flex:1, overflowY:'auto', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:12, padding:'28px 32px', animation:'fadeUp 0.3s ease' }}>
            <Markdown text={report} />
          </div>
        )}
      </div>
    </div>
  )
}
