# Enable Google Tasks API

## The Error

```
Failed to fetch task lists (403): Google Tasks API has not been used in project 96333342882
before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/
tasks.googleapis.com/overview?project=96333342882 then retry.
```

## What This Means

Your authentication is working perfectly! The token refresh logic is working, the migration succeeded, and your user record was created with the correct Google ID (`113058954775822825891`).

The only issue is that the Google Tasks API needs to be enabled in your Google Cloud Project.

## How to Fix (2 minutes)

### Option 1: Direct Link (Fastest)

1. **Click this link** to go directly to the API page:
   ```
   https://console.developers.google.com/apis/api/tasks.googleapis.com/overview?project=96333342882
   ```

2. **Click "Enable"** button

3. **Wait 1-2 minutes** for the API to activate

4. **Refresh the FlowFox integrations page**

### Option 2: Manual Steps

1. **Go to Google Cloud Console**:
   - Visit https://console.cloud.google.com
   - Select your project (ID: `96333342882`)

2. **Navigate to APIs & Services**:
   - Click the hamburger menu (☰) in top left
   - Click "APIs & Services" → "Library"

3. **Search for Google Tasks API**:
   - In the search bar, type "Google Tasks API"
   - Click on "Google Tasks API" from the results

4. **Enable the API**:
   - Click the blue "Enable" button
   - Wait for confirmation message

5. **Verify**:
   - Go back to FlowFox: http://localhost:3000/settings/integrations
   - You should now see your Google Task Lists!

## What APIs You Need

For FlowFox to work fully, you need these APIs enabled:

- ✅ **Google+ API** (for OAuth login) - Already enabled
- ⏳ **Google Tasks API** (for task sync) - **Enable this now**
- 📅 **Google Calendar API** (for calendar integration) - Enable when you add calendar features

## Verification Steps

After enabling the API:

1. **Refresh the integrations page** in FlowFox
2. **Check the server console** - you should see:
   ```
   Session data: {
     hasSession: true,
     hasAccessToken: true,
     userId: '113058954775822825891',
     expiresAt: 1768992961,
     tokenExpired: false
   }
   Creating Google Tasks client...
   Fetching task lists from Google API...
   Successfully fetched X task lists
   ```

3. **You should see your Google Task Lists** displayed on the page

## Troubleshooting

### "API hasn't propagated yet"

If you get the same error after enabling:
- Wait 2-3 minutes for Google's systems to propagate the change
- Clear browser cache and refresh
- Try clicking "Retry" in the error message

### "Wrong project"

If you see a different project ID in the error:
- Make sure you enabled the API in project `96333342882`
- Check your `.env.local` has the correct `AUTH_GOOGLE_ID` for this project

### "Still getting 403"

If the error persists after 5 minutes:
1. Verify the API is actually enabled:
   - Go to https://console.cloud.google.com/apis/dashboard?project=96333342882
   - You should see "Google Tasks API" in the enabled APIs list
2. Sign out and sign back in to get a fresh token
3. Check that your Google Cloud project has billing enabled (some APIs require it)

## Next Steps

Once the API is enabled and working:

1. ✅ Google Tasks integration will load successfully
2. ✅ You can map Google Task Lists to FlowFox boards
3. ✅ Bi-directional sync will work
4. ✅ Token refresh will keep it working for weeks/months

The authentication infrastructure is solid - you just need to flip this switch in Google Cloud Console!
