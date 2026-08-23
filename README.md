# Gmail Manager Pro

A powerful, fast, and completely client-side tool to bulk-manage your Gmail inbox. Say goodbye to the 50-email-per-page limit in the native Gmail client.

## Features
- **Bulk Grouping:** Automatically groups emails by sender so you can identify the biggest sources of clutter.
- **Bulk Actions:** Delete, Archive, Mark as Read, or Label thousands of emails from a single sender in one click.
- **Smart Quota Management:** Built-in throttling and chunking to ensure you never crash the Gmail API rate limits, even for inboxes with 100,000+ emails.
- **Privacy First:** 100% client-side application. No servers are involved, and your emails never leave your browser.
- **Installable PWA:** Install directly to your desktop or mobile home screen.

## Installation / Setup
1. Clone the repository.
2. Serve the directory using any static web server. For example:
   ```bash
   npx serve .
   ```
   Or using Python:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details on API usage, chunking, and authentication flow.

## License
MIT License
