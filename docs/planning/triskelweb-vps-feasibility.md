<!-- markdownlint-disable MD013 -->

# TriskelWeb VPS feasibility check

This document checks whether the Piensa VPS direction can satisfy the previous
TriskelWeb MVP decisions.

## Verdict

A Piensa Linux VPS can satisfy the current TriskelWeb MVP architecture if it is
operated as a real production server, not as casual shared hosting.

The compatible shape is:

- Piensa VPS Linux;
- Piensa Mail Plan or domain-included mail for real inboxes;
- PostgreSQL on the VPS or a managed Postgres fallback;
- full-stack modular monolith self-hosted on Node/Docker;
- nginx reverse proxy with HTTPS;
- Auth.js or Better Auth with Google OAuth;
- Stripe Checkout and webhooks;
- Correos adapter over outbound HTTPS APIs;
- automated database and file backups;
- documented restore procedure.

## Compatibility matrix

| Requirement | VPS fit | Condition |
| --- | --- | --- |
| `.es` domain | Yes | Register with Piensa or point DNS to VPS |
| Real mailbox | Yes | Piensa Mail Plan or domain mail configured with SPF/DKIM/DMARC |
| Google Auth | Yes | Public HTTPS domain and OAuth callback URL configured |
| Stripe Checkout | Yes | Backend can create sessions using Stripe secret key |
| Stripe webhooks | Yes | Public HTTPS endpoint, raw body, signature verification |
| Manual transfer | Yes | Admin UI and mail notifications run in app |
| PostgreSQL domain model | Yes | Install/manage Postgres or use managed DB |
| Stock reservations | Yes | Implement in app and DB transactions |
| Admin/backoffice | Yes | Serve admin routes from same app |
| Correos APIs | Yes | Needs Correos contract/API credentials and outbound HTTPS |
| Correos labels | Yes | Store PDFs/files on disk or object storage with backup |
| Provider event logs | Yes | Store in Postgres |
| Upload transfer proof | Yes | Store locally with backups or use object storage |
| Backups | Yes | Must be configured; not optional for production |
| Audit logs | Yes | Store app-level audit records in Postgres |
| Future Redsys/Bizum | Yes | Keep `PaymentProvider` abstraction |

## Google Auth requirements

Google OAuth does not require Vercel, Supabase, or Firebase.

A self-hosted app can use Google OAuth through Auth.js or Better Auth if:

- the site has a stable public HTTPS URL;
- Google OAuth credentials are created in Google Cloud Console;
- authorized JavaScript origins include the production domain;
- authorized redirect URIs include the auth callback route;
- client ID and client secret are stored as server environment secrets;
- account linking and admin authorization are handled in the app.

Typical Auth.js callback shape for a Next.js app:

- `https://<domain>/api/auth/callback/google`

Google Auth proves identity. It does not decide whether a user is an admin.
The app still needs internal authorization roles.

## Stripe requirements

Stripe works on a VPS if the app exposes HTTPS endpoints.

Required:

- create Checkout sessions server-side;
- store Stripe session/payment intent IDs as provider references;
- expose a public HTTPS webhook endpoint;
- verify webhook signatures using Stripe's signing secret;
- use the raw request body for signature verification;
- store processed Stripe event IDs for idempotency;
- return `2xx` quickly and process state changes safely.

The VPS must support valid TLS certificates. nginx plus Let's Encrypt/Certbot is
enough for this.

## Correos requirements

The VPS can call Correos APIs like any backend server.

Required:

- Correos contract/API access;
- API credentials stored as secrets;
- outbound HTTPS access from VPS;
- adapter module for Preregister, Labels, and Trackpub;
- raw provider responses logged for audit/debugging;
- labels stored with backup coverage.

Correos feasibility is contractual/API-access dependent, not VPS-dependent.

## Database and persistence

A VPS can run PostgreSQL locally.

Minimum production rules:

- PostgreSQL listens only locally or on a restricted private interface;
- app uses a least-privilege DB user;
- migrations are versioned;
- daily logical backups with `pg_dump` or `pg_dumpall` exist;
- backups are copied off-server;
- restore is tested before launch;
- disk usage alert exists.

For a small store, local Postgres on the VPS is viable. If operational risk feels
high later, the app can move DB to Neon while keeping the VPS app.

## Files and uploads

The MVP needs files for:

- product images;
- optional manual transfer proof;
- Correos labels;
- possibly invoices or admin attachments later.

Three viable approaches:

| Approach | Fit | Notes |
| --- | --- | --- |
| VPS disk + backup | Cheapest | Must include files in backup/restore plan |
| Cloudflare R2 | Robust | Separates files from server lifecycle |
| Firebase Storage | Viable | Good free quota shape, but adds Firebase dependency |

Cheapest MVP can start with VPS disk if backups are real. Safer MVP uses R2 or
Firebase Storage for uploads and labels.

### Firebase Storage note

Firebase Storage is a valid candidate for product images, manual transfer proof,
and Correos labels if its free quotas fit the initial Triskel traffic.

Recommended integration shape:

- keep PostgreSQL as the source of truth for orders/payments/shipments;
- store only file URLs, object paths, hashes, and metadata in PostgreSQL;
- upload sensitive files through the backend, not directly from anonymous clients;
- use Firebase Admin SDK/service account on the VPS when backend-mediated;
- keep Firebase Storage rules restrictive if direct client uploads are added;
- document quota and region choices before production.

Firebase Storage can pair with Firebase Auth, but it does not require moving the
whole app to Firebase. It can be used only as a file store.

## Email

Piensa Mail Plan fits the MVP mailbox requirement:

- domain included first year according to Piensa page;
- 5 mailboxes;
- 3 GB per mailbox;
- POP/IMAP/Webmail;
- DKIM, DMARC, SPF entries;
- antivirus/antispam first year.

However, mailbox email and transactional email are different concerns.

MVP can send low-volume order emails via the configured domain SMTP if Piensa's
limits allow it. If deliverability becomes important, add a transactional email
provider later.

## Deployment model

Recommended simple VPS deployment:

1. Ubuntu LTS or Debian stable.
2. Non-root deploy user.
3. SSH keys only.
4. Docker Compose or systemd service for the app.
5. PostgreSQL local service or Docker volume.
6. nginx reverse proxy.
7. Let's Encrypt HTTPS renewal.
8. Firewall allows only SSH, HTTP, and HTTPS.
9. Environment secrets stored outside git.
10. Automated deploy script.

## Security operating contract

Before launch, the owner must have:

- SSH key access only;
- root password login disabled;
- firewall rules documented;
- OS unattended/security updates or update routine;
- database backups and restore test;
- off-server backup copy;
- basic uptime monitoring;
- disk usage monitoring;
- secret rotation procedure;
- Stripe webhook signature verification;
- admin role checks on every mutation;
- audit log for admin state changes.

## Risks

| Risk | Mitigation |
| --- | --- |
| Single-server failure | Off-server backups and documented restore path |
| Manual ops mistakes | Scripted deploys and runbooks |
| DB loss | Daily dumps, off-server copies, restore testing |
| Upload loss | Use Firebase Storage/R2 or include uploads in backups |
| Security drift | Patch schedule and minimal open ports |
| Traffic spike | Resize VPS or move app/DB split later |
| Email deliverability | Configure SPF/DKIM/DMARC; add transactional provider if needed |

## Final decision implication

The VPS option does not break previous architecture decisions.

It is compatible with Google Auth, Stripe, Correos, PostgreSQL, admin flows,
provider boundaries, stock reservations, Firebase Storage, and mailbox-first MVP
requirements.

Selected architecture candidate:

- Piensa VPS Linux for app and PostgreSQL;
- Piensa mail/domain package for MVP mailbox;
- Firebase Storage for file storage candidate;
- Firebase Auth with Google and email/password;
- backend-mediated uploads to EU Firebase Storage first;
- Next.js as the preferred full-stack framework candidate;
- Stripe and Correos as provider adapters.

Remaining work is package price validation and implementation-detail design, not
fundamental architecture feasibility.
