# Setup

You can use **Explore demo** with no Google configuration.

Connecting a real inbox requires a Google Cloud OAuth **Web application** client ID. The client ID is public. **Never put a client secret in this repository** — this app uses Google Identity Services in the browser and has no backend to keep a secret.

## 1. Create a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the **Gmail API**.

## 2. Configure the OAuth consent screen

1. User type: **External** (unless you are on Google Workspace and can use Internal).
2. Add an app name, support email, and the privacy policy URL (`docs/privacy.html` on your HTTPS origin).
3. App scopes: `https://www.googleapis.com/auth/gmail.modify` only.
4. While the app is **unverified**, add yourself under **Test users**. Google will block other accounts.

Restricted Gmail scopes require Google’s verification and [Limited Use](https://developers.google.com/terms/api-services-user-data-policy) compliance before you can offer the app to the public. Until then, keep it in testing mode.

## 3. Create an OAuth client ID

1. Credentials → **Create credentials** → **OAuth client ID** → **Web application**.
2. Authorized JavaScript origins (examples):
   - `http://localhost:8000`
   - `https://your-domain.example`
3. You do **not** need authorized redirect URIs for the GIS token client used here.
4. Copy the client ID into `config.js`:

```js
window.EMAIL_FILTER_CONFIG = {
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    maxMessages: 10000
};
```

`maxMessages` is a client-side safety cap, not a Gmail quota. Lower it if you want shorter syncs.

## 4. Serve the app

OAuth will not work from `file://`. Use `npm start`, another local static server, or HTTPS hosting.

Sign in, grant **gmail.modify**, and wait for metadata sync. Stop sync at any time; partial results remain until you refresh or sign out.

## 5. Revoking access

Sign out in the app (this revokes the current access token when possible) and/or remove the app at [Google Account permissions](https://myaccount.google.com/permissions).
