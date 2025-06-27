import { createClient } from '@/utils/supabase/client'
import { StudySessionType } from '@/types'
import { Subject } from './subjects'
import { PRESET_SUBJECTS, PresetSubject } from '@/types/database'

export interface SessionWithSubject extends StudySessionType {
  subject?: Subject
}

export interface SubjectSummary {
  subjectId: string
  subject: Subject
  totalMinutes: number
}

/**
 * 今日の学習セッションを科目情報付きで取得
 */
export async function getTodaySessionsWithSubjects(userId: string): Promise<SessionWithSubject[]> {
  const supabase = createClient()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: false })
  
  if (error) {
    console.error('Error fetching today sessions:', error)
    return []
  }
  
  // カスタム科目を別途取得
  const customSubjectIds = sessions
    ?.filter(s => s.custom_subject_id)
    .map(s => s.custom_subject_id)
    .filter((id): id is string => id !== null) || []
  
  let customSubjectsMap = new Map<string, any>()
  
  if (customSubjectIds.length > 0) {
    const { data: customSubjects } = await supabase
      .from('custom_subjects')
      .select('*')
      .in('id', customSubjectIds)
    
    if (customSubjects) {
      customSubjects.forEach(cs => {
        customSubjectsMap.set(cs.id, cs)
      })
    }
  }
  
  // 科目情報を付加
  const sessionsWithSubjects: SessionWithSubject[] = []
  
  for (const session of sessions || []) {
    let subject: Subject | undefined
    
    if (session.preset_subject) {
      const presetKey = session.preset_subject as PresetSubject
      subject = {
        id: `preset_${presetKey}`,
        name: presetKey,
        color: PRESET_SUBJECTS[presetKey].color,
        isPreset: true,
        presetKey
      }
    } else if (session.custom_subject_id) {
      const customSubject = customSubjectsMap.get(session.custom_subject_id)
      if (customSubject) {
        subject = {
          id: session.custom_subject_id,
          name: customSubject.name,
          color: customSubject.color_hex,
          isPreset: false
        }
      }
    }
    
    sessionsWithSubjects.push({
      ...session,
      subject
    })
  }
  
  return sessionsWithSubjects
}

/**
 * 指定期間内の科目別学習時間のサマリーを取得
 */
export async function getSubjectSummaryForPeriod(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SubjectSummary[]> {
  const supabase = createClient()
  
  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('preset_subject, custom_subject_id, duration_min, duration')
    .eq('user_id', userId)
    .gte('start_time', startDate.toISOString())
    .lt('start_time', endDate.toISOString())
  
  if (error) {
    console.error('Error fetching subject summary:', error)
    return []
  }
  
  // カスタム科目を別途取得
  const customSubjectIds = sessions
    ?.filter(s => s.custom_subject_id)
    .map(s => s.custom_subject_id)
    .filter((id): id is string => id !== null) || []
  
  let customSubjectsMap = new Map<string, any>()
  
  if (customSubjectIds.length > 0) {
    const { data: customSubjects } = await supabase
      .from('custom_subjects')
      .select('*')
      .in('id', customSubjectIds)
    
    if (customSubjects) {
      customSubjects.forEach(cs => {
        customSubjectsMap.set(cs.id, cs)
      })
    }
  }
  
  // 科目別に集計
  const summaryMap = new Map<string, { subject: Subject; totalMinutes: number }>()
  
  for (const session of sessions || []) {
    const duration = session.duration_min || session.duration || 0
    
    if (session.preset_subject) {
      const presetKey = session.preset_subject as PresetSubject
      const subjectId = `preset_${presetKey}`
      
      if (!summaryMap.has(subjectId)) {
        summaryMap.set(subjectId, {
          subject: {
            id: subjectId,
            name: presetKey,
            color: PRESET_SUBJECTS[presetKey].color,
            isPreset: true,
            presetKey
          },
          totalMinutes: 0
        })
      }
      
      const current = summaryMap.get(subjectId)!
      current.totalMinutes += duration
    } else if (session.custom_subject_id) {
      const subjectId = session.custom_subject_id
      const customSubject = customSubjectsMap.get(subjectId)
      
      if (customSubject && !summaryMap.has(subjectId)) {
        summaryMap.set(subjectId, {
          subject: {
            id: subjectId,
            name: customSubject.name,
            color: customSubject.color_hex,
            isPreset: false
          },
          totalMinutes: 0
        })
      }
      
      if (summaryMap.has(subjectId)) {
        const current = summaryMap.get(subjectId)!
        current.totalMinutes += duration
      }
    }
  }
  
  // Map to array and sort by total time
  return Array.from(summaryMap.entries())
    .map(([subjectId, data]) => ({
      subjectId,
      subject: data.subject,
      totalMinutes: data.totalMinutes
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
}