import { classes as mockClasses } from '@/mock/classes'
import { delay } from '@/utils/async'
import type { ClassItem } from '@/types'

export function getClasses(): Promise<ClassItem[]> {
  return delay([...mockClasses])
}
