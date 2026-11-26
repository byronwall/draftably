# Privacy

Last updated 25 November 2026.

Draftably is made by Byron Wall. This page says what Draftably collects, why, and who else handles
it. Questions and requests go to [hello@draftably.dev](mailto:hello@draftably.dev).

## On your machine: nothing is sent

The editor, the Playground, the CLI and the npm packages run on your machine. Your diagrams stay in
your browser or your files. A Playground link keeps the source after the `#` in the address, which
the browser never sends to a server.

Two commands are the exception, because they make a URL for the render service: `draftably url`,
and the MCP tools `image_url` and `share_diagram`. The section below covers what happens when that URL is opened.

## This website

draftably.dev uses Google Analytics to count visits: the pages you open, your browser and device,
and a rough location from your IP address. Google sets cookies for this. Cloudflare serves the site.

## The render service

`draftably.dev/api` draws diagrams from image URLs, the REST API and the MCP server.

**Diagram source.** An image URL holds the diagram's source, so anyone with the URL can see the
diagram. The REST API and the MCP server receive the source in the request. The service draws it
and keeps the image in Cloudflare's cache, so the next request for the same diagram is fast and
free. A PNG carries its source inside the file. Apart from short links (below), the service does
not store the source anywhere else, and it never uses diagrams to train models.

**Short links.** Creating a short link (`/api/link`, `/api/v1/share` or the MCP tool `share_diagram`)
stores the diagram's source in the service's database, so the link can draw it later. Anyone with
the link can see the diagram and its source. The service also stores when the link was made, the
account when an API key made it, and a hash of the IP address (never the address itself). To have
a link deleted, write to [hello@draftably.dev](mailto:hello@draftably.dev).

**Rate limits.** Requests without a key are counted by IP address for one minute. The count is not
kept after that.

**Your account.** When you sign in, the service stores:

- your email address, and when you made the account;
- your credit balance, and a record of each change to it (each paid render and each purchase);
- for each API key: its label, when you made it, when it was last used and whether it is revoked,
  and a SHA-256 hash of its secret. The key itself is never stored;
- a sign-in cookie that lasts 30 days, stored as a hash. It is the only cookie the service sets;
- each emailed sign-in link, as a hash, for 15 minutes.

**Email.** Sign-in links are sent through Cloudflare. The service emails you only to sign in, and
if the [terms](/terms) or this page change in a way that matters.

**Payments.** Stripe takes your card details when you buy credits. Draftably receives the purchase,
not your card number.

## Who else handles your data

- **Cloudflare** hosts the site and the service, its cache and its database, and sends sign-in
  email. Cloudflare can keep request logs, which include IP addresses and URLs, for a short time.
- **Stripe** takes payments for credit packs.
- **Google** runs the analytics on draftably.dev.

Draftably does not sell your data or share it with anyone else.

## Your choices

- Revoke an API key at any time on the [account page](https://draftably.dev/account).
- To delete your account, email [hello@draftably.dev](mailto:hello@draftably.dev) from the
  account's address. The account, its keys, its sign-in sessions and its credit record are deleted.
  Images already in the cache expire on their own.
- To see what your account holds, ask at the same address.

## Changes

When this page changes, the date at the top changes. If a change affects how your data is used,
account holders get an email first.
