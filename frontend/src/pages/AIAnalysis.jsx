import { useEffect, useState } from 'react'

const severityColor = { critical:'#e53e3e', high:'#dd6b20', medium:'#d69e2e', low:'#38a169', info:'#4a9eff' }
const severityOrder = { critical:0, high:1, medium:2, low:3, info:4 }

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <div key={i} style={{color:'#ccc',fontSize:13,fontWeight:500,marginTop:14,marginBottom:4}}>{line.replace('## ','')}</div>
    if (line.startsWith('# '))  return <div key={i} style={{color:'#e5e5e5',fontSize:14,fontWeight:500,marginTop:16,marginBottom:6}}>{line.replace('# ','')}</div>
    if (line.startsWith('- ') || line.startsWith('* ')) return (
      <div key={i} style={{color:'#888',fontSize:12,lineHeight:1.7,paddingLeft:12,display:'flex',gap:6}}>
        <span style={{color:'#e53e3e',flexShrink:0}}>›</span><span>{line.replace(/^[-*] /,'')}</span>
      </div>
    )
    if (line.trim()==='') return <div key={i} style={{height:6}}/>
    return <div key={i} style={{color:'#777',fontSize:12,lineHeight:1.7}}>{line}</div>
  })
}

export default function AIAnalysis() {
  const [findings, setFindings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/findings')
      .then(r => r.json())
      .then(d => {
        const analyzed = d.filter(f => f.ai_analysis)
        const sorted = analyzed.sort((a,b) => (severityOrder[a.severity]??5)-(severityOrder[b.severity]??5))
        setFindings(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const critAndHigh = findings.filter(f => ['critical','high'].includes(f.severity))

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:'#0d0d1a',border:'1px solid #1a1a3a',borderRadius:6,padding:'12px 16px',display:'flex',gap:24,alignItems:'center'}}>
        <div><div style={{color:'#4a9eff',fontSize:10,marginBottom:2}}>model</div><div style={{color:'#8888cc',fontSize:12}}>deepseek/deepseek-chat</div></div>
        <div><div style={{color:'#4a9eff',fontSize:10,marginBottom:2}}>findings analyzed</div><div style={{color:'#8888cc',fontSize:12}}>{findings.length}</div></div>
        <div><div style={{color:'#4a9eff',fontSize:10,marginBottom:2}}>critical + high</div><div style={{color:critAndHigh.length>0?'#e53e3e':'#8888cc',fontSize:12,fontWeight:500}}>{critAndHigh.length}</div></div>
        <button onClick={() => { setLoading(true); fetch('/api/findings').then(r=>r.json()).then(d=>{setFindings(d.filter(f=>f.ai_analysis).sort((a,b)=>(severityOrder[a.severity]??5)-(severityOrder[b.severity]??5)));setLoading(false)}) }} style={{marginLeft:'auto',background:'transparent',color:'#444',border:'1px solid #2a2a2a',borderRadius:4,padding:'4px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>refresh</button>
      </div>

      {loading && <div style={{color:'#333',fontSize:12}}>loading...</div>}
      {!loading && findings.length === 0 && <div style={{color:'#2a2a2a',fontSize:12}}>no AI analysis yet — run a scan with the AI phase enabled</div>}

      {findings.map((f, i) => {
        const color = severityColor[f.severity] || '#555'
        return (
          <div key={i} style={{background:'#111',borderLeft:`3px solid ${color}`,border:`1px solid #1f1f1f`,borderLeft:`3px solid ${color}`,borderRadius:'0 6px 6px 0',padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <span style={{fontSize:9,padding:'2px 7px',borderRadius:3,background:color+'22',color}}>{f.severity}</span>
              {f.cve_id && <span style={{color:'#4a9eff',fontSize:11,fontFamily:'monospace'}}>{f.cve_id}</span>}
              {f.cvss_score && <span style={{color:'#444',fontSize:10}}>CVSS {f.cvss_score}</span>}
              <span style={{color:'#ccc',fontSize:13,fontWeight:500}}>{f.title}</span>
            </div>
            <div style={{background:'#0a0a14',border:'1px solid #151528',borderRadius:4,padding:'12px 14px'}}>
              <div style={{color:'#4a9eff',fontSize:10,marginBottom:8}}>analysis</div>
              {renderMarkdown(f.ai_analysis)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
