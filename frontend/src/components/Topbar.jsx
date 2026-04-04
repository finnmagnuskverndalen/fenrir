import { useState } from 'react'

export default function Topbar() {
  const [target, setTarget] = useState('')
  const [dryRun, setDryRun] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startScan() {
    if (!target.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), dry_run: dryRun }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.detail || 'Scan failed')
    } catch (e) {
      setError('Could not connect to backend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: 48,
      background: '#111',
      borderBottom: '1px solid #1f1f1f',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 10,
      flexShrink: 0,
    }}>
      <input
        value={target}
        onChange={e => setTarget(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && startScan()}
        placeholder="Target (e.g. 192.168.1.0/24)"
        style={{
          background: '#0d0d0d',
          border: '1px solid #2a2a2a',
          borderRadius: 4,
          color: '#e5e5e5',
          padding: '5px 10px',
          fontSize: 12,
          width: 240,
          outline: 'none',
        }}
      />

      <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#555', fontSize: 11, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={dryRun}
          onChange={e => setDryRun(e.target.checked)}
          style={{ accentColor: '#e53e3e' }}
        />
        dry run
      </label>

      <button
        onClick={startScan}
        disabled={loading || !target.trim()}
        style={{
          background: loading ? '#2a2a2a' : '#e53e3e',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '5px 14px',
          fontSize: 12,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'scanning...' : 'scan'}
      </button>

      {error && <span style={{ color: '#e53e3e', fontSize: 11 }}>{error}</span>}
    </div>
  )
}
