# Deploy

The site is static. Upload the repository **without** `node_modules`. Keep `vendor/` — those CSS and font files are required at runtime.

## Local

```bash
npm start
```

Binds `0.0.0.0:8000` with caching disabled.

## GitHub Pages

1. Push this branch.
2. Settings → Pages → deploy from `/` (or `/docs` only if you copy the app there).
3. Add `https://<user>.github.io` and the project URL origin to the OAuth client.

Project pages are served from a subpath. This app uses relative URLs (`./app.js`, `./vendor/...`) so a project site works if the whole repo is the published root.

## Netlify / Cloudflare Pages / Vercel

Set the publish directory to the repo root. No build command is required.

Optional headers are included in `netlify.toml` and `vercel.json`:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `X-Frame-Options: DENY`
- disabled camera/mic/geo permissions

Do not add a CSP that blocks `https://accounts.google.com` or Gmail API connections, or sign-in will fail.

## After deploy

1. Put the public origin on the OAuth client.
2. Set `config.js` `clientId`.
3. Host [privacy.html](privacy.html) at a stable HTTPS URL and paste it into the Google consent screen.
4. Add test users until the app is verified.
