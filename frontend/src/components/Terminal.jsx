import { useEffect, useRef, useState } from 'react'
import { useFenrir } from '../store/fenrirStore'

const levelColor = {
  OK:    '#22c55e',
  WARN:  '#f59e0b',
  ERROR: '#ff3b3b',
  INFO:  '#3b82f6',
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
      height, background: 'var(--bg-1)',
      borderTop: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}>CONSOLE</span>
        </div>

        <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'var(--bg-3)' : 'transparent',
              border: `1px solid ${filter === f ? 'var(--border)' : 'transparent'}`,
              borderRadius: 4, color: filter === f ? 'var(--text-2)' : 'var(--text-3)',
              padding: '2px 8px', fontFamily: 'var(--mono)', fontSize: 9,
              cursor: 'pointer', transition: 'all 0.1s',
            }}>{f}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)' }}>{lines.length} lines</span>
        <button onClick={() => setPaused(p => !p)} style={{
          background: paused ? 'var(--amber-soft)' : 'transparent',
          border: `1px solid ${paused ? 'rgba(245,158,11,0.3)' : 'transparent'}`,
          borderRadius: 4, color: paused ? 'var(--amber)' : 'var(--text-3)',
          padding: '2px 8px', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer',
        }}>
          {paused ? 'RESUME' : 'PAUSE'}
        </button>
        <button onClick={clearTerminal} style={{
          background: 'transparent', border: 'none',
          color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer',
          padding: '2px 8px',
        }}>CLEAR</button>
      </div>

      {/* Log lines */}
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {lines.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>
            <span style={{ color: 'var(--red)' }}>fenrir</span>
            <span>:~$</span>
            <span style={{ animation: 'blink 1.2s infinite' }}>_</span>
          </div>
        ) : lines.map((line, i) => {
          const match = line.text.match(/^\[(\w+)\]/)
          const level = match?.[1] || 'INFO'
          const color = levelColor[level] || 'var(--text-3)'
          const rest = line.text.replace(/^\[\w+\] /, '').replace(/^\[\w+\] /, '')
          return (
            <div key={i} style={{ display: 'flex', gap: 12, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-3)', flexShrink: 0, minWidth: 56 }}>{line.ts}</span>
              <span style={{ color, flexShrink: 0, minWidth: 40, fontWeight: 700 }}>{level}</span>
              <span style={{ color: 'var(--text-2)' }}>{rest}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
