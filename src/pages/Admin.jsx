import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Papa from 'papaparse' // Can remove if not used elsewhere, but keeping just in case. Actually user asked for papaparse, but it's used inside BulkUpload now. I'll keep the import if needed, or remove it.
import BulkUpload from '../components/BulkUpload'

export default function Admin() {
    console.log("Admin page loaded")
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedExamId, setSelectedExamId] = useState(null)

    // New Exam Form State
    const [newExamName, setNewExamName] = useState('')
    const [newExamDuration, setNewExamDuration] = useState(10)
    const [newExamMarks, setNewExamMarks] = useState(1)
    const [newExamNegativeMark, setNewExamNegativeMark] = useState(0)

    // New Question Form State
    const [questionText, setQuestionText] = useState('')
    const [optionA, setOptionA] = useState('')
    const [optionB, setOptionB] = useState('')
    const [optionC, setOptionC] = useState('')
    const [optionD, setOptionD] = useState('')
    const [correctOption, setCorrectOption] = useState('A')

    useEffect(() => {
        fetchExams()
    }, [])

    const fetchExams = async () => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*, questions(count)')
                // .eq('is_deleted', false) // Temporarily removed: column missing in DB
                .order('created_at', { ascending: false })

            if (error) throw error
            setExams(data)
        } catch (error) {
            console.error('Error fetching exams:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateExam = async (e) => {
        e.preventDefault()
        try {
            const { error } = await supabase
                .from('exams')
                .insert({
                    name: newExamName,
                    duration: newExamDuration,
                    marks: newExamMarks,
                    negative_mark: newExamNegativeMark
                })

            if (error) throw error

            setNewExamName('')
            setNewExamDuration(10)
            setNewExamNegativeMark(0)
            fetchExams()
            alert('Exam created!')
        } catch (error) {
            console.error('Error creating exam:', error)
            alert('Error creating exam')
        }
    }

    const handleToggleActive = async (examId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('exams')
                .update({ is_active: !currentStatus })
                .eq('id', examId)

            if (error) throw error
            fetchExams()
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    const handleAddQuestion = async (e) => {
        e.preventDefault()
        if (!selectedExamId) return alert('No exam selected')

        try {
            const { error } = await supabase
                .from('questions')
                .insert({
                    exam_id: selectedExamId,
                    question: questionText,
                    option_a: optionA,
                    option_b: optionB,
                    option_c: optionC,
                    option_d: optionD,
                    correct_option: correctOption
                })

            if (error) throw error

            setQuestionText('')
            setOptionA('')
            setOptionB('')
            setOptionC('')
            setOptionD('')
            setCorrectOption('A')
            alert('Question added successfully!')
            fetchExams() // Refresh count
        } catch (error) {
            console.error('Error adding question:', error)
            alert('Failed to add question')
        }
    }

    // CSV Logic moved to BulkUpload component

    if (loading) return <div style={{ padding: '2rem' }}>Loading Admin Panel...</div>

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Admin Panel</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>

                {/* Left Column: Manage Exams */}
                <div>
                    <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                        <h2>Create New Exam</h2>
                        <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <input
                                placeholder="Exam Name (e.g., APPSC Group I Mock 1)"
                                value={newExamName}
                                onChange={e => setNewExamName(e.target.value)}
                                required
                                style={{ padding: '0.5rem' }}
                            />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Duration (min)</label>
                                    <input
                                        type="number"
                                        placeholder="Duration"
                                        value={newExamDuration}
                                        onChange={e => setNewExamDuration(e.target.value)}
                                        required
                                        style={{ padding: '0.5rem', width: '100%' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Marks/Q</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        placeholder="1"
                                        value={newExamMarks}
                                        onChange={e => setNewExamMarks(e.target.value)}
                                        required
                                        style={{ padding: '0.5rem', width: '100%' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Negative</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0"
                                        value={newExamNegativeMark}
                                        onChange={e => setNewExamNegativeMark(e.target.value)}
                                        style={{ padding: '0.5rem', width: '100%' }}
                                    />
                                </div>
                            </div>
                            <button type="submit" style={{ padding: '0.5rem', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>Create Exam</button>
                        </form>
                    </div>

                    <h2>Existing Exams</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {exams.map(exam => (
                            <div key={exam.id} style={{
                                border: '1px solid #ddd',
                                padding: '1rem',
                                borderRadius: '8px',
                                background: selectedExamId === exam.id ? '#e7f1ff' : 'white',
                                borderLeft: selectedExamId === exam.id ? '5px solid #007bff' : '1px solid #ddd'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0 }}>{exam.name}</h3>
                                    <span style={{ fontSize: '0.8rem', background: exam.is_active ? '#28a745' : '#ccc', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                        {exam.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p style={{ margin: '0.5rem 0', color: '#666' }}>
                                    Duration: {exam.duration}m | Neg. Mark: {exam.negative_mark || 0} | Qs: {exam.questions[0]?.count || 0}
                                </p>
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => setSelectedExamId(exam.id)} style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}>Manage Questions</button>
                                    <button onClick={() => handleToggleActive(exam.id, exam.is_active)} style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                                        {exam.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm('Delete exam "' + exam.name + '"?')) return
                                            try {
                                                // Check for existing attempts for this exam (for confirmation message)
                                                const { count, error: countError } = await supabase
                                                    .from('attempts')
                                                    .select('*', { count: 'exact', head: true })
                                                    .eq('exam_id', exam.id)

                                                if (!countError && count > 0) {
                                                    const confirmMsg = `Exam "${exam.name}" has ${count} attempt(s). This will permanently delete the exam, its questions, and all attempt data. Proceed?`
                                                    if (!window.confirm(confirmMsg)) return
                                                }

                                                // Use RPC so deletes run with sufficient privileges (avoids FK + RLS issues)
                                                const { error: rpcError } = await supabase.rpc('delete_exam', {
                                                    target_exam_id: exam.id
                                                })

                                                if (rpcError) {
                                                    console.error('Error deleting exam:', rpcError)
                                                    alert('Failed to delete exam: ' + (rpcError.message || JSON.stringify(rpcError)))
                                                } else {
                                                    alert('Exam deleted.')
                                                    fetchExams()
                                                }
                                            } catch (err) {
                                                console.error('Unexpected error during delete:', err)
                                                alert('Unexpected error deleting exam')
                                            }
                                        }}
                                        style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Add Questions */}
                <div>
                    {selectedExamId ? (
                        <div style={{ background: 'white', border: '1px solid #ddd', padding: '1.5rem', borderRadius: '8px', position: 'sticky', top: '1rem' }}>
                            <h2 style={{ marginBottom: '1rem' }}>Manage: {exams.find(e => e.id === selectedExamId)?.name}</h2>

                            {/* Tabs or Sections for Single vs Bulk */}
                            {/* Bulk Upload Component */}
                            <div style={{ marginBottom: '2rem' }}>
                                <BulkUpload
                                    examId={selectedExamId}
                                    onUploadSuccess={fetchExams}
                                />
                            </div>

                            <h3>Add Single Question</h3>
                            <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                <textarea
                                    placeholder="Question Text"
                                    value={questionText}
                                    onChange={e => setQuestionText(e.target.value)}
                                    required
                                    rows={3}
                                    style={{ padding: '0.5rem' }}
                                />
                                <input placeholder="Option A" value={optionA} onChange={e => setOptionA(e.target.value)} required style={{ padding: '0.5rem' }} />
                                <input placeholder="Option B" value={optionB} onChange={e => setOptionB(e.target.value)} required style={{ padding: '0.5rem' }} />
                                <input placeholder="Option C" value={optionC} onChange={e => setOptionC(e.target.value)} required style={{ padding: '0.5rem' }} />
                                <input placeholder="Option D" value={optionD} onChange={e => setOptionD(e.target.value)} required style={{ padding: '0.5rem' }} />

                                <label>
                                    Correct Option:
                                    <select value={correctOption} onChange={e => setCorrectOption(e.target.value)} style={{ marginLeft: '0.5rem', padding: '0.25rem' }}>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>
                                </label>

                                <button type="submit" style={{ padding: '1rem', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Add Question</button>
                            </form>
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#666', border: '2px dashed #ddd', borderRadius: '8px' }}>
                            <h3>Select an exam from the left to manage questions</h3>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
