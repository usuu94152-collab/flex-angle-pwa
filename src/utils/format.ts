export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDelta(delta: number) {
  const rounded = Math.round(delta * 10) / 10
  if (rounded > 0) return `+${rounded}°`
  if (rounded < 0) return `${rounded}°`
  return '±0°'
}
