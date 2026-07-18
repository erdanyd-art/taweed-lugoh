import type { AttendanceRecord, Meeting } from '@/types'

const ISO_DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})/

/**
 * Reduces a meeting id to its date portion when it has one. Google Sheets
 * can silently convert a saved date-like "meeting" value (e.g.
 * "2026-07-21") to its own Date type; reading it back then returns a full
 * timestamp like "2026-07-21T16:00:00.000Z" instead of the plain string
 * that was actually saved. Backend.gs now prevents and repairs that at
 * the source (see normalizeMeetingValue there), but this keeps the
 * frontend resilient to any data saved before that fix ran — without it,
 * the same real-world meeting could show up as two different ids.
 */
export function normalizeMeetingId(id: string): string {
  const match = ISO_DATE_PREFIX_PATTERN.exec(id)
  return match ? match[1] : id
}

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
    const id = normalizeMeetingId(record.meetingId)
    if (seen.has(id)) continue
    seen.add(id)
    meetings.push({ id, label: id, date: '' })
  }
  return meetings
}
