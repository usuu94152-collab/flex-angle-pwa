import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Gauge,
  History,
  Home,
  Info,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type MeasurementKey = 'frontBack' | 'sideBend' | 'rotation'
type AxisKey = 'alpha' | 'beta' | 'gamma'
type Grade = 'good' | 'normal' | 'caution'
type Screen = 'home' | 'measure' | 'results' | 'history' | 'settings'
type SensorStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'denied'
  | 'unsupported'
  | 'unavailable'
type ResultSource = 'sensor' | 'manual' | null

type PermissionResponse = 'granted' | 'denied'

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionResponse>
}

type OrientationSnapshot = {
  alpha: number | null
  beta: number | null
  gamma: number | null
  timestamp: number
}

type MeasurementStep = {
  key: MeasurementKey
  label: string
  shortLabel: string
  axis: AxisKey
  max: number
  instruction: string
  motion: string
  caution?: string
}

type Threshold = {
  good: number
  normal: number
}

type CriteriaConfig = {
  version: string
  updatedAt: string
  thresholds: Record<MeasurementKey, Threshold>
}

type MeasurementResult = {
  angle: number | null
  source: ResultSource
  baseline: number | null
  rawDelta: number | null
  note: string
}

type FlexRecord = {
  id: string
  createdAt: string
  studentId: string
  studentName: string
  angles: Record<MeasurementKey, number>
  grades: Record<MeasurementKey, Grade>
  sources: Record<MeasurementKey, Exclude<ResultSource, null>>
  criteriaVersion: string
  deviceMemo: string
}

const STORAGE_KEYS = {
  criteria: 'flex-angle.criteria.v1',
  records: 'flex-angle.records.v1',
}

const STEPS: MeasurementStep[] = [
  {
    key: 'frontBack',
    label: '전후 굽힘',
    shortLabel: '전후',
    axis: 'beta',
    max: 180,
    instruction: '휴대폰을 몸통 앞면에 세로로 대고 바르게 선 자세에서 0도를 맞춥니다.',
    motion: '앞으로 또는 뒤로 천천히 굽힌 뒤 1초 정도 멈추면 가장 안정적인 각도를 저장합니다.',
  },
  {
    key: 'sideBend',
    label: '좌우 굽힘',
    shortLabel: '좌우',
    axis: 'gamma',
    max: 90,
    instruction: '같은 위치에서 휴대폰이 몸통과 함께 움직이도록 잡고 0도를 맞춥니다.',
    motion: '왼쪽 또는 오른쪽으로 천천히 기울이고, 흔들림이 줄었을 때의 최대 각도를 저장합니다.',
  },
  {
    key: 'rotation',
    label: '몸통 회전',
    shortLabel: '회전',
    axis: 'alpha',
    max: 180,
    instruction: '정면을 보고 선 상태에서 휴대폰 방향을 기준점으로 저장합니다.',
    motion: '골반은 최대한 고정하고 몸통을 좌우로 돌립니다.',
    caution: '회전값은 기기별 방향 센서 오차가 커서 참고 측정으로 표시됩니다.',
  },
]

const STEP_BY_KEY = STEPS.reduce(
  (acc, step) => ({ ...acc, [step.key]: step }),
  {} as Record<MeasurementKey, MeasurementStep>,
)

const DEFAULT_CRITERIA: CriteriaConfig = {
  version: 'school-flex-v1',
  updatedAt: new Date().toISOString(),
  thresholds: {
    frontBack: { good: 70, normal: 45 },
    sideBend: { good: 35, normal: 20 },
    rotation: { good: 55, normal: 35 },
  },
}

const DEFAULT_RESULTS: Record<MeasurementKey, MeasurementResult> = {
  frontBack: {
    angle: null,
    source: null,
    baseline: null,
    rawDelta: null,
    note: '',
  },
  sideBend: {
    angle: null,
    source: null,
    baseline: null,
    rawDelta: null,
    note: '',
  },
  rotation: {
    angle: null,
    source: null,
    baseline: null,
    rawDelta: null,
    note: '',
  },
}

const SOURCE_LABELS: Record<Exclude<ResultSource, null>, string> = {
  sensor: '센서',
  manual: '수동',
}

const GRADE_LABELS: Record<Grade, string> = {
  good: '좋음',
  normal: '보통',
  caution: '주의',
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be blocked in private browsing. The app still works in-memory.
  }
}

function roundAngle(value: number) {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getAxisValue(snapshot: OrientationSnapshot | null, axis: AxisKey) {
  if (!snapshot) return null
  return snapshot[axis]
}

function normalizeDelta(axis: AxisKey, current: number, baseline: number, max: number) {
  if (axis === 'alpha') {
    const wrapped = ((current - baseline + 540) % 360) - 180
    return clamp(Math.abs(wrapped), 0, max)
  }

  return clamp(Math.abs(current - baseline), 0, max)
}

function getGrade(angle: number, threshold: Threshold): Grade {
  if (angle >= threshold.good) return 'good'
  if (angle >= threshold.normal) return 'normal'
  return 'caution'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function csvCell(value: string | number) {
  const text = String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function getDeviceMemo(sensorStatus: SensorStatus, measurements: Record<MeasurementKey, MeasurementResult>) {
  const sourceMemo = STEPS.map((step) => {
    const result = measurements[step.key]
    return `${step.label}:${result.source ? SOURCE_LABELS[result.source] : '미완료'}`
  }).join(' / ')

  return [
    `sensor=${sensorStatus}`,
    sourceMemo,
    `ua=${window.navigator.userAgent}`,
  ].join(' | ')
}

function createRecordRows(records: FlexRecord[]) {
  return [
    [
      '날짜',
      '학번',
      '이름',
      '전후 굽힘 각도',
      '전후 굽힘 등급',
      '좌우 굽힘 각도',
      '좌우 굽힘 등급',
      '몸통 회전 각도',
      '몸통 회전 등급',
      '기준 버전',
      '측정 방식',
      '기기/브라우저 메모',
    ],
    ...records.map((record) => [
      formatDate(record.createdAt),
      record.studentId,
      record.studentName,
      record.angles.frontBack,
      GRADE_LABELS[record.grades.frontBack],
      record.angles.sideBend,
      GRADE_LABELS[record.grades.sideBend],
      record.angles.rotation,
      GRADE_LABELS[record.grades.rotation],
      record.criteriaVersion,
      STEPS.map((step) => `${step.shortLabel}:${SOURCE_LABELS[record.sources[step.key]]}`).join(' / '),
      record.deviceMemo,
    ]),
  ]
}

function getOrientationConstructor() {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return null
  return window.DeviceOrientationEvent as DeviceOrientationEventWithPermission
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [criteria, setCriteria] = useState<CriteriaConfig>(() =>
    readStorage(STORAGE_KEYS.criteria, DEFAULT_CRITERIA),
  )
  const [draftCriteria, setDraftCriteria] = useState<CriteriaConfig>(criteria)
  const [records, setRecords] = useState<FlexRecord[]>(() =>
    readStorage(STORAGE_KEYS.records, []),
  )
  const [measurements, setMeasurements] =
    useState<Record<MeasurementKey, MeasurementResult>>(DEFAULT_RESULTS)
  const [liveAngles, setLiveAngles] = useState<Record<MeasurementKey, number>>({
    frontBack: 0,
    sideBend: 0,
    rotation: 0,
  })
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [capturing, setCapturing] = useState<MeasurementKey | null>(null)
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>(() =>
    getOrientationConstructor() ? 'idle' : 'unsupported',
  )
  const [sensorMessage, setSensorMessage] = useState(() =>
    getOrientationConstructor()
      ? '센서 권한 요청 전입니다.'
      : '이 브라우저는 DeviceOrientationEvent를 지원하지 않습니다. 수동 입력을 사용하세요.',
  )
  const [sensorListening, setSensorListening] = useState(false)
  const [latestOrientation, setLatestOrientation] = useState<OrientationSnapshot | null>(null)
  const [manualDraft, setManualDraft] = useState('')
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)

  const latestOrientationRef = useRef<OrientationSnapshot | null>(null)
  const capturingRef = useRef<MeasurementKey | null>(null)
  const measurementsRef = useRef(measurements)
  const samplesRef = useRef<Record<MeasurementKey, number[]>>({
    frontBack: [],
    sideBend: [],
    rotation: [],
  })

  const currentStep = STEPS[currentStepIndex]
  const studentReady = studentId.trim().length > 0 && studentName.trim().length > 0
  const allComplete = STEPS.every((step) => measurements[step.key].angle !== null)

  const currentGrades = useMemo(() => {
    return STEPS.reduce(
      (acc, step) => {
        const angle = measurements[step.key].angle
        acc[step.key] = angle === null ? null : getGrade(angle, criteria.thresholds[step.key])
        return acc
      },
      {} as Record<MeasurementKey, Grade | null>,
    )
  }, [criteria.thresholds, measurements])

  const summary = useMemo(() => {
    const grades = STEPS.map((step) => currentGrades[step.key]).filter(Boolean) as Grade[]
    if (grades.length !== STEPS.length) return '세 가지 측정을 모두 마치면 총평이 표시됩니다.'
    if (grades.every((grade) => grade === 'good')) return '세 면 모두 안정적으로 좋은 범위입니다.'
    if (grades.some((grade) => grade === 'caution')) {
      return '주의 범위가 있어 무리하지 않는 동작과 충분한 준비운동을 권장합니다.'
    }
    return '대체로 보통 범위입니다. 좌우 차이와 회전값은 수업 기록으로 함께 살펴보세요.'
  }, [currentGrades])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.criteria, criteria)
  }, [criteria])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.records, records)
  }, [records])

  useEffect(() => {
    capturingRef.current = capturing
  }, [capturing])

  useEffect(() => {
    measurementsRef.current = measurements
  }, [measurements])

  useEffect(() => {
    if (!sensorListening) return

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const snapshot: OrientationSnapshot = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        timestamp: Date.now(),
      }

      if (snapshot.alpha === null && snapshot.beta === null && snapshot.gamma === null) {
        return
      }

      latestOrientationRef.current = snapshot
      setLatestOrientation(snapshot)
      setSensorStatus('listening')
      setSensorMessage('센서 값을 받고 있습니다.')

      const activeKey = capturingRef.current
      if (!activeKey) return

      const step = STEP_BY_KEY[activeKey]
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
      const isStable = max - min <= 5
      if (!isStable) return

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
    }

    window.addEventListener('deviceorientation', handleOrientation)
    const timer = window.setTimeout(() => {
      if (!latestOrientationRef.current) {
        setSensorStatus('unavailable')
        setSensorMessage('센서 이벤트가 아직 들어오지 않습니다. HTTPS 접속인지 확인하거나 수동 입력을 사용하세요.')
      }
    }, 1800)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.clearTimeout(timer)
    }
  }, [sensorListening])

  async function requestSensorPermission() {
    const orientationConstructor = getOrientationConstructor()

    if (!orientationConstructor) {
      setSensorStatus('unsupported')
      setSensorMessage('이 브라우저는 방향 센서를 지원하지 않습니다. 수동 입력을 사용하세요.')
      return
    }

    setSensorStatus('requesting')
    setSensorMessage('센서 권한을 요청하는 중입니다.')

    try {
      if (typeof orientationConstructor.requestPermission === 'function') {
        const response = await orientationConstructor.requestPermission()
        if (response !== 'granted') {
          setSensorStatus('denied')
          setSensorMessage('센서 권한이 거부되었습니다. 수동 입력으로 계속할 수 있습니다.')
          return
        }
      }

      setSensorListening(true)
      setSensorStatus('listening')
      setSensorMessage('권한이 허용되었습니다. 0도 보정을 진행하세요.')
    } catch {
      setSensorStatus('denied')
      setSensorMessage('권한 요청을 완료하지 못했습니다. 브라우저 설정을 확인하거나 수동 입력을 사용하세요.')
    }
  }

  function startNewMeasurement() {
    setMeasurements({
      frontBack: { ...DEFAULT_RESULTS.frontBack },
      sideBend: { ...DEFAULT_RESULTS.sideBend },
      rotation: { ...DEFAULT_RESULTS.rotation },
    })
    setLiveAngles({ frontBack: 0, sideBend: 0, rotation: 0 })
    setCurrentStepIndex(0)
    setCapturing(null)
    setManualDraft('')
    setCurrentRecordId(null)
    setScreen('measure')
  }

  function calibrateCurrentStep() {
    const current = getAxisValue(latestOrientationRef.current, currentStep.axis)

    if (current === null) {
      setSensorMessage('현재 센서값이 없습니다. 권한 요청 후 다시 시도하거나 수동 입력을 사용하세요.')
      return
    }

    setCapturing(null)
    samplesRef.current[currentStep.key] = []
    setLiveAngles((prev) => ({ ...prev, [currentStep.key]: 0 }))
    setMeasurements((prev) => ({
      ...prev,
      [currentStep.key]: {
        angle: null,
        source: null,
        baseline: roundAngle(current),
        rawDelta: null,
        note: '0도 보정 완료',
      },
    }))
    setSensorMessage(`${currentStep.label} 기준점을 저장했습니다. 측정 시작을 누르세요.`)
  }

  function beginCapture() {
    const result = measurements[currentStep.key]

    if (sensorStatus !== 'listening') {
      setSensorMessage('센서 권한 요청을 먼저 진행하세요. 센서가 막히면 수동 입력을 사용합니다.')
      return
    }

    if (result.baseline === null) {
      setSensorMessage('0도 보정을 먼저 진행하세요.')
      return
    }

    samplesRef.current[currentStep.key] = []
    setLiveAngles((prev) => ({ ...prev, [currentStep.key]: 0 }))
    setMeasurements((prev) => ({
      ...prev,
      [currentStep.key]: {
        ...prev[currentStep.key],
        angle: null,
        rawDelta: null,
        source: null,
        note: '측정 중',
      },
    }))
    setCapturing(currentStep.key)
    setSensorMessage(`${currentStep.label} 측정 중입니다. 가장 큰 자세에서 잠시 멈추세요.`)
  }

  function stopCapture() {
    const active = capturing
    setCapturing(null)

    if (!active) return

    const result = measurementsRef.current[active]
    const fallback = liveAngles[active]
    if (result.angle !== null) {
      setSensorMessage(`${STEP_BY_KEY[active].label} ${result.angle}도를 저장했습니다.`)
      return
    }

    if (fallback > 0) {
      setMeasurements((prev) => ({
        ...prev,
        [active]: {
          ...prev[active],
          angle: roundAngle(fallback),
          rawDelta: roundAngle(fallback),
          source: 'sensor',
          note: '현재 최대값 저장',
        },
      }))
      setSensorMessage(`${STEP_BY_KEY[active].label} 현재값 ${roundAngle(fallback)}도를 저장했습니다.`)
      return
    }

    setSensorMessage('저장할 센서값이 없습니다. 다시 측정하거나 수동 입력을 사용하세요.')
  }

  function saveManualValue() {
    const parsed = Number(manualDraft)

    if (!Number.isFinite(parsed) || parsed < 0 || parsed > currentStep.max) {
      setSensorMessage(`0에서 ${currentStep.max}도 사이의 값을 입력하세요.`)
      return
    }

    const angle = roundAngle(parsed)
    setCapturing(null)
    setMeasurements((prev) => ({
      ...prev,
      [currentStep.key]: {
        ...prev[currentStep.key],
        angle,
        rawDelta: angle,
        source: 'manual',
        note: '수동 입력',
      },
    }))
    setLiveAngles((prev) => ({ ...prev, [currentStep.key]: angle }))
    setManualDraft('')
    setSensorMessage(`${currentStep.label} 수동 입력값 ${angle}도를 저장했습니다.`)
  }

  function goNextStep() {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((index) => index + 1)
      setManualDraft('')
      return
    }

    saveCurrentRecord()
    setScreen('results')
  }

  function saveCurrentRecord() {
    if (!allComplete) return

    const angles = STEPS.reduce(
      (acc, step) => {
        acc[step.key] = measurements[step.key].angle ?? 0
        return acc
      },
      {} as Record<MeasurementKey, number>,
    )
    const grades = STEPS.reduce(
      (acc, step) => {
        acc[step.key] = getGrade(angles[step.key], criteria.thresholds[step.key])
        return acc
      },
      {} as Record<MeasurementKey, Grade>,
    )
    const sources = STEPS.reduce(
      (acc, step) => {
        acc[step.key] = measurements[step.key].source ?? 'manual'
        return acc
      },
      {} as Record<MeasurementKey, Exclude<ResultSource, null>>,
    )

    const id = currentRecordId ?? window.crypto.randomUUID()
    const record: FlexRecord = {
      id,
      createdAt: new Date().toISOString(),
      studentId: studentId.trim(),
      studentName: studentName.trim(),
      angles,
      grades,
      sources,
      criteriaVersion: criteria.version,
      deviceMemo: getDeviceMemo(sensorStatus, measurements),
    }

    setCurrentRecordId(id)
    setRecords((prev) => [record, ...prev.filter((item) => item.id !== id)])
  }

  function exportCurrentCsv() {
    const record = records.find((item) => item.id === currentRecordId)
    if (!record) return
    downloadCsv(`flex-angle-${record.studentId}-${record.studentName}.csv`, createRecordRows([record]))
  }

  function exportAllCsv() {
    if (records.length === 0) return
    downloadCsv('flex-angle-records.csv', createRecordRows(records))
  }

  function deleteRecord(id: string) {
    setRecords((prev) => prev.filter((record) => record.id !== id))
    if (currentRecordId === id) setCurrentRecordId(null)
  }

  function saveCriteria() {
    const nextThresholds = STEPS.reduce(
      (acc, step) => {
        const draft = draftCriteria.thresholds[step.key]
        const good = clamp(Number(draft.good) || 0, 0, step.max)
        const normal = clamp(Number(draft.normal) || 0, 0, good)
        acc[step.key] = { good, normal }
        return acc
      },
      {} as Record<MeasurementKey, Threshold>,
    )

    setCriteria({
      version: draftCriteria.version.trim() || DEFAULT_CRITERIA.version,
      updatedAt: new Date().toISOString(),
      thresholds: nextThresholds,
    })
    setScreen('home')
  }

  function resetCriteria() {
    const reset = {
      ...DEFAULT_CRITERIA,
      updatedAt: new Date().toISOString(),
    }
    setDraftCriteria(reset)
    setCriteria(reset)
  }

  function updateDraftThreshold(key: MeasurementKey, field: keyof Threshold, value: string) {
    setDraftCriteria((prev) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: {
          ...prev.thresholds[key],
          [field]: Number(value),
        },
      },
    }))
  }

  function renderStatusBadge(status: SensorStatus) {
    const labels: Record<SensorStatus, string> = {
      idle: '대기',
      requesting: '요청 중',
      listening: '수신 중',
      denied: '거부됨',
      unsupported: '미지원',
      unavailable: '수신 없음',
    }

    return <span className={`status-badge status-${status}`}>{labels[status]}</span>
  }

  function renderHome() {
    return (
      <main className="app-main">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">수업용 관찰 도구</span>
            <h1>3면 유연성 측정</h1>
            <p>
              전후, 좌우, 회전 기록.
              CSV 제출, 기기 저장.
            </p>
          </div>
          <div className="hero-visual" aria-label="휴대폰을 몸통에 대고 측정하는 안내 그림">
            <img className="posture-art" src="/posture-guide.svg" alt="" />
            <span className="visual-tag">SENSOR READY</span>
            <span className="visual-metric">3 AXIS</span>
          </div>
        </section>

        <section className="form-grid" aria-label="학생 정보 입력">
          <label>
            <span>학번</span>
            <input
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="예: 20315"
            />
          </label>
          <label>
            <span>이름</span>
            <input
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              autoComplete="name"
              placeholder="예: 김민준"
            />
          </label>
          <button className="primary-action" disabled={!studentReady} onClick={startNewMeasurement}>
            <Play size={20} aria-hidden="true" />
            측정 시작
          </button>
        </section>

        <section className="quick-actions" aria-label="빠른 이동">
          <button onClick={requestSensorPermission}>
            <Smartphone size={18} aria-hidden="true" />
            센서 권한 요청
          </button>
          <button onClick={() => setScreen('history')}>
            <History size={18} aria-hidden="true" />
            이전 기록 보기
          </button>
          <button onClick={() => {
            setDraftCriteria(criteria)
            setScreen('settings')
          }}>
            <Settings size={18} aria-hidden="true" />
            교사 설정
          </button>
        </section>

        <section className="info-band" aria-label="센서 상태">
          <div>
            <ShieldCheck size={20} aria-hidden="true" />
            <strong>센서 상태</strong>
            {renderStatusBadge(sensorStatus)}
          </div>
          <p>{sensorMessage}</p>
        </section>
      </main>
    )
  }

  function renderMeasure() {
    const result = measurements[currentStep.key]
    const grade = currentGrades[currentStep.key]
    const axisValue = getAxisValue(latestOrientation, currentStep.axis)
    const stepDone = result.angle !== null

    return (
      <main className="app-main measure-main">
        <section className="step-header">
          <div>
            <span className="eyebrow">단계 {currentStepIndex + 1} / {STEPS.length}</span>
            <h1>{currentStep.label}</h1>
            <p>{currentStep.instruction}</p>
          </div>
          <div className="meter">
            <Gauge size={24} aria-hidden="true" />
            <strong>{result.angle ?? liveAngles[currentStep.key]}</strong>
            <span>도</span>
          </div>
        </section>

        <section className="progress-row" aria-label="측정 진행 상태">
          {STEPS.map((step, index) => {
            const done = measurements[step.key].angle !== null
            const active = index === currentStepIndex
            return (
              <button
                key={step.key}
                className={`step-pill ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                onClick={() => {
                  setCurrentStepIndex(index)
                  setManualDraft('')
                }}
              >
                {done ? <CheckCircle2 size={16} aria-hidden="true" /> : <span>{index + 1}</span>}
                {step.shortLabel}
              </button>
            )
          })}
        </section>

        <section className="measure-layout">
          <div className="control-panel">
            <div className="sensor-strip">
              <div>
                <Smartphone size={20} aria-hidden="true" />
                <strong>DeviceOrientation</strong>
                {renderStatusBadge(sensorStatus)}
              </div>
              <button onClick={requestSensorPermission}>
                <RefreshCw size={17} aria-hidden="true" />
                권한 요청
              </button>
            </div>

            <div className="readout-grid" aria-label="실시간 센서값">
              <span>alpha {latestOrientation?.alpha?.toFixed(1) ?? '-'}</span>
              <span>beta {latestOrientation?.beta?.toFixed(1) ?? '-'}</span>
              <span>gamma {latestOrientation?.gamma?.toFixed(1) ?? '-'}</span>
              <span>{currentStep.axis} 기준 {result.baseline ?? '-'}</span>
            </div>

            <p className="motion-text">{currentStep.motion}</p>
            {currentStep.caution ? (
              <p className="warning-text">
                <AlertTriangle size={17} aria-hidden="true" />
                {currentStep.caution}
              </p>
            ) : null}

            <div className="button-grid">
              <button onClick={calibrateCurrentStep}>
                <RotateCcw size={18} aria-hidden="true" />
                0도 보정
              </button>
              {capturing === currentStep.key ? (
                <button className="primary-action" onClick={stopCapture}>
                  <Pause size={18} aria-hidden="true" />
                  측정 종료
                </button>
              ) : (
                <button className="primary-action" onClick={beginCapture}>
                  <Activity size={18} aria-hidden="true" />
                  측정 시작
                </button>
              )}
            </div>

            <div className="manual-input">
              <label>
                <span>수동 각도 입력</span>
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
                수동값 저장
              </button>
            </div>

            <div className="status-line">
              <Info size={17} aria-hidden="true" />
              <span>{sensorMessage}</span>
            </div>
          </div>

          <aside className="result-panel">
            <h2>현재 단계 기록</h2>
            <dl>
              <div>
                <dt>저장 각도</dt>
                <dd>{result.angle === null ? '-' : `${result.angle}도`}</dd>
              </div>
              <div>
                <dt>등급</dt>
                <dd>{grade ? GRADE_LABELS[grade] : '-'}</dd>
              </div>
              <div>
                <dt>입력 방식</dt>
                <dd>{result.source ? SOURCE_LABELS[result.source] : '-'}</dd>
              </div>
              <div>
                <dt>실시간 축</dt>
                <dd>{axisValue === null ? '-' : `${currentStep.axis} ${axisValue.toFixed(1)}`}</dd>
              </div>
            </dl>
            <button className="primary-action wide" disabled={!stepDone} onClick={goNextStep}>
              {currentStepIndex === STEPS.length - 1 ? '결과 보기' : '다음 단계'}
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </aside>
        </section>
      </main>
    )
  }

  function renderResults() {
    const record = records.find((item) => item.id === currentRecordId)

    return (
      <main className="app-main">
        <section className="result-hero">
          <div>
            <span className="eyebrow">측정 완료</span>
            <h1>{studentName || '학생'} 결과</h1>
            <p>{summary}</p>
          </div>
          <button className="primary-action" disabled={!record} onClick={exportCurrentCsv}>
            <Download size={19} aria-hidden="true" />
            CSV 다운로드
          </button>
        </section>

        <section className="result-grid" aria-label="측정 결과">
          {STEPS.map((step) => {
            const result = measurements[step.key]
            const grade = currentGrades[step.key]
            return (
              <article className={`result-card grade-${grade ?? 'pending'}`} key={step.key}>
                <div>
                  <span>{step.label}</span>
                  <strong>{result.angle ?? '-'}도</strong>
                </div>
                <p>{grade ? GRADE_LABELS[grade] : '-'}</p>
                <small>{result.source ? SOURCE_LABELS[result.source] : '-'} · 기준 {criteria.thresholds[step.key].normal}/{criteria.thresholds[step.key].good}</small>
              </article>
            )
          })}
        </section>

        <section className="info-band">
          <div>
            <FileSpreadsheet size={20} aria-hidden="true" />
            <strong>CSV 항목</strong>
          </div>
          <p>날짜, 학번, 이름, 3면 각도와 등급, 기준 버전, 측정 방식, 기기/브라우저 메모가 포함됩니다.</p>
        </section>

        <section className="quick-actions">
          <button onClick={startNewMeasurement}>
            <Play size={18} aria-hidden="true" />
            다시 측정
          </button>
          <button onClick={() => setScreen('history')}>
            <History size={18} aria-hidden="true" />
            이전 기록
          </button>
          <button onClick={() => setScreen('home')}>
            <Home size={18} aria-hidden="true" />
            처음으로
          </button>
        </section>
      </main>
    )
  }

  function renderHistory() {
    return (
      <main className="app-main">
        <section className="list-header">
          <div>
            <span className="eyebrow">로컬 저장 기록</span>
            <h1>이전 기록</h1>
            <p>기록은 현재 브라우저의 로컬 저장소에만 남습니다.</p>
          </div>
          <button className="primary-action" disabled={records.length === 0} onClick={exportAllCsv}>
            <Download size={19} aria-hidden="true" />
            전체 CSV
          </button>
        </section>

        {records.length === 0 ? (
          <section className="empty-state">
            <ClipboardList size={32} aria-hidden="true" />
            <p>아직 저장된 기록이 없습니다.</p>
          </section>
        ) : (
          <section className="record-list" aria-label="저장된 측정 기록">
            {records.map((record) => (
              <article className="record-row" key={record.id}>
                <div>
                  <strong>{record.studentId} {record.studentName}</strong>
                  <span>{formatDate(record.createdAt)} · {record.criteriaVersion}</span>
                </div>
                <div className="record-values">
                  {STEPS.map((step) => (
                    <span key={step.key}>
                      {step.shortLabel} {record.angles[step.key]}도 {GRADE_LABELS[record.grades[step.key]]}
                    </span>
                  ))}
                </div>
                <div className="row-actions">
                  <button onClick={() => downloadCsv(`flex-angle-${record.studentId}-${record.studentName}.csv`, createRecordRows([record]))}>
                    <Download size={17} aria-hidden="true" />
                    CSV
                  </button>
                  <button className="danger" onClick={() => deleteRecord(record.id)}>삭제</button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    )
  }

  function renderSettings() {
    return (
      <main className="app-main">
        <section className="list-header">
          <div>
            <span className="eyebrow">교사 설정</span>
            <h1>등급 기준</h1>
            <p>좋음 기준 이상은 좋음, 보통 기준 이상은 보통, 그 아래는 주의로 계산합니다.</p>
          </div>
          <SlidersHorizontal size={34} aria-hidden="true" />
        </section>

        <section className="settings-panel">
          <label className="version-field">
            <span>기준 버전</span>
            <input
              value={draftCriteria.version}
              onChange={(event) => setDraftCriteria((prev) => ({ ...prev, version: event.target.value }))}
            />
          </label>

          {STEPS.map((step) => (
            <fieldset className="threshold-row" key={step.key}>
              <legend>{step.label}</legend>
              <label>
                <span>보통 기준</span>
                <input
                  type="number"
                  min="0"
                  max={step.max}
                  value={draftCriteria.thresholds[step.key].normal}
                  onChange={(event) => updateDraftThreshold(step.key, 'normal', event.target.value)}
                />
              </label>
              <label>
                <span>좋음 기준</span>
                <input
                  type="number"
                  min="0"
                  max={step.max}
                  value={draftCriteria.thresholds[step.key].good}
                  onChange={(event) => updateDraftThreshold(step.key, 'good', event.target.value)}
                />
              </label>
            </fieldset>
          ))}
        </section>

        <section className="quick-actions">
          <button className="primary-action" onClick={saveCriteria}>
            <Save size={18} aria-hidden="true" />
            기준 저장
          </button>
          <button onClick={resetCriteria}>
            <RotateCcw size={18} aria-hidden="true" />
            기본값 복원
          </button>
          <button onClick={() => setScreen('home')}>
            <Home size={18} aria-hidden="true" />
            처음으로
          </button>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <div className="promo-strip">측정값은 이 기기에만 저장됩니다</div>
      <header className="topbar">
        <button className="brand" onClick={() => setScreen('home')} aria-label="처음 화면으로 이동">
          <span className="brand-mark">
            <UserRound size={20} aria-hidden="true" />
          </span>
          <span>Flex Angle</span>
        </button>
        <nav aria-label="주요 화면">
          <button className={screen === 'home' ? 'active' : ''} onClick={() => setScreen('home')}>
            <Home size={17} aria-hidden="true" />
            홈
          </button>
          <button className={screen === 'history' ? 'active' : ''} onClick={() => setScreen('history')}>
            <History size={17} aria-hidden="true" />
            기록
          </button>
          <button className={screen === 'settings' ? 'active' : ''} onClick={() => {
            setDraftCriteria(criteria)
            setScreen('settings')
          }}>
            <Settings size={17} aria-hidden="true" />
            설정
          </button>
        </nav>
      </header>

      {screen === 'home' ? renderHome() : null}
      {screen === 'measure' ? renderMeasure() : null}
      {screen === 'results' ? renderResults() : null}
      {screen === 'history' ? renderHistory() : null}
      {screen === 'settings' ? renderSettings() : null}
    </div>
  )
}

export default App
