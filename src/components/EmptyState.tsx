import { ClipboardList } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <section className="empty-state">
      <ClipboardList size={32} aria-hidden="true" />
      <p>{children}</p>
    </section>
  )
}
