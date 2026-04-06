import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'
import HostCard from '../components/HostCard'

const sevColor = { critical:'#ff3b3b', high:'#f97316', medium:'#f59e0b', low:'#22c55e', info:'#3b82f6' }
const sevBg    = { critical:'rgba(255,59,59,0.1)', high:'rgba(249,115,22,0.1)', medium:'rgba(245,158,11,0.1)', low:'rgba(34,197,94,0.1)', info:'rgba(59,130,246,0.1)' }
const sevOrder = { critical:0, high:1, medium:2, low:3, info:4 }

export default function Phase3VulnScan() {
  const { hosts, selectedHosts, selectAllHosts, clearHostSelect, scanning, setScanning, setPhaseStatus, addTerminalLine, setPhase } = useFenrir()
  const [findings, setFindings] = useState([])
  const [dryRun, setDryRun] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [sevFilter, setSevFilter] = useState('all')
  const [aiSummary, setAiSummary] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const loadFindings = () =>
    fetch('/api/findings').then(r => r.json()).then(d => {
      const seen = new Set()
      setFindings(d.filter(f => {
        const k = `${f.title}|${f.host_id}`
        if (seen.has(k)) return false
        seen.add(k); return true
      }))
    }).catch(() => {})

  useEffect(() => { loadFindings() }, [])

  const canRun = selectedHosts.size > 0 && !scanning

  async function run() {
    if (!canRun) return
    setScanning(true); setPhaseStatus(3, 'running'); setAiSummary('')
    const targets = [...selectedHosts]
    setProgress({ current: 0, total: targets.length })
    addTerminalLine(`[INFO] [phase3] Vuln scanning ${targets.length} host(s)`)

    for (let i = 0; i < targets.length; i++) {
      const ip = targets[i]
      setProgress({ current: i + 1, total: targets.length })
      addTerminalLine(`[INFO] [phase3] nuclei → ${ip} (${i+1}/${targets.length})`)
      const res = await fetch('/api/scan/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: ip, phases: ['vulns', 'ai'], dry_run: dryRun }),
      })
      if (!res.ok) { const d = await res.json(); addTerminalLine(`[WARN] [phase3] ${ip}: ${d.detail}`) }

      for (let w = 0; w < 90; w++) {
        await new Promise(r => setTimeout(r, 2000))
        const h = await fetch('/api/health').then(r => r.json()).catch(() => ({}))
        if (!h.active_scans?.includes(ip)) break
      }
      await loadFindings()
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 800))
    }

    setPhaseStatus(3, 'complete'); setScanning(false); setProgress({ current: 0, total: 0 })
    addTerminalLine(`[OK] [phase3] Scan complete`)

    const fresh = await fetch('/api/findings').then(r => r.json()).catch(() => [])
    if (fresh.length > 0) {
      try {
        const aiRes = await fetch('/api/ai/summarize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'vulnscan', data: fresh.slice(0, 20) }),
        })
        if (aiRes.ok) { const d = await aiRes.json(); setAiSummary(d.summary || '') }
      } catch {}
    }
  }

  const sorted = [...findings].sort((a, b) => (sevOrder[a.severity]??5) - (sevOrder[b.severity]??5))
  const filtered = sevFilter === 'all' ? sorted : sorted.filter(f => f.severity === sevFilter)
  const counts = ['critical','high','medium','low','info'].reduce((acc, s) => ({ ...acc, [s]: findings.filter(f=>f.severity===s).length }), {})
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div style={{ display:'flex', gap:16, height:'100%', overflow:'hidden' }}>

      {/* ── Left panel ── */}
      <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>

        {/* Control card */}
        <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:12, padding:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#8b5cf6', boxShadow:'0 0 6px #8b5cf6' }} />
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-2)', letterSpacing:'0.1em' }}>PHASE 03</span>
            <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:4 }}>Vuln Scan</span>
          </div>

          {/* Host selection */}
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            <button onClick={selectAllHosts} style={{ flex:1, background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-2)', padding:'6px', fontSize:11, fontWeight:500 }}>
              All ({hosts.length})
            </button>
            <button onClick={clearHostSelect} style={{ flex:1, background:'transparent', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-3)', padding:'6px', fontSize:11 }}>
              None
            </button>
          </div>

          {selectedHosts.size > 0 && (
            <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:10 }}>
              {selectedHosts.size} host{selectedHosts.size !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Dry run toggle */}
          <div onClick={() => setDryRun(!dryRun)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:12 }}>
            <div style={{ width:32, height:18, borderRadius:9, position:'relative', background:dryRun?'var(--amber)':'var(--bg-4)', border:'1px solid var(--border)', transition:'background 0.2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:2, left:dryRun?15:2, width:12, height:12, borderRadius:'50%', background:dryRun?'#000':'var(--text-3)', transition:'left 0.2s' }} />
            </div>
            <span style={{ fontSize:11, color:dryRun?'var(--amber)':'var(--text-3)' }}>Dry run</span>
          </div>

          {/* Scan button */}
          <button onClick={run} disabled={!canRun} style={{
            width:'100%', height:38,
            background: canRun ? 'rgba(139,92,246,0.2)' : 'var(--bg-3)',
            border: `1px solid ${canRun ? 'rgba(139,92,246,0.4)' : 'var(--border)'}`,
            borderRadius:8, color: canRun ? '#c4b5fd' : 'var(--text-3)',
            fontFamily:'var(--sans)', fontWeight:600, fontSize:13,
            cursor: canRun ? 'pointer' : 'not-allowed',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            {scanning ? (
              <><div style={{ width:12, height:12, border:'2px solid #c4b5fd', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Scanning...</>
            ) : `Scan ${selectedHosts.size || 0} hosts`}
          </button>

          {/* Progress bar */}
          {scanning && progress.total > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-3)' }}>{progress.current}/{progress.total}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'#8b5cf6' }}>{pct}%</span>
              </div>
              <div style={{ background:'var(--bg-3)', borderRadius:4, height:3, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'#8b5cf6', width:`${pct}%`, borderRadius:4, transition:'width 0.5s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* Host list — scrollable */}
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
          {hosts.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--text-3)', padding:'4px 0' }}>Run phases 1 & 2 first.</div>
          ) : hosts.map(h => <HostCard key={h.ip} host={h} compact />)}
        </div>
      </div>

      {/* ── Right panel — findings ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}>

        {/* AI summary */}
        {aiSummary && (
          <div style={{ background:'var(--blue-soft)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:10, padding:'14px 16px', flexShrink:0, animation:'fadeUp 0.3s ease' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--blue)', letterSpacing:'0.1em', marginBottom:6 }}>AI ANALYSIS</div>
            <div style={{ fontSize:12, color:'rgba(147,197,253,0.9)', lineHeight:1.7 }}>{aiSummary}</div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, color:'var(--text-2)', fontWeight:500 }}>
            {findings.length} finding{findings.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display:'flex', gap:3, flex:1, flexWrap:'wrap' }}>
            {['all','critical','high','medium','low','info'].map(s => (
              <button key={s} onClick={() => setSevFilter(s)} style={{
                background: sevFilter===s ? (sevBg[s]||'var(--bg-3)') : 'transparent',
                border: `1px solid ${sevFilter===s ? (sevColor[s]+'44'||'var(--border)') : 'transparent'}`,
                borderRadius:6, padding:'4px 10px', fontSize:11,
                fontWeight: sevFilter===s ? 600 : 400,
                color: sevFilter===s ? (sevColor[s]||'var(--text-2)') : 'var(--text-3)',
                cursor:'pointer',
              }}>
                {s==='all' ? `All (${findings.length})` : `${s.charAt(0).toUpperCase()+s.slice(1)} (${counts[s]||0})`}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={loadFindings} style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-2)', padding:'5px 12px', fontSize:11, fontWeight:500 }}>Refresh</button>
            <button onClick={() => setPhase(4)} style={{ background:'transparent', border:'1px solid var(--red-border)', borderRadius:8, color:'var(--red)', padding:'5px 14px', fontFamily:'var(--sans)', fontWeight:600, fontSize:12, cursor:'pointer' }}>
              Exploitation →
            </button>
          </div>
        </div>

        {/* Findings list */}
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
          {filtered.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:10 }}>
              <div style={{ fontSize:32, opacity:0.07 }}>🔍</div>
              <div style={{ fontSize:13, color:'var(--text-3)', fontWeight:500 }}>
                {findings.length === 0 ? 'Select hosts and run vuln scan' : 'No findings match this filter'}
              </div>
              {findings.length === 0 && (
                <div style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', maxWidth:300, lineHeight:1.6 }}>
                  Nuclei will scan HTTP services discovered in Phase 2. Make sure you ran the port scan first.
                </div>
              )}
            </div>
          ) : filtered.map((f, i) => {
            const color = sevColor[f.severity] || 'var(--text-3)'
            const bg = sevBg[f.severity] || 'var(--bg-2)'
            const isOpen = expanded === i
            return (
              <div key={i} onClick={() => setExpanded(isOpen ? null : i)} style={{
                background:'var(--bg-2)', borderLeft:`3px solid ${color}`,
                border:'1px solid var(--border)', borderLeft:`3px solid ${color}`,
                borderRadius:'0 10px 10px 0', overflow:'hidden', cursor:'pointer',
                transition:'border-color 0.15s',
              }}>
                <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:9, padding:'2px 8px', borderRadius:4, background:bg, color, fontWeight:700, letterSpacing:'0.05em', flexShrink:0 }}>
                    {f.severity?.toUpperCase()}
                  </span>
                  {f.cve_id && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--blue)', flexShrink:0 }}>{f.cve_id}</span>}
                  {f.cvss_score && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)', flexShrink:0 }}>CVSS {f.cvss_score}</span>}
                  <span style={{ fontSize:12, color:'var(--text)', fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.title}</span>
                  <span style={{ color:'var(--text-3)', fontSize:11, flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop:'1px solid var(--border)', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                    {f.description && <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>{f.description}</div>}
                    {f.ai_analysis && (
                      <div style={{ background:'var(--blue-soft)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, padding:'10px 12px' }}>
                        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--blue)', letterSpacing:'0.08em', marginBottom:6 }}>AI ANALYSIS</div>
                        <div style={{ fontSize:12, color:'rgba(147,197,253,0.9)', lineHeight:1.7 }}>
                          {f.ai_analysis.replace(/#{1,3} /g,'').replace(/\*\*/g,'')}
                        </div>
                      </div>
                    )}
                    {f.cve_id && (
                      <a href={`https://nvd.nist.gov/vuln/detail/${f.cve_id}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:11, color:'var(--blue)' }}>
                        View on NVD →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
