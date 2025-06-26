import { Suspense } from "react"
import ProfilePageClient from "./ProfilePageClient"
import Loading from "@/app/loading"

const ProfilePage = () => {
  return (
    <Suspense fallback={<Loading />}>
      <ProfilePageClient />
    </Suspense>
  )
}

export default ProfilePage
