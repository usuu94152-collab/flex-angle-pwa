import { Trash2 } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { Sparkline } from '../components/Sparkline'
import { GRADE_LABELS } from '../constants/labels'
import { STEPS } from '../constants/steps'
import type { FlexRecord } from '../types'
import { formatDate, formatDelta } from '../utils/format'
import { getTrendSeries } from '../utils/record'

type Props = {
  records: FlexRecord[]
  onDelete: (id: string) => void
}

export function HistoryScreen({ records, onDelete }: Props) {
  return (
    <main className="app-main">
      <section className="list-header">
        <div>
          <span className="eyebrow">로컬 저장 기록</span>
          <h1>나의 기록</h1>
          <p>측정할 때마다 기록이 쌓이고, 추이 그래프로 변화를 확인할 수 있습니다.</p>
        </div>
      </section>

      {records.length === 0 ? (
        <EmptyState>아직 저장된 기록이 없습니다. 측정을 시작해 보세요.</EmptyState>
      ) : (
        <>
          <section className="trend-grid" aria-label="측정 추이">
            {STEPS.map((step) => (
              <article className="trend-card" key={step.key}>
                <span>{step.label}</span>
                <Sparkline points={getTrendSeries(records, step.key)} max={step.max} />
              </article>
            ))}
          </section>

          <section className="record-list" aria-label="저장된 측정 기록">
            {records.map((record, index) => {
              const previous = records[index + 1]
              return (
                <article className="record-row" key={record.id}>
                  <div>
                    <strong>{formatDate(record.createdAt)}</strong>
                  </div>
                  <div className="record-values">
                    {STEPS.map((step) => {
                      const angle = record.angles[step.key]
                      const delta = previous ? angle - previous.angles[step.key] : null
                      return (
                        <span key={step.key}>
                          {step.shortLabel} {angle}° {GRADE_LABELS[record.grades[step.key]]}
                          {delta !== null ? (
                            <em className="value-delta">{formatDelta(delta)}</em>
                          ) : null}
                        </span>
                      )
                    })}
                  </div>
                  <div className="row-actions">
                    <button className="danger" onClick={() => onDelete(record.id)}>
                      <Trash2 size={17} aria-hidden="true" />
                      삭제
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        </>
      )}
    </main>
  )
}
