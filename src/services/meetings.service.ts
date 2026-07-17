import { meetings as mockMeetings } from '@/mock/meetings'
import { delay } from '@/utils/async'
import type { Meeting } from '@/types'

export function getMeetings(): Promise<Meeting[]> {
  return delay([...mockMeetings])
}
