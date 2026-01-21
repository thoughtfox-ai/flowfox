import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          // Request offline access to get refresh token
          access_type: "offline",
          // Force consent screen to always show (needed to get refresh token every time)
          prompt: "consent",
          response_type: "code",
          // Request scopes for Google Tasks and Calendar
          scope: [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/tasks",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      // Persist user ID from profile
      if (profile) {
        token.id = profile.sub
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client session
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.expiresAt = token.expiresAt as number
      // Include user ID in session
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
    async signIn({ account, profile }) {
      // Optionally restrict to specific domain
      // if (!profile?.email?.endsWith("@thoughtfox.com")) {
      //   return false
      // }

      // Create or update user in Supabase users table
      if (profile?.email && profile?.sub) {
        try {
          const supabase = createAdminClient()

          // Upsert user record (create if doesn't exist, update if exists)
          await supabase
            .from('users')
            .upsert({
              id: profile.sub, // Use Google ID as user ID
              email: profile.email,
              full_name: profile.name || profile.email.split('@')[0],
              avatar_url: profile.picture || null,
              google_id: profile.sub,
            }, {
              onConflict: 'id'
            })
        } catch (error) {
          console.error('Failed to create/update user:', error)
          // Don't block sign in if user creation fails
        }
      }

      return true
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
