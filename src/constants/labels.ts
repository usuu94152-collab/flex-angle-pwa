import type { Grade, ResultSource, SensorStatus } from '../types'

export const SOURCE_LABELS: Record<Exclude<ResultSource, null>, string> = {
  sensor: '센서',
  manual: '수동',
}

export const GRADE_LABELS: Record<Grade, string> = {
  good: '좋음',
  normal: '보통',
  caution: '주의',
}

export const SENSOR_STATUS_LABELS: Record<SensorStatus, string> = {
  idle: '대기',
  requesting: '요청 중',
  listening: '수신 중',
  denied: '거부됨',
  unsupported: '미지원',
  unavailable: '수신 없음',
}
