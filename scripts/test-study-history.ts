import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testStudyHistory() {
  console.log('Testing get_study_history function...\n')

  // Get a test user
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)

  if (userError) {
    console.error('Error fetching user:', userError)
    return
  }

  if (!users || users.length === 0) {
    console.log('No users found in the database')
    return
  }

  const userId = users[0].id
  console.log(`Testing with user ID: ${userId}\n`)

  // Test different periods
  const periods = ['day', 'week', 'month'] as const

  for (const period of periods) {
    console.log(`\nTesting ${period} period:`)
    console.log('-'.repeat(40))

    const { data, error } = await supabase.rpc('get_study_history', {
      user_id_param: userId,
      period_param: period,
      limit_param: 10
    })

    if (error) {
      console.error(`Error for ${period}:`, error)
      continue
    }

    if (!data || data.length === 0) {
      console.log(`No data found for ${period} period`)
      continue
    }

    console.log(`Found ${data.length} records:`)
    data.forEach((record: any) => {
      const date = new Date(record.period_start)
      const formattedDate = period === 'day' 
        ? date.toLocaleDateString('ja-JP')
        : period === 'week'
        ? `Week starting ${date.toLocaleDateString('ja-JP')}`
        : date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
      
      const hours = Math.floor(record.total_minutes / 60)
      const minutes = record.total_minutes % 60
      console.log(`  ${formattedDate}: ${hours}h ${minutes}m`)
    })
  }
}

testStudyHistory()
  .then(() => {
    console.log('\nTest completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })