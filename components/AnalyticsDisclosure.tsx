'use client'

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import styles from './AnalyticsDisclosure.module.css'

type AnalyticsDisclosure = {
  open: boolean
  panelId: string
  buttonText: string
  toggle: () => void
}

type AnalyticsToggleButtonProps = {
  open: boolean
  onToggle: () => void
  panelId: string
  className?: string
  style?: CSSProperties
}

type CollapsibleAnalyticsProps = {
  open: boolean
  id: string
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function useAnalyticsDisclosure(storageKey: string): AnalyticsDisclosure {
  const reactId = useId()
  const panelId = `analytics-panel-${reactId.replace(/:/g, '')}`
  const [open, setOpen] = useState(false)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    try {
      setOpen(window.sessionStorage.getItem(storageKey) === 'open')
    } catch {
      setOpen(false)
    }
    setRestored(true)
  }, [storageKey])

  useEffect(() => {
    if (!restored) return
    try {
      window.sessionStorage.setItem(storageKey, open ? 'open' : 'closed')
    } catch {
      // Session persistence is a convenience; the disclosure still works without it.
    }
  }, [open, restored, storageKey])

  return {
    open,
    panelId,
    buttonText: open ? 'Hide Analytics' : 'Show Analytics',
    toggle: () => setOpen(value => !value),
  }
}

export function AnalyticsToggleButton({ open, onToggle, panelId, className, style }: AnalyticsToggleButtonProps) {
  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
    >
      <BarChart3 size={16} />
      {open ? 'Hide Analytics' : 'Show Analytics'}
    </button>
  )
}

export function CollapsibleAnalytics({ open, id, children, className, style }: CollapsibleAnalyticsProps) {
  const [present, setPresent] = useState(open)
  const [expanded, setExpanded] = useState(open)

  useEffect(() => {
    let frame = 0
    let timer = 0

    if (open) {
      setPresent(true)
      frame = window.requestAnimationFrame(() => setExpanded(true))
    } else {
      setExpanded(false)
      timer = window.setTimeout(() => setPresent(false), 240)
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (timer) window.clearTimeout(timer)
    }
  }, [open])

  if (!present) return null

  return (
    <div
      id={id}
      className={`${styles.panel}${expanded ? ` ${styles.open}` : ''}${className ? ` ${className}` : ''}`}
      style={style}
      aria-hidden={expanded ? undefined : true}
    >
      <div className={styles.inner}>{children}</div>
    </div>
  )
}
