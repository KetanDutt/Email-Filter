# Security

## Threat model

The app is static JavaScript. The browser talks to Google. There is no app server to steal tokens from.

Main risks:

- A malicious sender name or label trying to run script in the page
- Token leakage via storage, logs, or a compromised browser extension
- Accidental bulk Trash on the wrong senders
- Hosting the files on a page that also runs untrusted scripts

## Mitigations

- Sender addresses and label names are rendered as text nodes
- Access tokens live only in memory and are revoked on sign-out when GIS is available
- Confirm dialogs describe the **loaded** ID count before mutate
- `beforeunload` warns if a sync or mutation is still running
- Service worker caching is allowlisted to first-party assets

## What you must do when hosting

- Serve only over HTTPS
- Do not inject third-party analytics or tag managers into the same origin
- Keep `config.js` free of secrets (there should be none)
- Use your own OAuth client; do not reuse an unknown client ID
- Follow Google [Limited Use](https://developers.google.com/terms/api-services-user-data-policy) if you publish Gmail access to other people

## Reporting

Report vulnerabilities privately to the address in [LICENSE](../LICENSE) rather than opening a public issue with exploit details.
