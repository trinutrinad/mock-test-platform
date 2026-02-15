import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import './ExamRoom.css'

export default function ExamRoom() {
    const { examId } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [exam, setExam] = useState(null)
    const [questions, setQuestions] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState({}) // { questionId: selectedOption }
    const [markedQuestions, setMarkedQuestions] = useState(new Set()) // For "Review Later"
    const [timeLeft, setTimeLeft] = useState(0) // in seconds
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [selectedSection, setSelectedSection] = useState('all')

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
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', examId)
                .single()

            if (examError) throw examError
            setExam(examData)
            setTimeLeft(examData.duration * 60)

            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select('*')
                .eq('exam_id', examId)

            if (questionsError) throw questionsError
            setQuestions(questionsData)

            setLoading(false)
        } catch (error) {
            console.error('Error fetching exam:', error)
            alert('Failed to load exam')
            navigate('/dashboard')
        }
    }

    const handleSelectAnswer = (option) => {
        const currentQuestion = questions[currentQuestionIndex]
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: option,
        }))
    }

    const handleMarkForReview = () => {
        const currentQuestion = questions[currentQuestionIndex]
        setMarkedQuestions((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(currentQuestion.id)) {
                newSet.delete(currentQuestion.id)
            } else {
                newSet.add(currentQuestion.id)
            }
            return newSet
        })
    }

    const handleClearResponse = () => {
        const currentQuestion = questions[currentQuestionIndex]
        setAnswers((prev) => {
            const newAnswers = { ...prev }
            delete newAnswers[currentQuestion.id]
            return newAnswers
        })
    }

    const handleSubmit = async (autoSubmit = false) => {
        if (!autoSubmit && !window.confirm('Are you sure? You cannot undo this action.')) {
            return
        }

        setSubmitting(true)
        try {
            // Create attempt record
            const { data: attemptData, error: attemptError } = await supabase
                .from('attempts')
                .insert([
                    {
                        user_id: user.id,
                        exam_id: examId,
                        submitted_at: new Date(),
                    },
                ])
                .select()
                .single()

            if (attemptError) throw attemptError

            // Save answers
            const answerRecords = Object.entries(answers).map(([questionId, option]) => ({
                attempt_id: attemptData.id,
                question_id: questionId,
                selected_option: option,
            }))

            if (answerRecords.length > 0) {
                const { error: answersError } = await supabase
                    .from('answers')
                    .insert(answerRecords)

                if (answersError) throw answersError
            }

            navigate(`/result/${attemptData.id}`)
        } catch (error) {
            console.error('Error submitting exam:', error)
            alert('Failed to submit exam')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="exam-loading">Loading exam...</div>
    if (!exam || questions.length === 0) return <div className="exam-error">No questions found</div>

    const currentQuestion = questions[currentQuestionIndex]
    const filteredQuestions =
        selectedSection === 'all'
            ? questions
            : questions.filter((q) => q.section === selectedSection)

    const sections = [...new Set(questions.map((q) => q.section))].filter(Boolean)

    const getQuestionStatus = (questionId) => {
        if (markedQuestions.has(questionId)) return 'review'
        if (answers[questionId]) return 'answered'
        return 'unanswered'
    }

    const stats = {
        answered: Object.keys(answers).length,
        reviewed: markedQuestions.size,
        unanswered: questions.length - Object.keys(answers).length,
    }

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="exam-room">
            {/* Header Timer */}
            <div className="exam-header">
                <div className="exam-info">
                    <h1 className="exam-title">{exam.name}</h1>
                    <div className="exam-stats">
                        <span className="stat-item">
                            <span className="stat-label">Answered:</span>
                            <span className="stat-value">{stats.answered}</span>
                        </span>
                        <span className="stat-item">
                            <span className="stat-label">Review:</span>
                            <span className="stat-value">{stats.reviewed}</span>
                        </span>
                        <span className="stat-item">
                            <span className="stat-label">Unanswered:</span>
                            <span className="stat-value">{stats.unanswered}</span>
                        </span>
                    </div>
                </div>
                <div className={`timer ${timeLeft < 300 ? 'warning' : ''}`}>
                    ⏱️ {formatTime(timeLeft)}
                </div>
            </div>

            <div className="exam-container">
                {/* Main Question Panel */}
                <div className="question-panel">
                    <div className="question-number">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </div>

                    <div className="question-content">
                        <h2 className="question-text">{currentQuestion.question_text}</h2>

                        {currentQuestion.image_url && (
                            <img src={currentQuestion.image_url} alt="Question visual" className="question-image" />
                        )}

                        <div className="options-container">
                            {['a', 'b', 'c', 'd'].map((option) => {
                                const optionKey = `option_${option}`
                                const optionText = currentQuestion[optionKey]
                                if (!optionText) return null

                                return (
                                    <label key={option} className="option-label">
                                        <input
                                            type="radio"
                                            name="question-option"
                                            value={option}
                                            checked={answers[currentQuestion.id] === option}
                                            onChange={() => handleSelectAnswer(option)}
                                            className="option-input"
                                        />
                                        <span className="option-radio">{option.toUpperCase()}</span>
                                        <span className="option-text">{optionText}</span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    <div className="question-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={handleClearResponse}
                            disabled={!answers[currentQuestion.id]}
                        >
                            Clear Response
                        </button>
                        <button
                            className={`btn ${markedQuestions.has(currentQuestion.id) ? 'btn-marked' : 'btn-secondary'}`}
                            onClick={handleMarkForReview}
                        >
                            {markedQuestions.has(currentQuestion.id) ? '✓ Marked' : 'Mark for Review'}
                        </button>
                    </div>

                    <div className="question-navigation">
                        <button
                            className="nav-btn"
                            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                            disabled={currentQuestionIndex === 0}
                        >
                            ← Previous
                        </button>
                        <button
                            className="nav-btn"
                            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                            disabled={currentQuestionIndex === questions.length - 1}
                        >
                            Next →
                        </button>
                    </div>
                </div>

                {/* Question Navigator Panel */}
                <div className="navigator-panel">
                    <div className="navigator-header">
                        <h3>Questions</h3>
                        {sections.length > 0 && (
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                className="section-select"
                            >
                                <option value="all">All Sections</option>
                                {sections.map((section) => (
                                    <option key={section} value={section}>
                                        {section}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="question-status-legend">
                        <div className="legend-item">
                            <span className="legend-box answered"></span>
                            <span>Answered</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-box review"></span>
                            <span>Review</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-box unanswered"></span>
                            <span>Unanswered</span>
                        </div>
                    </div>

                    <div className="question-grid">
                        {filteredQuestions.map((question, idx) => (
                            <button
                                key={question.id}
                                className={`question-btn ${getQuestionStatus(question.id)} ${
                                    question.id === currentQuestion.id ? 'active' : ''
                                }`}
                                onClick={() => {
                                    const questionIndex = questions.findIndex((q) => q.id === question.id)
                                    setCurrentQuestionIndex(questionIndex)
                                }}
                                title={`Q${idx + 1} - ${getQuestionStatus(question.id)}`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>

                    <button
                        className="btn btn-primary submit-btn"
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : '✓ Submit Exam'}
                    </button>
                </div>
            </div>
        </div>
    )
}
