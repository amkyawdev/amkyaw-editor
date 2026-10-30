import { useEffect, useState } from 'react'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type ResponsiveState = {
  width: number
  height: number
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouch: boolean
  isLandscape: boolean
  isPortrait: boolean
  hasHover: boolean
  prefersReducedMotion: boolean
  dpr: number
}

const breakpointFor = (width: number): Breakpoint => {
  if (width < 480) return 'xs'
  if (width < 768) return 'sm'
  if (width < 1024) return 'md'
  if (width < 1440) return 'lg'
  return 'xl'
}

const readState = (): ResponsiveState => {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      breakpoint: 'xs',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      isLandscape: false,
      isPortrait: true,
      hasHover: true,
      prefersReducedMotion: false,
      dpr: 1,
    }
  }
  const width = window.innerWidth
  const height = window.innerHeight
  const breakpoint = breakpointFor(width)
  const isTouch = window.matchMedia('(pointer: coarse)').matches
  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl',
    isTouch,
    isLandscape: width > height,
    isPortrait: height >= width,
    hasHover: window.matchMedia('(hover: hover)').matches,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    dpr: window.devicePixelRatio || 1,
  }
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(readState)

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setState(readState()))
    }
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return state
}
