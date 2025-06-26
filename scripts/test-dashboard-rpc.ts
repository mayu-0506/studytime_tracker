import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testDashboardRPC() {
  console.log('Testing Dashboard RPC functions...\n')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Test each RPC function
  const rpcs = [
    'dashboard_totals',
    'subject_breakdown',
    'last_7_day_buckets',  // アンダースコア付きに修正
    'last_4_week_buckets'  // アンダースコア付きに修正
  ]

  for (const rpc of rpcs) {
    try {
      console.log(`Testing ${rpc}...`)
      const { data, error } = await supabase.rpc(rpc)
      
      if (error) {
        console.error(`❌ ${rpc}: ${error.message}`)
        if (error.message.includes('not exist')) {
          console.log(`   → RPC function "${rpc}" does not exist in the database`)
          console.log(`   → Please run: scripts/sql/dashboard-rpc-functions.sql`)
        }
      } else {
        console.log(`✅ ${rpc}: Success`)
        console.log(`   Data:`, data)
      }
    } catch (err) {
      console.error(`❌ ${rpc}: Unexpected error:`, err)
    }
    console.log('')
  }

  // Test monthly_calendar with parameters
  try {
    console.log('Testing monthly_calendar with parameters...')
    const firstDay = new Date()
    firstDay.setDate(1)
    const lastDay = new Date(firstDay)
    lastDay.setMonth(lastDay.getMonth() + 1)
    lastDay.setDate(0)

    const { data, error } = await supabase.rpc('monthly_calendar', {
      _first: firstDay.toISOString().split('T')[0],
      _last: lastDay.toISOString().split('T')[0]
    })
    
    if (error) {
      console.error(`❌ monthly_calendar: ${error.message}`)
      if (error.message.includes('not exist')) {
        console.log(`   → RPC function "monthly_calendar" does not exist in the database`)
        console.log(`   → Please run: scripts/sql/dashboard-rpc-functions.sql`)
      }
    } else {
      console.log(`✅ monthly_calendar: Success`)
      console.log(`   Data:`, data)
    }
  } catch (err) {
    console.error(`❌ monthly_calendar: Unexpected error:`, err)
  }
}

testDashboardRPC()