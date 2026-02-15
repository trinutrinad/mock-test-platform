import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Result() {
    const { attemptId } = useParams()
    const { user, role } = useAuth()
    const navigate = useNavigate()

    const [attempt, setAttempt] = useState(null)
    const [questions, setQuestions] = useState([])
    const [userAnswers, setUserAnswers] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) fetchResultData()
    }, [attemptId, user])

    const fetchResultData = async () => {
        try {
            // 1. Fetch Attempt Details
            const { data: attemptData, error: attemptError } = await supabase
                .from('attempts')
                .select('*, exams(*)')
                .eq('id', attemptId)
                .single()

            if (attemptError) throw attemptError

            // Security check: Ensure the attempt belongs to the user OR user is admin
            if (attemptData.user_id !== user.id && role !== 'admin') {
                alert("You are not authorized to view this result.")
                navigate('/dashboard')
                return
            }

            setAttempt(attemptData)

            // 2. Fetch Questions (including correct options for display)
            // Note: RLS must allow reading questions for this to work.
            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select('*')
                .eq('exam_id', attemptData.exam_id)

            if (questionsError) throw questionsError
            setQuestions(questionsData)

            // 3. Fetch User Answers
            const { data: answersData, error: answersError } = await supabase
                .from('answers')
                .select('*')
                .eq('attempt_id', attemptId)

            if (answersError) throw answersError

            // Map answers for easy lookup { question_id: selected_option }
            const answersMap = {}
            answersData.forEach(a => {
                answersMap[a.question_id] = a.selected_option
            })
            setUserAnswers(answersMap)

        } catch (error) {
            console.error('Error fetching result data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Analysis...</div>
    if (!attempt) return <div style={{ padding: '2rem', textAlign: 'center' }}>Result not found.</div>

    // Calculate detailed stats
    const totalQuestions = questions.length

    let correctCount = 0
    let wrongCount = 0
    let unansweredCount = 0

    questions.forEach(q => {
        const userSelected = userAnswers[q.id]
        if (!userSelected) {
            unansweredCount++
        } else if (userSelected === q.correct_option) {
            correctCount++
        } else {
            wrongCount++
        }
    })

    const percentage = totalQuestions > 0 ? ((attempt.score / totalQuestions) * 100).toFixed(1) : 0

    // Data for Pie Chart
    const pieData = [
        { name: 'Correct', value: correctCount, color: '#28a745' },
        { name: 'Incorrect', value: wrongCount, color: '#dc3545' },
        { name: 'Unanswered', value: unansweredCount, color: '#ffc107' }
    ].filter(d => d.value > 0)

    const formatTime = (seconds) => {
        if (!seconds) return 'N/A'
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}m ${secs}s`
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            {/* Header Summary */}
            <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '1px solid #eee', paddingBottom: '2rem' }}>
                <h1 style={{ color: '#28a745', marginBottom: '0.5rem' }}>Result Analysis</h1>
                <h2 style={{ color: '#666', marginBottom: '1rem' }}>{attempt.exams.name}</h2>
                <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1.5rem' }}>
                    Sent: {new Date(attempt.submitted_at).toLocaleString()} |
                    Rule: +{attempt.exams.marks || 1} / -{attempt.exams.negative_mark || 0}
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', minWidth: '120px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>{attempt.score} / {totalQuestions}</div>
                        <div style={{ color: '#666' }}>Score</div>
                    </div>
                    <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', minWidth: '120px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{percentage}%</div>
                        <div style={{ color: '#666' }}>Percentage</div>
                    </div>
                    <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', minWidth: '120px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6610f2' }}>{formatTime(attempt.time_taken)}</div>
                        <div style={{ color: '#666' }}>Time Taken</div>
                    </div>
                </div>

                {/* Chart Section */}
                <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Question Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ borderLeft: '4px solid #007bff', paddingLeft: '1rem' }}>Detailed Breakdown</h3>

                {questions.map((q, index) => {
                    const userSelected = userAnswers[q.id]
                    const isCorrect = userSelected === q.correct_option
                    const isSkipped = !userSelected

                    return (
                        <div key={q.id} style={{
                            border: '1px solid #eee',
                            padding: '1.5rem',
                            borderRadius: '8px',
                            background: isCorrect ? '#f6ffed' : (isSkipped ? '#fffbe6' : '#fff1f0'),
                            borderColor: isCorrect ? '#b7eb8f' : (isSkipped ? '#ffe58f' : '#ffa39e')
                        }}>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 'bold', minWidth: '25px' }}>{index + 1}.</span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '1rem' }}>{q.question}</p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {['A', 'B', 'C', 'D'].map(opt => {
                                            const optionText = q[`option_${opt.toLowerCase()}`]
                                            const isSelected = userSelected === opt
                                            const isTheCorrectAnswer = q.correct_option === opt

                                            let style = {
                                                padding: '0.75rem',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }

                                            if (isTheCorrectAnswer) {
                                                style.background = '#d9f7be' // Green highlight
                                                style.borderColor = '#73d13d'
                                                style.fontWeight = 'bold'
                                            }

                                            if (isSelected && !isTheCorrectAnswer) {
                                                style.background = '#ffccc7' // Red highlight
                                                style.borderColor = '#ff4d4f'
                                            }

                                            return (
                                                <div key={opt} style={style}>
                                                    <span><span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{opt}.</span> {optionText}</span>
                                                    <span>
                                                        {isTheCorrectAnswer && <span style={{ color: '#389e0d' }}>✔ Correct</span>}
                                                        {isSelected && !isTheCorrectAnswer && <span style={{ color: '#cf1322' }}>✘ Your Answer</span>}
                                                        {isSelected && isTheCorrectAnswer && <span style={{ color: '#389e0d', marginLeft: '0.5rem' }}>(You)</span>}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                <Link to="/dashboard">
                    <button style={{ padding: '1rem 2rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}>
                        Back to Dashboard
                    </button>
                </Link>
            </div>
        </div>
    )
}
