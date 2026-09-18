# Changelog

## 2.0.0

- Replaced `gapi` + SweetAlert2 with `fetch`, GIS, and native dialogs
- Stopped requesting full-mail and extra Gmail scopes; `gmail.modify` only
- Deduplicated message IDs, bounded retries, cancelable sync
- Render sender and label values as text (no HTML injection)
- Added demo mode, CSV export, select-matching, pagination, and forums/all tabs
- Vendored Bootstrap assets for offline UI and reproducible installs
- Added unit tests, optional Playwright specs, and operator docs
