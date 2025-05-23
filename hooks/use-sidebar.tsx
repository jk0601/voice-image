'use client'

import { create } from 'zustand'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect } from 'react'

type SidebarStore = {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open })
}))

export function useSidebarToggle() {
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useSidebarStore()

  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-state')
    if (savedState) {
      setSidebarOpen(savedState === 'true')
    }
  }, [setSidebarOpen])

  const toggle = useCallback(() => {
    toggleSidebar()
    localStorage.setItem('sidebar-state', String(!isSidebarOpen))
  }, [toggleSidebar, isSidebarOpen])

  return { isSidebarOpen, toggleSidebar: toggle }
}

export { usePathname } 