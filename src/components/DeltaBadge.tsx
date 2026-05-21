import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { formatDelta } from '../utils/format'

export function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="delta-badge delta-flat">첫 측정</span>
  }

  const rounded = Math.round(delta * 10) / 10

  if (rounded > 0) {
    return (
      <span className="delta-badge delta-up">
        <ArrowUp size={14} aria-hidden="true" />
        {formatDelta(rounded)} 향상
      </span>
    )
  }

  if (rounded < 0) {
    return (
      <span className="delta-badge delta-down">
        <ArrowDown size={14} aria-hidden="true" />
        {formatDelta(rounded)} 감소
      </span>
    )
  }

  return (
    <span className="delta-badge delta-flat">
      <Minus size={14} aria-hidden="true" />
      ±0° 유지
    </span>
  )
}
