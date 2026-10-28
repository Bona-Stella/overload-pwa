import { createContext, useContext } from 'react'
import type { AuthController, AuthState } from './controller.ts'
export const AuthContext = createContext<{ state: AuthState; controller: AuthController } | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider가 필요합니다.')
  return value
}
