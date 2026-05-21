export type MeasurementKey = 'frontBack' | 'sideBend' | 'rotation'
export type AxisKey = 'alpha' | 'beta' | 'gamma'
export type Grade = 'good' | 'normal' | 'caution'
export type Screen = 'home' | 'measure' | 'results' | 'history'

export type SensorStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'denied'
  | 'unsupported'
  | 'unavailable'

export type ResultSource = 'sensor' | 'manual' | null

export type MeasurePhase = 'ready' | 'prepare' | 'measuring' | 'done'

export type PermissionResponse = 'granted' | 'denied'

export type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionResponse>
}

export type OrientationSnapshot = {
  alpha: number | null
  beta: number | null
  gamma: number | null
  timestamp: number
}

export type MeasurementStep = {
  key: MeasurementKey
  label: string
  shortLabel: string
  axis: AxisKey
  max: number
  instruction: string
  motion: string
  caution?: string
}

export type Threshold = {
  good: number
  normal: number
}

export type Criteria = Record<MeasurementKey, Threshold>

export type MeasurementResult = {
  angle: number | null
  source: ResultSource
  baseline: number | null
  rawDelta: number | null
  note: string
}

export type FlexRecord = {
  id: string
  createdAt: string
  angles: Record<MeasurementKey, number>
  grades: Record<MeasurementKey, Grade>
  sources: Record<MeasurementKey, Exclude<ResultSource, null>>
}

export type TrendPoint = {
  createdAt: string
  value: number
}
