'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  // Language
  language: 'EN' | 'KU' | 'AR'
  setLanguage: (lang: 'EN' | 'KU' | 'AR') => void

  // Modals
  isCustomizerOpen: boolean
  isCartOpen: boolean
  isReviewModalOpen: boolean
  isMenuManagerOpen: boolean
  setCustomizerOpen: (open: boolean) => void
  setCartOpen: (open: boolean) => void
  setReviewModalOpen: (open: boolean) => void
  setMenuManagerOpen: (open: boolean) => void

  // Mobile menu
  isMobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void

  // Hero background
  heroBackgroundIndex: number
  setHeroBackgroundIndex: (index: number) => void

  // Toast
  toastMessage: string | null
  setToastMessage: (message: string | null) => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Loading states
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Language
      language: 'EN',
      setLanguage: (lang) => set({ language: lang }),

      // Modals
      isCustomizerOpen: false,
      isCartOpen: false,
      isReviewModalOpen: false,
      isMenuManagerOpen: false,
      setCustomizerOpen: (open) => set({ isCustomizerOpen: open }),
      setCartOpen: (open) => set({ isCartOpen: open }),
      setReviewModalOpen: (open) => set({ isReviewModalOpen: open }),
      setMenuManagerOpen: (open) => set({ isMenuManagerOpen: open }),

      // Mobile menu
      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

      // Hero background
      heroBackgroundIndex: 0,
      setHeroBackgroundIndex: (index) => set({ heroBackgroundIndex: index }),

      // Toast
      toastMessage: null,
      setToastMessage: (message) => set({ toastMessage: message }),

      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Loading states
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'smashed-burger-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
      }),
    }
  )
)