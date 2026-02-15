import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const location = useLocation()
  const { signOut, role } = useAuth()

  const menuItems = [
    { icon: '🏠', label: 'Dashboard', path: '/dashboard', role: 'all' },
    { icon: '📚', label: 'Study Room', path: '/study-room', role: 'user' },
    { icon: '✏️', label: 'Exam Room', path: '/exam-room', role: 'user' },
    { icon: '📊', label: 'Reports', path: '/reports', role: 'user' },
    { icon: 'ℹ️', label: 'Exam Info', path: '/exam-info', role: 'user' },
    { icon: '🎯', label: 'All Exams', path: '/all-exams', role: 'user' },
    { icon: '🎓', label: 'Tutorials', path: '/tutorials', role: 'user' },
  ]

  // Admin-only items
  if (role === 'admin') {
    menuItems.push(
      { icon: '👨‍💼', label: 'Admin Panel', path: '/admin', role: 'admin' },
      { icon: '⬆️', label: 'Bulk Upload', path: '/admin', role: 'admin' }
    )
  }

  const isActive = (path) => location.pathname === path

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        {isOpen && <h2 className="sidebar-title">EkLavya</h2>}
        <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
            title={item.label}
          >
            <span className="menu-icon">{item.icon}</span>
            {isOpen && <span className="menu-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button onClick={signOut} className="logout-btn" title="Logout">
          <span className="menu-icon">🚪</span>
          {isOpen && <span className="menu-label">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
