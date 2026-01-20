# OAuth Consent Screen - Detailed Setup Guide

This guide walks you through configuring the OAuth Consent Screen in Google Cloud Console step-by-step.

## Navigation

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project from the dropdown at the top
3. Click the hamburger menu (☰) in the top left
4. Navigate to **APIs & Services** > **OAuth consent screen**

---

## Part 1: User Type Selection

You'll see two options:

### Option A: Internal (Recommended for ThoughtFox)
✅ **Choose this if:**
- You have a Google Workspace organization (e.g., @thoughtfox.io email domain)
- You only want team members with your organization's email to access FlowFox
- You don't need Google's verification process

**Advantages:**
- No verification required
- Automatically restricted to your domain
- Faster setup

**Limitations:**
- Only users with your organization's Google Workspace emails can sign in
- Can't share with external users

### Option B: External
⚠️ **Choose this if:**
- You don't have Google Workspace
- You're using personal Gmail accounts
- You need to allow users from multiple domains

**Limitations:**
- Limited to 100 users while in "Testing" mode
- Requires verification for production use (can take weeks)
- Shows "unverified app" warning to users

**For ThoughtFox internal use, choose Internal.**

Click **CREATE** after selecting your user type.

---

## Part 2: OAuth Consent Screen Configuration

### App Information Section

**1. App name** ⭐ REQUIRED
```
FlowFox
```
This name appears on the consent screen when users sign in.

**2. User support email** ⭐ REQUIRED
- Select your email from the dropdown
- This email is shown to users if they have questions about the app
```
your-email@thoughtfox.io
```

**3. App logo** (Optional)
- Upload a square image (120x120px minimum)
- PNG or JPG format
- Shows on the consent screen for branding
- Skip for now, can add later

**4. Application home page** (Optional)
```
https://flowfox.yourdomain.com
```
Skip if you don't have a production URL yet.

**5. Application privacy policy link** (Optional)
Skip for internal tools.

**6. Application terms of service link** (Optional)
Skip for internal tools.

### Authorized Domains Section

**Authorized domains** (Optional but recommended)

Add your production domain here (without `https://` or paths):
```
yourdomain.com
```

For development, you don't need to add `localhost`.

**Example:**
- ✅ Correct: `thoughtfox.com`
- ❌ Wrong: `https://thoughtfox.com`
- ❌ Wrong: `https://thoughtfox.com/`

### Developer Contact Information

**Developer contact information** ⭐ REQUIRED

Enter email addresses that Google can use to contact you about changes to your project:
```
your-email@thoughtfox.io
```

You can add multiple emails separated by commas.

**Click "SAVE AND CONTINUE" at the bottom.**

---

## Part 3: Scopes Configuration

This is the most important part for FlowFox functionality.

### Understanding Scopes

Scopes define what data your app can access from the user's Google account.

### Adding Scopes

**Click "ADD OR REMOVE SCOPES"**

You'll see a modal with hundreds of possible scopes. Here's what FlowFox needs:

#### Required Scopes (Added Automatically)
These are included by default:
- ✅ `openid` - Authenticate user identity
- ✅ `userinfo.email` - Access user's email address
- ✅ `userinfo.profile` - Access basic profile info (name, picture)

#### Additional Scopes to Add

**1. Google Tasks API**

Search for "tasks" in the filter box, then select:
```
https://www.googleapis.com/auth/tasks
```
- **Description:** "See, edit, create and delete all your tasks"
- **Type:** Sensitive
- **This allows:** FlowFox to sync tasks bidirectionally with Google Tasks

**2. Google Calendar API**

Search for "calendar" in the filter box, then select:
```
https://www.googleapis.com/auth/calendar.readonly
```
- **Description:** "See and download any calendar you can access using your Google Calendar"
- **Type:** Sensitive
- **This allows:** FlowFox to display calendar events in My Day view

**OR** if you want read+write access:
```
https://www.googleapis.com/auth/calendar
```
- **Description:** "See, edit, share, and permanently delete all the calendars you can access using Google Calendar"
- **Type:** Restricted (requires verification for production)

**For MVP, use `calendar.readonly`** to avoid verification.

### Scope Summary

Your final scope list should be:

| Scope | Purpose | Auto-added? |
|-------|---------|-------------|
| `openid` | Authentication | Yes |
| `userinfo.email` | User email | Yes |
| `userinfo.profile` | User name/picture | Yes |
| `https://www.googleapis.com/auth/tasks` | Tasks sync | **Add manually** |
| `https://www.googleapis.com/auth/calendar.readonly` | Calendar view | **Add manually** |

**Click "UPDATE" at the bottom of the scope modal.**
**Click "SAVE AND CONTINUE".**

---

## Part 4: Test Users (External User Type Only)

⚠️ **Skip this section if you chose "Internal" user type.**

If you chose "External" user type, you need to add test users:

**Click "ADD USERS"**

Add email addresses of people who should be able to test the app:
```
ben@thoughtfox.io
teammate@thoughtfox.io
```

While in "Testing" status:
- Only these users can sign in
- Maximum 100 test users
- No verification needed

**Click "SAVE AND CONTINUE".**

---

## Part 5: Summary & Verification

Review your settings:
- App name: FlowFox
- User support email: your-email@thoughtfox.io
- Scopes: 5 total (3 default + Tasks + Calendar)
- Publishing status: Testing (or Internal)

**Click "BACK TO DASHBOARD"**

---

## Common Issues & Solutions

### Issue: "Scope not found"
**Solution:** Make sure you enabled the APIs first:
1. Go to **APIs & Services** > **Library**
2. Search for "Google Tasks API" → Enable
3. Search for "Google Calendar API" → Enable
4. Return to OAuth consent screen and add scopes again

### Issue: "This app isn't verified" warning
**Solution:**
- For Internal apps: This won't appear
- For External apps in Testing: Add yourself as a test user, click "Advanced" → "Go to FlowFox (unsafe)"
- For production: Apply for verification (takes 2-6 weeks)

### Issue: Can't select "Internal" user type
**Solution:** You need a Google Workspace account. Options:
1. Create a Google Workspace account (paid)
2. Use "External" type and add test users
3. Proceed with "External" - works fine for small teams

### Issue: "Invalid scope" error later
**Solution:** The scope URL must be exact. Copy from this guide:
```
https://www.googleapis.com/auth/tasks
https://www.googleapis.com/auth/calendar.readonly
```

---

## After Configuration

Once OAuth Consent Screen is configured:

### Next: Create Credentials
1. Go to **APIs & Services** > **Credentials**
2. Follow Step 4 in `GOOGLE_OAUTH_SETUP.md`

### Editing Later
You can always edit the OAuth consent screen:
- Add/remove scopes
- Change app name
- Add more test users
- Add app logo

**To edit:** Return to **OAuth consent screen** and click "EDIT APP"

---

## Security Best Practices

### For Internal Apps:
✅ Use "Internal" user type
✅ Restrict to your organization's domain
✅ Only request scopes you need (don't add `calendar` if you only need `calendar.readonly`)

### For External Apps:
✅ Keep in "Testing" status until ready for production
✅ Only add trusted test users
✅ Use least-privilege scopes (readonly when possible)
✅ Apply for verification before publishing to >100 users

---

## Troubleshooting Checklist

Before proceeding to credentials creation, verify:

- [ ] OAuth consent screen configured
- [ ] User type selected (Internal or External)
- [ ] App name is "FlowFox"
- [ ] Support email added
- [ ] Google Tasks API enabled in Library
- [ ] Google Calendar API enabled in Library
- [ ] Tasks scope added: `https://www.googleapis.com/auth/tasks`
- [ ] Calendar scope added: `https://www.googleapis.com/auth/calendar.readonly`
- [ ] (External only) Test users added
- [ ] Summary page shows 5 scopes total

If all checked, proceed to **Step 4: Create OAuth 2.0 Credentials** in `GOOGLE_OAUTH_SETUP.md`.
