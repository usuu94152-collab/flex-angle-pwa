import type { AxisKey, Grade, OrientationSnapshot, Threshold } from '../types'

export function roundAngle(value: number) {
  return Math.round(value * 10) / 10
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getAxisValue(snapshot: OrientationSnapshot | null, axis: AxisKey) {
  if (!snapshot) return null
  return snapshot[axis]
}

export function normalizeDelta(axis: AxisKey, current: number, baseline: number, max: number) {
  if (axis === 'alpha') {
    const wrapped = ((current - baseline + 540) % 360) - 180
    return clamp(Math.abs(wrapped), 0, max)
  }

  return clamp(Math.abs(current - baseline), 0, max)
}

export function getGrade(angle: number, threshold: Threshold): Grade {
  if (angle >= threshold.good) return 'good'
  if (angle >= threshold.normal) return 'normal'
  return 'caution'
}
