# Gmail Manager Pro

A **client-side** workspace for cleaning a Gmail inbox by sender. It runs in the browser, talks to the Gmail API directly, and **does not send mailbox data to an application server**.

This is not a Gmail replacement and is **not affiliated with Google**.

## What it does

- Groups loaded inbox messages by sender
- Bulk **mark read**, **archive**, **move to Trash**, or **apply an existing label**
- Filters by unread / read / starred and Gmail categories
- Searches the senders already loaded in this tab
- Exports the current sender list as CSV
- Includes a **no-account demo** so you can try the UI without OAuth

## What it does not do

- It does **not** load email bodies or attachments
- It does **not** store access tokens or mail on a server
- It does **not** permanently delete mail (Trash follows Gmail’s normal 30-day policy)
- It does **not** operate on your entire mailbox at once (there is a safety cap)

Read [docs/LIMITATIONS.md](docs/LIMITATIONS.md) before using it on a real inbox.

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:8000`. Use **Explore demo** immediately.

Any static server also works:

```bash
python3 -m http.server 8000
```

Google sign-in requires HTTPS (or `http://localhost`) and your own OAuth client ID. See [docs/SETUP.md](docs/SETUP.md).

## Tests

```bash
npm test          # unit + demo-flow tests (no browser)
npm run check     # syntax check
npm run test:e2e  # Playwright (optional; needs browsers)
```

## Privacy

Only the `gmail.modify` scope is requested. Sender metadata stays in tab memory and is cleared on sign-out or closing the tab. Details: [docs/privacy.html](docs/privacy.html).

## Deploy

The app is static files. Host them on GitHub Pages, Netlify, Cloudflare Pages, or any HTTPS origin, then add that origin to your Google Cloud OAuth client. See [docs/DEPLOY.md](docs/DEPLOY.md).

## License

See [LICENSE](LICENSE).
