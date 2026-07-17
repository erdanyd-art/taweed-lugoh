import { useEffect, useState } from 'react'
import { getClasses } from '@/services/classes.service'
import type { ClassItem } from '@/types'

export function useClasses() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    getClasses().then((data) => {
      if (!active) return
      setClasses(data)
      setIsLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  return { classes, isLoading }
}
