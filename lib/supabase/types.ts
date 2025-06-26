export type Profile = {
  id: string
  email: string
  name: string | null
  grade: string | null
  target_school: string | null
  created_at: string
  updated_at: string
}

export type StudySession = {
  id: string
  user_id: string
  subject: string
  start_time: string
  end_time: string | null
  duration: number | null
  memo: string | null
  created_at: string
}