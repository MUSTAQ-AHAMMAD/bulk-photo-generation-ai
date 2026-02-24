import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

interface User {
  id: string
  email: string
  name: string
  role: string
  credits: number
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  updateCredits: (credits: number) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        Cookies.set('accessToken', accessToken, { expires: 1 })
        Cookies.set('refreshToken', refreshToken, { expires: 7 })
        Cookies.set('userId', user.id, { expires: 7 })
        set({ user, accessToken, isAuthenticated: true })
      },
      clearAuth: () => {
        Cookies.remove('accessToken')
        Cookies.remove('refreshToken')
        Cookies.remove('userId')
        set({ user: null, accessToken: null, isAuthenticated: false })
      },
      updateCredits: (credits) => set((state) => ({ user: state.user ? { ...state.user, credits } : null })),
    }),
    { name: 'auth-storage', partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }) },
  ),
)
