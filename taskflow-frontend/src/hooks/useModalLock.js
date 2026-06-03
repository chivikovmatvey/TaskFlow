import { useEffect } from 'react'
import { useModalStore } from '../stores/modalStore'

export function useModalLock(isOpen = true) {
  useEffect(() => {
    if (!isOpen) return
    const { open, close } = useModalStore.getState()
    open()
    return () => close()
  }, [isOpen])
}
