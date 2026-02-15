import { Link } from 'react-router-dom'
import './Dashboard.css'

export default function ExamInfo() {
    return (
        <div className="dashboard-container">
            <section className="welcome-banner" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="welcome-title">ℹ️ Exam Info</h1>
                    <p className="welcome-subtitle">Information about exams and how they work.</p>
                </div>
            </section>
            <div className="empty-state" style={{ padding: '3rem' }}>
                <p className="empty-text" style={{ fontSize: '1.1rem' }}>Exam info content is coming soon. Head to All Exams or Dashboard to see available tests.</p>
                <Link to="/all-exams" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>View All Exams</Link>
            </div>
        </div>
    )
}
