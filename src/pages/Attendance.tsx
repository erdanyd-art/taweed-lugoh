import { useEffect, useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { SearchBar } from '@/components/shared/SearchBar'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { deriveMeetings } from '@/utils/meetings'
import { ATTENDANCE_STATUS_OPTIONS, ATTENDANCE_STATUS_STYLES } from '@/constants/attendance-status'
import type { AttendanceStatus, Meeting } from '@/types'
import { cn } from '@/lib/utils'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function meetingLabel(meeting: Meeting): string {
  if (!ISO_DATE_PATTERN.test(meeting.id)) return meeting.label
  return new Date(`${meeting.id}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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

  // Meetings created via the date picker below, before any attendance has
  // been saved for them (so they don't exist in `meetings`, which is
  // derived from saved attendance rows). Kept only for this page visit.
  const [extraMeetings, setExtraMeetings] = useState<Meeting[]>([])
  const [newMeetingDate, setNewMeetingDate] = useState('')

  const meetings = useMemo(() => deriveMeetings(records), [records])

  const allMeetings = useMemo(() => {
    const known = new Set(meetings.map((meeting) => meeting.id))
    return [...meetings, ...extraMeetings.filter((meeting) => !known.has(meeting.id))]
  }, [meetings, extraMeetings])

  useEffect(() => {
    if (!meetingId && meetings.length > 0) {
      setMeetingId(meetings[0].id)
    }
  }, [meetings, meetingId])

  const loading = isClassesLoading || isStudentsLoading || isAttendanceLoading

  const rows = useMemo(() => {
    if (!meetingId) return []
    const query = search.trim().toLowerCase()
    return students
      .filter((student) => classId === 'all' || student.classId === classId)
      .filter((student) => !query || student.name.toLowerCase().includes(query))
      .map((student) => {
        const record = records.find(
          (item) => item.studentId === student.id && item.meetingId === meetingId,
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

  function handleAddMeeting() {
    if (!newMeetingDate) return
    setExtraMeetings((prev) =>
      prev.some((meeting) => meeting.id === newMeetingDate)
        ? prev
        : [...prev, { id: newMeetingDate, label: newMeetingDate, date: newMeetingDate }],
    )
    setMeetingId(newMeetingDate)
    setNewMeetingDate('')
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
            <FilterSelect
              value={meetingId}
              onChange={setMeetingId}
              placeholder="Select meeting"
              options={allMeetings.map((meeting) => ({
                value: meeting.id,
                label: meetingLabel(meeting),
              }))}
            />
            <FilterSelect
              value={classId}
              onChange={setClassId}
              placeholder="Select class"
              options={[
                { value: 'all', label: 'All Classes' },
                ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
              ]}
            />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={newMeetingDate}
                onChange={(event) => setNewMeetingDate(event.target.value)}
                className="w-40"
                aria-label="New meeting date"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddMeeting}
                disabled={!newMeetingDate}
                title="Add meeting for this date"
              >
                <Plus className="size-4" />
              </Button>
            </div>
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
                    description="Pick a meeting above, or add a new date to start taking attendance."
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
    </div>
  )
}
