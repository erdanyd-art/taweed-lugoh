import { useCallback, useEffect, useState } from 'react'
import * as scoresService from '@/services/scores.service'
import type { ScoreRecord } from '@/types'

export function useScores() {
  const [scores, setScores] = useState<ScoreRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const data = await scoresService.getScores()
    setScores(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function updateScore(
    studentId: string,
    values: { preTest: number; postTest: number },
  ) {
    setIsSaving(true)
    const updated = await scoresService.updateScore(studentId, values)
    setScores((prev) =>
      prev.map((record) => (record.studentId === studentId ? updated : record)),
    )
    setIsSaving(false)
    return updated
  }

  return { scores, isLoading, isSaving, updateScore }
}
