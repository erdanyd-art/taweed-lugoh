import { Badge } from '@/components/ui/badge'
import type { AttendanceStatus } from '@/types'
import { ATTENDANCE_STATUS_STYLES } from '@/constants/attendance-status'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: AttendanceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', ATTENDANCE_STATUS_STYLES[status], className)}
    >
      {status}
    </Badge>
  )
}
