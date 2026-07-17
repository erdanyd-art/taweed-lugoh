import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { SearchBar } from '@/components/shared/SearchBar'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { Button } from '@/components/ui/button'
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
import { useMeetings } from '@/hooks/useMeetings'
import { useClasses } from '@/hooks/useClasses'
import { useStudents } from '@/hooks/useStudents'
import { useAttendance } from '@/hooks/useAttendance'
import { ATTENDANCE_STATUS_OPTIONS, ATTENDANCE_STATUS_STYLES } from '@/constants/attendance-status'
import type { AttendanceStatus } from '@/types'
import { cn } from '@/lib/utils'

export function Attendance() {
  const { meetings, isLoading: isMeetingsLoading } = useMeetings()
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

  useEffect(() => {
    if (!meetingId && meetings.length > 0) {
      setMeetingId(meetings[0].id)
    }
  }, [meetings, meetingId])

  const loading =
    isMeetingsLoading || isClassesLoading || isStudentsLoading || isAttendanceLoading

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return students
      .filter((student) => classId === 'all' || student.classId === classId)
      .filter((student) => !query || student.name.toLowerCase().includes(query))
      .map((student) => {
        const record = records.find(
          (item) => item.studentId === student.id && item.meetingId === meetingId,
        )
        const status = record
          ? draftStatuses[record.id] ?? record.status
          : undefined
        return { student, record, status }
      })
  }, [students, records, classId, meetingId, search, draftStatuses])

  const dirtyCount = rows.filter(
    (row) => row.record && draftStatuses[row.record.id] !== undefined,
  ).length

  function updateStatus(recordId: string | undefined, status: AttendanceStatus) {
    if (!recordId) return
    setDraftStatuses((prev) => ({ ...prev, [recordId]: status }))
  }

  async function handleSaveAttendance() {
    const updates = rows
      .filter((row) => row.record && draftStatuses[row.record.id] !== undefined)
      .map((row) => ({ ...row.record!, status: draftStatuses[row.record!.id] }))

    if (updates.length === 0) return

    await saveAttendance(updates)
    setDraftStatuses((prev) => {
      const next = { ...prev }
      updates.forEach((update) => delete next[update.id])
      return next
    })
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
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
              options={meetings.map((meeting) => ({
                value: meeting.id,
                label: meeting.label,
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
              rows.map(({ student, record, status }) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-foreground">
                    {student.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        updateStatus(record?.id, value as AttendanceStatus)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          'ml-auto w-36 font-medium',
                          status ? ATTENDANCE_STATUS_STYLES[status] : '',
                        )}
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
