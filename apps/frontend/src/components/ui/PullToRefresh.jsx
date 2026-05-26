import { useRef, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 64
const MAX_PULL = 96
const DAMPEN = 0.55

export default function PullToRefresh({ onRefresh, className = '', children }) {
  const scrollRef = useRef(null)
  const startYRef = useRef(null)
  const pullingRef = useRef(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const onTouchStart = useCallback((e) => {
    if (refreshing) return
    const el = scrollRef.current
    if (!el || el.scrollTop > 0) {
      startYRef.current = null
      pullingRef.current = false
      return
    }
    startYRef.current = e.touches[0].clientY
    pullingRef.current = false
  }, [refreshing])

  const onTouchMove = useCallback((e) => {
    if (refreshing || startYRef.current == null) return
    const el = scrollRef.current
    if (!el) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      if (pullingRef.current) {
        pullingRef.current = false
        setPull(0)
      }
      return
    }
    if (el.scrollTop > 0) {
      startYRef.current = null
      pullingRef.current = false
      setPull(0)
      return
    }
    pullingRef.current = true
    if (e.cancelable) e.preventDefault()
    const next = Math.min(MAX_PULL, delta * DAMPEN)
    setPull(next)
  }, [refreshing])

  const finishPull = useCallback(async () => {
    if (!pullingRef.current) {
      startYRef.current = null
      return
    }
    const shouldRefresh = pull >= THRESHOLD
    pullingRef.current = false
    startYRef.current = null
    if (shouldRefresh && onRefresh) {
      setRefreshing(true)
      setPull(THRESHOLD)
      try { await onRefresh() }
      finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
  }, [pull, onRefresh])

  const indicatorOpacity = Math.min(1, pull / THRESHOLD)
  const showSpinner = refreshing || pull >= THRESHOLD
  const indicatorRotation = (pull / THRESHOLD) * 180

  return (
    <div
      ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={finishPull}
      onTouchCancel={finishPull}
      className={`relative overflow-y-scroll overscroll-contain scrollbar-hide ${className}`}
    >
      <div
        className="pointer-events-none absolute left-0 right-0 flex justify-center"
        style={{
          top: 0,
          transform: `translateY(${Math.max(0, pull - 28)}px)`,
          opacity: indicatorOpacity,
          transition: pullingRef.current ? 'none' : 'transform 200ms ease, opacity 200ms ease',
        }}
      >
        <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-[#0e0f0c]">
          <RefreshCw
            size={16}
            className={showSpinner ? 'animate-spin' : ''}
            style={!showSpinner ? { transform: `rotate(${indicatorRotation}deg)`, transition: 'transform 80ms linear' } : undefined}
          />
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: pullingRef.current ? 'none' : 'transform 200ms ease',
        }}
      >
        {children}
      </div>
    </div>
  )
}
