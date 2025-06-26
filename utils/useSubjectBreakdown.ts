import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'
import { SubjectBreakdown } from '@/actions/dashboard-stats'

export function useSubjectBreakdown() {
  return useSWR<SubjectBreakdown[]>('/rpc/subject_breakdown', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('subject_breakdown')
    
    if (error) throw error
    return data || [] // [{ subject_id, name, total_min }]
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}