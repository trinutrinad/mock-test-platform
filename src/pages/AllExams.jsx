import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

export default function AllExams() {
    const [exams, setExams] = useState([])
    const [attempts, setAttempts] = useState([])
    const [loading, setLoading] = useState(true)
    const { user } = useAuth()

    useEffect(() => {
        fetchExams()
        if (user) fetchAttempts()
    }, [user])

    const fetchExams = async () => {
        try {
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

    if (loading) return <div className="loading-container">Loading exams...</div>

    return (
        <div className="dashboard-container">
            <section className="welcome-banner" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="welcome-title">🎯 All Exams</h1>
                    <p className="welcome-subtitle">Browse active mock tests and start when you're ready.</p>
                </div>
            </section>
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
                                                <button className="btn btn-completed" disabled>✓ Completed</button>
                                                <Link to={`/result/${attempt.id}`} className="btn-secondary">View Result →</Link>
                                            </>
                                        ) : (
                                            <Link to={`/exam/${exam.id}`} className="btn btn-primary">Start Exam →</Link>
                                        )}
                                        <Link to={`/leaderboard/${exam.id}`} className="btn-secondary">🏆 Leaderboard</Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}
