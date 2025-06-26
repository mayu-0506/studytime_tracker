import Layout from "@/components/Layout"

interface MainLayoutProps {
    children: React.ReactNode
  }
  
  const MainLayout = async ({ children }: MainLayoutProps) => {
    return (
      <Layout>
        <div className="mx-auto max-w-screen-lg px-2 my-10">{children}</div>
      </Layout>
    )
  }
  
  export default MainLayout