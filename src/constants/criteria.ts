import type { Criteria } from '../types'

export const DEFAULT_CRITERIA: Criteria = {
  frontBack: { good: 70, normal: 45 },
  sideBend: { good: 35, normal: 20 },
  rotation: { good: 55, normal: 35 },
}
