import { Sidebar } from './components/layout/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="ml-16 flex flex-col min-h-screen overflow-hidden pt-14">
        {children}
      </div>
    </div>
  )
}