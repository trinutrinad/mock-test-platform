import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import './Layout.css'

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="app-layout">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={() => setMobileMenuOpen(false)}
      />
      <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  )
}
