'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'

interface User {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    avatar_url?: string | null
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const loading = status === 'loading'

  // Transform NextAuth session to match expected User type
  const user: User | null = session?.user
    ? {
        id: session.user.id || '',
        email: session.user.email || '',
        user_metadata: {
          full_name: session.user.name || session.user.email?.split('@')[0] || 'User',
          avatar_url: session.user.image || null,
        },
      }
    : null

  const signOut = async () => {
    await nextAuthSignOut({ callbackUrl: '/auth/login' })
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
