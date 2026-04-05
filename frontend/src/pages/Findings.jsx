import { useState, useEffect } from 'react'
import { useWS } from '../components/WebSocketProvider'

const SEVERITIES = ['all','critical','high','medium','low','info']
const severityColor = { critical:'#e53e3e', high:'#dd6b20', medium:'#d69e2e', low:'#38a169', info:'#4a9eff' }
const severityOrder = { critical:0, high:1, medium:2, low:3, info:4 }

export default function Findings() {
  const { findings: wsFindings } = useWS()
  const [dbFindings, setDbFindings] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/findings')
      .then(r => r.json())
      .then(d => setDbFindings(d))
      .catch(() => {})
  }, [wsFindings.length])

  const findings = dbFindings.length > 0 ? dbFindings : wsFindings
  const sorted = [...findings].sort((a,b) => (severityOrder[a.severity]??5)-(severityOrder[b.severity]??5))
  const filtered = sorted.filter(f => {
    if (filter !== 'all' && f.severity !== filter) return false
    if (search) { const q = search.toLowerCase(); return f.title?.toLowerCase().includes(q) || f.cve_id?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q) }
    return true
  })
  const counts = SEVERITIES.reduce((acc,s) => { acc[s] = s==='all' ? findings.length : findings.filter(f=>f.severity===s).length; return acc }, {})

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="search CVE, title, description..." style={{background:'#0d0d0d',border:'1px solid #2a2a2a',borderRadius:4,color:'#e5e5e5',padding:'5px 10px',fontSize:12,outline:'none',width:220}}/>
        {SEVERITIES.map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={{background:filter===s?(severityColor[s]||'#555')+'22':'transparent',border:`1px solid ${filter===s?(severityColor[s]||'#555'):'#2a2a2a'}`,borderRadius:4,color:filter===s?(severityColor[s]||'#aaa'):'#444',padding:'4px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
            {s} ({counts[s]||0})
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? <div style={{color:'#2a2a2a',fontSize:12,marginTop:8}}>no findings match filter</div>
        : filtered.map((f,i) => {
          const isOpen = expanded===i
          const color = severityColor[f.severity]||'#555'
          return (
            <div key={i} style={{background:'#111',borderLeft:`3px solid ${color}`,border:`1px solid #1f1f1f`,borderLeft:`3px solid ${color}`,borderRadius:'0 6px 6px 0',overflow:'hidden',cursor:'pointer'}} onClick={()=>setExpanded(isOpen?null:i)}>
              <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:9,padding:'2px 7px',borderRadius:3,flexShrink:0,background:color+'22',color}}>{f.severity}</span>
                {f.cve_id && <span style={{color:'#4a9eff',fontSize:11,fontFamily:'monospace',flexShrink:0}}>{f.cve_id}</span>}
                {f.cvss_score && <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,flexShrink:0,background:'#1a1a1a',color:'#666',border:'1px solid #2a2a2a'}}>CVSS {f.cvss_score}</span>}
                <span style={{color:'#ccc',fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.title}</span>
                <span style={{color:'#2a2a2a',fontSize:10,flexShrink:0}}>{isOpen?'▲':'▼'}</span>
              </div>
              {isOpen && (
                <div style={{borderTop:'1px solid #1a1a1a',padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{display:'flex',gap:16,fontSize:11,color:'#444'}}>
                    {f.host && <span>host: <span style={{color:'#666'}}>{f.host}</span></span>}
                    <span>detected by: <span style={{color:'#666'}}>{f.detected_by||'nuclei'}</span></span>
                  </div>
                  {f.description && <div><div style={{color:'#333',fontSize:10,marginBottom:4}}>description</div><div style={{color:'#888',fontSize:12,lineHeight:1.6}}>{f.description}</div></div>}
                  {f.ai_analysis && (
                    <div style={{background:'#0d0d1a',border:'1px solid #1a1a3a',borderRadius:4,padding:'10px 12px'}}>
                      <div style={{color:'#4a9eff',fontSize:10,marginBottom:6,fontWeight:500}}>AI analysis</div>
                      <div style={{color:'#8888cc',fontSize:12,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{f.ai_analysis}</div>
                    </div>
                  )}
                  {f.cve_id && <a href={`https://nvd.nist.gov/vuln/detail/${f.cve_id}`} target="_blank" rel="noreferrer" style={{color:'#4a9eff',fontSize:11,textDecoration:'none'}} onClick={e=>e.stopPropagation()}>View on NVD →</a>}
                </div>
              )}
            </div>
          )
        })
      }
    </div>
  )
}
