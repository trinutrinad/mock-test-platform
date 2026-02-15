import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

export default function Reports() {
    const [attempts, setAttempts] = useState([])
    const [loading, setLoading] = useState(true)
    const { user } = useAuth()

    useEffect(() => {
        if (user) fetchAttempts()
        else setLoading(false)
    }, [user])

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

    if (loading) return <div className="loading-container">Loading reports...</div>

    return (
        <div className="dashboard-container">
            <section className="welcome-banner" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="welcome-title">📊 Reports</h1>
                    <p className="welcome-subtitle">Your exam history and scores.</p>
                </div>
            </section>
            <section className="attempts-section">
                <h2 className="section-title">📊 Your Exam History</h2>
                {attempts.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-text">You haven't taken any exams yet. Start from the dashboard or All Exams.</p>
                        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Go to Dashboard</Link>
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
                                        <td className="date">
                                            {new Date(attempt.submitted_at).toLocaleDateString()}{' '}
                                            {new Date(attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
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
