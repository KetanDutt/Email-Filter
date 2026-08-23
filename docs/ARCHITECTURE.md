# Architecture Document

## Overview
Gmail Manager Pro is a client-side Single Page Application (SPA) designed to help users efficiently manage and bulk-clean their Gmail inbox. 

## Technology Stack
- **Frontend Core:** HTML5, CSS3, Vanilla JavaScript (ES6+).
- **UI Framework:** Bootstrap 5 (CSS & Icons).
- **Alerts & Modals:** SweetAlert2.
- **APIs:** 
  - Google Identity Services (GIS) for authentication.
  - Gmail REST API for reading and mutating emails.

## File Structure
- `index.html`: The main entry point, containing the HTML layout and UI components.
- `style.css`: Custom styling, overriding Bootstrap variables for a dark theme.
- `app.js`: Application logic, state management, and API interactions.
- `sw.js`: Service worker to enable Progressive Web App (PWA) offline asset caching.
- `manifest.json`: Web app manifest for installability.

## API Quota Management
The Gmail API imposes strict rate limits (e.g., 250 quota units per second). To prevent `403 Rate Limit Exceeded` errors:
1. **Fetching:** `messages.get` requests are throttled with a 1.5-second delay between batches of 50 to safely stay under limits.
2. **Mutations:** Bulk actions (Archive, Delete, Mark Read) use the `batchModify` endpoint. Large sets of IDs are automatically chunked into arrays of 1000 and processed sequentially.
3. **Retry Logic:** If a rate limit is exceeded, requests are caught, paused for 2-5 seconds, and automatically retried.

## Authentication Flow
The application uses the modern Google Identity Services `TokenClient` to request short-lived OAuth 2.0 access tokens. Once a token is retrieved, it is passed to the legacy `gapi.client` using `gapi.client.setToken()`.
