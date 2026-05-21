import { GRADE_LABELS } from '../constants/labels'
import type { Grade } from '../types'
import { DeltaBadge } from './DeltaBadge'

type Props = {
  label: string
  angle: number
  grade: Grade
  delta: number | null
}

export function ResultCard({ label, angle, grade, delta }: Props) {
  return (
    <article className={`result-card grade-${grade}`}>
      <div>
        <span>{label}</span>
        <strong>{angle}°</strong>
      </div>
      <p>{GRADE_LABELS[grade]}</p>
      <DeltaBadge delta={delta} />
    </article>
  )
}
