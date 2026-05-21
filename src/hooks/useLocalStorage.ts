import { useEffect, useState } from 'react'
import { writeStorage } from '../utils/storage'

export function useLocalStorage<T>(key: string, initial: () => T) {
  const [value, setValue] = useState<T>(initial)

  useEffect(() => {
    writeStorage(key, value)
  }, [key, value])

  return [value, setValue] as const
}
