import { useEffect, useRef, useState } from 'react'
import { useFenrir } from '../store/fenrirStore'

const levelColor = { OK: '#39d353', WARN: '#f59e0b', ERROR: '#e53e3e', INFO: '#3b82f6', SYS: '#666' }

export default function Terminal({ height = 165 }) {
  const { terminalLines, clearTerminal } = useFenrir()
  const ref = useRef(null)
  const [filter, setFilter] = useState('ALL')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!paused && ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [terminalLines, paused])

  const filters = ['ALL', 'ERROR', 'WARN', 'OK', 'INFO']
  const lines = filter === 'ALL' ? terminalLines : terminalLines.filter(l => l.text.includes(`[${filter}]`))

  return (
    <div style={{ height, background: '#040406', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>CONSOLE</span>
        <div style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'var(--bg4)' : 'transparent',
              border: `1px solid ${filter === f ? 'var(--border)' : 'transparent'}`,
              borderRadius: 3, color: filter === f ? 'var(--text-dim)' : 'var(--text-muted)',
              padding: '1px 6px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9,
            }}>{f}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>{lines.length} lines</span>
        <button onClick={() => setPaused(!paused)} style={{ background: 'none', border: 'none', color: paused ? 'var(--amber)' : 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer' }}>
          {paused ? 'RESUME' : 'PAUSE'}
        </button>
        <button onClick={clearTerminal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer' }}>CLR</button>
      </div>
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '5px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {lines.length === 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--red)' }}>fenrir</span>
            <span style={{ color: 'var(--text-muted)' }}>:~$</span>
            <span style={{ animation: 'blink 1s infinite' }}>_</span>
          </div>
        ) : lines.map((line, i) => {
          const match = line.text.match(/^\[(\w+)\]/)
          const level = match?.[1] || 'INFO'
          return (
            <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.5, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 10 }}>{line.ts}</span>
              <span style={{ color: levelColor[level] || 'var(--text-dim)', flexShrink: 0, fontSize: 10 }}>{match?.[0]}</span>
              <span style={{ color: 'var(--text-dim)' }}>{line.text.replace(/^\[\w+\] /, '')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
