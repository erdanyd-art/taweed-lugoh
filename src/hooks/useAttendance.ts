import { useCallback, useEffect, useState } from 'react'
import * as attendanceService from '@/services/attendance.service'
import type { AttendanceRecord } from '@/types'

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const data = await attendanceService.getAttendance()
    setRecords(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function saveAttendance(updates: AttendanceRecord[]) {
    setIsSaving(true)
    try {
      const data = await attendanceService.saveAttendance(updates)
      setRecords(data)
    } finally {
      setIsSaving(false)
    }
  }

  return { records, isLoading, isSaving, saveAttendance }
}
