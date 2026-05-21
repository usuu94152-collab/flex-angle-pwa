import type { TrendPoint } from '../types'

type Props = {
  points: TrendPoint[]
  max: number
  width?: number
  height?: number
}

export function Sparkline({ points, max, width = 280, height = 64 }: Props) {
  if (points.length < 2) {
    return (
      <div className="sparkline sparkline-empty">
        2회 이상 측정하면 추이가 표시됩니다
      </div>
    )
  }

  const pad = 8
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const safeMax = max > 0 ? max : 1

  const coords = points.map((point, index) => {
    const x = pad + (innerW * index) / (points.length - 1)
    const y = pad + innerH - (innerH * Math.min(point.value, safeMax)) / safeMax
    return { x, y }
  })

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const last = coords[coords.length - 1]
  const firstValue = points[0].value
  const lastValue = points[points.length - 1].value

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`추이: ${firstValue}° 에서 ${lastValue}° 로 변화`}
    >
      <polyline
        points={linePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c, index) => (
        <circle
          key={index}
          cx={c.x}
          cy={c.y}
          r={index === coords.length - 1 ? 4 : 2.5}
          fill="currentColor"
        />
      ))}
      <circle cx={last.x} cy={last.y} r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
