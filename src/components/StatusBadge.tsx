import { SENSOR_STATUS_LABELS } from '../constants/labels'
import type { SensorStatus } from '../types'

export function StatusBadge({ status }: { status: SensorStatus }) {
  return <span className={`status-badge status-${status}`}>{SENSOR_STATUS_LABELS[status]}</span>
}
