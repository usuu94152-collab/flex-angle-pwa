import { useCallback, useEffect, useRef, useState } from 'react'
import { MEASURE_SECONDS, PREPARE_SECONDS, STEPS } from '../constants/steps'
import type {
  MeasurementKey,
  MeasurementResult,
  MeasurePhase,
  OrientationSnapshot,
} from '../types'
import { getAxisValue, normalizeDelta, roundAngle } from '../utils/angle'
import { beep, initAudio, vibrate } from '../utils/feedback'
import type { OrientationSensor } from './useOrientationSensor'

const EMPTY_RESULT: MeasurementResult = {
  angle: null,
  source: null,
  baseline: null,
  rawDelta: null,
  note: '',
}

function emptyResults(): Record<MeasurementKey, MeasurementResult> {
  return {
    frontBack: { ...EMPTY_RESULT },
    sideBend: { ...EMPTY_RESULT },
    rotation: { ...EMPTY_RESULT },
  }
}

function emptyAngles(): Record<MeasurementKey, number> {
  return { frontBack: 0, sideBend: 0, rotation: 0 }
}

function emptySamples(): Record<MeasurementKey, number[]> {
  return { frontBack: [], sideBend: [], rotation: [] }
}

export function useMeasurementSession(sensor: OrientationSensor, onFinish: () => void) {
  const { latestOrientationRef, subscribe } = sensor

  const [measurements, setMeasurements] = useState(emptyResults)
  const [liveAngles, setLiveAngles] = useState(emptyAngles)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [phase, setPhase] = useState<MeasurePhase>('ready')
  const [countdown, setCountdown] = useState(0)
  const [capturing, setCapturing] = useState<MeasurementKey | null>(null)
  const [manualDraft, setManualDraft] = useState('')

  const measurementsRef = useRef(measurements)
  const liveAnglesRef = useRef(liveAngles)
  const capturingRef = useRef<MeasurementKey | null>(null)
  const stepIndexRef = useRef(0)
  const samplesRef = useRef(emptySamples())
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    measurementsRef.current = measurements
  }, [measurements])
  useEffect(() => {
    liveAnglesRef.current = liveAngles
  }, [liveAngles])
  useEffect(() => {
    stepIndexRef.current = currentStepIndex
  }, [currentStepIndex])
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  const currentStep = STEPS[currentStepIndex]

  const handleSample = useCallback((snapshot: OrientationSnapshot) => {
    const activeKey = capturingRef.current
    if (!activeKey) return

    const step = STEPS.find((item) => item.key === activeKey)
    if (!step) return

    const result = measurementsRef.current[activeKey]
    const baseline = result.baseline
    const current = getAxisValue(snapshot, step.axis)
    if (baseline === null || current === null) return

    const delta = normalizeDelta(step.axis, current, baseline, step.max)
    setLiveAngles((prev) => ({ ...prev, [activeKey]: roundAngle(delta) }))

    const samples = [...samplesRef.current[activeKey], delta].slice(-8)
    samplesRef.current[activeKey] = samples
    if (samples.length < 5) return

    const min = Math.min(...samples)
    const max = Math.max(...samples)
    if (max - min > 5) return

    const stableAngle = roundAngle(samples.reduce((sum, value) => sum + value, 0) / samples.length)
    const previousAngle = measurementsRef.current[activeKey].angle ?? 0
    if (stableAngle > previousAngle + 0.4) {
      setMeasurements((prev) => ({
        ...prev,
        [activeKey]: {
          ...prev[activeKey],
          angle: stableAngle,
          rawDelta: stableAngle,
          source: 'sensor',
          note: '안정 구간 평균값',
        },
      }))
    }
  }, [])

  useEffect(() => subscribe(handleSample), [subscribe, handleSample])

  const beginMeasuring = useCallback(() => {
    const step = STEPS[stepIndexRef.current]
    const axisValue = getAxisValue(latestOrientationRef.current, step.axis)

    if (axisValue === null) {
      capturingRef.current = null
      setCapturing(null)
      setCountdown(0)
      setPhase('ready')
      return
    }

    const baseline = roundAngle(axisValue)
    samplesRef.current[step.key] = []
    const calibrated: MeasurementResult = {
      angle: null,
      source: null,
      baseline,
      rawDelta: null,
      note: '0도 보정 완료',
    }
    measurementsRef.current = { ...measurementsRef.current, [step.key]: calibrated }
    setMeasurements((prev) => ({ ...prev, [step.key]: calibrated }))
    setLiveAngles((prev) => ({ ...prev, [step.key]: 0 }))
    capturingRef.current = step.key
    setCapturing(step.key)
    setCountdown(MEASURE_SECONDS)
    setPhase('measuring')
  }, [latestOrientationRef])

  const finishMeasuring = useCallback(() => {
    const step = STEPS[stepIndexRef.current]
    capturingRef.current = null
    setCapturing(null)

    const result = measurementsRef.current[step.key]
    if (result.angle === null) {
      const angle = roundAngle(liveAnglesRef.current[step.key])
      const finalized: MeasurementResult = {
        ...result,
        angle,
        rawDelta: angle,
        source: 'sensor',
        note: '측정 종료 시점 값',
      }
      measurementsRef.current = { ...measurementsRef.current, [step.key]: finalized }
      setMeasurements((prev) => ({ ...prev, [step.key]: finalized }))
    }

    beep('end')
    vibrate([300, 120, 300])
    setPhase('done')
  }, [])

  const advance = useCallback(() => {
    const index = stepIndexRef.current
    if (index < STEPS.length - 1) {
      setCurrentStepIndex(index + 1)
      stepIndexRef.current = index + 1
      setManualDraft('')
      setCountdown(0)
      setPhase('ready')
    } else {
      setPhase('ready')
      onFinishRef.current()
    }
  }, [])

  useEffect(() => {
    if (phase !== 'prepare' && phase !== 'measuring') return

    const total = phase === 'prepare' ? PREPARE_SECONDS : MEASURE_SECONDS
    if (phase === 'prepare') {
      beep('tick')
      vibrate(100)
    } else {
      beep('start')
      vibrate([220, 90, 220])
    }

    let remaining = total
    const interval = window.setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining > 0) {
        beep('tick')
        vibrate(70)
        return
      }
      window.clearInterval(interval)
      if (phase === 'prepare') {
        beginMeasuring()
      } else {
        finishMeasuring()
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [phase, beginMeasuring, finishMeasuring])

  useEffect(() => {
    if (phase !== 'done') return
    const timer = window.setTimeout(() => advance(), 1600)
    return () => window.clearTimeout(timer)
  }, [phase, advance])

  const startStep = useCallback(() => {
    initAudio()
    const step = STEPS[stepIndexRef.current]
    samplesRef.current[step.key] = []
    const fresh = { ...EMPTY_RESULT }
    measurementsRef.current = { ...measurementsRef.current, [step.key]: fresh }
    setMeasurements((prev) => ({ ...prev, [step.key]: fresh }))
    setLiveAngles((prev) => ({ ...prev, [step.key]: 0 }))
    setManualDraft('')
    setCountdown(PREPARE_SECONDS)
    setPhase('prepare')
  }, [])

  const cancelStep = useCallback(() => {
    capturingRef.current = null
    setCapturing(null)
    setCountdown(0)
    setPhase('ready')
  }, [])

  const saveManualValue = useCallback(() => {
    const step = STEPS[stepIndexRef.current]
    const parsed = Number(manualDraft)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > step.max) return false

    const angle = roundAngle(parsed)
    const finalized: MeasurementResult = {
      angle,
      source: 'manual',
      baseline: null,
      rawDelta: angle,
      note: '수동 입력',
    }
    measurementsRef.current = { ...measurementsRef.current, [step.key]: finalized }
    setMeasurements((prev) => ({ ...prev, [step.key]: finalized }))
    setLiveAngles((prev) => ({ ...prev, [step.key]: angle }))
    setManualDraft('')
    setPhase('done')
    return true
  }, [manualDraft])

  const startNewMeasurement = useCallback(() => {
    const fresh = emptyResults()
    measurementsRef.current = fresh
    setMeasurements(fresh)
    setLiveAngles(emptyAngles())
    samplesRef.current = emptySamples()
    capturingRef.current = null
    setCapturing(null)
    setCurrentStepIndex(0)
    stepIndexRef.current = 0
    setManualDraft('')
    setCountdown(0)
    setPhase('ready')
  }, [])

  return {
    measurements,
    liveAngles,
    currentStep,
    currentStepIndex,
    phase,
    countdown,
    capturing,
    manualDraft,
    setManualDraft,
    startStep,
    cancelStep,
    saveManualValue,
    startNewMeasurement,
  }
}

export type MeasurementSession = ReturnType<typeof useMeasurementSession>
