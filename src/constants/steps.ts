import type { MeasurementKey, MeasurementStep } from '../types'

export const PREPARE_SECONDS = 5
export const MEASURE_SECONDS = 10

export const STEPS: MeasurementStep[] = [
  {
    key: 'frontBack',
    label: '전후 굽힘',
    shortLabel: '전후',
    axis: 'beta',
    max: 180,
    instruction: '휴대폰을 몸통 앞면에 세로로 대고 바르게 섭니다. 준비 시간이 끝나면 자동으로 0도가 맞춰집니다.',
    motion: '측정 신호가 울리면 앞이나 뒤로 천천히 굽혀 가장 큰 자세에서 멈추고 유지하세요.',
  },
  {
    key: 'sideBend',
    label: '좌우 굽힘',
    shortLabel: '좌우',
    axis: 'gamma',
    max: 90,
    instruction: '휴대폰이 몸통과 함께 움직이도록 잡고 바르게 섭니다. 준비 시간이 끝나면 자동으로 0도가 맞춰집니다.',
    motion: '측정 신호가 울리면 왼쪽 또는 오른쪽으로 천천히 기울이고 최대 자세를 유지하세요.',
  },
  {
    key: 'rotation',
    label: '몸통 회전',
    shortLabel: '회전',
    axis: 'alpha',
    max: 180,
    instruction: '정면을 보고 바르게 섭니다. 준비 시간이 끝나면 자동으로 기준 방향이 저장됩니다.',
    motion: '측정 신호가 울리면 골반은 고정하고 몸통을 좌우로 돌려 최대 자세를 유지하세요.',
    caution: '회전값은 기기별 방향 센서 오차가 커서 참고용으로 봐 주세요.',
  },
]

export const STEP_BY_KEY = STEPS.reduce(
  (acc, step) => ({ ...acc, [step.key]: step }),
  {} as Record<MeasurementKey, MeasurementStep>,
)
