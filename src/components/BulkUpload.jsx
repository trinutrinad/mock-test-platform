import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import { mapQuestionsWithAI } from '../services/aiService'
import { stripBOM, validateCSVHeaders, parseCSVRows, sanitizeForDB } from '../services/csvUploadService'

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function BulkUpload({ examId, onUploadSuccess }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState([])
    const [uploading, setUploading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [fileType, setFileType] = useState(null)

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setPreview([])
        setError(null)
        setSuccess(null)

        const name = selectedFile.name.toLowerCase()
        if (name.endsWith('.csv')) setFileType('csv')
        else if (name.endsWith('.xlsx')) setFileType('excel')
        else if (name.endsWith('.pdf')) setFileType('pdf')
        else if (name.endsWith('.docx')) setFileType('word')
        else setFileType('unknown')
    }

    const processFile = async () => {
        if (!file) return
        setProcessing(true)
        setError(null)
        setPreview([])

        try {
            if (fileType === 'csv') parseCSV(file)
            else if (fileType === 'excel') parseExcel(file)
            else if (fileType === 'pdf') await parsePDF(file)
            else if (fileType === 'word') await parseWord(file)
            else setError('Unsupported file type. Please use .csv, .xlsx, .pdf, or .docx')
        } catch (err) {
            console.error('Processing failed:', err)
            setError('File processing failed: ' + err.message)
        } finally {
            setProcessing(false) // Note: CSV/Excel sync parsing might verify this earlier, but async PDF/Word needs it here
        }
    }

    // --- 1. Structured Parsing (CSV/Excel) ---

    const parseCSV = (file) => {
        try {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    // Read as text using UTF-8 and strip BOM if present
                    let text = e.target.result
                    text = stripBOM(text) // Remove UTF-8 BOM if present

                    // Parse CSV from string so we control encoding/BOM handling
                    Papa.parse(text, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: false,
                        transform: (val) => (typeof val === 'string' ? val.trim() : val),
                        complete: (results) => {
                            try {
                                // Dynamically validate headers
                                const fields = (results.meta && results.meta.fields) || []
                                const headerValidation = validateCSVHeaders(fields)

                                if (!headerValidation.valid) {
                                    setError('CSV header validation failed: ' + headerValidation.warnings.join('; ') + '\nFound headers: ' + fields.join(', '))
                                    return
                                }

                                // Log header validation warnings (bilingual detection, etc.)
                                if (headerValidation.warnings.length > 0) {
                                    console.log('CSV Header Warnings:', headerValidation.warnings.join('\n'))
                                }

                                // Parse rows with bilingual support
                                const { processedRows, summary } = parseCSVRows(results.data, examId, {
                                    bilingual: new Map(),
                                    single: {},
                                    mappedHeaders: headerValidation.mappedHeaders
                                })

                                console.log('CSV Parsing Summary:', summary)
                                console.log('Validation Logs:', summary.validationLogs)

                                validateAndPreview(processedRows, false)
                            } catch (validationErr) {
                                console.error('Header/row validation error:', validationErr)
                                setError('CSV validation failed: ' + validationErr.message)
                            }
                        },
                        error: (err) => {
                            console.error('PapaParse error:', err)
                            setError('Failed to parse CSV: ' + (err && err.message ? err.message : JSON.stringify(err)))
                        }
                    })
                } catch (inner) {
                    console.error('CSV processing error:', inner)
                    setError('CSV processing failed: ' + inner.message)
                }
            }
            // Use UTF-8 explicitly; browsers may handle BOM but we strip it via stripBOM
            reader.readAsText(file, 'utf-8')
        } catch (err) {
            console.error('parseCSV failed:', err)
            setError('Failed to read CSV file: ' + err.message)
        }
    }

    const parseExcel = (file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(sheet)
            validateAndPreview(jsonData, false)
        }
        reader.readAsArrayBuffer(file)
    }

    // --- 2. Unstructured Parsing (PDF/Word) ---

    const parsePDF = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            let fullText = ''

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items.map(item => item.str).join(' ')
                fullText += pageText + '\n'
            }

            // AI Mapping
            const extractedQuestions = await mapQuestionsWithAI(fullText)
            validateAndPreview(extractedQuestions, true)
        } catch (err) {
            throw new Error('PDF extraction failed: ' + err.message)
        }
    }

    const parseWord = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            const fullText = result.value

            // AI Mapping
            const extractedQuestions = await mapQuestionsWithAI(fullText)
            validateAndPreview(extractedQuestions, true)
        } catch (err) {
            throw new Error('Word extraction failed: ' + err.message)
        }
    }

    // --- Common Validation & Preview Logic ---

    const validateAndPreview = (data, isTypeset = false) => {
        // For CSV/Excel: data is pre-validated by parseCSVRows
        // For PDF/Word: data is from AI and needs validation
        
        if (isTypeset) {
            // AI-generated data from PDF/Word needs validation
            const findFirst = (obj, candidates) => {
                for (const c of candidates) {
                    if (Object.prototype.hasOwnProperty.call(obj, c) && obj[c] !== undefined && obj[c] !== null && String(obj[c]).toString().trim() !== '') return obj[c]
                }
                return undefined
            }

            const parseCorrectAnswer = (raw, options) => {
                if (raw === undefined || raw === null) return { letter: '', index: -1 }
                const str = String(raw).trim()
                if (!str) return { letter: '', index: -1 }

                // A/B/C/D
                const up = str.toUpperCase()
                if (['A', 'B', 'C', 'D'].includes(up)) return { letter: up, index: ['A', 'B', 'C', 'D'].indexOf(up) }

                // 1-4
                const num = parseInt(str, 10)
                if (!isNaN(num) && num >= 1 && num <= 4) {
                    const idx = num - 1
                    return { letter: ['A', 'B', 'C', 'D'][idx], index: idx }
                }

                // exact option text match (case-insensitive)
                if (Array.isArray(options)) {
                    const normalized = options.map(o => o ? String(o).trim().toLowerCase() : '')
                    const matchIndex = normalized.indexOf(str.toLowerCase())
                    if (matchIndex !== -1) return { letter: ['A', 'B', 'C', 'D'][matchIndex], index: matchIndex }
                }

                return { letter: '', index: -1 }
            }

            const processedRows = data.map((row, index) => {
                try {
                    if (!row || typeof row !== 'object') {
                        return {
                            id: index,
                            exam_id: examId,
                            question: '',
                            option_a: '',
                            option_b: '',
                            option_c: '',
                            option_d: '',
                            correct_option: '',
                            correct_index: -1,
                            errors: ['Malformed Row'],
                            validationLog: `Row ${index + 2}: Malformed`
                        }
                    }

                    const normalizedRow = {}
                    Object.keys(row).forEach(key => normalizedRow[key.toLowerCase().trim()] = row[key])

                    const question = findFirst(normalizedRow, ['question', 'question_text', 'q'])
                    const option_a = findFirst(normalizedRow, ['option_a', 'option a', 'a', 'opt_a', 'opt a', 'option1', 'option_1'])
                    const option_b = findFirst(normalizedRow, ['option_b', 'option b', 'b', 'opt_b', 'opt b', 'option2', 'option_2'])
                    const option_c = findFirst(normalizedRow, ['option_c', 'option c', 'c', 'opt_c', 'opt c', 'option3', 'option_3'])
                    const option_d = findFirst(normalizedRow, ['option_d', 'option d', 'd', 'opt_d', 'opt d', 'option4', 'option_4'])
                    const correct_raw = findFirst(normalizedRow, ['correct_answer', 'correct answer', 'correct', 'answer', 'correct_option', 'correctoption'])

                    const errors = []
                    if (!question) errors.push('Missing Question')
                    if (!option_a || !option_b || !option_c || !option_d) errors.push('Missing Options')

                    const options = [option_a || '', option_b || '', option_c || '', option_d || '']
                    const parsed = parseCorrectAnswer(correct_raw, options)
                    if (parsed.index === -1) errors.push('Invalid Answer')

                    return {
                        id: index,
                        exam_id: examId,
                        question: question || '',
                        option_a: option_a || '',
                        option_b: option_b || '',
                        option_c: option_c || '',
                        option_d: option_d || '',
                        correct_option: parsed.letter || '',
                        correct_index: parsed.index,
                        errors: errors,
                        validationLog: errors.length === 0 ? `Row ${index + 2}: Valid` : `Row ${index + 2}: ${errors.join(', ')}`
                    }
                } catch (rowErr) {
                    console.error('Row processing failed at index', index, rowErr)
                    return {
                        id: index,
                        exam_id: examId,
                        question: '',
                        option_a: '',
                        option_b: '',
                        option_c: '',
                        option_d: '',
                        correct_option: '',
                        correct_index: -1,
                        errors: ['Malformed Row', rowErr.message || String(rowErr)],
                        validationLog: `Row ${index + 2}: Exception - ${rowErr.message}`
                    }
                }
            })
            setPreview(processedRows)
        } else {
            // CSV/Excel is already pre-validated
            setPreview(data)
        }

        if (data.length === 0) {
            setError('No questions found in file.')
        }
    }

    // --- Editable Grid Handlers ---

    const handleEditChange = (index, field, value) => {
        setPreview(prev => {
            const newPreview = [...prev]
            newPreview[index] = { ...newPreview[index], [field]: value }

            // Re-validate row
            const row = newPreview[index]
            const errors = []
            if (!row.question) errors.push('Missing Question')
            if (!row.option_a || !row.option_b || !row.option_c || !row.option_d) errors.push('Missing Options')

            if (field === 'correct_option') {
                const val = value ? value.toString().toUpperCase().trim() : ''
                const valid = ['A', 'B', 'C', 'D'].includes(val)
                if (!valid) errors.push('Invalid Answer')
                else newPreview[index].correct_index = ['A', 'B', 'C', 'D'].indexOf(val)
            } else {
                // Check existing answer validity and try to keep index in sync
                const cur = row.correct_option ? row.correct_option.toString().toUpperCase().trim() : ''
                const valid = ['A', 'B', 'C', 'D'].includes(cur)
                if (!valid) errors.push('Invalid Answer')
                else newPreview[index].correct_index = ['A', 'B', 'C', 'D'].indexOf(cur)
            }

            newPreview[index].errors = errors
            return newPreview
        })
    }

    const handleDeleteRow = (index) => {
        setPreview(prev => prev.filter((_, i) => i !== index))
    }

    const handleConfirmUpload = async () => {
        // Upload only valid rows; log invalid rows for debugging
        const validRows = preview.filter(row => !row.errors || row.errors.length === 0)
        const invalidRows = preview.filter(row => row.errors && row.errors.length > 0)

        if (validRows.length === 0) {
            alert('No valid questions to upload. Please fix or remove invalid rows.')
            console.log('BulkUpload - invalid rows (none uploaded):', invalidRows)
            return
        }

        setUploading(true)
        try {
            // Prepare rows for insert using sanitizeForDB for proper UTF-8 handling
            const rowsToInsert = sanitizeForDB(validRows)

            if (invalidRows.length > 0) {
                console.log('BulkUpload - skipping invalid rows:', invalidRows.map(r => ({ row: r.id + 2, errors: r.errors, log: r.validationLog })))
            }

            if (!supabase) throw new Error('Database client not configured')

            const { error } = await supabase.from('questions').insert(rowsToInsert)
            if (error) throw error

            setSuccess(`Successfully uploaded ${rowsToInsert.length} questions! Skipped ${invalidRows.length} invalid rows.`)
            setFile(null)
            setPreview([])
            if (onUploadSuccess) onUploadSuccess()
        } catch (err) {
            setError('Upload failed: ' + err.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
            <h3 style={{ marginTop: 0, color: '#2563eb' }}>Universal Question Upload</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
                Supports <strong>CSV, Excel, PDF, Word</strong>. Auto-maps text to questions.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
                <input
                    type="file"
                    accept=".csv, .xlsx, .pdf, .docx"
                    onChange={handleFileChange}
                    style={{ fontSize: '0.9rem', padding: '0.5rem', border: '1px solid #eee', borderRadius: '4px' }}
                />

                {fileType && (
                    <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: '#e0e7ff', color: '#3730a3', borderRadius: '4px' }}>
                        Detected: {fileType.toUpperCase()}
                    </span>
                )}

                <button
                    onClick={processFile}
                    disabled={!file || processing}
                    style={{
                        padding: '0.5rem 1.5rem',
                        background: processing ? '#6c757d' : '#6f42c1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (!file || processing) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {processing ? 'Processing...' : 'Process File'}
                </button>
            </div>

            {error && (
                <div style={{ padding: '1rem', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #f5c6cb' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {success && (
                <div style={{ padding: '1rem', background: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #c3e6cb' }}>
                    {success}
                </div>
            )}

            {preview.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>Preview & Edit ({preview.length} Questions)</h4>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            {preview.filter(r => r.errors.length > 0).length} Invalid Rows
                        </span>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '1rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd', width: '30px' }}>#</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Question</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Options (A, B, C, D)</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd', width: '80px' }}>Ans</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd', width: '50px' }}>Act</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => {
                                    const hasError = row.errors.length > 0
                                    return (
                                        <tr key={i} style={{ background: hasError ? '#fff3cd' : 'white', borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '0.5rem', textAlign: 'center', color: '#666' }}>{i + 1}</td>

                                            {/* Editable Question */}
                                            <td style={{ padding: '0.5rem' }}>
                                                <textarea
                                                    value={row.question}
                                                    onChange={(e) => handleEditChange(i, 'question', e.target.value)}
                                                    rows={2}
                                                    style={{ width: '100%', border: '1px solid #ddd', padding: '0.25rem', borderRadius: '4px', fontSize: 'inherit' }}
                                                />
                                                {row.errors.includes('Missing Question') && <div style={{ color: 'red', fontSize: '0.75rem' }}>Required</div>}
                                            </td>

                                            {/* Editable Options */}
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                    <input value={row.option_a} onChange={(e) => handleEditChange(i, 'option_a', e.target.value)} placeholder="Opt A" style={{ border: '1px solid #ddd', borderRadius: '3px', padding: '2px' }} />
                                                    <input value={row.option_b} onChange={(e) => handleEditChange(i, 'option_b', e.target.value)} placeholder="Opt B" style={{ border: '1px solid #ddd', borderRadius: '3px', padding: '2px' }} />
                                                    <input value={row.option_c} onChange={(e) => handleEditChange(i, 'option_c', e.target.value)} placeholder="Opt C" style={{ border: '1px solid #ddd', borderRadius: '3px', padding: '2px' }} />
                                                    <input value={row.option_d} onChange={(e) => handleEditChange(i, 'option_d', e.target.value)} placeholder="Opt D" style={{ border: '1px solid #ddd', borderRadius: '3px', padding: '2px' }} />
                                                </div>
                                            </td>

                                            {/* Editable Answer */}
                                            <td style={{ padding: '0.5rem' }}>
                                                <select
                                                    value={row.correct_option}
                                                    onChange={(e) => handleEditChange(i, 'correct_option', e.target.value)}
                                                    style={{ width: '100%', padding: '0.25rem', border: row.errors.includes('Invalid Answer') || row.errors.includes('Missing Answer') ? '1px solid red' : '1px solid #ddd' }}
                                                >
                                                    <option value="">-</option>
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="C">C</option>
                                                    <option value="D">D</option>
                                                </select>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleDeleteRow(i)}
                                                    style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                                    title="Delete Row"
                                                >
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handleConfirmUpload}
                            disabled={uploading}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: uploading ? '#6c757d' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: uploading ? 'wait' : 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {uploading ? 'Uploading...' : `Confirm Upload (${preview.length})`}
                        </button>
                        <button
                            onClick={() => { setPreview([]); setFile(null); }}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Discard All
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
