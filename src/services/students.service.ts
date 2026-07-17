import { students as mockStudents } from '@/mock/students'
import { delay } from '@/utils/async'
import type { Student } from '@/types'

let students: Student[] = [...mockStudents]

export function getStudents(): Promise<Student[]> {
  return delay([...students])
}

export function addStudent(input: Omit<Student, 'id'>): Promise<Student> {
  const created: Student = { id: `std-${Date.now()}`, ...input }
  students = [created, ...students]
  return delay(created)
}

export function deleteStudent(id: string): Promise<void> {
  students = students.filter((student) => student.id !== id)
  return delay(undefined)
}
