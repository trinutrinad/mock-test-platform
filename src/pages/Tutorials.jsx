import { Link } from 'react-router-dom'
import './Dashboard.css'

export default function Tutorials() {
    return (
        <div className="dashboard-container">
            <section className="welcome-banner" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="welcome-title">🎓 Tutorials</h1>
                    <p className="welcome-subtitle">Guides and how-to content.</p>
                </div>
            </section>
            <div className="empty-state" style={{ padding: '3rem' }}>
                <p className="empty-text" style={{ fontSize: '1.1rem' }}>Tutorials are coming soon. Start with a mock test from the dashboard.</p>
                <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>Go to Dashboard</Link>
            </div>
        </div>
    )
}
