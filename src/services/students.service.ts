import { apiGet, apiPost } from '@/lib/api'
import type { Student } from '@/types'

/** Shape returned by the Apps Script backend — column names differ from our Student type. */
export interface BackendStudent {
  id: string
  name: string
  class: string
  preTest: number | string
  postTest: number | string
}

/** Sheets returns empty cells as '' — map that to null, everything else to a number. */
function toScore(value: number | string): number | null {
  return value === '' || value === null || value === undefined ? null : Number(value)
}

export function mapBackendStudent(student: BackendStudent): Student {
  return {
    id: student.id,
    name: student.name,
    classId: student.class,
    preTest: toScore(student.preTest),
    postTest: toScore(student.postTest),
  }
}

function toPayload(input: Omit<Student, 'id'>) {
  return {
    name: input.name,
    class: input.classId,
    preTest: input.preTest,
    postTest: input.postTest,
  }
}

export async function getStudents(): Promise<Student[]> {
  const students = await apiGet<BackendStudent[]>('students')
  return students.map(mapBackendStudent)
}

export async function addStudent(input: Omit<Student, 'id'>): Promise<Student> {
  const created = await apiPost<BackendStudent>('createStudent', toPayload(input))
  return mapBackendStudent(created)
}

export async function updateStudent(
  id: string,
  input: Omit<Student, 'id'>,
): Promise<Student> {
  const updated = await apiPost<BackendStudent>('updateStudent', {
    id,
    ...toPayload(input),
  })
  return mapBackendStudent(updated)
}

export async function deleteStudent(id: string): Promise<void> {
  await apiPost<{ id: string }>('deleteStudent', { id })
}
