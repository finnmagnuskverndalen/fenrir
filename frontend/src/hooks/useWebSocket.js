import { useEffect, useRef } from 'react'
import { useFenrir } from '../store/fenrirStore'

export function useWebSocket() {
  const ws = useRef(null)
  const { addLog, addHost, addFinding, addTerminalLine, setPhaseStatus, setScanning } = useFenrir()

  useEffect(() => {
    function connect() {
      const socket = new WebSocket('ws://127.0.0.1:8765/ws')
      ws.current = socket
      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          addLog(msg)
          const text = msg.message || msg.detail || msg.text || ''
          if (text) addTerminalLine(`[${(msg.level || 'info').toUpperCase()}] [${msg.phase || 'sys'}] ${text}`)
          if (msg.type === 'host') addHost(msg.data)
          if (msg.type === 'finding') addFinding(msg.data)
          if (msg.type === 'phase') setPhaseStatus(msg.phase, msg.status)
          if (msg.type === 'log' && msg.phase === 'done') setScanning(false)
        } catch {}
      }
      socket.onclose = () => setTimeout(connect, 3000)
      socket.onerror = () => socket.close()
    }
    connect()
    return () => ws.current?.close()
  }, [])
}
