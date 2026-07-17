import { useEffect, useState } from 'react'
import { getMeetings } from '@/services/meetings.service'
import type { Meeting } from '@/types'

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    getMeetings().then((data) => {
      if (!active) return
      setMeetings(data)
      setIsLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  return { meetings, isLoading }
}
