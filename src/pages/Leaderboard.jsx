import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Leaderboard() {
    const { examId } = useParams()
    const { user } = useAuth()
    const [leaderboard, setLeaderboard] = useState([])
    const [examName, setExamName] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchLeaderboard()
    }, [examId])

    const fetchLeaderboard = async () => {
        try {
            // Fetch exam details first
            const { data: exam, error: examError } = await supabase
                .from('exams')
                .select('name, negative_mark, duration') // Added negative_mark to select just in case we want to show it
                .eq('id', examId)
                .single()

            if (examError) throw examError
            setExamName(exam.name)

            // Fetch leaderboard data
            // Note: This relies on the 'leaderboard' view existing in Supabase
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .eq('exam_id', examId)
                .order('rank', { ascending: true })
                .limit(50)

            if (error) throw error
            setLeaderboard(data)
        } catch (error) {
            console.error('Error fetching leaderboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (seconds) => {
        if (!seconds) return 'N/A'
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}m ${secs}s`
    }

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Leaderboard...</div>

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <Link to="/dashboard" style={{ textDecoration: 'none', color: '#666' }}>← Back to Dashboard</Link>
                <h1 style={{ color: '#2563eb', margin: 0 }}>{examName} Leaderboard</h1>
            </div>

            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '1rem', width: '80px', textAlign: 'center' }}>Rank</th>
                            <th style={{ padding: '1rem' }}>User</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Score</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Time</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                    No attempts yet. Be the first!
                                </td>
                            </tr>
                        ) : (
                            leaderboard.map((entry) => {
                                const isCurrentUser = user && entry.email === user.email
                                return (
                                    <tr key={entry.rank} style={{
                                        borderBottom: '1px solid #eee',
                                        background: isCurrentUser ? '#e6f7ff' : 'white'
                                    }}>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: entry.rank <= 3 ? '#d4af37' : '#666' }}>
                                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {isCurrentUser ? <strong>{entry.email} (You)</strong> : entry.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>
                                            {entry.score}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: '#666' }}>
                                            {formatTime(entry.time_taken)}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: '#666', fontSize: '0.9rem' }}>
                                            {new Date(entry.submitted_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
