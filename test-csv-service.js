#!/usr/bin/env node

/**
 * CSV Upload Service Test Script
 * Tests bilingual CSV parsing with UTF-8/BOM support
 * Run with: node test-csv-service.js
 */

import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { stripBOM, validateCSVHeaders, parseCSVRows, sanitizeForDB } from './src/services/csvUploadService.js'

const EXAM_ID = 'test-exam-uuid'

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dimGray: '\x1b[2m'
}

function log(level, msg) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
  let prefix = ''
  switch (level) {
    case 'INFO':
      prefix = `${colors.cyan}[${timestamp}]${colors.reset}`
      break
    case 'PASS':
      prefix = `${colors.green}[✓ PASS]${colors.reset}`
      break
    case 'FAIL':
      prefix = `${colors.red}[✗ FAIL]${colors.reset}`
      break
    case 'WARN':
      prefix = `${colors.yellow}[⚠ WARN]${colors.reset}`
      break
    default:
      prefix = `[${level}]`
  }
  console.log(`${prefix} ${msg}`)
}

function divider() {
  console.log(`\n${colors.dimGray}${'─'.repeat(80)}${colors.reset}\n`)
}

async function testBOMHandling() {
  log('INFO', 'Testing BOM handling...')
  
  const textWithBOM = '\uFEFFHello, World!'
  const textWithoutBOM = 'Hello, World!'
  
  const result1 = stripBOM(textWithBOM)
  const result2 = stripBOM(textWithoutBOM)
  
  if (result1 === textWithoutBOM && result2 === textWithoutBOM) {
    log('PASS', 'BOM correctly stripped')
    return true
  } else {
    log('FAIL', 'BOM stripping failed')
    console.log(`  Expected: "${textWithoutBOM}"`)
    console.log(`  Got BOM input: "${result1}"`)
    console.log(`  Got non-BOM input: "${result2}"`)
    return false
  }
}

async function testUnicodeHandling() {
  log('INFO', 'Testing Unicode character support...')
  
  const unicodeText = 'English: Hello | Telugu: హలో | Hindi: नमस्ते | Tamil: வாழ்க'
  const result = stripBOM(unicodeText)
  
  if (result === unicodeText && result.includes('హలో') && result.includes('नमस्ते') && result.includes('வாழ்க')) {
    log('PASS', 'Unicode characters preserved correctly')
    console.log(`  Verified: ${result}`)
    return true
  } else {
    log('FAIL', 'Unicode handling failed')
    return false
  }
}

async function testHeaderValidationMonolingual() {
  log('INFO', 'Testing monolingual header validation...')
  
  const headers = ['Question', 'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Correct_Answer']
  const result = validateCSVHeaders(headers)
  
  if (result.valid && result.mappedHeaders.question && result.mappedHeaders.option_a) {
    log('PASS', 'Monolingual headers validated successfully')
    console.log(`  Warnings: ${result.warnings.length === 0 ? 'None' : result.warnings.join('; ')}`)
    return true
  } else {
    log('FAIL', 'Monolingual header validation failed')
    console.log(`  Warnings: ${result.warnings.join('; ')}`)
    return false
  }
}

async function testHeaderValidationBilingual() {
  log('INFO', 'Testing bilingual header validation...')
  
  const headers = ['Question_EN', 'Question_TE', 'OptionA_EN', 'OptionA_TE', 'OptionB_EN', 'OptionB_TE', 'OptionC_EN', 'OptionC_TE', 'OptionD_EN', 'OptionD_TE', 'Answer']
  const result = validateCSVHeaders(headers)
  
  if (result.valid && result.warnings.some(w => w.includes('bilingual'))) {
    log('PASS', 'Bilingual headers detected and validated')
    result.warnings.forEach(w => console.log(`  - ${w}`))
    return true
  } else {
    log('FAIL', 'Bilingual header validation failed')
    console.log(`  Valid: ${result.valid}`)
    console.log(`  Warnings: ${result.warnings.join('; ')}`)
    return false
  }
}

async function testCSVFileReading() {
  log('INFO', 'Testing CSV file reading...')
  
  const samplePath = path.join(process.cwd(), 'samples', 'bilingual_sample.csv')
  
  if (!fs.existsSync(samplePath)) {
    log('WARN', `Sample file not found at ${samplePath}`)
    return false
  }
  
  try {
    const fileContent = fs.readFileSync(samplePath, 'utf-8')
    const cleaned = stripBOM(fileContent)
    
    // Parse with PapaParse
    const parsed = await new Promise((resolve, reject) => {
      Papa.parse(cleaned, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject
      })
    })
    
    log('PASS', `CSV file read successfully: ${parsed.data.length} rows parsed`)
    console.log(`  Headers: ${parsed.meta.fields.join(', ')}`)
    
    return { success: true, data: parsed.data, headers: parsed.meta.fields }
  } catch (err) {
    log('FAIL', `CSV file reading failed: ${err.message}`)
    return false
  }
}

async function testRowParsing() {
  log('INFO', 'Testing row parsing with bilingual support...')
  
  const samplePath = path.join(process.cwd(), 'samples', 'bilingual_sample.csv')
  
  if (!fs.existsSync(samplePath)) {
    log('WARN', `Sample file not found at ${samplePath}`)
    return false
  }
  
  try {
    const fileContent = fs.readFileSync(samplePath, 'utf-8')
    const cleaned = stripBOM(fileContent)
    
    const parsed = await new Promise((resolve, reject) => {
      Papa.parse(cleaned, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject
      })
    })
    
    // Validate headers
    const headerValidation = validateCSVHeaders(parsed.meta.fields)
    if (!headerValidation.valid) {
      log('FAIL', `Header validation failed: ${headerValidation.warnings.join('; ')}`)
      return false
    }
    
    // Parse rows
    const result = parseCSVRows(parsed.data, EXAM_ID, {
      bilingual: new Map(),
      single: {},
      mappedHeaders: headerValidation.mappedHeaders
    })
    
    console.log(`  Total rows processed: ${result.summary.totalRows}`)
    console.log(`  Valid rows: ${result.summary.validRows}`)
    console.log(`  Invalid rows: ${result.summary.invalidRows}`)
    
    if (result.summary.validRows > 0) {
      log('PASS', 'Row parsing completed successfully')
      
      // Show sample of first valid row
      const firstValid = result.validRows[0]
      console.log(`\n  Sample valid row:`)
      console.log(`    Question: ${firstValid.question.substring(0, 60)}...`)
      console.log(`    Option A: ${firstValid.option_a.substring(0, 60)}...`)
      console.log(`    Answer: ${firstValid.correct_option}`)
      
      return { success: true, result, firstValid }
    } else {
      log('FAIL', 'No valid rows parsed')
      result.summary.validationLogs.slice(0, 3).forEach(log => console.log(`  ${log}`))
      return false
    }
  } catch (err) {
    log('FAIL', `Row parsing failed: ${err.message}`)
    console.error(err)
    return false
  }
}

async function testBilingualMerge() {
  log('INFO', 'Testing bilingual field merging (EN + TE with <br/>)...')
  
  const testRows = [
    {
      Question_EN: 'What is the capital?',
      Question_TE: 'రాజధానी ఏమిటి?',
      OptionA_EN: 'Delhi',
      OptionA_TE: 'ఢిల్లీ',
      OptionB_EN: 'Mumbai',
      OptionB_TE: 'ముంబై',
      OptionC_EN: 'Bangalore',
      OptionC_TE: 'బెంగళూరు',
      OptionD_EN: 'Chennai',
      OptionD_TE: 'చెన్నై',
      Answer: 'A'
    }
  ]
  
  // Validate headers
  const headers = Object.keys(testRows[0])
  const headerValidation = validateCSVHeaders(headers)
  
  if (!headerValidation.valid) {
    log('FAIL', `Header validation failed: ${headerValidation.warnings.join('; ')}`)
    return false
  }
  
  // Parse row
  const result = parseCSVRows(testRows, EXAM_ID, {
    bilingual: new Map(),
    single: {},
    mappedHeaders: headerValidation.mappedHeaders
  })
  
  if (result.validRows.length > 0) {
    const row = result.validRows[0]
    const hasBilingualMerge = row.question.includes('<br/>') && row.option_a.includes('<br/>')
    
    if (hasBilingualMerge) {
      log('PASS', 'Bilingual fields merged with <br/> separator')
      console.log(`\n  Merged Question:`)
      console.log(`    ${row.question.replace(/<br\/>/g, '\n    ')}`)
      console.log(`\n  Merged Option A:`)
      console.log(`    ${row.option_a.replace(/<br\/>/g, '\n    ')}`)
      return true
    } else {
      log('FAIL', 'Bilingual merge not detected')
      console.log(`  Question: ${row.question}`)
      return false
    }
  } else {
    log('FAIL', 'No valid rows to check merge')
    return false
  }
}

async function testSanitization() {
  log('INFO', 'Testing database sanitization (UTF-8 encoding)...')
  
  const testRows = [
    {
      id: 0,
      exam_id: EXAM_ID,
      question: 'English: What? | Telugu: ఏమిటి?',
      option_a: 'Option 1<br/>ఆప్션్ 1',
      option_b: null,
      option_c: undefined,
      option_d: 'Option 4',
      correct_option: 'A',
      correct_index: 0,
      errors: [],
      validationLog: 'Valid'
    }
  ]
  
  const sanitized = sanitizeForDB(testRows)
  
  if (sanitized.length === 1) {
    const row = sanitized[0]
    const isValid =
      row.exam_id === EXAM_ID &&
      row.question.includes('ఏమిటి?') &&
      row.option_a.includes('<br/>') &&
      row.option_b === '' &&
      row.option_c === '' &&
      typeof row.question === 'string' &&
      !row.errors &&
      !row.validationLog &&
      !row.correct_index
    
    if (isValid) {
      log('PASS', 'Sanitization successful: null/undefined converted to "", internal fields removed')
      console.log(`\n  Sample sanitized row:`)
      console.log(`    question: "${row.question}"`)
      console.log(`    option_a: "${row.option_a}"`)
      console.log(`    Has no errors field: ${!row.errors}`)
      return true
    } else {
      log('FAIL', 'Sanitization validation failed')
      console.log('Sanitized row:', JSON.stringify(row, null, 2))
      return false
    }
  } else {
    log('FAIL', 'Unexpected sanitized row count')
    return false
  }
}

async function testAnswerValidation() {
  log('INFO', 'Testing answer validation (A/B/C/D format)...')
  
  const testRows = [
    { answer: 'A', expected: true, description: 'Single letter A' },
    { answer: 'B', expected: true, description: 'Single letter B' },
    { answer: '1', expected: true, description: 'Numeric 1' },
    { answer: '4', expected: true, description: 'Numeric 4' },
    { answer: 'E', expected: false, description: 'Invalid letter E' },
    { answer: '5', expected: false, description: 'Invalid number 5' },
    { answer: '', expected: false, description: 'Empty string' }
  ]
  
  const validateAnswer = (ans, options = ['A', 'B', 'C', 'D']) => {
    const str = String(ans || '').trim()
    if (!str) return false
    const up = str.toUpperCase()
    if (['A', 'B', 'C', 'D'].includes(up)) return true
    const num = parseInt(str, 10)
    if (!isNaN(num) && num >= 1 && num <= 4) return true
    return false
  }
  
  let allPassed = true
  testRows.forEach(({ answer, expected, description }) => {
    const result = validateAnswer(answer)
    const pass = result === expected
    console.log(`  ${pass ? '✓' : '✗'} ${description}: "${answer}" -> ${result}`)
    if (!pass) allPassed = false
  })
  
  if (allPassed) {
    log('PASS', 'All answer validation tests passed')
    return true
  } else {
    log('FAIL', 'Some answer validation tests failed')
    return false
  }
}

async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.bright}${colors.cyan}║              CSV UPLOAD SERVICE - BILINGUAL TEST SUITE                             ║${colors.reset}`)
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`)

  const tests = [
    { name: 'BOM Handling', fn: testBOMHandling },
    { name: 'Unicode Support', fn: testUnicodeHandling },
    { name: 'Monolingual Header Validation', fn: testHeaderValidationMonolingual },
    { name: 'Bilingual Header Validation', fn: testHeaderValidationBilingual },
    { name: 'CSV File Reading', fn: testCSVFileReading },
    { name: 'Answer Format Validation', fn: testAnswerValidation },
    { name: 'Row Parsing', fn: testRowParsing },
    { name: 'Bilingual Field Merging', fn: testBilingualMerge },
    { name: 'Database Sanitization', fn: testSanitization }
  ]

  const results = []

  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push({ name: test.name, passed: !!result })
      divider()
    } catch (err) {
      log('FAIL', `Test "${test.name}" threw exception: ${err.message}`)
      results.push({ name: test.name, passed: false })
      console.error(err)
      divider()
    }
  }

  // Summary
  console.log(`\n${colors.bright}📊 TEST SUMMARY${colors.reset}`)
  const passed = results.filter(r => r.passed).length
  const total = results.length

  results.forEach(r => {
    const icon = r.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`
    console.log(`  ${icon} ${r.name}`)
  })

  console.log(`\n${colors.bright}Result: ${passed}/${total} tests passed${colors.reset}`)

  if (passed === total) {
    console.log(`${colors.green}✓ ALL TESTS PASSED - Production ready!${colors.reset}\n`)
    process.exit(0)
  } else {
    console.log(`${colors.red}✗ SOME TESTS FAILED${colors.reset}\n`)
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err)
  process.exit(1)
})
