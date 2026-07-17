import type { ScoreRecord } from '@/types'
import { students } from '@/mock/students'

const preTestScores = [
  62, 58, 71, 65, 54, 68, 74, 60, 77, 69, 63, 72, 66, 80, 75, 70, 64, 78,
]
const postTestScores = [
  84, 79, 90, 88, 76, 91, 92, 82, 95, 89, 85, 93, 87, 97, 94, 90, 83, 96,
]

export const scoreRecords: ScoreRecord[] = students.map((student, index) => ({
  id: `score-${student.id}`,
  studentId: student.id,
  preTest: preTestScores[index % preTestScores.length],
  postTest: postTestScores[index % postTestScores.length],
}))
