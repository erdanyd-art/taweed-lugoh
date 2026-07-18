import { useEffect, useMemo, useState } from 'react'
import { Check, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { SearchBar } from '@/components/shared/SearchBar'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClasses } from '@/hooks/useClasses'
import { useStudents } from '@/hooks/useStudents'
import { useAttendance } from '@/hooks/useAttendance'
import { buildAttendanceRecordId } from '@/services/attendance.service'
import { deriveMeetings, normalizeMeetingId } from '@/utils/meetings'
import { exportAttendanceReport } from '@/utils/pdf'
import { ATTENDANCE_STATUS_OPTIONS, ATTENDANCE_STATUS_STYLES } from '@/constants/attendance-status'
import type { AttendanceStatus, Meeting } from '@/types'
import { cn } from '@/lib/utils'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// meeting.id is already normalized to a plain date by deriveMeetings()
// (or created that way locally, e.g. from the date picker), so this only
// needs to recognize that shape — no separate "full ISO datetime" case to
// handle here anymore.
function meetingLabel(meeting: Meeting): string {
  if (!ISO_DATE_PATTERN.test(meeting.id)) return meeting.label
  return new Date(`${meeting.id}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function todayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function Attendance() {
  const { classes, isLoading: isClassesLoading } = useClasses()
  const { students, isLoading: isStudentsLoading } = useStudents()
  const {
    records,
    isLoading: isAttendanceLoading,
    isSaving,
    saveAttendance,
  } = useAttendance()

  const [meetingId, setMeetingId] = useState('')
  const [classId, setClassId] = useState('all')
  const [search, setSearch] = useState('')
  const [draftStatuses, setDraftStatuses] = useState<
    Record<string, AttendanceStatus>
  >({})
  const [justSaved, setJustSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Meetings selected/created via the date picker below, before any
  // attendance has been saved for them (so they don't exist yet in
  // `meetings`, which is derived from saved attendance rows). Kept only
  // for this page visit.
  const [extraMeetings, setExtraMeetings] = useState<Meeting[]>([])
  // Mirrors the date picker input; kept in sync with meetingId in both
  // directions so the two controls never show conflicting state.
  const [dateValue, setDateValue] = useState('')
  // A date the user picked (or today, on first load) that has no meeting
  // yet — set to open the create-confirmation dialog, cleared once
  // confirmed or cancelled.
  const [pendingDate, setPendingDate] = useState<string | null>(null)

  const meetings = useMemo(() => deriveMeetings(records), [records])

  const allMeetings = useMemo(() => {
    const known = new Set(meetings.map((meeting) => normalizeMeetingId(meeting.id)))
    return [
      ...meetings,
      ...extraMeetings.filter((meeting) => !known.has(normalizeMeetingId(meeting.id))),
    ]
  }, [meetings, extraMeetings])

  const isNewMeeting =
    meetingId !== '' &&
    !meetings.some((meeting) => normalizeMeetingId(meeting.id) === normalizeMeetingId(meetingId))

  const loading = isClassesLoading || isStudentsLoading || isAttendanceLoading

  // On first load (once data has arrived), auto-select today's meeting if
  // it already exists. If it doesn't, but other meetings do (e.g. one
  // just created a moment ago, before a reload), select the most recent
  // one instead of re-prompting to create today's — that prompt was
  // overriding/hiding whatever meeting the user had just saved, making it
  // look like it had vanished. Only offer to create today's meeting when
  // there is truly no meeting to fall back to yet.
  useEffect(() => {
    if (loading || meetingId) return
    const today = todayIso()
    const existing = allMeetings.find((meeting) => normalizeMeetingId(meeting.id) === today)
    if (existing) {
      setDateValue(today)
      setMeetingId(today)
    } else if (meetings.length > 0) {
      const latest = meetings[meetings.length - 1]
      const latestId = normalizeMeetingId(latest.id)
      setDateValue(ISO_DATE_PATTERN.test(latestId) ? latestId : '')
      setMeetingId(latestId)
    } else {
      setDateValue(today)
      setPendingDate(today)
    }
  }, [loading, meetingId, allMeetings, meetings])

  const rows = useMemo(() => {
    if (!meetingId) return []
    const query = search.trim().toLowerCase()
    return students
      .filter((student) => classId === 'all' || student.classId === classId)
      .filter((student) => !query || student.name.toLowerCase().includes(query))
      .map((student) => {
        const record = records.find(
          (item) =>
            item.studentId === student.id &&
            normalizeMeetingId(item.meetingId) === normalizeMeetingId(meetingId),
        )
        const recordId = record?.id ?? buildAttendanceRecordId(student.id, meetingId)
        // No saved record yet (new student, or a meeting nobody has taken
        // attendance for) defaults to Present rather than a blank status.
        const status = draftStatuses[recordId] ?? record?.status ?? 'Present'
        return { student, record, recordId, status }
      })
  }, [students, records, classId, meetingId, search, draftStatuses])

  // A row with no saved record is always "dirty" — it still needs to be
  // written (as the default Present, or whatever was picked) so Save
  // actually creates it instead of doing nothing.
  const dirtyCount = rows.filter(
    (row) => !row.record || draftStatuses[row.recordId] !== undefined,
  ).length

  function updateStatus(recordId: string, status: AttendanceStatus) {
    setDraftStatuses((prev) => ({ ...prev, [recordId]: status }))
  }

  /** Shared by the date picker and the initial-load effect: select the
   * meeting for `date` if it already exists, otherwise ask before
   * creating it. */
  function resolveDate(date: string) {
    setDateValue(date)
    if (!date) return
    const existing = allMeetings.find((meeting) => normalizeMeetingId(meeting.id) === date)
    if (existing) {
      setMeetingId(date)
    } else {
      setPendingDate(date)
    }
  }

  function handleSelectMeeting(id: string) {
    const normalized = normalizeMeetingId(id)
    setMeetingId(normalized)
    setDateValue(ISO_DATE_PATTERN.test(normalized) ? normalized : '')
  }

  function confirmCreateMeeting() {
    if (!pendingDate) return
    setExtraMeetings((prev) =>
      prev.some((meeting) => meeting.id === pendingDate)
        ? prev
        : [...prev, { id: pendingDate, label: pendingDate, date: pendingDate }],
    )
    setMeetingId(pendingDate)
    setPendingDate(null)
  }

  function cancelCreateMeeting() {
    setPendingDate(null)
    setDateValue(ISO_DATE_PATTERN.test(meetingId) ? meetingId : '')
  }

  async function handleSaveAttendance() {
    const updates = rows
      .filter((row) => !row.record || draftStatuses[row.recordId] !== undefined)
      .map((row) => ({
        id: row.recordId,
        studentId: row.student.id,
        meetingId,
        status: row.status,
      }))

    if (updates.length === 0) return

    setSaveError(null)
    try {
      await saveAttendance(updates)
      setDraftStatuses((prev) => {
        const next = { ...prev }
        updates.forEach((update) => delete next[update.id])
        return next
      })
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save attendance.')
    }
  }

  function classNameFor(id: string) {
    return classes.find((cls) => cls.id === id)?.name ?? '—'
  }

  function handleExportPdf() {
    const currentMeeting = allMeetings.find(
      (meeting) => normalizeMeetingId(meeting.id) === meetingId,
    )
    const meetingText = currentMeeting ? meetingLabel(currentMeeting) : meetingId
    exportAttendanceReport(
      rows.map((row) => ({
        studentName: row.student.name,
        className: classNameFor(row.student.classId),
        meeting: meetingText,
        status: row.status,
      })),
    )
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track and update student attendance per meeting"
        action={
          <div className="flex items-center gap-3">
            {justSaved ? (
              <span className="flex items-center gap-1 text-sm text-success">
                <Check className="size-4" />
                Saved
              </span>
            ) : null}
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={rows.length === 0}
            >
              <Download className="size-4" />
              Export PDF
            </Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={dirtyCount === 0 || isSaving}
            >
              {isSaving
                ? 'Saving...'
                : dirtyCount > 0
                  ? `Save Attendance (${dirtyCount})`
                  : 'Save Attendance'}
            </Button>
          </div>
        }
      />

      {saveError ? (
        <p className="mb-4 text-sm text-destructive">{saveError}</p>
      ) : null}

      <TableToolbar
        search={
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search students..."
          />
        }
        filters={
          <>
            <div className="flex items-center gap-2">
              <FilterSelect
                value={meetingId}
                onChange={handleSelectMeeting}
                placeholder="Select meeting"
                options={allMeetings.map((meeting) => ({
                  // Normalized so this always matches the (also
                  // normalized) `meetingId` state the Select is
                  // controlled by — otherwise a raw corrupted id here
                  // wouldn't match and the trigger would show nothing
                  // selected even though a meeting is active.
                  value: normalizeMeetingId(meeting.id),
                  label: meetingLabel(meeting),
                }))}
              />
              {meetingId ? (
                <Badge
                  variant="outline"
                  className={
                    isNewMeeting
                      ? 'border-warning/20 bg-warning/15 text-warning'
                      : 'border-success/20 bg-success/15 text-success'
                  }
                >
                  {isNewMeeting ? 'New Meeting' : 'Existing Meeting'}
                </Badge>
              ) : null}
            </div>
            <FilterSelect
              value={classId}
              onChange={setClassId}
              placeholder="Select class"
              options={[
                { value: 'all', label: 'All Classes' },
                ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
              ]}
            />
            <Input
              type="date"
              value={dateValue}
              onChange={(event) => resolveDate(event.target.value)}
              className="w-40"
              aria-label="Meeting date"
            />
          </>
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingState rows={5} columns={2} />
            ) : !meetingId ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <EmptyState
                    title="No meeting selected"
                    description="Pick a date or meeting above to start taking attendance."
                  />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <EmptyState
                    title="No students found"
                    description={
                      search
                        ? 'Try a different search term.'
                        : 'No students match the selected filters.'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ student, recordId, status }) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-foreground">
                    {student.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        updateStatus(recordId, value as AttendanceStatus)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn('ml-auto w-36 font-medium', ATTENDANCE_STATUS_STYLES[status])}
                      >
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={pendingDate !== null}
        onOpenChange={(open) => !open && cancelCreateMeeting()}
        title="Create new meeting?"
        description={
          pendingDate
            ? `No meeting exists yet for ${meetingLabel({ id: pendingDate, label: pendingDate, date: pendingDate })}. Create it and start taking attendance?`
            : undefined
        }
        confirmLabel="Create Meeting"
        onConfirm={confirmCreateMeeting}
      />
    </div>
  )
}
