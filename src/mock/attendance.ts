import type { AttendanceRecord, AttendanceStatus } from '@/types'
import { students } from '@/mock/students'
import { meetings } from '@/mock/meetings'

const statusCycle: AttendanceStatus[] = [
  'Present',
  'Present',
  'Present',
  'Present',
  'Sick',
  'Present',
  'Permission',
  'Present',
  'Present',
  'Absent',
  'Present',
  'Present',
]

export const attendanceRecords: AttendanceRecord[] = meetings.flatMap(
  (meeting, meetingIndex) =>
    students.map((student, studentIndex) => ({
      id: `att-${meeting.id}-${student.id}`,
      studentId: student.id,
      meetingId: meeting.id,
      status:
        statusCycle[(studentIndex * 3 + meetingIndex * 5) % statusCycle.length],
    })),
)
