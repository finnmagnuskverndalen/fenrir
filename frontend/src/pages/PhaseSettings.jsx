import { useState, useEffect } from 'react'
import { useFenrir } from '../store/fenrirStore'

const PANEL = { width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }
const LABEL = { fontSize: 9, color: '#c8c8c8', letterSpacing: '0.1em', marginBottom: 6, display: 'block', fontWeight: 700 }
const INPUT = {
  width: '100%', boxSizing: 'border-box',
  background: '#0d0d0d', border: '1px solid rgba(229,62,62,0.35)', borderRadius: 2,
  color: '#e8e8e8', fontFamily: 'var(--mono)', fontSize: 12, padding: '8px 10px',
  outline: 'none',
}
const HINT = { fontSize: 10, color: 'rgba(200,200,200,0.45)', marginTop: 5, lineHeight: 1.6 }
const SECTION = { marginBottom: 22 }

export default function PhaseSettings() {
  const { settings, setSettings } = useFenrir()
  const [local, setLocal]         = useState({ ...settings })
  const [saved, setSaved]         = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting]     = useState(false)
  const [ollamaModels, setOllamaModels] = useState([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [modelError, setModelError] = useState('')

  useEffect(() => { setLocal({ ...settings }) }, [settings])

  const isDirty = JSON.stringify(local) !== JSON.stringify(settings)

  function patch(key, val) {
    setLocal(s => ({ ...s, [key]: val }))
    setSaved(false)
    setTestResult(null)
  }

  async function save() {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      })
      const data = await res.json()
      if (data.ok) {
        // Re-fetch to get masked key
        const r2 = await fetch('/api/settings')
        const fresh = await r2.json()
        setSettings(fresh)
        setLocal(fresh)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `Save failed: ${e.message}` })
    }
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      // Save first so test uses current settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      })
      const res = await fetch('/api/ai/test', { method: 'POST' })
      const data = await res.json()
      setTestResult(data.status === 'ok'
        ? { ok: true,  msg: `OK — ${data.result}` }
        : { ok: false, msg: data.error || 'Connection failed' })
    } catch (e) {
      setTestResult({ ok: false, msg: e.message })
    } finally {
      setTesting(false)
    }
  }

  async function fetchOllamaModels() {
    setFetchingModels(true)
    setModelError('')
    setOllamaModels([])
    try {
      const res = await fetch('/api/settings/ollama/models')
      const data = await res.json()
      if (data.error) { setModelError(data.error); return }
      setOllamaModels(data.models || [])
    } catch (e) {
      setModelError(e.message)
    } finally {
      setFetchingModels(false)
    }
  }

  const btnBase = {
    width: '100%', height: 34, borderRadius: 2,
    fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 10,
    letterSpacing: '0.1em', cursor: 'pointer', marginBottom: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <div style={PANEL}>
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 2,
          padding: 14, display: 'flex', flexDirection: 'column', flex: 1,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1.2s infinite', boxShadow: '0 0 6px var(--red)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: '#c8c8c8', letterSpacing: '0.12em' }}>
              PHASE_00 // CONFIG
            </span>
          </div>

          {/* Provider selector */}
          <div style={SECTION}>
            <span style={LABEL}>AI PROVIDER</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['openrouter', 'ollama'].map(p => (
                <button key={p} onClick={() => patch('provider', p)} style={{
                  flex: 1, height: 30, borderRadius: 2, cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  border: `1px solid ${local.provider === p ? 'var(--red-border)' : 'rgba(229,62,62,0.2)'}`,
                  background: local.provider === p ? 'rgba(229,62,62,0.12)' : '#0d0d0d',
                  color: local.provider === p ? 'var(--red)' : '#888',
                }}>
                  {p === 'openrouter' ? 'OPENROUTER' : '[*] OLLAMA'}
                </button>
              ))}
            </div>
            <div style={HINT}>
              {local.provider === 'openrouter'
                ? 'Cloud API · requires key · 200+ models'
                : 'Local inference · no key · private'}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Save button */}
          <button onClick={save} style={{
            ...btnBase,
            background: isDirty ? 'rgba(229,62,62,0.08)' : 'transparent',
            border: `1px solid ${isDirty ? 'var(--red-border)' : 'var(--border)'}`,
            color: isDirty ? 'var(--red)' : 'var(--text-4)',
          }}>
            {saved ? '✓ SAVED' : '[ SAVE SETTINGS ]'}
          </button>

          {/* Test button */}
          <button onClick={testConnection} disabled={testing} style={{
            ...btnBase,
            background: 'transparent',
            border: '1px solid rgba(229,62,62,0.25)',
            color: testing ? '#555' : '#aaa',
            opacity: testing ? 0.6 : 1,
          }}>
            {testing ? '// TESTING...' : '[ TEST CONNECTION ]'}
          </button>

          {/* Test result */}
          {testResult && (
            <div style={{
              padding: '8px 10px', borderRadius: 2, marginTop: 4,
              background: testResult.ok ? 'rgba(200,200,200,0.05)' : 'rgba(229,62,62,0.06)',
              border: `1px solid ${testResult.ok ? 'rgba(200,200,200,0.15)' : 'rgba(229,62,62,0.2)'}`,
              color: testResult.ok ? '#c8c8c8' : 'var(--red)',
              fontFamily: 'var(--mono)', fontSize: 9, lineHeight: 1.5,
            }}>
              {testResult.ok ? '>> ' : 'ERR '}{testResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* ── Main config panel ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 2,
          padding: 24, height: '100%', boxSizing: 'border-box',
        }}>

          {local.provider === 'openrouter' ? (
            <>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(229,62,62,0.6)', letterSpacing: '0.12em', marginBottom: 24 }}>
                // OPENROUTER CONFIGURATION
              </div>

              <div style={SECTION}>
                <span style={LABEL}>API KEY</span>
                <input
                  type="password"
                  value={local.openrouter_api_key}
                  onChange={e => patch('openrouter_api_key', e.target.value)}
                  placeholder="sk-or-v1-..."
                  style={INPUT}
                  autoComplete="off"
                />
                <div style={HINT}>Get a free key at openrouter.ai/keys</div>
              </div>

              <div style={SECTION}>
                <span style={LABEL}>MODEL</span>
                <input
                  value={local.openrouter_model}
                  onChange={e => patch('openrouter_model', e.target.value)}
                  placeholder="meta-llama/llama-3.3-70b-instruct"
                  style={INPUT}
                />
                <div style={HINT}>deepseek/deepseek-chat · meta-llama/llama-3.3-70b-instruct (free) · google/gemini-2.0-flash-exp (free)</div>
              </div>

              <div style={SECTION}>
                <span style={LABEL}>MAX TOKENS</span>
                <input
                  type="number"
                  min={128} max={32768}
                  value={local.ai_max_tokens}
                  onChange={e => patch('ai_max_tokens', parseInt(e.target.value) || 4096)}
                  style={{ ...INPUT, width: 140 }}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(229,62,62,0.6)', letterSpacing: '0.12em', marginBottom: 24 }}>
                // OLLAMA CONFIGURATION
              </div>

              <div style={SECTION}>
                <span style={LABEL}>OLLAMA BASE URL</span>
                <input
                  value={local.ollama_base_url}
                  onChange={e => patch('ollama_base_url', e.target.value)}
                  placeholder="http://localhost:11434"
                  style={INPUT}
                />
                <div style={HINT}>Default: http://localhost:11434 · Install at ollama.com</div>
              </div>

              <div style={SECTION}>
                <span style={LABEL}>MODEL</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    value={local.ollama_model}
                    onChange={e => patch('ollama_model', e.target.value)}
                    placeholder="llama3.2"
                    style={{ ...INPUT, flex: 1 }}
                  />
                  <button onClick={fetchOllamaModels} disabled={fetchingModels} style={{
                    height: 30, padding: '0 12px', borderRadius: 2, cursor: 'pointer', flexShrink: 0,
                    background: '#0d0d0d', border: '1px solid rgba(229,62,62,0.35)',
                    color: '#aaa', fontFamily: 'var(--mono)', fontSize: 10,
                    opacity: fetchingModels ? 0.5 : 1,
                  }}>
                    {fetchingModels ? '...' : '[FETCH]'}
                  </button>
                </div>
                {modelError && (
                  <div style={{ fontSize: 8, color: 'var(--red)', marginTop: 5 }}>{modelError}</div>
                )}
                {ollamaModels.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ollamaModels.map(m => (
                      <button key={m} onClick={() => patch('ollama_model', m)} style={{
                        padding: '3px 8px', borderRadius: 2, cursor: 'pointer', fontSize: 9,
                        fontFamily: 'var(--mono)', letterSpacing: '0.04em',
                        background: local.ollama_model === m ? 'rgba(229,62,62,0.1)' : 'var(--bg-3)',
                        border: `1px solid ${local.ollama_model === m ? 'var(--red-border)' : 'var(--border)'}`,
                        color: local.ollama_model === m ? 'var(--red)' : '#aaa',
                      }}>
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                <div style={HINT}>Recommended: llama3.2 · mistral · deepseek-r1 · qwen2.5-coder</div>
              </div>

              <div style={SECTION}>
                <span style={LABEL}>MAX TOKENS</span>
                <input
                  type="number"
                  min={128} max={32768}
                  value={local.ai_max_tokens}
                  onChange={e => patch('ai_max_tokens', parseInt(e.target.value) || 4096)}
                  style={{ ...INPUT, width: 140 }}
                />
              </div>
            </>
          )}

          {/* Unsaved indicator */}
          {isDirty && (
            <div style={{ fontSize: 8, color: 'var(--amber)', marginTop: 8, letterSpacing: '0.08em' }}>
              [UNSAVED CHANGES]
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
