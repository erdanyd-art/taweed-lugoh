import type { ReactNode } from 'react'

interface TableToolbarProps {
  search?: ReactNode
  filters?: ReactNode
  action?: ReactNode
}

export function TableToolbar({ search, filters, action }: TableToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {search}
        {filters}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
