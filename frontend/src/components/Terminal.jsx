import { useEffect, useRef } from 'react'
import { useFenrir } from '../store/fenrirStore'

const levelColor = { OK: '#39d353', WARN: '#f59e0b', ERROR: '#e53e3e', INFO: '#3b82f6' }

export default function Terminal({ height = 160 }) {
  const { terminalLines, clearTerminal } = useFenrir()
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [terminalLines])

  return (
    <div style={{
      height,
      background: '#050507',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>
            FENRIR CONSOLE — {terminalLines.length} lines
          </span>
        </div>
        <button onClick={clearTerminal} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
        }}>CLEAR</button>
      </div>
      <div ref={ref} style={{
        flex: 1, overflowY: 'auto', padding: '6px 12px',
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {terminalLines.length === 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--red)' }}>fenrir@console</span>
            <span style={{ color: 'var(--text-muted)' }}>:~$ </span>
            <span style={{ animation: 'blink 1s infinite' }}>_</span>
          </div>
        ) : terminalLines.map((line, i) => {
          const match = line.text.match(/^\[(\w+)\]/)
          const level = match?.[1] || 'INFO'
          const color = levelColor[level] || 'var(--text-dim)'
          return (
            <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.5, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{line.ts?.slice(11, 19)}</span>
              <span style={{ color, flexShrink: 0 }}>{match?.[0] || ''}</span>
              <span style={{ color: 'var(--text-dim)' }}>{line.text.replace(/^\[\w+\] /, '')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
