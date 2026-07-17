import { Badge } from '@/components/ui/badge'
import type { AttendanceStatus } from '@/types'
import { statusStyles } from '@/lib/attendance-status'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: AttendanceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', statusStyles[status], className)}
    >
      {status}
    </Badge>
  )
}
