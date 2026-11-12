import type { ReactNode } from 'react'
import { VernSymbol, VernWordmark } from '../brand/VernLogo.tsx'

/** Symbol + wordmark in forest on cream, with optional content (e.g. step label) on the right. */
export default function VernHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="vern-header">
      <span className="vern-header__logo" role="img" aria-label="Vern">
        <VernSymbol size={30} />
        <VernWordmark size={28} />
      </span>
      {children}
    </header>
  )
}
