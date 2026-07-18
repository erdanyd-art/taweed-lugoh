import { useCallback, useEffect, useState } from 'react'
import * as studentsService from '@/services/students.service'
import * as scoresService from '@/services/scores.service'
import type { Student } from '@/types'

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    const data = await studentsService.getStudents()
    setStudents(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addStudent(input: Omit<Student, 'id'>) {
    const created = await studentsService.addStudent(input)
    setStudents((prev) => [created, ...prev])
    return created
  }

  async function updateStudent(id: string, input: Omit<Student, 'id'>) {
    const updated = await studentsService.updateStudent(id, input)
    setStudents((prev) =>
      prev.map((student) => (student.id === id ? updated : student)),
    )
    return updated
  }

  async function deleteStudent(id: string) {
    await studentsService.deleteStudent(id)
    setStudents((prev) => prev.filter((student) => student.id !== id))
  }

  /**
   * Separate from updateStudent: the backend's updateStudent action is
   * admin-only, while saveScores allows a tutor to edit scores for their
   * own class. Scores.tsx must use this, not updateStudent.
   */
  async function saveScore(
    id: string,
    input: { preTest: number | null; postTest: number | null },
  ) {
    const [updated] = await scoresService.saveScores([{ studentId: id, ...input }])
    setStudents((prev) =>
      prev.map((student) => (student.id === id ? updated : student)),
    )
    return updated
  }

  return { students, isLoading, addStudent, updateStudent, deleteStudent, saveScore }
}
