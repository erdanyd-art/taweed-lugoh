import { apiGet } from '@/lib/api'
import type { ClassItem } from '@/types'

export function getClasses(): Promise<ClassItem[]> {
  return apiGet<ClassItem[]>('classes')
}
