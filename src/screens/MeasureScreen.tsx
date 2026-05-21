import { AlertTriangle, Info, Play, Save, Smartphone, X } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { StepProgress } from '../components/StepProgress'
import { STEPS } from '../constants/steps'
import type { MeasurementSession } from '../hooks/useMeasurementSession'
import type { OrientationSensor } from '../hooks/useOrientationSensor'

type Props = {
  session: MeasurementSession
  sensor: OrientationSensor
}

export function MeasureScreen({ session, sensor }: Props) {
  const {
    measurements,
    liveAngles,
    currentStep,
    currentStepIndex,
    phase,
    countdown,
    manualDraft,
    setManualDraft,
    startStep,
    cancelStep,
    saveManualValue,
  } = session
  const { sensorStatus, sensorMessage, requestPermission } = sensor

  const result = measurements[currentStep.key]
  const sensorReady = sensorStatus === 'listening'
  const isLastStep = currentStepIndex === STEPS.length - 1

  return (
    <main className="app-main measure-main">
      <section className="step-header">
        <div>
          <span className="eyebrow">
            단계 {currentStepIndex + 1} / {STEPS.length}
          </span>
          <h1>{currentStep.label}</h1>
          <p>{currentStep.instruction}</p>
        </div>
      </section>

      <StepProgress measurements={measurements} currentStepIndex={currentStepIndex} />

      <section className="measure-stage">
        {phase === 'ready' ? (
          <div className="stage-ready">
            <p className="motion-text">{currentStep.motion}</p>
            {currentStep.caution ? (
              <p className="warning-text">
                <AlertTriangle size={17} aria-hidden="true" />
                {currentStep.caution}
              </p>
            ) : null}
            {sensorReady ? (
              <button className="primary-action wide" onClick={startStep}>
                <Play size={20} aria-hidden="true" />
                측정 시작
              </button>
            ) : (
              <div className="sensor-fallback">
                <button className="primary-action wide" onClick={requestPermission}>
                  <Smartphone size={18} aria-hidden="true" />
                  센서 권한 요청
                </button>
                <p className="hint">센서를 쓸 수 없다면 아래에 각도를 직접 입력하세요.</p>
              </div>
            )}
          </div>
        ) : null}

        {phase === 'prepare' ? (
          <div className="countdown-stage phase-prepare">
            <span className="phase-label">준비</span>
            <strong className="countdown">{countdown}</strong>
            <p>바르게 선 자세를 유지하세요. 0이 되면 자동으로 0도가 맞춰집니다.</p>
            <button onClick={cancelStep}>
              <X size={18} aria-hidden="true" />
              중단
            </button>
          </div>
        ) : null}

        {phase === 'measuring' ? (
          <div className="countdown-stage phase-measuring">
            <span className="phase-label">측정</span>
            <strong className="countdown">{countdown}</strong>
            <div className="live-angle">
              <span>현재 각도</span>
              <strong>{liveAngles[currentStep.key]}°</strong>
            </div>
            <p>{currentStep.motion}</p>
            <button onClick={cancelStep}>
              <X size={18} aria-hidden="true" />
              중단
            </button>
          </div>
        ) : null}

        {phase === 'done' ? (
          <div className="countdown-stage phase-done">
            <span className="phase-label">완료</span>
            <strong className="countdown">{result.angle ?? 0}°</strong>
            <p>{isLastStep ? '결과 화면으로 이동합니다.' : '다음 단계로 이동합니다.'}</p>
          </div>
        ) : null}
      </section>

      {phase === 'ready' ? (
        <section className="manual-input" aria-label="수동 각도 입력">
          <label>
            <span>수동 각도 입력 (0-{currentStep.max}°)</span>
            <input
              value={manualDraft}
              onChange={(event) => setManualDraft(event.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
              max={currentStep.max}
              placeholder={`0-${currentStep.max}`}
            />
          </label>
          <button onClick={saveManualValue}>
            <Save size={18} aria-hidden="true" />
            입력 저장
          </button>
        </section>
      ) : null}

      <section className="sensor-status-line">
        <div>
          <Smartphone size={18} aria-hidden="true" />
          <strong>센서</strong>
          <StatusBadge status={sensorStatus} />
        </div>
        <p>
          <Info size={16} aria-hidden="true" />
          {sensorMessage}
        </p>
      </section>
    </main>
  )
}
