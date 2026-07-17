import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { statusStyles } from '@/lib/attendance-status'
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
import {
  classes,
  meetings,
  students,
  attendanceRecords as initialAttendance,
} from '@/mock'
import type { AttendanceStatus } from '@/types'
import { cn } from '@/lib/utils'

const statusOptions: AttendanceStatus[] = [
  'Present',
  'Permission',
  'Sick',
  'Absent',
]

export function Attendance() {
  const [meetingId, setMeetingId] = useState(meetings[0]?.id ?? '')
  const [classId, setClassId] = useState<string>('all')
  const [attendance, setAttendance] = useState(initialAttendance)

  const rows = useMemo(() => {
    return students
      .filter((student) => classId === 'all' || student.classId === classId)
      .map((student) => {
        const record = attendance.find(
          (item) => item.studentId === student.id && item.meetingId === meetingId,
        )
        return { student, record }
      })
  }, [attendance, classId, meetingId])

  function updateStatus(recordId: string | undefined, status: AttendanceStatus) {
    if (!recordId) return
    setAttendance((prev) =>
      prev.map((item) => (item.id === recordId ? { ...item, status } : item)),
    )
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track and update student attendance per meeting"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Select value={meetingId} onValueChange={setMeetingId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Select meeting" />
          </SelectTrigger>
          <SelectContent>
            {meetings.map((meeting) => (
              <SelectItem key={meeting.id} value={meeting.id}>
                {meeting.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="h-24 text-center text-muted-foreground"
                >
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ student, record }) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-foreground">
                    {student.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={record?.status}
                      onValueChange={(value) =>
                        updateStatus(record?.id, value as AttendanceStatus)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          'ml-auto w-36 font-medium',
                          record ? statusStyles[record.status] : '',
                        )}
                      >
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
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
