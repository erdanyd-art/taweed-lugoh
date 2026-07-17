import { attendanceRecords as mockAttendance } from '@/mock/attendance'
import { delay } from '@/utils/async'
import type { AttendanceRecord } from '@/types'

let attendance: AttendanceRecord[] = [...mockAttendance]

export function getAttendance(): Promise<AttendanceRecord[]> {
  return delay([...attendance])
}

export function saveAttendance(
  updates: AttendanceRecord[],
): Promise<AttendanceRecord[]> {
  attendance = attendance.map((record) => {
    const update = updates.find((item) => item.id === record.id)
    return update ?? record
  })
  return delay([...attendance], 600)
}
