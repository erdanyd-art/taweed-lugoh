import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/layouts/Sidebar'
import { Navbar } from '@/layouts/Navbar'
import { PAGE_TITLES } from '@/constants/nav'

export function AppLayout() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'Dashboard'

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <Sidebar className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar title={title} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
