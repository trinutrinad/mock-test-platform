import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')

const env = {}
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
        env[key.trim()] = value.trim()
    }
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testExamCreation() {
    // Skip creation since we don't have auth
    // const { data: insertData, error: insertError } = await supabase...

    // Test 1: Explicit select
    console.log('Test 1: Selecting "is_deleted" explicitly...')
    const { data: data1, error: error1 } = await supabase
        .from('exams')
        .select('id, name, is_deleted')
        .limit(1)

    if (error1) {
        console.error('Test 1 Failed (Column likely missing):', error1.message)
    } else {
        console.log('Test 1 Success. Data:', data1)
    }

    // Test 3: Verifying fix - Fetching ALL exams without filter
    console.log('Test 3: Fetching exams for Admin Panel view (without filter)...')
    const { data: data3, error: error3 } = await supabase
        .from('exams')
        .select('*, questions(count)')
        .order('created_at', { ascending: false })

    if (error3) {
        console.error('Test 3 Failed:', error3.message)
    } else {
        console.log(`Test 3 Success. Fetched ${data3.length} exams.`)
        if (data3.length > 0) {
            console.log('Sample exam:', { name: data3[0].name, is_deleted: data3[0].is_deleted })
        }
    }
}
// testExamCreation()
testExamCreation()
