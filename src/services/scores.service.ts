import { apiPost } from '@/lib/api'
import { mapBackendStudent, type BackendStudent } from '@/services/students.service'
import type { Student } from '@/types'

interface ScoreUpdate {
  studentId: string
  preTest: number | null
  postTest: number | null
}

interface BackendScoreResult {
  studentId: string
  name: string
  class: string
  preTest: number | string
  postTest: number | string
}

/** Tutors can save scores for their own class; admins update rejects tutors for this, see saveScores action. */
export async function saveScores(updates: ScoreUpdate[]): Promise<Student[]> {
  const results = await apiPost<BackendScoreResult[]>('saveScores', updates)
  return results.map((result) =>
    mapBackendStudent({
      id: result.studentId,
      name: result.name,
      class: result.class,
      preTest: result.preTest,
      postTest: result.postTest,
    } satisfies BackendStudent),
  )
}
