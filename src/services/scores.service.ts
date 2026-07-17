import { scoreRecords as mockScores } from '@/mock/scores'
import { delay } from '@/utils/async'
import type { ScoreRecord } from '@/types'

let scores: ScoreRecord[] = [...mockScores]

export function getScores(): Promise<ScoreRecord[]> {
  return delay([...scores])
}

export function updateScore(
  studentId: string,
  values: { preTest: number; postTest: number },
): Promise<ScoreRecord> {
  scores = scores.map((record) =>
    record.studentId === studentId ? { ...record, ...values } : record,
  )
  const updated = scores.find((record) => record.studentId === studentId)
  return delay(updated as ScoreRecord, 500)
}
