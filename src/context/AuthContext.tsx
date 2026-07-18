import { createContext, useContext, useState, type ReactNode } from 'react'
import { apiLogin } from '@/lib/api'
import { clearStoredUser, getStoredUser, setStoredUser } from '@/lib/auth-storage'
import type { AuthUser } from '@/types/auth'

interface AuthContextValue {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())

  async function login(username: string, password: string) {
    const authUser = await apiLogin(username, password)
    setStoredUser(authUser)
    setUser(authUser)
  }

  function logout() {
    clearStoredUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
