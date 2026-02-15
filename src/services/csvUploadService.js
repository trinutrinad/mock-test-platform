/**
 * Enhanced CSV Upload Service for Bilingual Support
 * Supports UTF-8, UTF-8-SIG (BOM), and bilingual column pairs
 * Production-ready with comprehensive error handling
 */

/**
 * Detect and remove BOM if present
 * @param {string} text - Raw text potentially with BOM
 * @returns {string} Text without BOM
 */
export const stripBOM = (text) => {
  if (typeof text === 'string' && text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1)
  }
  return text
}

/**
 * Normalize header by lowercasing and trimming
 * @param {string} header - Raw header string
 * @returns {string} Normalized header
 */
const normalizeHeader = (header) => {
  return String(header || '').toLowerCase().trim()
}

/**
 * Extract base name and language code from bilingual column
 * Examples: "Question_EN" -> {base: "question", lang: "en"}
 *          "OptionA_TE" -> {base: "optiona", lang: "te"}
 * @param {string} header - Column header
 * @returns {object|null} {base, lang} or null if not bilingual
 */
const parseBilingualColumn = (header) => {
  const match = header.match(/^(.+?)_(en|te|hi|ta|ml|kn|gu|mr|bn|pa|ur|as|ks)$/i)
  if (match) {
    return {
      base: match[1].toLowerCase(),
      lang: match[2].toLowerCase()
    }
  }
  return null
}

/**
 * Group headers into bilingual pairs and single columns
 * @param {string[]} headers - Array of raw headers
 * @returns {object} {bilingual: Map, single: {normalizedHeader: rawHeader}}
 */
const groupBilingualHeaders = (headers) => {
  const bilingual = new Map() // base -> {en, te, hi, etc}
  const single = {} // normalized -> raw

  headers.forEach(header => {
    const normalized = normalizeHeader(header)
    const parsed = parseBilingualColumn(normalized)

    if (parsed) {
      if (!bilingual.has(parsed.base)) {
        bilingual.set(parsed.base, {})
      }
      bilingual.get(parsed.base)[parsed.lang] = normalized
    } else {
      single[normalized] = header
    }
  })

  return { bilingual, single }
}

/**
 * Extract value from row, supporting multiple candidates
 * @param {object} row - Data row
 * @param {string[]} candidates - List of candidate normalized headers
 * @param {object} normalizedRowLookup - Map of normalized header to actual value
 * @returns {string|null} Extracted and trimmed value or null
 */
const findValue = (candidates, normalizedRowLookup) => {
  for (const candidate of candidates) {
    const val = normalizedRowLookup[candidate]
    if (val !== undefined && val !== null) {
      const str = String(val).trim()
      if (str !== '') return str
    }
  }
  return null
}

/**
 * Merge bilingual values with HTML line break
 * @param {object} bilingualGroup - Map entry like {en: "Hello", te: "హలో"}
 * @returns {string} Merged value like "Hello<br/>హలో"
 */
const mergeBilingualValue = (bilingualGroup) => {
  const parts = []
  // Define order: English first, then alphabetical by language
  const languages = ['en', 'te', 'hi', 'ta', 'ml', 'kn', 'gu', 'mr', 'bn', 'pa', 'ur', 'as', 'ks']
    .filter(lang => bilingualGroup[lang] !== undefined)

  for (const lang of languages) {
    const normalized = bilingualGroup[lang]
    const val = this.normalizedRow[normalized]
    if (val !== undefined && val !== null) {
      const str = String(val).trim()
      if (str !== '') parts.push(str)
    }
  }

  return parts.join('<br/>')
}

/**
 * Validate answer field (A/B/C/D format)
 * @param {string} answerStr - Raw answer value
 * @param {string[]} options - Array of [optionA, optionB, optionC, optionD]
 * @returns {object} {letter: "A"|"B"|"C"|"D"|"", index: 0-3|-1, isValid: boolean}
 */
const parseCorrectAnswer = (answerStr, options) => {
  if (!answerStr || answerStr === '') {
    return { letter: '', index: -1, isValid: false }
  }

  const str = String(answerStr).trim()
  if (!str) {
    return { letter: '', index: -1, isValid: false }
  }

  // Format 1: A/B/C/D
  const upper = str.toUpperCase()
  if (['A', 'B', 'C', 'D'].includes(upper)) {
    return { letter: upper, index: ['A', 'B', 'C', 'D'].indexOf(upper), isValid: true }
  }

  // Format 2: 1-4 (numeric)
  const num = parseInt(str, 10)
  if (!isNaN(num) && num >= 1 && num <= 4) {
    const idx = num - 1
    return { letter: ['A', 'B', 'C', 'D'][idx], index: idx, isValid: true }
  }

  // Format 3: Exact text match (case-insensitive)
  if (Array.isArray(options) && options.length === 4) {
    const normalized = options.map(o => (o ? String(o).trim().toLowerCase() : ''))
    const matchIndex = normalized.indexOf(str.toLowerCase())
    if (matchIndex !== -1) {
      return { letter: ['A', 'B', 'C', 'D'][matchIndex], index: matchIndex, isValid: true }
    }
  }

  return { letter: '', index: -1, isValid: false }
}

/**
 * Parse and validate a single CSV row
 * @param {object} rawRow - Raw data row from CSV
 * @param {number} rowIndex - Zero-based row index
 * @param {string} examId - Exam ID
 * @param {object} headerConfig - Header grouping config from validateCSVHeaders
 * @returns {object} Processed row with validation errors
 */
const processCSVRow = (rawRow, rowIndex, examId, headerConfig) => {
  const { bilingual, single, mappedHeaders } = headerConfig
  const errors = []
  let validationLog = `Row ${rowIndex + 2}: ` // +2 because CSV row 1 is headers, 0-indexed

  // Skip empty rows
  if (!rawRow || typeof rawRow !== 'object' || Object.keys(rawRow).length === 0) {
    errors.push('Empty row')
    return {
      id: rowIndex,
      exam_id: examId,
      question: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: '',
      correct_index: -1,
      errors,
      validationLog: validationLog + 'Skipped - empty'
    }
  }

  // Normalize all keys to lowercase for lookup
  const normalizedRow = {}
  Object.entries(rawRow).forEach(([key, value]) => {
    normalizedRow[normalizeHeader(key)] = value
  })

  // Extract main fields (single-language or merged bilingual)
  let question = ''
  let option_a = ''
  let option_b = ''
  let option_c = ''
  let option_d = ''

  // Question
  if (mappedHeaders.question.bilingual) {
    const qGroup = mappedHeaders.question.headers
    const parts = []
    Object.entries(qGroup).forEach(([lang, normalized]) => {
      const val = normalizedRow[normalized]
      if (val !== undefined && val !== null) {
        const str = String(val).trim()
        if (str) parts.push(str)
      }
    })
    question = parts.join('<br/>')
  } else {
    question = findValue(mappedHeaders.question.candidates, normalizedRow) || ''
  }

  // Option A
  if (mappedHeaders.option_a.bilingual) {
    const aGroup = mappedHeaders.option_a.headers
    const parts = []
    Object.entries(aGroup).forEach(([lang, normalized]) => {
      const val = normalizedRow[normalized]
      if (val !== undefined && val !== null) {
        const str = String(val).trim()
        if (str) parts.push(str)
      }
    })
    option_a = parts.join('<br/>')
  } else {
    option_a = findValue(mappedHeaders.option_a.candidates, normalizedRow) || ''
  }

  // Option B
  if (mappedHeaders.option_b.bilingual) {
    const bGroup = mappedHeaders.option_b.headers
    const parts = []
    Object.entries(bGroup).forEach(([lang, normalized]) => {
      const val = normalizedRow[normalized]
      if (val !== undefined && val !== null) {
        const str = String(val).trim()
        if (str) parts.push(str)
      }
    })
    option_b = parts.join('<br/>')
  } else {
    option_b = findValue(mappedHeaders.option_b.candidates, normalizedRow) || ''
  }

  // Option C
  if (mappedHeaders.option_c.bilingual) {
    const cGroup = mappedHeaders.option_c.headers
    const parts = []
    Object.entries(cGroup).forEach(([lang, normalized]) => {
      const val = normalizedRow[normalized]
      if (val !== undefined && val !== null) {
        const str = String(val).trim()
        if (str) parts.push(str)
      }
    })
    option_c = parts.join('<br/>')
  } else {
    option_c = findValue(mappedHeaders.option_c.candidates, normalizedRow) || ''
  }

  // Option D
  if (mappedHeaders.option_d.bilingual) {
    const dGroup = mappedHeaders.option_d.headers
    const parts = []
    Object.entries(dGroup).forEach(([lang, normalized]) => {
      const val = normalizedRow[normalized]
      if (val !== undefined && val !== null) {
        const str = String(val).trim()
        if (str) parts.push(str)
      }
    })
    option_d = parts.join('<br/>')
  } else {
    option_d = findValue(mappedHeaders.option_d.candidates, normalizedRow) || ''
  }

  // Answer
  const answerRaw = findValue(mappedHeaders.answer.candidates, normalizedRow) || ''
  const options = [option_a, option_b, option_c, option_d]
  const answerParsed = parseCorrectAnswer(answerRaw, options)

  // Validation
  if (!question) {
    errors.push('Missing Question')
    validationLog += ' | Missing Question'
  }
  if (!option_a || !option_b || !option_c || !option_d) {
    errors.push('Missing Options')
    validationLog += ' | Missing Options'
  }
  if (!answerParsed.isValid) {
    errors.push('Invalid Answer')
    validationLog += ' | Invalid Answer'
  }

  if (errors.length === 0) {
    validationLog += ' | Valid'
  }

  return {
    id: rowIndex,
    exam_id: examId,
    question: question || '',
    option_a: option_a || '',
    option_b: option_b || '',
    option_c: option_c || '',
    option_d: option_d || '',
    correct_option: answerParsed.letter || '',
    correct_index: answerParsed.index,
    errors,
    validationLog
  }
}

/**
 * Dynamically validate and map CSV headers
 * Supports bilingual columns: Question_EN, Question_TE, etc.
 * Falls back to single-language columns: Question, question_text, q
 * @param {string[]} headers - Raw CSV headers
 * @returns {object} {valid: boolean, mappedHeaders: object, warnings: string[]}
 */
export const validateCSVHeaders = (headers) => {
  const warnings = []
  const { bilingual, single } = groupBilingualHeaders(headers)

  // Candidates for single-language columns
  const questionCandidates = ['question', 'question_text', 'q', 'question_title']
  const optionACandidates = ['option_a', 'option a', 'a', 'opt_a', 'opt a', 'option1', 'option_1', 'answer_a']
  const optionBCandidates = ['option_b', 'option b', 'b', 'opt_b', 'opt b', 'option2', 'option_2', 'answer_b']
  const optionCCandidates = ['option_c', 'option c', 'c', 'opt_c', 'opt c', 'option3', 'option_3', 'answer_c']
  const optionDCandidates = ['option_d', 'option d', 'd', 'opt_d', 'opt d', 'option4', 'option_4', 'answer_d']
  const answerCandidates = ['correct_answer', 'correct answer', 'correct', 'answer', 'correct_option', 'correctoption', 'ans', 'right_answer']

  const mappedHeaders = {}

  // Map Question
  if (bilingual.has('question')) {
    mappedHeaders.question = {
      bilingual: true,
      headers: bilingual.get('question')
    }
    warnings.push(`Detected bilingual Question columns: ${Object.keys(bilingual.get('question')).join(', ')}`)
  } else {
    const found = questionCandidates.find(c => single[c] !== undefined)
    if (!found) {
      return {
        valid: false,
        mappedHeaders: null,
        warnings: [...warnings, 'No Question column found']
      }
    }
    mappedHeaders.question = {
      bilingual: false,
      candidates: [found]
    }
  }

  // Map Option A
  if (bilingual.has('optiona')) {
    mappedHeaders.option_a = {
      bilingual: true,
      headers: bilingual.get('optiona')
    }
  } else {
    const found = optionACandidates.find(c => single[c] !== undefined)
    if (!found) {
      return {
        valid: false,
        mappedHeaders: null,
        warnings: [...warnings, 'No Option A column found']
      }
    }
    mappedHeaders.option_a = {
      bilingual: false,
      candidates: [found]
    }
  }

  // Map Option B
  if (bilingual.has('optionb')) {
    mappedHeaders.option_b = {
      bilingual: true,
      headers: bilingual.get('optionb')
    }
  } else {
    const found = optionBCandidates.find(c => single[c] !== undefined)
    if (!found) {
      return {
        valid: false,
        mappedHeaders: null,
        warnings: [...warnings, 'No Option B column found']
      }
    }
    mappedHeaders.option_b = {
      bilingual: false,
      candidates: [found]
    }
  }

  // Map Option C
  if (bilingual.has('optionc')) {
    mappedHeaders.option_c = {
      bilingual: true,
      headers: bilingual.get('optionc')
    }
  } else {
    const found = optionCCandidates.find(c => single[c] !== undefined)
    if (!found) {
      return {
        valid: false,
        mappedHeaders: null,
        warnings: [...warnings, 'No Option C column found']
      }
    }
    mappedHeaders.option_c = {
      bilingual: false,
      candidates: [found]
    }
  }

  // Map Option D
  if (bilingual.has('optiond')) {
    mappedHeaders.option_d = {
      bilingual: true,
      headers: bilingual.get('optiond')
    }
  } else {
    const found = optionDCandidates.find(c => single[c] !== undefined)
    if (!found) {
      return {
        valid: false,
        mappedHeaders: null,
        warnings: [...warnings, 'No Option D column found']
      }
    }
    mappedHeaders.option_d = {
      bilingual: false,
      candidates: [found]
    }
  }

  // Map Answer (optional but good to have)
  const answerFound = answerCandidates.find(c => single[c] !== undefined)
  mappedHeaders.answer = {
    bilingual: false,
    candidates: answerFound ? [answerFound] : []
  }

  return {
    valid: true,
    mappedHeaders,
    warnings
  }
}

/**
 * Parse CSV text with bilingual support
 * Expects CSV to be pre-parsed into array of objects by PapaParse
 * @param {object[]} rows - Pre-parsed CSV data from PapaParse
 * @param {string} examId - Exam ID for context
 * @param {object} headerConfig - Validated header config
 * @returns {object} {processedRows, summary}
 */
export const parseCSVRows = (rows, examId, headerConfig) => {
  const processedRows = []
  const validRows = []
  const invalidRows = []
  const validationLogs = []

  rows.forEach((row, index) => {
    try {
      const processed = processCSVRow(row, index, examId, headerConfig)
      processedRows.push(processed)
      validationLogs.push(processed.validationLog)

      if (processed.errors.length === 0) {
        validRows.push(processed)
      } else {
        invalidRows.push(processed)
      }
    } catch (err) {
      const errorRow = {
        id: index,
        exam_id: examId,
        question: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: '',
        correct_index: -1,
        errors: ['Parse Error: ' + err.message],
        validationLog: `Row ${index + 2}: Parse error - ${err.message}`
      }
      processedRows.push(errorRow)
      invalidRows.push(errorRow)
      validationLogs.push(errorRow.validationLog)
    }
  })

  return {
    processedRows,
    validRows,
    invalidRows,
    summary: {
      totalRows: processedRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      validationLogs
    }
  }
}

/**
 * Prepare rows for database insertion (sanitize encoding, ensure UTF-8)
 * @param {object[]} rows - Processed rows
 * @returns {object[]} Sanitized rows ready for insertion
 */
export const sanitizeForDB = (rows) => {
  return rows.map(row => {
    const sanitized = {}
    Object.entries(row).forEach(([key, value]) => {
      // Skip internal fields
      if (['id', 'errors', 'validationLog', 'correct_index'].includes(key)) {
        return
      }
      // Ensure all values are strings, handle null/undefined
      if (value === null || value === undefined) {
        sanitized[key] = ''
      } else {
        sanitized[key] = String(value)
      }
    })
    return sanitized
  })
}

export default {
  stripBOM,
  validateCSVHeaders,
  parseCSVRows,
  sanitizeForDB
}
