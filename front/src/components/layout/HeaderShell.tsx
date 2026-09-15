import type { ReactNode } from "react"
import Logo from "./Logo"

interface HeaderShellProps {
  onLogoClick?: () => void
  center?: ReactNode
  right?: ReactNode
}

export default function HeaderShell({ onLogoClick, center, right }: HeaderShellProps) {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 px-4 sm:px-6 py-2.5 sm:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        <div className="shrink-0">
          <Logo onClick={onLogoClick} />
        </div>
        {center && <div className="min-w-0 flex-1 flex items-center justify-center">{center}</div>}
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  )
}