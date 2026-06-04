'use client'

import { useEffect, useRef } from 'react'

// Bridges a voice "action" command (e.g. "create RFQ") to the page that can
// perform it. The voice button stashes the intent + dispatches an event, then
// navigates. A page already mounted reacts to the event; a page that mounts
// after navigation consumes the stashed intent. Either way the action fires once.
const STORAGE_KEY = 'wiseflow:voice-intent'
export const VOICE_INTENT_EVENT = 'wiseflow:voice-intent'

export function requestVoiceIntent(intent: string) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(STORAGE_KEY, intent) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(VOICE_INTENT_EVENT, { detail: intent }))
}

function consumePendingVoiceIntent(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY)
    if (value) window.sessionStorage.removeItem(STORAGE_KEY)
    return value
  } catch {
    return null
  }
}

/** Run `handler` when the matching voice intent arrives — on mount (after a voice navigation) or live (same page). */
export function useVoiceIntent(intent: string, handler: () => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    // Fire synchronously (not via a timer) so React StrictMode's effect
    // double-invoke in dev — which would clear a pending timeout — can't drop
    // the action. The intent is consumed from storage so it only runs once.
    const pending = consumePendingVoiceIntent()
    if (pending === intent) handlerRef.current()
    window.addEventListener(VOICE_INTENT_EVENT, onEvent)
    return () => window.removeEventListener(VOICE_INTENT_EVENT, onEvent)

    function onEvent(event: Event) {
      if ((event as CustomEvent).detail === intent) {
        consumePendingVoiceIntent()
        handlerRef.current()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])
}
