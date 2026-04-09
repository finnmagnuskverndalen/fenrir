import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'

const sevColor = {
  critical: '#ff2020',
  high:     '#ff5500',
  medium:   '#f59e0b',
  low:      '#883333',
  info:     'rgba(229,62,62,0.5)',
}
const sevBg = {
  critical: 'rgba(255,32,32,0.1)',
  high:     'rgba(255,85,0,0.1)',
  medium:   'rgba(245,158,11,0.1)',
  low:      'rgba(136,51,51,0.1)',
  info:     'rgba(229,62,62,0.06)',
}
const sevOrder = { critical:0, high:1, medium:2, low:3, info:4 }

export default function Phase3VulnScan() {
  const { hosts, selectedHosts, toggleHostSelect, selectAllHosts, clearHostSelect, scanning, setScanning, setPhaseStatus, addTerminalLine, setPhase } = useFenrir()
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
      addTerminalLine(`[INFO] [phase3] nuclei -> ${ip} (${i+1}/${targets.length})`)
      const res = await fetch('/api/scan/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: ip, phases: ['vulns', 'ai'], dry_run: dryRun }),
      })
      if (!res.ok) { const d = await res.json(); addTerminalLine(`[WARN] [phase3] ${ip}: ${d.detail}`) }

      for (let w = 0; w < 150; w++) {
        await new Promise(r => setTimeout(r, 3000))
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

  const sorted   = [...findings].sort((a, b) => (sevOrder[a.severity]??5) - (sevOrder[b.severity]??5))
  const filtered = sevFilter === 'all' ? sorted : sorted.filter(f => f.severity === sevFilter)
  const counts   = ['critical','high','medium','low','info'].reduce((acc, s) => ({ ...acc, [s]: findings.filter(f=>f.severity===s).length }), {})
  const pct      = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div style={{ display:'flex', gap:14, height:'100%', overflow:'hidden' }}>

      {/* Left panel */}
      <div style={{ width:230, flexShrink:0, display:'flex', flexDirection:'column', gap:8, overflow:'hidden' }}>

        <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:2, padding:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:6, height:6, background:'var(--red)', boxShadow:'0 0 8px var(--red)', animation:'pulse 2s infinite' }} />
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-2)', letterSpacing:'0.15em' }}>PHASE_03 // VULN SCAN</span>
          </div>

          <div style={{ display:'flex', gap:5, marginBottom:10 }}>
            <button onClick={selectAllHosts} style={{
              flex:1, background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:2,
              color:'var(--text-2)', padding:'5px', fontSize:9, fontWeight:700,
              fontFamily:'var(--mono)', letterSpacing:'0.08em', cursor:'pointer',
            }}>ALL ({hosts.length})</button>
            <button onClick={clearHostSelect} style={{
              flex:1, background:'transparent', border:'1px solid var(--border)', borderRadius:2,
              color:'var(--text-3)', padding:'5px', fontSize:9,
              fontFamily:'var(--mono)', letterSpacing:'0.08em', cursor:'pointer',
            }}>NONE</button>
          </div>

          {selectedHosts.size > 0 && (
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-3)', marginBottom:10, letterSpacing:'0.06em' }}>
              {selectedHosts.size} HOST{selectedHosts.size !== 1 ? 'S' : ''} SELECTED
            </div>
          )}

          <div onClick={() => setDryRun(!dryRun)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:12 }}>
            <div style={{
              width:32, height:18, borderRadius:9, position:'relative',
              background:dryRun?'rgba(245,158,11,0.3)':'var(--bg-4)',
              border:`1px solid ${dryRun?'rgba(245,158,11,0.4)':'var(--border)'}`,
              transition:'all 0.2s', flexShrink:0,
            }}>
              <div style={{ position:'absolute', top:2, left:dryRun?15:2, width:12, height:12, borderRadius:'50%', background:dryRun?'var(--amber)':'var(--text-4)', transition:'left 0.2s' }} />
            </div>
            <span style={{ fontSize:9, color:dryRun?'var(--amber)':'var(--text-3)', letterSpacing:'0.06em' }}>DRY_RUN</span>
          </div>

          <button onClick={run} disabled={!canRun} style={{
            width:'100%', height:36,
            background: canRun ? 'rgba(229,62,62,0.08)' : 'transparent',
            border: `1px solid ${canRun ? 'var(--red-border)' : 'var(--border)'}`,
            borderRadius:2, color: canRun ? 'var(--red)' : 'var(--text-4)',
            fontFamily:'var(--mono)', fontWeight:700, fontSize:10,
            cursor: canRun ? 'pointer' : 'not-allowed',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            letterSpacing:'0.1em',
            boxShadow: canRun ? '0 0 14px rgba(229,62,62,0.08)' : 'none',
          }}>
            {scanning ? (
              <><div style={{ width:10, height:10, border:'1px solid var(--text-3)', borderTopColor:'var(--red)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />SCANNING...</>
            ) : `[ SCAN ${selectedHosts.size || 0} HOSTS ]`}
          </button>

          {scanning && progress.total > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text-4)', letterSpacing:'0.1em' }}>{progress.current}/{progress.total}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--red)', letterSpacing:'0.1em' }}>{pct}%</span>
              </div>
              <div style={{ background:'var(--bg-3)', borderRadius:1, height:2, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'var(--red)', width:`${pct}%`, borderRadius:1, transition:'width 0.5s ease', boxShadow:'0 0 6px var(--red)' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:2, padding:'12px', flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text-3)', letterSpacing:'0.15em', marginBottom:8 }}>
            // HOSTS ({hosts.length})
          </div>
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
            {hosts.length === 0 ? (
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-4)', letterSpacing:'0.06em' }}>&gt; RUN PHASES 1 &amp; 2 FIRST</div>
            ) : hosts.map(h => {
              const selected = selectedHosts.has(h.ip)
              return (
                <div key={h.ip} onClick={() => toggleHostSelect(h.ip)} style={{
                  padding:'6px 8px', borderRadius:2, cursor:'pointer',
                  background: selected ? 'rgba(229,62,62,0.07)' : 'transparent',
                  border: `1px solid ${selected ? 'var(--red-border)' : 'transparent'}`,
                  display:'flex', alignItems:'center', gap:8,
                  transition:'all 0.12s',
                }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background: h.compromised ? '#ff2020' : selected ? 'var(--red)' : '#c8c8c8', flexShrink:0 }} />
                  <span style={{ fontFamily:'var(--mono)', fontSize:10, color: h.compromised ? '#ff2020' : 'var(--text)', flex:1 }}>{h.ip}</span>
                  {h.ports?.length > 0 && <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text-4)' }}>{h.ports.length}p</span>}
                  {h.compromised && <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'#ff2020', letterSpacing:'0.08em' }}>PWNED</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>

        {aiSummary && (
          <div style={{
            background:'rgba(229,62,62,0.04)', border:'1px solid var(--border)',
            borderLeft:'2px solid var(--red)',
            borderRadius:2, padding:'12px 14px', flexShrink:0, animation:'fadeUp 0.3s ease',
          }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text-3)', letterSpacing:'0.15em', marginBottom:6 }}>// AI ANALYSIS</div>
            <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.8 }}>{aiSummary}</div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-2)', letterSpacing:'0.05em' }}>
            {findings.length} FINDING{findings.length !== 1 ? 'S' : ''}
          </span>
          <div style={{ display:'flex', gap:2, flex:1, flexWrap:'wrap' }}>
            {['all','critical','high','medium','low','info'].map(s => {
              const active = sevFilter === s
              const c = sevColor[s] || 'var(--text-3)'
              return (
                <button key={s} onClick={() => setSevFilter(s)} style={{
                  background: active ? (sevBg[s] || 'rgba(229,62,62,0.08)') : 'transparent',
                  border: `1px solid ${active ? (c + '44') : 'transparent'}`,
                  borderRadius:2, padding:'3px 9px', fontSize:9,
                  fontWeight: active ? 700 : 400,
                  color: active ? (c || 'var(--text-2)') : 'var(--text-4)',
                  cursor:'pointer', fontFamily:'var(--mono)', letterSpacing:'0.08em',
                }}>
                  {s === 'all' ? `ALL (${findings.length})` : `${s.toUpperCase()} (${counts[s]||0})`}
                </button>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <button onClick={loadFindings} style={{
              background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:2,
              color:'var(--text-3)', padding:'4px 10px', fontSize:9, fontWeight:700,
              fontFamily:'var(--mono)', letterSpacing:'0.08em', cursor:'pointer',
            }}>REFRESH</button>
            <button onClick={() => setPhase(4)} style={{
              background:'transparent', border:'1px solid var(--red-border)', borderRadius:2,
              color:'var(--red)', padding:'4px 12px', fontFamily:'var(--mono)', fontWeight:700, fontSize:9, cursor:'pointer',
              letterSpacing:'0.1em',
            }}>EXPLOIT &gt;&gt;</button>
          </div>
        </div>

        {/* Findings list */}
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
          {filtered.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:12 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:28, color:'var(--text-4)', letterSpacing:'0.08em' }}>[NO_FINDINGS]</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-3)', letterSpacing:'0.08em' }}>
                {findings.length === 0 ? 'SELECT HOSTS AND RUN VULN SCAN' : 'NO FINDINGS MATCH FILTER'}
              </div>
              {findings.length === 0 && (
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-4)', textAlign:'center', maxWidth:320, lineHeight:1.8, letterSpacing:'0.04em' }}>
                  nuclei scans HTTP services from phase 2 // run port scan first
                </div>
              )}
            </div>
          ) : filtered.map((f, i) => {
            const color = sevColor[f.severity] || 'var(--text-3)'
            const bg    = sevBg[f.severity]   || 'var(--bg-2)'
            const isOpen = expanded === i
            return (
              <div key={i} onClick={() => setExpanded(isOpen ? null : i)} style={{
                background:'var(--bg-1)',
                border:`1px solid var(--border)`,
                borderLeft:`2px solid ${color}`,
                borderRadius:'0 2px 2px 0', overflow:'hidden', cursor:'pointer',
                transition:'border-color 0.15s',
                boxShadow: isOpen ? `0 0 16px rgba(229,62,62,0.04)` : 'none',
              }}>
                <div style={{ padding:'9px 12px', display:'flex', alignItems:'center', gap:9 }}>
                  <span style={{ fontSize:8, padding:'2px 7px', borderRadius:2, background:bg, color, fontWeight:700, letterSpacing:'0.1em', flexShrink:0 }}>
                    {f.severity?.toUpperCase()}
                  </span>
                  {f.cve_id && <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-2)', flexShrink:0 }}>{f.cve_id}</span>}
                  {f.cvss_score && <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-4)', flexShrink:0 }}>CVSS:{f.cvss_score}</span>}
                  <span style={{ fontSize:11, color:'var(--text)', fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.title}</span>
                  <span style={{ color:'var(--text-4)', fontSize:9, flexShrink:0, letterSpacing:'0.05em' }}>{isOpen ? '[--]' : '[++]'}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop:'1px solid var(--border)', padding:'10px 12px', display:'flex', flexDirection:'column', gap:10 }}>
                    {f.description && (
                      <div style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.8 }}>{f.description}</div>
                    )}
                    {f.ai_analysis && (
                      <div style={{
                        background:'rgba(229,62,62,0.04)', border:'1px solid var(--border)',
                        borderLeft:'2px solid var(--red)',
                        borderRadius:'0 2px 2px 0', padding:'10px 12px',
                      }}>
                        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text-3)', letterSpacing:'0.15em', marginBottom:6 }}>// AI_ANALYSIS</div>
                        <div style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.8 }}>
                          {f.ai_analysis.replace(/#{1,3} /g,'').replace(/\*\*/g,'')}
                        </div>
                      </div>
                    )}
                    {f.cve_id && (
                      <a href={`https://nvd.nist.gov/vuln/detail/${f.cve_id}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:10, color:'var(--red)', letterSpacing:'0.05em' }}>
                        VIEW ON NVD --&gt;
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
