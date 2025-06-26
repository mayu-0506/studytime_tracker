import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import Signup from "@/components/auth/Signup"

const SignupPage = async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user

  if (user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Signup />
    </div>
  )
}

export default SignupPage
