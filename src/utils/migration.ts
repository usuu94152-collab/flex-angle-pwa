import type { FlexRecord, MeasurementKey } from '../types'

const KEYS: MeasurementKey[] = ['frontBack', 'sideBend', 'rotation']

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasAllKeys(value: unknown): boolean {
  return isRecordLike(value) && KEYS.every((key) => key in value)
}

/**
 * Normalizes raw localStorage data to the current FlexRecord shape.
 * Legacy records carried studentId/studentName/criteriaVersion/deviceMemo;
 * those teacher fields are dropped while angles/grades/sources are preserved.
 */
export function migrateRecords(raw: unknown): FlexRecord[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item) => {
    if (!isRecordLike(item)) return []
    const { id, createdAt, angles, grades, sources } = item

    if (typeof id !== 'string' || typeof createdAt !== 'string') return []
    if (!hasAllKeys(angles) || !hasAllKeys(grades) || !hasAllKeys(sources)) return []

    return [
      {
        id,
        createdAt,
        angles: angles as FlexRecord['angles'],
        grades: grades as FlexRecord['grades'],
        sources: sources as FlexRecord['sources'],
      },
    ]
  })
}
