# Privacy

Gmail Manager Pro is a browser app. If you host the files, **you** are the operator that Google’s consent screen names. This document describes what the code in this repository does.

## Data the app can access

With your consent it requests:

`https://www.googleapis.com/auth/gmail.modify`

That scope can read and change mailbox labels (including Trash and archive). **This implementation only reads:**

- message IDs
- label IDs
- the `From` header

It does not request message bodies, attachments, or full raw MIME.

## How data is used

Sender metadata is grouped in the tab so you can mark read, archive, apply a label, or move messages to Trash. CSV export stays on your computer.

## Storage and sharing

- No application server receives your mail
- No analytics pixels are included
- Access tokens are kept in memory and cleared on sign-out
- Theme preference may be stored in `localStorage` (`light` / `dark` only)

## Retention

Close the tab or sign out to drop mailbox data from memory. Google still holds your mail under your Google Account. Revoke the app at [Google Account permissions](https://myaccount.google.com/permissions).

## Operator responsibilities

If you deploy this client ID for other people, publish this policy on HTTPS, complete Google’s OAuth verification if required, and follow the Google API Services User Data Policy (Limited Use for Gmail).
