import { useState, useEffect } from 'react'

interface AvatarProps {
  src: string
  alt?: string
  className?: string
  placeholder?: string
}

export default function Avatar({ src, alt = 'Avatar', className = '', placeholder }: AvatarProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchImage = async () => {
      try {
        const response = await fetch(src)
        if (!response.ok) throw new Error('Network response was not ok')
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        if (isMounted) setImgUrl(objectUrl)
      } catch (e) {
        console.error('Failed to load avatar:', e)
        if (isMounted) setError(true)
      }
    }
    fetchImage()
    return () => {
      isMounted = false
      if (imgUrl) URL.revokeObjectURL(imgUrl)
    }
  }, [src])

  if (error && placeholder) {
    return <img src={placeholder} alt={alt} className={className} />
  }

  if (!imgUrl) {
    return (
      <div className={`animate-pulse bg-slate-700 ${className}`} style={{ width: '40px', height: '40px', borderRadius: '9999px' }} />
    )
  }

  return <img src={imgUrl} alt={alt} className={className} />
}

