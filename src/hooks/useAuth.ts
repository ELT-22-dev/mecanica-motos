import { useEffect, useState } from 'react'
import type { BlinkUser } from '@blinkdotnew/sdk'
import { blink } from '@/blink/client'

export function useAuth() {
  const [user, setUser] = useState<BlinkUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (!state.isLoading) setIsLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, isLoading, isAuthenticated: !!user }
}
