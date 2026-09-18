# Contributing

## Develop

```bash
npm install
npm start
```

Edit static files in the repo root. `config.js` is the only runtime config.

If you bump Bootstrap, pin versions in `package.json` and run `npm run vendor` so `vendor/` stays in sync.

## Test

```bash
npm test
npm run check
```

Put pure logic in `core.js` so Node can test it without a browser. Playwright specs in `tests/browser/` cover the demo walkthrough and mocked Gmail HTTP.

## Rules of thumb

- Never persist tokens or mailbox data
- Never assign untrusted strings with `innerHTML`
- Keep Gmail error handling honest about partial success
- Do not add a backend “proxy” that receives mail
