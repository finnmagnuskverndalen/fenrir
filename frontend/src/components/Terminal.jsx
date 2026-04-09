import { useEffect, useRef, useState } from 'react'
import { useFenrir } from '../store/fenrirStore'

const levelColor = {
  OK:    '#22c55e',
  WARN:  '#f59e0b',
  ERROR: '#ff2020',
  INFO:  'rgba(229,62,62,0.7)',
}

export default function Terminal({ height = 160 }) {
  const { terminalLines, clearTerminal } = useFenrir()
  const ref = useRef(null)
  const [filter, setFilter] = useState('ALL')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!paused && ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [terminalLines, paused])

  const FILTERS = ['ALL', 'ERROR', 'WARN', 'OK', 'INFO']
  const lines = filter === 'ALL'
    ? terminalLines
    : terminalLines.filter(l => l.text.includes(`[${filter}]`))

  return (
    <div style={{
      height,
      background: 'var(--bg-0)',
      borderTop: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      boxShadow: '0 -4px 24px rgba(229,62,62,0.04)',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 14px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg-1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 6px var(--red)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.15em' }}>CONSOLE</span>
        </div>

        <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />

        <div style={{ display: 'flex', gap: 2 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'rgba(229,62,62,0.1)' : 'transparent',
              border: `1px solid ${filter === f ? 'var(--red-border)' : 'transparent'}`,
              borderRadius: 2,
              color: filter === f ? 'var(--red)' : 'var(--text-4)',
              padding: '2px 8px',
              fontFamily: 'var(--mono)', fontSize: 9,
              cursor: 'pointer', transition: 'all 0.1s',
              letterSpacing: '0.08em',
            }}>{f}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.05em' }}>{lines.length} LINES</span>
        <button onClick={() => setPaused(p => !p)} style={{
          background: paused ? 'rgba(245,158,11,0.08)' : 'transparent',
          border: `1px solid ${paused ? 'rgba(245,158,11,0.3)' : 'transparent'}`,
          borderRadius: 2, color: paused ? 'var(--amber)' : 'var(--text-4)',
          padding: '2px 8px', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer',
          letterSpacing: '0.08em',
        }}>
          {paused ? 'RESUME' : 'PAUSE'}
        </button>
        <button onClick={clearTerminal} style={{
          background: 'transparent', border: 'none',
          color: 'var(--text-4)', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer',
          padding: '2px 8px', letterSpacing: '0.08em',
        }}>CLR</button>
      </div>

      {/* Log lines */}
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '5px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {lines.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            <span style={{ color: 'var(--red)', textShadow: '0 0 8px var(--red)' }}>fenrir</span>
            <span style={{ color: 'var(--text-4)' }}>@warroom</span>
            <span style={{ color: 'var(--text-3)' }}>:~$</span>
            <span style={{ animation: 'blink 1.2s infinite', color: 'var(--red)' }}>█</span>
          </div>
        ) : lines.map((line, i) => {
          const match = line.text.match(/^\[(\w+)\]/)
          const level = match?.[1] || 'INFO'
          const color = levelColor[level] || 'var(--text-3)'
          const rest = line.text.replace(/^\[\w+\] /, '').replace(/^\[\w+\] /, '')
          return (
            <div key={i} style={{ display: 'flex', gap: 10, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7 }}>
              <span style={{ color: 'var(--text-4)', flexShrink: 0, minWidth: 56 }}>{line.ts}</span>
              <span style={{ color, flexShrink: 0, minWidth: 40, fontWeight: 700, textShadow: `0 0 8px ${color}40` }}>{level}</span>
              <span style={{ color: 'var(--text-2)' }}>{rest}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
