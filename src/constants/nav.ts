import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Users, CalendarCheck, GraduationCap } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/scores', label: 'Scores', icon: GraduationCap },
]

export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/attendance': 'Attendance',
  '/scores': 'Scores',
}
