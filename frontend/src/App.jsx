import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Hosts from './pages/Hosts'
import Findings from './pages/Findings'
import AIAnalysis from './pages/AIAnalysis'
import Reports from './pages/Reports'
import Scope from './pages/Scope'
import AuditLog from './pages/AuditLog'
import { WebSocketProvider } from './components/WebSocketProvider'

export default function App() {
  return (
    <WebSocketProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar />
          <main style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#0d0d0d' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/hosts" element={<Hosts />} />
              <Route path="/findings" element={<Findings />} />
              <Route path="/ai" element={<AIAnalysis />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/scope" element={<Scope />} />
              <Route path="/audit" element={<AuditLog />} />
            </Routes>
          </main>
        </div>
      </div>
    </WebSocketProvider>
  )
}
