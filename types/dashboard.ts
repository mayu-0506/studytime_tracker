export interface DashboardTotals {
  total_min: number
  current_week_min: number
  current_month_min: number
}

// Database RPCから返される実際の型に合わせる
export interface SubjectBreakdown {
  subject_id: string
  name: string
  total_min: number
}

export interface DayBucket {
  d: string
  total_min: number
}

export interface WeekBucket {
  week_start: string
  total_min: number
}

export interface DashboardInitialData {
  totals: DashboardTotals | null
  subjectBreakdown: SubjectBreakdown[]
  dayBuckets: DayBucket[]
  weekBuckets: WeekBucket[]
  error: string | null
}