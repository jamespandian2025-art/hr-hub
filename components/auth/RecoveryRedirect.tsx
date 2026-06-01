'use client'

import { useEffect } from 'react'

function hasRecoverySignal(value: string) {
  return /(?:^|[?#&])(?:type=recovery|access_token=|refresh_token=|token_hash=|code=|error_code=)/i.test(value)
}

export default function RecoveryRedirect() {
  useEffect(() => {
    const current = `${window.location.search}${window.location.hash}`
    if (!hasRecoverySignal(current)) return
    window.location.replace(`/account-recovery${window.location.search}${window.location.hash}`)
  }, [])

  return null
}
