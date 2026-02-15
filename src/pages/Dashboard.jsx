import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [attempts, setAttempts] = useState([])
    const { user, signOut, role } = useAuth()

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
            if (!user) setLoading(false) // Stop loading if no user yet (will be redirect by ProtectedRoute anyway)
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

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Dashboard...</div>

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Dashboard</h1>
                    <p style={{ color: '#666' }}>Welcome, <span style={{ fontWeight: 'bold' }}>{user?.email}</span></p>
                    {role === 'admin' && <span style={{ background: '#000', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>ADMIN</span>}
                </div>
            </header>

            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ marginBottom: '1.5rem', borderLeft: '4px solid #2563eb', paddingLeft: '1rem' }}>Available Exams</h2>
                {exams.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No active exams at the moment.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {exams.map(exam => {
                            const hasAttempted = attempts.some(a => a.exam_id === exam.id)
                            return (
                                <div key={exam.id} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', background: 'white' }}>
                                    <h3 style={{ marginBottom: '0.5rem' }}>{exam.name}</h3>
                                    <p style={{ color: '#666', marginBottom: '1.5rem' }}>Duration: {exam.duration} minutes</p>

                                    {hasAttempted ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <button disabled style={{ width: '100%', padding: '0.75rem', background: '#ccc', color: '#666', border: 'none', borderRadius: '4px', cursor: 'not-allowed' }}>
                                                Completed
                                            </button>
                                            <Link to={`/result/${attempts.find(a => a.exam_id === exam.id).id}`} style={{ fontSize: '0.9rem', color: '#2563eb', whiteSpace: 'nowrap' }}>
                                                View Result
                                            </Link>
                                        </div>
                                    ) : (
                                        <Link to={`/exam/${exam.id}`}>
                                            <button style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: '500' }}>
                                                Start Exam
                                            </button>
                                        </Link>
                                    )}
                                    <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                                        <Link to={`/leaderboard/${exam.id}`} style={{ fontSize: '0.9rem', color: '#666', textDecoration: 'none' }}>
                                            🏆 View Leaderboard
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            <section>
                <h2 style={{ marginBottom: '1.5rem', borderLeft: '4px solid #10b981', paddingLeft: '1rem' }}>Your Past Attempts</h2>
                {attempts.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>You haven't taken any exams yet.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: '#f8f9fa' }}>
                                    <th style={{ padding: '1rem', borderBottom: '2px solid #ddd' }}>Exam</th>
                                    <th style={{ padding: '1rem', borderBottom: '2px solid #ddd' }}>Score</th>
                                    <th style={{ padding: '1rem', borderBottom: '2px solid #ddd' }}>Date</th>
                                    <th style={{ padding: '1rem', borderBottom: '2px solid #ddd' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attempts.map(attempt => (
                                    <tr key={attempt.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '1rem' }}>{attempt.exams?.name || 'Unknown Exam'}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{attempt.score}</td>
                                        <td style={{ padding: '1rem' }}>{new Date(attempt.submitted_at).toLocaleDateString()} {new Date(attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <Link to={`/result/${attempt.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>View Result</Link>
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
