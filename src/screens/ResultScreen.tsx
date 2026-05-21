import { History, Home, Play } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { ResultCard } from '../components/ResultCard'
import { STEPS } from '../constants/steps'
import type { FlexRecord, Grade } from '../types'
import { formatDate } from '../utils/format'

type Props = {
  record: FlexRecord | undefined
  previousRecord: FlexRecord | null
  onRemeasure: () => void
  onViewHistory: () => void
  onHome: () => void
}

function buildSummary(grades: Grade[]): string {
  if (grades.every((grade) => grade === 'good')) {
    return '세 방향 모두 좋은 범위입니다. 지금 흐름을 유지하세요.'
  }
  if (grades.some((grade) => grade === 'caution')) {
    return '주의 범위가 있어요. 무리하지 말고 준비운동을 충분히 한 뒤 다시 측정해 보세요.'
  }
  return '대체로 보통 범위입니다. 꾸준히 기록하며 변화를 살펴보세요.'
}

export function ResultScreen({
  record,
  previousRecord,
  onRemeasure,
  onViewHistory,
  onHome,
}: Props) {
  if (!record) {
    return (
      <main className="app-main">
        <EmptyState>측정 결과가 없습니다. 측정을 다시 진행해 주세요.</EmptyState>
      </main>
    )
  }

  const grades = STEPS.map((step) => record.grades[step.key])

  return (
    <main className="app-main">
      <section className="result-hero">
        <div>
          <span className="eyebrow">측정 완료 · {formatDate(record.createdAt)}</span>
          <h1>오늘의 측정 결과</h1>
          <p>{buildSummary(grades)}</p>
        </div>
      </section>

      <section className="result-grid" aria-label="측정 결과">
        {STEPS.map((step) => {
          const angle = record.angles[step.key]
          const delta =
            previousRecord === null
              ? null
              : angle - previousRecord.angles[step.key]
          return (
            <ResultCard
              key={step.key}
              label={step.label}
              angle={angle}
              grade={record.grades[step.key]}
              delta={delta}
            />
          )
        })}
      </section>

      <section className="quick-actions">
        <button onClick={onRemeasure}>
          <Play size={18} aria-hidden="true" />
          다시 측정
        </button>
        <button onClick={onViewHistory}>
          <History size={18} aria-hidden="true" />
          이전 기록
        </button>
        <button onClick={onHome}>
          <Home size={18} aria-hidden="true" />
          처음으로
        </button>
      </section>
    </main>
  )
}
