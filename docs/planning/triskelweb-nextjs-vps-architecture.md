<!-- markdownlint-disable MD013 -->

# TriskelWeb Next.js VPS architecture

This document defines the implementation architecture for the selected TriskelWeb
MVP candidate:

- Next.js full-stack modular monolith;
- Piensa Linux VPS;
- PostgreSQL as ecommerce source of truth;
- Firebase Auth for identity;
- Firebase Storage for files;
- Stripe and Correos behind provider adapters;
- Piensa domain/mailbox for MVP email presence.

The goal is to keep the first production system cheap and understandable without
turning provider details into the domain model.

## Architecture decision

Use one deployable Next.js application on the Piensa VPS.

| Area | Decision |
| --- | --- |
| Application shape | Full-stack modular monolith |
| Runtime | Node.js Next.js server behind nginx |
| Process model | Docker Compose for app and PostgreSQL |
| Reverse proxy | nginx on the host |
| HTTPS | Let's Encrypt certificates managed on the host |
| Database | Local PostgreSQL on the VPS first |
| Auth | Firebase Auth with Google + email/password |
| File storage | EU Firebase Storage via backend-mediated uploads |
| Payments | Stripe hosted checkout and webhook adapter |
| Manual transfer | Internal payment flow with admin validation |
| Shipping | Correos adapter with manual MVP rates |
| Email | Try Piensa mailbox/SMTP first; transactional provider later if needed |
| Backups | Piensa VPS backup plus PostgreSQL dumps copied off-server |

This is intentionally not a Vercel-first architecture. The app must be portable
enough to move later, but the first deployment target is the VPS.

## Runtime topology

```text
Internet
  |
  | HTTPS
  v
nginx on Piensa VPS
  |
  | localhost reverse proxy
  v
Next.js app container
  |
  | local Docker network
  v
PostgreSQL container + persistent volume

External services:
  - Firebase Auth
  - Firebase Storage
  - Stripe
  - Correos
  - Piensa Mail / SMTP
  - Off-server backup destination
```

The VPS exposes only:

- SSH for operator access;
- HTTP for Let's Encrypt challenge/redirect;
- HTTPS for public application traffic.

PostgreSQL is not publicly reachable.

## Why Docker Compose

Docker Compose is the recommended MVP default because it gives repeatable local
and VPS deployment without adopting Kubernetes or a heavy platform.

Compose should manage:

- the Next.js application container;
- PostgreSQL;
- optional one-off migration jobs;
- optional backup helper jobs.

The host should manage:

- nginx;
- Let's Encrypt / Certbot;
- firewall;
- SSH;
- OS packages and security updates;
- disk and uptime monitoring.

This split keeps the public edge simple and avoids hiding critical server
security behind the application deployment.

## Application module boundaries

The application code should be organized around ecommerce capabilities, not
around external providers.

Recommended module map:

| Module | Responsibility |
| --- | --- |
| `catalog` | Products, variants, images, availability display |
| `inventory` | Stock, reservations, commit/release logic |
| `checkout` | Cart-to-order orchestration and customer checkout flow |
| `orders` | Orders, items, addresses, order state transitions |
| `payments` | Internal payment model and payment state machine |
| `shipping` | Internal shipment model and shipment state machine |
| `admin` | Backoffice queues, mutations, audit views |
| `notifications` | Customer/admin email events |
| `files` | Storage metadata, upload policies, file access |
| `auth` | Firebase identity integration and app roles |
| `providers/stripe` | Stripe API and webhook adapter |
| `providers/correos` | Correos API and tracking adapter |
| `providers/firebase` | Firebase Auth/Storage adapter |

Rules:

- domain modules call application services, not provider SDKs directly;
- provider adapters map external events into internal commands/events;
- Stripe IDs, Correos IDs, and Firebase object paths are metadata/reference data;
- internal state machines remain provider-neutral.

## Data ownership

PostgreSQL owns all ecommerce truth:

- customers and optional accounts;
- carts;
- products and variants;
- inventory and reservations;
- orders and order items;
- payments and payment attempts;
- manual transfer proof metadata;
- shipping rates;
- shipments and shipment events;
- provider references;
- provider event logs;
- admin audit logs.

Firebase Storage owns file bytes only. PostgreSQL stores:

- object path;
- bucket name;
- content type;
- byte size;
- checksum/hash when available;
- owner/scope;
- visibility policy;
- creation timestamp;
- deletion/replacement status.

Firebase Auth owns identity proof only. PostgreSQL stores:

- linked account record;
- customer relation;
- admin role or customer permission;
- audit-relevant actor identity.

## Auth architecture

Use Firebase Auth as the identity provider.

MVP default:

- enable Google provider;
- enable email/password provider;
- require verified email before sensitive account actions;
- use Firebase's maintained password reset flow;
- map Firebase `uid` to internal `CustomerAccount`;
- keep guest checkout possible without login;
- use app-level roles for admin authorization.

Recommended server flow:

1. User authenticates through Firebase Auth in the browser.
2. Browser sends Firebase ID token to a Next.js auth endpoint.
3. Server verifies the token with Firebase Admin SDK.
4. Server creates a secure HTTP-only session cookie.
5. Application loads internal account/customer/role from PostgreSQL.
6. Every admin mutation checks the internal role, not just Firebase identity.

Email/password is part of the MVP, but it remains an auth-provider capability,
not a domain concept.

Rules:

- Google login should stay the preferred login path in UI copy;
- email/password accounts require verified email for sensitive actions;
- password reset uses Firebase's maintained reset flow;
- provider choice must not change the domain model.

## Authorization model

Authentication answers: "Who is this?"

Authorization answers: "What can this person do in TriskelWeb?"

MVP can start with one internal admin role, but the model should leave room for:

- `admin`;
- `fulfillment`;
- `payment_reviewer`;
- `support`.

Every state-changing admin action must record:

- actor account ID;
- action name;
- previous state;
- next state;
- timestamp;
- optional note;
- provider reference if relevant.

## File storage architecture

Use backend-mediated Firebase Storage uploads first, with a European bucket
location.

Preferred location choice:

1. a Spain/EU-compatible Firebase/GCS region if available in the Firebase console;
2. otherwise an EU multi-region bucket.

Recommended object paths:

```text
product-images/{productId}/{imageId}-{safeFileName}
manual-transfer-proofs/{orderId}/{proofId}-{safeFileName}
shipment-labels/{shipmentId}/{labelId}.pdf
temporary-uploads/{purpose}/{uploadId}-{safeFileName}
```

Recommended MVP upload limits:

| Upload type | Limit | Accepted types |
| --- | --- | --- |
| Product image | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
| Transfer proof | 10 MB | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| Admin attachment | 10 MB | Start disabled unless explicitly needed |

### Product images

Product image upload is admin-only.

Flow:

1. Admin submits image through admin UI.
2. Next.js route validates admin role.
3. Server uploads the file to Firebase Storage using Firebase Admin SDK.
4. Server stores file metadata in PostgreSQL.
5. Catalog reads image metadata from PostgreSQL.
6. Public image delivery uses safe public URLs or signed access, depending on final
   bucket policy.

### Manual transfer proof

Transfer proof can be uploaded by a guest or account customer only for a matching
pending manual transfer order.

Flow:

1. Customer opens proof upload page from the order confirmation/payment email.
2. Server validates order token/session and payment status.
3. Server accepts limited file types and size.
4. Server uploads the file to a private Firebase Storage path.
5. Server stores metadata and links it to `ManualTransferProof`.
6. Admin reviews the proof from the backoffice.

Proof files are sensitive. They must not be public by default.

### Correos labels

Correos label PDFs are generated during order preparation.

Flow:

1. Admin selects `generate label` on a paid/preparing order.
2. App calls the Correos adapter.
3. Adapter stores raw response/provider reference.
4. Label PDF is stored in Firebase Storage.
5. PostgreSQL stores label file metadata and shipment reference.
6. Admin downloads the label through an authenticated route.

Label files should be private by default.

## Payment architecture

The internal `payments` module owns payment state. Stripe and manual transfer are
payment methods/providers at the edge.

### Stripe checkout

Flow:

1. Checkout service validates cart, shipping rate, customer email, and stock.
2. Inventory service creates transactional reservation.
3. Payment service creates a pending payment attempt.
4. Stripe adapter creates a hosted Checkout Session server-side.
5. App stores Stripe session/payment intent IDs as provider references.
6. Customer pays on Stripe-hosted checkout.
7. Stripe calls the webhook endpoint.
8. Webhook verifies signature using raw body.
9. Provider event is stored for idempotency.
10. Stripe event is mapped to an internal payment event.
11. App updates payment/order/reservation state transactionally.

Rules:

- never handle card data directly;
- verify webhook signatures;
- store processed provider event IDs;
- return `2xx` quickly;
- make state transitions idempotent;
- expire unpaid Stripe attempts after the configured 24h window.

### Manual transfer

Flow:

1. Checkout creates order and payment attempt with manual transfer method.
2. Inventory reservation is held for 72h.
3. Customer receives transfer instructions.
4. Customer may upload proof.
5. Admin reviews transfer/proof/bank movement.
6. Admin accepts or rejects payment.
7. App commits or releases reservation according to result.
8. Expiry job cancels stale unpaid transfers.

Manual transfer is internal/admin validated. It must not depend on Stripe.

## Shipping architecture

The internal `shipping` module owns shipment state. Correos is an adapter.

MVP checkout uses manual shipping rates from PostgreSQL, not a live Correos rate
lookup.

Correos flow:

1. Paid order enters fulfillment queue.
2. Admin moves order into preparation.
3. App creates or updates internal shipment.
4. Correos adapter creates preregistration/label.
5. Provider references and raw responses are stored.
6. Label file is stored privately.
7. Tracking updates are fetched or received.
8. Provider tracking data is mapped into internal shipment events/status.

Correos production launch blockers remain:

- valid Correos contract;
- API credentials;
- allowed products/services;
- label format requirements;
- tracking endpoint behavior.

## Background jobs

The MVP needs recurring jobs even if traffic is low.

Required jobs:

| Job | Purpose |
| --- | --- |
| Stripe pending expiry | Cancel/release stock after 24h unpaid timeout |
| Manual transfer expiry | Cancel/release stock after 72h unpaid timeout |
| Correos tracking sync | Fetch tracking for active shipments if webhook/push is unavailable |
| PostgreSQL dump | Create daily logical backup |
| Backup off-server copy | Copy dumps outside the VPS |
| Cleanup temporary uploads | Remove abandoned upload artifacts |

Implementation options:

1. Host cron calling authenticated internal job endpoints.
2. Containerized job runner in Compose.
3. Later: dedicated queue/worker if background work grows.

For MVP, cron plus idempotent job handlers is enough.

## Secrets and configuration

Secrets must never be committed.

Store these as VPS environment configuration:

- PostgreSQL password;
- Firebase service account credentials;
- Firebase project/bucket IDs;
- Stripe secret key;
- Stripe webhook signing secret;
- Correos credentials;
- SMTP credentials;
- app session secret;
- backup destination credentials.

Recommended practice:

- keep `.env.production` outside git;
- restrict file permissions;
- document required variables in `.env.example` without values;
- rotate secrets after accidental exposure;
- use separate development and production provider credentials.

## Deployment flow

Recommended deployment path:

1. Developer merges approved changes locally.
2. VPS deploy user pulls a tagged commit or release branch.
3. Build application container.
4. Run database migrations.
5. Start/update containers with Docker Compose.
6. Run health check.
7. Reload nginx only if proxy config changed.
8. Record deployed git SHA and migration version.

The deploy must be scripted. Avoid manual file copying.

Minimum deploy artifacts:

- `docker-compose.yml`;
- application `Dockerfile`;
- migration command;
- deploy script;
- nginx site config;
- `.env.example`;
- backup script;
- restore runbook.

## Backup and restore architecture

Piensa VPS backup is required, but it is not enough by itself.

Minimum backup policy:

1. Enable Piensa VPS backup.
2. Run daily PostgreSQL logical dump.
3. Copy database dump off-server.
4. Include Firebase Storage metadata in PostgreSQL backups.
5. Keep provider files in Firebase Storage with access policy documented.
6. Test restore before launch.
7. Record restore steps in a runbook.

Restore test must prove:

- PostgreSQL schema restores;
- orders/payments/shipments/provider references restore;
- file metadata still resolves to expected storage objects;
- app can boot against restored database;
- admin can inspect an order after restore.

## Monitoring and operations

Minimum monitoring:

- uptime check for public HTTPS site;
- disk usage alert;
- PostgreSQL backup success/failure alert;
- certificate expiry alert;
- basic application error logging;
- failed webhook/job logging;
- admin audit visibility.

MVP monitoring choice:

- UptimeRobot monitors `https://<domain>/api/health`;
- the health endpoint checks app boot and database connectivity;
- cron logs and alerts on backup/job failure;
- disk usage cron alerts before the VPS runs out of space;
- Healthchecks.io or Netdata can be added later if needed.

## Email architecture

Piensa mail satisfies the real mailbox requirement.

For transactional emails, try Piensa SMTP first.

Use Piensa SMTP only if:

- sending limits are compatible with expected MVP volume;
- SPF/DKIM/DMARC are configured;
- test order emails reach Gmail/Outlook reliably.

If deliverability or limits are poor, add a dedicated transactional email provider
later without changing the domain model.

Emails needed for MVP:

- order placed;
- manual transfer instructions;
- proof received;
- payment confirmed;
- payment rejected;
- unpaid order expired/cancelled;
- preparing;
- shipped with tracking;
- shipping issue if needed.

## Security baseline

Before production launch:

- SSH keys only;
- root password login disabled;
- firewall allows only SSH/HTTP/HTTPS;
- OS update routine exists;
- nginx serves HTTPS only after redirect;
- app cookies are secure and HTTP-only;
- admin routes require internal role checks;
- provider webhooks verify signatures/secrets;
- file uploads validate type, size, and owner;
- sensitive files are private by default;
- database is not public;
- backups are encrypted or access-restricted;
- audit logs cover admin mutations.

## Upgrade seams

The MVP should stay cheap, but not corner itself.

| Future need | Upgrade path |
| --- | --- |
| More traffic | Resize VPS or split app/database |
| DB operations risk | Move PostgreSQL to Neon or another managed Postgres |
| File volume growth | Keep Firebase Storage or move to R2/S3-compatible storage |
| Email deliverability | Add transactional provider |
| More payment methods | Add Redsys/Bizum/PayPal adapters behind `PaymentProvider` |
| More shipping providers | Add adapters behind `ShippingProvider` |
| Heavier background work | Add queue/worker service |
| Admin team growth | Expand internal roles/permissions |

## Resolved launch choices

These implementation choices are now fixed for MVP:

1. Firebase Auth enables Google + email/password.
2. Firebase Storage uses a European bucket location.
3. Product images can be public/cacheable; transfer proofs and labels are private.
4. Backend-mediated uploads are mandatory for sensitive files.
5. Initial monitoring uses UptimeRobot + cron logs/alerts.
6. Transactional email tries Piensa SMTP first.

The detailed decision record is in
`docs/planning/triskelweb-launch-choices.md`.

## Remaining external checks

These remain explicit checks before implementation or launch:

1. Confirm final Firebase bucket location in the console.
2. Decide if sensitive metadata needs encryption in PostgreSQL.
3. Confirm Piensa SMTP limits and deliverability tests.
4. Confirm exact Piensa checkout prices, renewals, VAT, and backup restore behavior.
5. Decide whether local development mirrors Docker Compose exactly.

## Launch checklist

The architecture is production-ready only after these checks pass:

- Piensa VPS purchased with backup enabled;
- `.es` domain and mailbox configured;
- DNS, SPF, DKIM, and DMARC configured;
- nginx and Let's Encrypt working;
- Docker Compose deployment scripted;
- PostgreSQL migrations working;
- daily database backup working;
- off-server backup copy working;
- restore test completed;
- Firebase Auth production project configured;
- Firebase Storage production bucket configured;
- Stripe production account and webhooks validated;
- Correos contract/API credentials validated;
- admin authorization and audit logs implemented;
- payment and stock reservation expiry jobs implemented;
- monitoring alerts configured;
- secrets stored outside git.

## Decision implication

This architecture preserves all previous TriskelWeb MVP decisions.

It keeps PostgreSQL as the ecommerce source of truth, uses Firebase only for
identity/files, treats Stripe and Correos as adapters, and keeps the first
production deployment inside a low-cost Piensa VPS package with explicit operating
responsibility.
