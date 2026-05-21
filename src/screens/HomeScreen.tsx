import { History, Play, ShieldCheck, Smartphone } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { STEPS } from '../constants/steps'
import type { FlexRecord, SensorStatus } from '../types'
import { formatDate } from '../utils/format'

type Props = {
  records: FlexRecord[]
  sensorStatus: SensorStatus
  sensorMessage: string
  onStart: () => void
  onViewHistory: () => void
  onRequestPermission: () => void
}

const heroImage = `${import.meta.env.BASE_URL}flexibility-planes.png`

export function HomeScreen({
  records,
  sensorStatus,
  sensorMessage,
  onStart,
  onViewHistory,
  onRequestPermission,
}: Props) {
  const latest = records[0]

  return (
    <main className="app-main">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">나의 유연성 기록</span>
          <h1>유연성을 꾸준히 기록하세요</h1>
          <p>
            전후·좌우·회전 세 방향의 가동 범위를 측정하고, 시간이 지나며 어떻게
            변하는지 확인하세요. 모든 기록은 이 기기에만 저장됩니다.
          </p>
          <button className="primary-action" onClick={onStart}>
            <Play size={20} aria-hidden="true" />
            측정 시작
          </button>
        </div>
        <div className="hero-visual" aria-label="3면 유연성 측정 기준면 안내 그림">
          <img className="posture-art" src={heroImage} alt="" />
          <span className="visual-tag">SENSOR READY</span>
          <span className="visual-metric">3 AXIS</span>
        </div>
      </section>

      {latest ? (
        <section className="summary-card" aria-label="최근 기록 요약">
          <div className="summary-head">
            <span className="eyebrow">최근 기록</span>
            <strong>{formatDate(latest.createdAt)}</strong>
          </div>
          <div className="summary-values">
            {STEPS.map((step) => (
              <span key={step.key}>
                {step.shortLabel} {latest.angles[step.key]}°
              </span>
            ))}
          </div>
          <button onClick={onViewHistory}>
            <History size={18} aria-hidden="true" />
            전체 기록 보기
          </button>
        </section>
      ) : null}

      <section className="quick-actions" aria-label="빠른 이동">
        <button onClick={onRequestPermission}>
          <Smartphone size={18} aria-hidden="true" />
          센서 권한 요청
        </button>
        <button onClick={onViewHistory}>
          <History size={18} aria-hidden="true" />
          이전 기록 보기
        </button>
      </section>

      <section className="info-band" aria-label="센서 상태">
        <div>
          <ShieldCheck size={20} aria-hidden="true" />
          <strong>센서 상태</strong>
          <StatusBadge status={sensorStatus} />
        </div>
        <p>{sensorMessage}</p>
      </section>
    </main>
  )
}
