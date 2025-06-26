import { createClient } from '@/utils/supabase/client'

export async function signupWithEmail(email: string, password: string) {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/onboarding`
    }
  })
  
  if (error) throw error
}