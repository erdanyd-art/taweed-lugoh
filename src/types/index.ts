export interface ClassItem {
  id: string
  name: string
}

export interface Student {
  id: string
  name: string
  classId: string
  preTest: number | null
  postTest: number | null
}

export interface Meeting {
  id: string
  label: string
  date: string
}

export type AttendanceStatus = 'Present' | 'Permission' | 'Sick' | 'Absent'

export interface AttendanceRecord {
  id: string
  studentId: string
  meetingId: string
  status: AttendanceStatus
}
