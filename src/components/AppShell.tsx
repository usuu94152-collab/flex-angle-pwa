import { History, Home, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Screen } from '../types'

type Props = {
  screen: Screen
  onNavigate: (screen: Screen) => void
  children: ReactNode
}

export function AppShell({ screen, onNavigate, children }: Props) {
  return (
    <div className="app-shell">
      <div className="promo-strip">측정 기록은 이 기기에만 저장됩니다</div>
      <header className="topbar">
        <button className="brand" onClick={() => onNavigate('home')} aria-label="홈으로 이동">
          <span className="brand-mark">
            <UserRound size={20} aria-hidden="true" />
          </span>
          <span>Flex Angle</span>
        </button>
        <nav aria-label="주요 화면">
          <button className={screen === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}>
            <Home size={17} aria-hidden="true" />
            홈
          </button>
          <button
            className={screen === 'history' ? 'active' : ''}
            onClick={() => onNavigate('history')}
          >
            <History size={17} aria-hidden="true" />
            기록
          </button>
        </nav>
      </header>
      {children}
    </div>
  )
}
