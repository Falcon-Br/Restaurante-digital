import { createContext } from 'react'

export interface AuthUser {
  token: string
  nome: string
  email: string
  role: string
}

export interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)
