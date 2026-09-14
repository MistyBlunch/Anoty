import type { ReactNode } from "react"
import Logo from "./Logo"

interface HeaderShellProps {
  onLogoClick?: () => void
  center?: ReactNode
  right?: ReactNode
}

export default function HeaderShell({ onLogoClick, center, right }: HeaderShellProps) {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Logo onClick={onLogoClick} />
        {center}
        {right}
      </div>
    </header>
  )
}