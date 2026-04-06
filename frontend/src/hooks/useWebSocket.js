import { useEffect, useRef } from 'react'
import { useFenrir } from '../store/fenrirStore'

let _socket = null
let _listeners = []

function getSocket(onMessage) {
  if (_socket && (_socket.readyState === WebSocket.OPEN || _socket.readyState === WebSocket.CONNECTING)) {
    if (!_listeners.includes(onMessage)) _listeners.push(onMessage)
    return
  }
  _socket = new WebSocket('ws://127.0.0.1:8765/ws')
  _listeners = [onMessage]
  _socket.onmessage = (e) => {
    try { const msg = JSON.parse(e.data); _listeners.forEach(fn => fn(msg)) } catch {}
  }
  _socket.onclose = () => { _socket = null; setTimeout(() => getSocket(onMessage), 3000) }
  _socket.onerror = () => { _socket?.close() }
}

export function useWebSocket() {
  const { addLog, addHost, addFinding, addTerminalLine, setPhaseStatus, setScanning } = useFenrir()
  const seen = useRef(new Set())

  useEffect(() => {
    function handle(msg) {
      const key = `${msg.timestamp}|${msg.message}`
      if (seen.current.has(key)) return
      seen.current.add(key)
      if (seen.current.size > 500) seen.current = new Set([...seen.current].slice(-250))

      addLog(msg)
      const text = msg.message || msg.detail || ''
      if (text) addTerminalLine(`[${(msg.level || 'info').toUpperCase()}] [${msg.phase || 'sys'}] ${text}`)
      if (msg.type === 'host' && msg.data) addHost(msg.data)
      if (msg.type === 'finding' && msg.data) addFinding(msg.data)
      if (msg.type === 'phase') setPhaseStatus(msg.phase, msg.status)
      if (msg.type === 'log' && msg.phase === 'done') setScanning(false)
    }
    getSocket(handle)
    return () => { _listeners = _listeners.filter(fn => fn !== handle) }
  }, [])
}
