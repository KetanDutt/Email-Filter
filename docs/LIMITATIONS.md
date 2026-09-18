# Limitations

This tool is built for **deliberate inbox cleanup**, not as a full Gmail client.

## Safety cap

Sync stops after `config.maxMessages` (default 10,000) metadata records. Remaining mail is not shown. Narrow the filter (unread + a category) rather than raising the cap blindly.

## Loaded vs mailbox

Counts are **messages loaded in this tab**. Search only matches those senders. Changing filter or category on a real account **re-fetches** from Gmail with a new query.

## Actions apply to loaded IDs only

Bulk actions never invent IDs. If sync was partial or stopped, unlisted mail is untouched.

If a `batchModify` call fails after earlier chunks succeeded, the banner reports how many IDs were **confirmed**. Refresh before retrying; the last in-flight chunk might still have reached Gmail.

## Trash is not permanent delete

Trash uses Gmail’s Trash label. Gmail typically permanently deletes those messages after about 30 days. There is no “delete forever” button here on purpose.

## Tokens expire

GIS access tokens last about an hour and are not refreshed in the background. Sign out and sign in again if requests start returning 401.

## Unverified Google apps

Until Google verifies the OAuth client, only **test users** listed in Cloud Console can sign in, and they will see a warning screen. That is expected.

## Offline

The service worker can show the UI shell offline. Listing or changing mail requires the network. Loaded rows are not persisted.

## Demo mode

Demo data is synthetic. Actions never call Google. Use it to learn the UI; do not treat counts as a real mailbox.

## Accessibility and browsers

The app targets current Chromium, Firefox, and Safari releases. Native `<dialog>` and GIS popups must be allowed. Content blockers that strip `accounts.google.com` will prevent sign-in (demo still works).
