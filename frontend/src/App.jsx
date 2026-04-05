import { useEffect } from 'react'
import Header from './components/Header'
import Terminal from './components/Terminal'
import Phase1Detection from './pages/Phase1Detection'
import Phase2PortScan from './pages/Phase2PortScan'
import Phase3VulnScan from './pages/Phase3VulnScan'
import Phase4Exploitation from './pages/Phase4Exploitation'
import Phase5Report from './pages/Phase5Report'
import { useFenrir } from './store/fenrirStore'
import { useWebSocket } from './hooks/useWebSocket'

const phases = {
  1: Phase1Detection,
  2: Phase2PortScan,
  3: Phase3VulnScan,
  4: Phase4Exploitation,
  5: Phase5Report,
}

export default function App() {
  useWebSocket()
  const { currentPhase } = useFenrir()
  const PhaseComponent = phases[currentPhase] || Phase1Detection

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Header />
      <div style={{
        flex: 1,
        overflow: 'hidden',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <PhaseComponent />
        </div>
      </div>
      <Terminal height={170} />
    </div>
  )
}
