import Layout from "@/components/Layout"

interface AuthLayoutProps {
    children: React.ReactNode
  }
  
  const AuthLayout = async ({ children }: AuthLayoutProps) => {
    return (
      <Layout>
        <div className="flex items-center justify-center mt-20">{children}</div>
      </Layout>
    )
  }
  
  export default AuthLayout