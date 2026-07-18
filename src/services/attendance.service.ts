import { apiGet, apiPost } from '@/lib/api'
import type { AttendanceRecord } from '@/types'

/** Shape returned by the Apps Script backend — rows are keyed by (studentId, meeting), no id column. */
interface BackendAttendance {
  studentId: string
  meeting: string
  status: AttendanceRecord['status']
}

export function buildAttendanceRecordId(studentId: string, meeting: string): string {
  return `${studentId}::${meeting}`
}

function mapBackendAttendance(record: BackendAttendance): AttendanceRecord {
  return {
    id: buildAttendanceRecordId(record.studentId, record.meeting),
    studentId: record.studentId,
    meetingId: record.meeting,
    status: record.status,
  }
}

function toPayload(record: AttendanceRecord): BackendAttendance {
  return {
    studentId: record.studentId,
    meeting: record.meetingId,
    status: record.status,
  }
}

export async function getAttendance(): Promise<AttendanceRecord[]> {
  const records = await apiGet<BackendAttendance[]>('attendance')
  return records.map(mapBackendAttendance)
}

/**
 * Unlike the other mutating endpoints, saveAttendance on the backend only
 * returns the rows it just wrote — not the full list — so we re-fetch to
 * keep this function's contract (return the full merged list) unchanged
 * for callers.
 */
export async function saveAttendance(
  updates: AttendanceRecord[],
): Promise<AttendanceRecord[]> {
  await apiPost('saveAttendance', updates.map(toPayload))
  return getAttendance()
}
