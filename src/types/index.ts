export interface ClassItem {
  id: string
  name: string
}

export interface Student {
  id: string
  name: string
  classId: string
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

export interface ScoreRecord {
  id: string
  studentId: string
  preTest: number
  postTest: number
}
