import { useState } from 'react'
import './App.css'
import { AppShell } from './components/AppShell'
import { DEFAULT_CRITERIA } from './constants/criteria'
import { STORAGE_KEYS } from './constants/storage'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useMeasurementSession } from './hooks/useMeasurementSession'
import { useOrientationSensor } from './hooks/useOrientationSensor'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MeasureScreen } from './screens/MeasureScreen'
import { ResultScreen } from './screens/ResultScreen'
import type { FlexRecord, Screen } from './types'
import { migrateRecords } from './utils/migration'
import { buildRecord, getPreviousRecord } from './utils/record'
import { readStorage } from './utils/storage'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [records, setRecords] = useLocalStorage<FlexRecord[]>(STORAGE_KEYS.records, () =>
    migrateRecords(readStorage<unknown>(STORAGE_KEYS.records, [])),
  )
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)

  const sensor = useOrientationSensor()
  const session = useMeasurementSession(sensor, handleFinish)

  function handleFinish() {
    const id = window.crypto.randomUUID()
    const record = buildRecord(id, session.measurements, DEFAULT_CRITERIA)
    setRecords((prev) => [record, ...prev])
    setCurrentRecordId(id)
    setScreen('results')
  }

  function beginMeasurement() {
    session.startNewMeasurement()
    setCurrentRecordId(null)
    setScreen('measure')
  }

  function navigate(next: Screen) {
    if (next !== 'measure') session.cancelStep()
    setScreen(next)
  }

  function deleteRecord(id: string) {
    setRecords((prev) => prev.filter((record) => record.id !== id))
    if (currentRecordId === id) setCurrentRecordId(null)
  }

  const currentRecord = records.find((record) => record.id === currentRecordId)

  return (
    <AppShell screen={screen} onNavigate={navigate}>
      {screen === 'home' ? (
        <HomeScreen
          records={records}
          sensorStatus={sensor.sensorStatus}
          sensorMessage={sensor.sensorMessage}
          onStart={beginMeasurement}
          onViewHistory={() => navigate('history')}
          onRequestPermission={sensor.requestPermission}
        />
      ) : null}

      {screen === 'measure' ? <MeasureScreen session={session} sensor={sensor} /> : null}

      {screen === 'results' ? (
        <ResultScreen
          record={currentRecord}
          previousRecord={getPreviousRecord(records, currentRecordId)}
          onRemeasure={beginMeasurement}
          onViewHistory={() => navigate('history')}
          onHome={() => navigate('home')}
        />
      ) : null}

      {screen === 'history' ? (
        <HistoryScreen records={records} onDelete={deleteRecord} />
      ) : null}
    </AppShell>
  )
}

export default App
