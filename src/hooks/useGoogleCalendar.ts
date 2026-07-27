import { useCallback, useEffect, useState } from 'react'
import { isConnected, connect, disconnect } from '@/lib/googleCalendar'

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    setConnected(isConnected())
  }, [])

  const doConnect = useCallback(async () => {
    await connect()
    setConnected(true)
  }, [])

  const doDisconnect = useCallback(() => {
    disconnect()
    setConnected(false)
  }, [])

  return { connected, connect: doConnect, disconnect: doDisconnect }
}
