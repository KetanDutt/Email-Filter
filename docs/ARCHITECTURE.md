# Architecture

Gmail Manager Pro is a static single-page app. There is no application backend.

## Stack

- HTML, CSS, and vanilla JavaScript
- Bootstrap 5.3.3 CSS and Bootstrap Icons, vendored under `vendor/`
- Google Identity Services (GIS) token client for OAuth
- Gmail REST API via `fetch` (no `gapi` client)

## Files

| File | Role |
| --- | --- |
| `index.html` | Layout, landmark structure, demo/sign-in chrome |
| `style.css` | Theme, spacing, dark mode |
| `config.js` | Public OAuth client ID and message cap |
| `core.js` | Pure helpers shared with Node tests |
| `app.js` | UI state, OAuth, sync, mutations |
| `sw.js` | Optional app-shell cache; never caches Gmail/OAuth |
| `manifest.json` | PWA install metadata |
| `tests/` | Unit tests and optional Playwright specs |

## Data flow

1. GIS returns a short-lived access token into tab memory.
2. `users.messages.list` pages inbox IDs for the current filter and category (`in:inbox` plus Gmail search operators).
3. `users.messages.get?format=metadata` loads `From` and `labelIds` only.
4. Messages are stored in a `Map` keyed by ID so refresh cannot duplicate rows.
5. The UI groups, filters, and paginates that in-memory set.
6. Mutations call `users.messages.batchModify` in chunks of 1,000 IDs. Local labels update **only after** a chunk succeeds.

## Quota and retries

- Metadata fetches run in small parallel batches with a short pause, staying under typical per-user Gmail unit rates.
- HTTP 429, 5xx, and Gmail `rateLimitExceeded` / `userRateLimitExceeded` / `backendError` retry up to five times with exponential backoff and `Retry-After`.
- 401, 404, and ordinary 403 are not retried in a loop.
- Users can abort an in-flight sync; aborted requests are ignored even if they complete late.

## Security properties

- Mailbox fields are assigned with `textContent` / DOM APIs, never `innerHTML`.
- Tokens are not written to `localStorage`, cookies, or IndexedDB.
- The service worker allowlists public assets by URL and skips `googleapis.com` / `accounts.google.com`.
- Closing the tab or signing out drops the session.

## Why `gmail.modify`

Archive, Trash, mark-read, and label changes require modify access. The app never requests `mail.google.com` (full mail) or `gmail.readonly` in addition. Restricted scopes still mean you must follow Google’s Limited Use rules if you publish the client ID widely.
