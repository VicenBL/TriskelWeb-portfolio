<!-- markdownlint-disable MD013 -->

# TriskelWeb launch choices

This document records the remaining pre-implementation choices resolved after the
Next.js VPS architecture decision.

## Resolved choices

| Topic | Decision | Implementation impact |
| --- | --- | --- |
| Firebase Auth | Google + email/password | Google remains primary; email/password requires verified email and password reset UX |
| Firebase Storage | EU bucket, backend-mediated, sensitive files private | PostgreSQL stores metadata; product images can be public, proofs and labels stay private |
| Monitoring | UptimeRobot + cron | Public uptime check plus cron-based backup/job alerts |
| Transactional email | Try Piensa SMTP first | Keep email behind adapter so a transactional provider can replace it later |

## Auth decision

Enable both Firebase Google Auth and Firebase email/password for MVP.

Rules:

- Google login should be the preferred login path in UI copy.
- Email/password accounts must require verified email before sensitive account
  actions.
- Password reset must use Firebase's maintained reset flow.
- Guest checkout remains allowed.
- Admin authorization is internal and stored in PostgreSQL; Firebase identity alone
  never grants admin access.

## Storage decision

Use Firebase Storage in a European location.

Preferred location choice:

1. a Spain/EU-compatible Firebase/GCS region if available in the Firebase console;
2. otherwise an EU multi-region bucket.

Access policy:

| File type | Access |
| --- | --- |
| Product images | Public or cacheable read URL |
| Manual transfer proofs | Private, served only through authenticated/order-authorized backend routes |
| Correos labels | Private, served only through authenticated admin backend routes |
| Future invoices | Private by default |

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

All uploaded filenames must be sanitized. The storage object path must use internal
IDs, not customer-provided names alone.

## Monitoring decision

Use UptimeRobot plus cron-based checks for MVP.

Minimum checks:

- UptimeRobot monitors `https://<domain>/api/health`.
- The health endpoint checks app boot and database connectivity.
- Daily backup cron writes logs and alerts on failure.
- Expiry/tracking cron jobs write logs and alert on repeated failure.
- Disk usage script alerts before the VPS runs out of space.
- Certificate expiry is covered by UptimeRobot/HTTPS monitoring and certbot logs.

Future upgrade:

- add Healthchecks.io if cron visibility is not enough;
- add Netdata or another VPS metric agent only if server debugging needs it.

## Email decision

Use Piensa SMTP first if production tests pass.

Before launch, verify:

- SMTP credentials work from the VPS;
- SPF, DKIM, and DMARC are configured;
- Gmail and Outlook receive order emails reliably;
- sending limits are compatible with expected TriskelWeb MVP traffic;
- bounced/failing sends are logged.

Keep email sending behind a `NotificationProvider`/mailer adapter. If Piensa SMTP
is unreliable or limited, switch to a dedicated transactional email provider without
changing order/payment/shipping domain logic.

## Remaining external checks

These are not architecture choices; they require account/checkout validation:

- final Piensa `.es` price, renewal, VAT, and bundle behavior;
- exact Piensa VPS backup retention and restore semantics;
- Stripe production account eligibility, fees, and webhook configuration;
- Correos contract/API credentials and allowed shipping products;
- final Firebase project/bucket location visible in the console.
