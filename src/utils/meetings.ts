import type { AttendanceRecord, Meeting } from '@/types'

/**
 * There's no Meetings sheet on the backend — "meeting" is just a label on
 * each attendance record. Derived here from already-fetched records rather
 * than a separate API call, since every Apps Script round trip costs
 * 2-3s regardless of how little data it returns — fetching the same
 * attendance data twice per page load is pure waste.
 */
export function deriveMeetings(records: AttendanceRecord[]): Meeting[] {
  const seen = new Set<string>()
  const meetings: Meeting[] = []
  for (const record of records) {
    if (seen.has(record.meetingId)) continue
    seen.add(record.meetingId)
    meetings.push({ id: record.meetingId, label: record.meetingId, date: '' })
  }
  return meetings
}
