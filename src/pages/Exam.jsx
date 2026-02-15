import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Exam() {
    const { examId } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [exam, setExam] = useState(null)
    const [questions, setQuestions] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState({}) // { questionId: selectedOption }
    const [timeLeft, setTimeLeft] = useState(0) // in seconds
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const timerRef = useRef(null)

    useEffect(() => {
        fetchExamData()
        return () => clearInterval(timerRef.current)
    }, [examId])

    useEffect(() => {
        if (timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current)
                        handleSubmit(true) // Auto submit
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => clearInterval(timerRef.current)
    }, [timeLeft])

    const fetchExamData = async () => {
        try {
            // Fetch Exam Details
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', examId)
                .single()

            if (examError) throw examError
            setExam(examData)
            setTimeLeft(examData.duration * 60)

            // Fetch Questions
            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select('id, question, option_a, option_b, option_c, option_d')
                .eq('exam_id', examId)

            if (questionsError) throw questionsError
            setQuestions(questionsData)

        } catch (error) {
            console.error('Error fetching exam:', error)
            alert('Failed to load exam. Please try again.')
            navigate('/dashboard')
        } finally {
            setLoading(false)
        }
    }

    const handleOptionSelect = (questionId, option) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: option
        }))
    }

    const handleSubmit = async (isAutoSubmit = false) => {
        if (submitting) return
        if (!isAutoSubmit && !window.confirm('Are you sure you want to submit?')) return

        setSubmitting(true)
        clearInterval(timerRef.current)

        try {
            // Prepare answers for RPC
            const answersPayload = Object.entries(answers).map(([qId, option]) => ({
                question_id: qId,
                selected_option: option
            }))

            // Call Secure RPC
            const timeTaken = (exam.duration * 60) - timeLeft
            const { data: attemptId, error } = await supabase.rpc('submit_exam', {
                exam_id: examId,
                answers: answersPayload,
                time_taken: timeTaken
            })

            if (error) throw error

            navigate(`/result/${attemptId}`)

        } catch (error) {
            console.error('Error submitting exam:', error)
            alert('Failed to submit exam. Please contact support.')
            setSubmitting(false)
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    if (loading) return <div style={{ padding: '2rem' }}>Loading Exam...</div>
    if (!exam) return <div style={{ padding: '2rem' }}>Exam not found.</div>

    const currentQuestion = questions[currentQuestionIndex]

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
                <h2>{exam.name}</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#666', background: '#f1f1f1', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                        Marks/Q: +{exam.marks || 1} | Neg: -{exam.negative_mark || 0}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft < 60 ? 'red' : 'black' }}>
                        Time Left: {formatTime(timeLeft)}
                    </div>
                </div>
            </header>

            {questions.length > 0 ? (
                <div>
                    <div style={{ marginBottom: '1rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#666' }}>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    </div>

                    <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>{currentQuestion.question}</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {['A', 'B', 'C', 'D'].map(opt => (
                                <label key={opt} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    border: `1px solid ${answers[currentQuestion.id] === opt ? '#007bff' : '#ddd'}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    background: answers[currentQuestion.id] === opt ? '#e7f1ff' : 'white'
                                }}>
                                    <input
                                        type="radio"
                                        name={`question-${currentQuestion.id}`}
                                        value={opt}
                                        checked={answers[currentQuestion.id] === opt}
                                        onChange={() => handleOptionSelect(currentQuestion.id, opt)}
                                        style={{ marginRight: '1rem' }}
                                    />
                                    <span>
                                        <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{opt}.</span>
                                        {currentQuestion[`option_${opt.toLowerCase()}`]}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            style={{ padding: '0.75rem 1.5rem', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer' }}
                        >
                            Previous
                        </button>

                        {currentQuestionIndex < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                style={{ padding: '0.75rem 1.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: submitting ? 'wait' : 'pointer' }}
                            >
                                {submitting ? 'Submitting...' : 'Submit Exam'}
                            </button>
                        )}
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {questions.map((q, idx) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                style={{
                                    width: '35px',
                                    height: '35px',
                                    borderRadius: '50%',
                                    border: '1px solid #ddd',
                                    background: currentQuestionIndex === idx ? '#007bff' : (answers[q.id] ? '#e7f1ff' : 'white'),
                                    color: currentQuestionIndex === idx ? 'white' : 'black',
                                    cursor: 'pointer'
                                }}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>

                </div>
            ) : (
                <p>No questions found for this exam.</p>
            )}
        </div>
    )
}
