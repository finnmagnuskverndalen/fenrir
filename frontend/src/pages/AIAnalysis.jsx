import { useWS } from '../components/WebSocketProvider'

export default function AIAnalysis() {
  const { findings } = useWS()
  const analyzed = findings.filter(f => f.ai_analysis)

  return (
    <div>
      <div style={{ color: '#444', fontSize: 10, marginBottom: 14 }}>
        {analyzed.length} finding{analyzed.length !== 1 ? 's' : ''} analyzed by AI
      </div>

      {analyzed.length === 0 ? (
        <div style={{ color: '#333', fontSize: 12 }}>
          no AI analysis yet — run a scan with AI phase enabled
        </div>
      ) : (
        analyzed.map((f, i) => (
          <div key={i} style={{
            background: '#111', border: '1px solid #1f1f1f', borderRadius: 6,
            padding: '14px 16px', marginBottom: 12,
          }}>
            <div style={{ color: '#e5e5e5', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{f.title}</div>
            {f.cve_id && <div style={{ color: '#4a9eff', fontSize: 11, marginBottom: 10 }}>{f.cve_id}</div>}
            <div style={{ color: '#888', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {f.ai_analysis}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
