# Google Tasks Integration Fixes

## Issues Fixed

### 1. Missing Token Refresh Logic ✅

**Problem**: Google OAuth access tokens expire after ~1 hour. The app was storing tokens but never refreshing them, causing API calls to fail with 401 errors after the token expired.

**Fix**: Added automatic token refresh in `src/auth.ts`:
- Checks if token expires within 5 minutes
- Automatically calls Google's token refresh endpoint
- Updates the JWT with fresh access token
- Preserves refresh token for future refreshes

**Location**: [src/auth.ts:42-80](src/auth.ts#L42-L80)

### 2. Poor Error Visibility ✅

**Problem**: When API calls failed, error messages were generic ("Failed to fetch task lists") without details about WHY they failed.

**Fix**: Enhanced error handling in two places:

**A. API Route** (`src/app/api/google/task-lists/route.ts`):
- Added comprehensive logging of session state
- Logs token expiration status
- Logs each step of the API call
- Includes full error stack traces

**B. Google Tasks Client** (`src/lib/google/tasks-client.ts`):
- Now parses Google API error responses
- Includes actual error message from Google
- Shows HTTP status code in error message

**Locations**:
- [src/app/api/google/task-lists/route.ts](src/app/api/google/task-lists/route.ts)
- [src/lib/google/tasks-client.ts:50-67](src/lib/google/tasks-client.ts#L50-L67)

### 3. Session State After Migration

**Note**: After running migration 005 (UUID → TEXT conversion), old JWT sessions may still contain stale data. A fresh sign-in is required.

## Testing Steps

To test these fixes:

1. **Clear old session data**:
   ```bash
   # In browser DevTools Console:
   localStorage.clear()
   sessionStorage.clear()
   # Then manually clear all cookies for localhost:3000
   ```

2. **Restart development server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

3. **Sign out and sign back in**:
   - Visit http://localhost:3000
   - Click sign out
   - Click sign in with Google
   - Complete OAuth flow (you'll see consent screen due to `prompt: "consent"`)

4. **Test Google Tasks integration**:
   - Visit http://localhost:3000/settings/integrations
   - Should see Google Task Lists without errors

5. **Monitor server console**:
   You should now see detailed logs like:
   ```
   Session data: {
     hasSession: true,
     hasAccessToken: true,
     userId: '117492150812345678901',
     expiresAt: 1737545678,
     tokenExpired: false
   }
   Creating Google Tasks client...
   Fetching task lists from Google API...
   Successfully fetched 3 task lists
   ```

   Or if there's an error, you'll see specific details:
   ```
   Error name: Error
   Error message: Failed to fetch task lists (401): Request had invalid authentication credentials
   ```

## Expected Behavior

### First Hour After Sign-In
- Access token is fresh
- API calls work immediately
- No token refresh needed

### After ~55 Minutes
- Token refresh triggers automatically
- Console shows: "Token refreshed successfully"
- User doesn't notice anything
- API calls continue working

### If Token Refresh Fails
- User sees 500 error
- Console shows detailed error from Google
- User needs to sign out and back in

## Token Lifecycle

```
Sign In → Get Access Token (1hr) + Refresh Token
           ↓
           ├─ [0-55min] → Use Access Token ✅
           ├─ [55-60min] → Auto Refresh → New Access Token ✅
           └─ [Refresh fails] → Show error → Re-authenticate 🔄
```

## Troubleshooting

### Still getting 500 errors after sign-in?

Check the server console for these specific messages:

1. **"No access token in session"**
   - Problem: OAuth callback didn't store tokens
   - Fix: Check `.env` has valid `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`

2. **"Failed to fetch task lists (401): Invalid Credentials"**
   - Problem: Token refresh failed or token is invalid
   - Fix: Sign out, clear cookies, sign back in

3. **"Failed to fetch task lists (403): Access Not Configured"**
   - Problem: Google Tasks API not enabled in Google Cloud Console
   - Fix: Enable Tasks API at https://console.cloud.google.com

4. **"Token refreshed successfully" but still getting errors**
   - Problem: Refresh token might be revoked
   - Fix: Sign out and back in (forces new consent screen)

### Verifying token refresh is working

Add this to your test:

1. Sign in and note the time
2. Keep the app open for 1 hour
3. After ~55 minutes, make an API call
4. Check server console for "Token refreshed successfully"
5. API call should still succeed

## Files Modified

- `src/auth.ts` - Added token refresh logic in JWT callback
- `src/app/api/google/task-lists/route.ts` - Enhanced error logging
- `src/lib/google/tasks-client.ts` - Better error messages from Google API

## Next Steps

Once this is working:

1. ✅ Token refresh is automatic
2. ✅ Error messages are helpful
3. ⏭️ Implement token refresh UI indicator (optional)
4. ⏭️ Add error handling for revoked tokens
5. ⏭️ Implement bi-directional sync logic
