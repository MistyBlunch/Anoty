import type React from "react"

export interface HeaderShellProps {
  onLogoClick?: () => void
  center?: React.ReactNode
  right?: React.ReactNode
  left?: React.ReactNode
  className?: string
}

export interface LogoProps {
  onClick?: () => void
  className?: string
}

export interface AvatarProps {
  src: string
  alt?: string
  className?: string
  placeholder?: string
}

export interface SvgSafeProps {
  svg: string
  className?: string
}

export interface GithubIconProps {
  className?: string
}
