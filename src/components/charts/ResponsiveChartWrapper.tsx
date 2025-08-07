'use client'

import React, { useState, useEffect } from 'react'

interface ResponsiveChartWrapperProps {
  children: React.ReactNode
  minHeight?: string
  mobileHeight?: string
  desktopHeight?: string
}

export default function ResponsiveChartWrapper({
  children,
  minHeight = '250px',
  mobileHeight = '300px',
  desktopHeight = '400px'
}: ResponsiveChartWrapperProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const height = isMobile ? mobileHeight : desktopHeight

  return (
    <div 
      className="w-full relative"
      style={{ 
        height,
        minHeight
      }}
    >
      {children}
    </div>
  )
}