import { CheckCircle2 } from 'lucide-react'
import { STEPS } from '../constants/steps'
import type { MeasurementKey, MeasurementResult } from '../types'

type Props = {
  measurements: Record<MeasurementKey, MeasurementResult>
  currentStepIndex: number
}

export function StepProgress({ measurements, currentStepIndex }: Props) {
  return (
    <div className="progress-row" aria-label="측정 진행 상태">
      {STEPS.map((step, index) => {
        const done = measurements[step.key].angle !== null
        const active = index === currentStepIndex
        return (
          <div
            key={step.key}
            className={`step-pill ${active ? 'active' : ''} ${done ? 'done' : ''}`}
          >
            {done ? <CheckCircle2 size={16} aria-hidden="true" /> : <span>{index + 1}</span>}
            {step.shortLabel}
          </div>
        )
      })}
    </div>
  )
}
