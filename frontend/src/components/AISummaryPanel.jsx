import { useFenrir } from '../store/fenrirStore'

export default function AISummaryPanel({ phase }) {
  const { aiSummary } = useFenrir()
  const text = aiSummary[phase]

  if (!text) return null

  return (
    <div style={{
      background: 'rgba(59,130,246,0.04)',
      border: '1px solid rgba(59,130,246,0.15)',
      borderRadius: 8,
      padding: '12px 14px',
      animation: 'fade-in 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3b82f6', letterSpacing: 1 }}>
          AI ANALYSIS — DEEPSEEK
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--body)', fontSize: 13, color: 'rgba(59,130,246,0.8)',
        lineHeight: 1.7, whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  )
}
