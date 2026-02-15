import { Link } from 'react-router-dom'
import './QuickLinks.css'

export default function QuickLinks() {
  const links = [
    { icon: '✏️', label: 'Mock Test', path: '/dashboard', color: 'blue' },
    { icon: '📊', label: 'Reports', path: '/reports', color: 'green' },
    { icon: '🎯', label: 'All Exams', path: '/all-exams', color: 'purple' },
    { icon: '🔧', label: 'Gap Fixer', path: '#', color: 'orange', disabled: true },
  ]

  return (
    <div className="quick-links-section">
      <h3 className="section-title">⚡ Quick Access Links</h3>
      <div className="quick-links-grid">
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.disabled ? '#' : link.path}
            className={`quick-link-card quick-link-${link.color} ${link.disabled ? 'disabled' : ''}`}
            onClick={(e) => link.disabled && e.preventDefault()}
          >
            <div className="link-icon">{link.icon}</div>
            <div className="link-label">{link.label}</div>
            {link.disabled && <span className="coming-soon">Coming Soon</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
