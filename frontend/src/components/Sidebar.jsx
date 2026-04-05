import { NavLink } from 'react-router-dom'
import { useWS } from './WebSocketProvider'

const nav = [
  { path: '/',         label: 'Dashboard' },
  { path: '/hosts',    label: 'Hosts' },
  { path: '/findings', label: 'Findings' },
  { path: '/exploits', label: 'Exploits', accent: true },
  { path: '/ai',       label: 'AI Analysis' },
  { path: '/reports',  label: 'Reports' },
  { path: '/scope',    label: 'Scope' },
  { path: '/audit',    label: 'Audit Log' },
]

export default function Sidebar() {
  const { connected } = useWS()
  return (
    <div style={{width:200,background:'#111',borderRight:'1px solid #1f1f1f',display:'flex',flexDirection:'column',padding:'16px 0',flexShrink:0}}>
      <div style={{padding:'0 16px 20px',borderBottom:'1px solid #1f1f1f'}}>
        <div style={{color:'#e53e3e',fontWeight:600,fontSize:15,letterSpacing:1}}>FENRIR</div>
        <div style={{color:'#333',fontSize:10,marginTop:2}}>Network Security Scanner</div>
      </div>
      <nav style={{padding:'12px 8px',flex:1}}>
        {nav.map(({path,label,accent}) => (
          <NavLink key={path} to={path} end={path==='/'} style={({isActive})=>({
            display:'block',padding:'7px 10px',borderRadius:4,
            color: isActive ? '#e5e5e5' : accent ? '#dd6b20' : '#555',
            background: isActive ? '#1a1a1a' : 'transparent',
            textDecoration:'none',fontSize:12,marginBottom:2,
          })}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div style={{padding:'12px 16px',borderTop:'1px solid #1f1f1f',display:'flex',alignItems:'center',gap:6}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:connected?'#39d353':'#e53e3e'}}/>
        <span style={{color:'#333',fontSize:10}}>{connected?'connected':'disconnected'}</span>
      </div>
    </div>
  )
}
