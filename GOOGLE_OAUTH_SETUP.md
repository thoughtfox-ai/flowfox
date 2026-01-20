# Google OAuth Setup Guide for FlowFox

FlowFox uses Google OAuth to authenticate users and access Google Tasks and Calendar APIs.

## Prerequisites

- Google Cloud Project
- Access to Google Cloud Console (console.cloud.google.com)

## Step 1: Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "FlowFox" or "ThoughtFox Project Manager"

## Step 2: Enable Required APIs

1. Navigate to **APIs & Services** > **Library**
2. Search for and enable these APIs:
   - **Google Tasks API**
   - **Google Calendar API**
   - **Google+ API** (for profile information)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **Internal** if you want to restrict to your organization's domain
   - Or choose **External** for broader access
3. Fill in required fields:
   - **App name**: FlowFox
   - **User support email**: your email
   - **Developer contact**: your email
4. Add the following scopes:
   - `openid`
   - `userinfo.email`
   - `userinfo.profile`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/calendar.readonly`
5. Save and continue

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Choose **Web application**
4. Add a name (e.g., "FlowFox Web Client")
5. Add **Authorized redirect URIs**:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Step 5: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Auth.js Configuration
AUTH_SECRET=<already-generated-by-npx-auth-secret>
AUTH_GOOGLE_ID=your-client-id-here.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret-here

# Optional: Gemini AI for board generation
GEMINI_API_KEY=your-gemini-api-key-here
```

## Step 6: Restart the Development Server

```bash
npm run dev
```

## Testing Authentication

1. Visit `http://localhost:3000`
2. You should be redirected to `/auth/login`
3. Click "Sign in with Google"
4. Authorize the app
5. You should be redirected back to FlowFox

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Ensure the redirect URI in Google Cloud Console exactly matches `http://localhost:3000/api/auth/callback/google`
- Check for trailing slashes or protocol mismatches (http vs https)

### "Access blocked: FlowFox has not completed verification"
- This appears for External apps in development
- Add yourself as a test user in OAuth consent screen settings
- Or use Internal user type if within a Google Workspace organization

### "Configuration error"
- Check that `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set in `.env.local`
- Ensure `AUTH_SECRET` is set (should be auto-generated)

### Session not persisting
- Clear browser cookies
- Check that middleware is running (should see `ƒ Proxy (Middleware)` in build output)
- Verify `SessionProvider` is wrapping your app in layout.tsx

## Accessing Google APIs with User Tokens

Once authenticated, the session includes:
- `session.accessToken` - Use this to make Google API calls
- `session.refreshToken` - Used to refresh the access token
- `session.expiresAt` - When the access token expires

Example using the access token:

```typescript
import { auth } from "@/auth"

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.accessToken) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Call Google Tasks API
  const response = await fetch(
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  )

  const data = await response.json()
  return Response.json(data)
}
```

## Next Steps

- Implement Google Tasks sync (Phase 2, Week 6)
- Implement Google Calendar integration
- Add user profile settings page
- Add integration management UI at `/settings/integrations`
