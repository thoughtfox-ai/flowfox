'use client'

import { signIn } from "next-auth/react"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Loader2 } from 'lucide-react'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(false)
    }
  }

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
        return 'Error signing in. Please try again.'
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account.'
      case 'SessionRequired':
        return 'Please sign in to access this page.'
      case 'Configuration':
        return 'Server configuration error. Please contact support.'
      default:
        return errorCode ? `Authentication error: ${errorCode}` : null
    }
  }

  const errorMessage = getErrorMessage(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7FAFC] to-[#E2E8F0] dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-[#FF6B35]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-[#FF6B35] flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">FF</span>
          </div>
          <CardTitle className="text-2xl">
            Welcome to Flow<span className="text-[#FF6B35]">Fox</span>
          </CardTitle>
          <CardDescription>
            ThoughtFox&apos;s internal project management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-[#FF6B35] hover:bg-[#E85D04] text-white"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Sign in to access FlowFox and connect Google Tasks & Calendar
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
