import { apiGet } from '@/lib/api'
import type { Meeting } from '@/types'

interface BackendAttendance {
  studentId: string
  meeting: string
  status: string
}

/**
 * There is no Meetings sheet on the backend — "meeting" is just a free-text
 * label on each Attendance row. We derive the distinct list from attendance
 * data, in first-seen order (which matches seed order since rows are
 * grouped by meeting).
 */
export async function getMeetings(): Promise<Meeting[]> {
  const records = await apiGet<BackendAttendance[]>('attendance')
  const seen = new Set<string>()
  const meetings: Meeting[] = []
  for (const record of records) {
    if (seen.has(record.meeting)) continue
    seen.add(record.meeting)
    meetings.push({ id: record.meeting, label: record.meeting, date: '' })
  }
  return meetings
}
