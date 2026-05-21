import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DeviceOrientationEventWithPermission,
  OrientationSnapshot,
  SensorStatus,
} from '../types'

function getOrientationConstructor() {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return null
  return window.DeviceOrientationEvent as DeviceOrientationEventWithPermission
}

export type Sampler = (snapshot: OrientationSnapshot) => void

export function useOrientationSensor() {
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>(() =>
    getOrientationConstructor() ? 'idle' : 'unsupported',
  )
  const [sensorMessage, setSensorMessage] = useState(() =>
    getOrientationConstructor()
      ? '센서 권한을 요청한 뒤 측정을 시작하세요.'
      : '이 브라우저는 방향 센서를 지원하지 않습니다. 수동 입력을 사용하세요.',
  )
  const [sensorListening, setSensorListening] = useState(false)
  const [latestOrientation, setLatestOrientation] = useState<OrientationSnapshot | null>(null)

  const latestOrientationRef = useRef<OrientationSnapshot | null>(null)
  const samplersRef = useRef(new Set<Sampler>())

  const subscribe = useCallback((sampler: Sampler) => {
    const samplers = samplersRef.current
    samplers.add(sampler)
    return () => {
      samplers.delete(sampler)
    }
  }, [])

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
      samplersRef.current.forEach((sampler) => sampler(snapshot))
    }

    window.addEventListener('deviceorientation', handleOrientation)
    const timer = window.setTimeout(() => {
      if (!latestOrientationRef.current) {
        setSensorStatus('unavailable')
        setSensorMessage(
          '센서 이벤트가 들어오지 않습니다. HTTPS 접속인지 확인하거나 수동 입력을 사용하세요.',
        )
      }
    }, 1800)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.clearTimeout(timer)
    }
  }, [sensorListening])

  const requestPermission = useCallback(async () => {
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
      setSensorMessage('권한이 허용되었습니다. 측정을 시작하세요.')
    } catch {
      setSensorStatus('denied')
      setSensorMessage(
        '권한 요청을 완료하지 못했습니다. 브라우저 설정을 확인하거나 수동 입력을 사용하세요.',
      )
    }
  }, [])

  return {
    sensorStatus,
    sensorMessage,
    latestOrientation,
    latestOrientationRef,
    requestPermission,
    subscribe,
  }
}

export type OrientationSensor = ReturnType<typeof useOrientationSensor>
