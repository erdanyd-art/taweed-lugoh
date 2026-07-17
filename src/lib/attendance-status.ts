import type { AttendanceStatus } from '@/types'

export const statusStyles: Record<AttendanceStatus, string> = {
  Present: 'bg-success/15 text-success border-success/20',
  Permission: 'bg-warning/15 text-warning border-warning/20',
  Sick: 'bg-accent text-accent-foreground border-accent',
  Absent: 'bg-destructive/10 text-destructive border-destructive/20',
}
