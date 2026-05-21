import { STEPS } from '../constants/steps'
import type {
  Criteria,
  FlexRecord,
  Grade,
  MeasurementKey,
  MeasurementResult,
  ResultSource,
  TrendPoint,
} from '../types'
import { getGrade } from './angle'

export function buildRecord(
  id: string,
  measurements: Record<MeasurementKey, MeasurementResult>,
  criteria: Criteria,
): FlexRecord {
  const angles = STEPS.reduce(
    (acc, step) => {
      acc[step.key] = measurements[step.key].angle ?? 0
      return acc
    },
    {} as Record<MeasurementKey, number>,
  )
  const grades = STEPS.reduce(
    (acc, step) => {
      acc[step.key] = getGrade(angles[step.key], criteria[step.key])
      return acc
    },
    {} as Record<MeasurementKey, Grade>,
  )
  const sources = STEPS.reduce(
    (acc, step) => {
      acc[step.key] = measurements[step.key].source ?? 'manual'
      return acc
    },
    {} as Record<MeasurementKey, Exclude<ResultSource, null>>,
  )

  return {
    id,
    createdAt: new Date().toISOString(),
    angles,
    grades,
    sources,
  }
}

/** Records are stored newest-first; the previous record sits right after the current one. */
export function getPreviousRecord(
  records: FlexRecord[],
  currentId: string | null,
): FlexRecord | null {
  if (currentId === null) return records[0] ?? null
  const index = records.findIndex((record) => record.id === currentId)
  if (index === -1) return records[0] ?? null
  return records[index + 1] ?? null
}

/** Oldest-to-newest series for a single measurement, for the sparkline chart. */
export function getTrendSeries(records: FlexRecord[], key: MeasurementKey): TrendPoint[] {
  return [...records]
    .reverse()
    .map((record) => ({ createdAt: record.createdAt, value: record.angles[key] }))
}
