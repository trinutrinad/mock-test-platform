import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import QuickLinks from '../components/QuickLinks'
import ActivityTracker from '../components/ActivityTracker'
import './Dashboard.css'

export default function Dashboard() {
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [attempts, setAttempts] = useState([])
    const { user, role } = useAuth()

    useEffect(() => {
        fetchExams()
        if (user) fetchAttempts()
    }, [user])

    const fetchExams = async () => {
        try {
            if (!supabase) return
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setExams(data || [])
        } catch (error) {
            console.error('Error fetching exams:', error)
        } finally {
            if (!user) setLoading(false)
        }
    }

    const fetchAttempts = async () => {
        try {
            if (!supabase) return
            const { data, error } = await supabase
                .from('attempts')
                .select('*, exams(name)')
                .eq('user_id', user.id)
                .order('submitted_at', { ascending: false })

            if (error) throw error
            setAttempts(data || [])
        } catch (error) {
            console.error('Error fetching attempts:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="loading-container">Loading Dashboard...</div>

    return (
        <div className="dashboard-container">
            {/* Welcome Banner */}
            <section className="welcome-banner">
                <div>
                    <h1 className="welcome-title">Welcome back! 👋</h1>
                    <p className="welcome-subtitle">Ready to ace your exams? Start practicing now or view your progress.</p>
                </div>
                <div className="user-greeting">
                    <p className="greeting-email">{user?.email}</p>
                    {role === 'admin' && <span className="admin-badge">Admin</span>}
                </div>
            </section>

            {/* Quick Access Links */}
            <QuickLinks />

            {/* Activity Tracker */}
            <ActivityTracker />

            {/* Available Exams Section */}
            <section className="exams-section">
                <h2 className="section-title">📝 Available Exams</h2>
                {exams.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-text">No active exams at the moment.</p>
                    </div>
                ) : (
                    <div className="exams-grid">
                        {exams.map(exam => {
                            const hasAttempted = attempts.some(a => a.exam_id === exam.id)
                            const attempt = attempts.find(a => a.exam_id === exam.id)
                            return (
                                <div key={exam.id} className="exam-card">
                                    <div className="exam-header">
                                        <h3 className="exam-title">{exam.name}</h3>
                                        {hasAttempted && <span className="completed-badge">✓ Completed</span>}
                                    </div>

                                    <div className="exam-meta">
                                        <div className="meta-item">
                                            <span className="meta-icon">⏱️</span>
                                            <span className="meta-text">{exam.duration} minutes</span>
                                        </div>
                                    </div>

                                    <div className="exam-actions">
                                        {hasAttempted ? (
                                            <>
                                                <button className="btn btn-completed" disabled>
                                                    ✓ Completed
                                                </button>
                                                <Link to={`/result/${attempt.id}`} className="btn-secondary">
                                                    View Result →
                                                </Link>
                                            </>
                                        ) : (
                                            <Link to={`/exam/${exam.id}`} className="btn btn-primary">
                                                Start Exam →
                                            </Link>
                                        )}
                                        <Link to={`/leaderboard/${exam.id}`} className="btn-secondary">
                                            🏆 Leaderboard
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Past Attempts Section */}
            <section className="attempts-section">
                <h2 className="section-title">📊 Your Exam History</h2>
                {attempts.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-text">You haven't taken any exams yet. Start practicing now!</p>
                    </div>
                ) : (
                    <div className="attempts-table-wrapper">
                        <table className="attempts-table">
                            <thead>
                                <tr>
                                    <th>Exam Name</th>
                                    <th>Score</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attempts.map(attempt => (
                                    <tr key={attempt.id}>
                                        <td className="exam-name">{attempt.exams?.name || 'Unknown Exam'}</td>
                                        <td className="score">{attempt.score}</td>
                                        <td className="date">{new Date(attempt.submitted_at).toLocaleDateString()} {new Date(attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>
                                            <Link to={`/result/${attempt.id}`} className="view-link">View</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}
