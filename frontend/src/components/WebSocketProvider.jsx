import { createContext, useContext, useEffect, useRef, useState } from 'react'

const WSContext = createContext(null)

export function WebSocketProvider({ children }) {
  const [logs, setLogs] = useState([])
  const [hosts, setHosts] = useState([])
  const [findings, setFindings] = useState([])
  const [phases, setPhases] = useState({})
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    function connect() {
      const ws = new WebSocket('ws://127.0.0.1:8765/ws')
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        setTimeout(connect, 3000)
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'log') {
            setLogs(prev => [msg, ...prev].slice(0, 500))
          } else if (msg.type === 'host') {
            setHosts(prev => {
              const exists = prev.find(h => h.ip === msg.data.ip)
              if (exists) return prev
              return [msg.data, ...prev]
            })
          } else if (msg.type === 'finding') {
            setFindings(prev => [msg.data, ...prev])
          } else if (msg.type === 'phase') {
            setPhases(prev => ({ ...prev, [msg.phase]: msg.status }))
          }
        } catch {}
      }
    }
    connect()
    return () => wsRef.current?.close()
  }, [])

  return (
    <WSContext.Provider value={{ logs, hosts, findings, phases, connected }}>
      {children}
    </WSContext.Provider>
  )
}

export function useWS() {
  return useContext(WSContext)
}
