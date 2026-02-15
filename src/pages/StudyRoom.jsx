import { Link } from 'react-router-dom'
import './Dashboard.css'

export default function StudyRoom() {
    return (
        <div className="dashboard-container">
            <section className="welcome-banner" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="welcome-title">📚 Study Room</h1>
                    <p className="welcome-subtitle">Focused study materials and resources.</p>
                </div>
            </section>
            <div className="empty-state" style={{ padding: '3rem' }}>
                <p className="empty-text" style={{ fontSize: '1.1rem' }}>Study Room is coming soon. Use the dashboard to take mock tests in the meantime.</p>
                <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>Go to Dashboard</Link>
            </div>
        </div>
    )
}
