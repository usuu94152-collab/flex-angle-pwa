type BeepType = 'tick' | 'start' | 'end'

const TONES: Record<BeepType, { freq: number; duration: number }> = {
  tick: { freq: 660, duration: 0.08 },
  start: { freq: 880, duration: 0.32 },
  end: { freq: 392, duration: 0.5 },
}

let audioContext: AudioContext | null = null

function getAudioConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const scoped = window as typeof window & { webkitAudioContext?: typeof AudioContext }
  return window.AudioContext ?? scoped.webkitAudioContext ?? null
}

/** Must be called from a user gesture (the 시작 button) to satisfy autoplay policy. */
export function initAudio() {
  if (audioContext) {
    if (audioContext.state === 'suspended') void audioContext.resume()
    return
  }
  const Ctx = getAudioConstructor()
  if (!Ctx) return
  try {
    audioContext = new Ctx()
  } catch {
    audioContext = null
  }
}

export function beep(type: BeepType) {
  if (!audioContext) return
  const { freq, duration } = TONES[type]
  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.4, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + duration)
}

export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    // Vibration unsupported or blocked — ignore.
  }
}
