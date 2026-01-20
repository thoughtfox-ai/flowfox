'use client'

import type { User } from '@supabase/supabase-js'
import { createContext, useContext, type ReactNode } from 'react'

// AUTH DISABLED FOR DEVELOPMENT
// TODO: Re-enable real auth once Google OAuth is configured

// Mock user for development - use static date to avoid hydration mismatch
// Using a valid UUID for database compatibility
const DEV_USER_ID = 'db297104-c70f-4e4c-80ae-343849c9c02f'

const MOCK_USER: User = {
  id: DEV_USER_ID,
  email: 'dev@thoughtfox.io',
  app_metadata: {},
  user_metadata: {
    full_name: 'Dev User',
    avatar_url: null,
  },
  aud: 'authenticated',
  created_at: '2025-01-20T00:00:00.000Z',
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
  // Use mock user - no loading state needed
  const user = MOCK_USER
  const loading = false

  const signOut = async () => {
    // In dev mode, just refresh the page
    window.location.href = '/boards'
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
