import { useCallback, useEffect, useState } from 'react'
import * as studentsService from '@/services/students.service'
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

  async function deleteStudent(id: string) {
    await studentsService.deleteStudent(id)
    setStudents((prev) => prev.filter((student) => student.id !== id))
  }

  return { students, isLoading, addStudent, deleteStudent }
}
