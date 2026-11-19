# Environment variables

The production environment file must stay outside version control.

Use `env.example` as the non-secret setup template. Copy it to `.env.local` for
local development or to `.env.production` on the VPS, then fill real values outside
version control.

The tracked, non-secret template is `env.example`; copy it to a local environment
file rather than committing populated settings.

Firebase has two configuration surfaces:

- `NEXT_PUBLIC_FIREBASE_*` values are the Firebase Web App configuration used by
  the browser login page. They are public identifiers, not secrets, and are safe
  to expose to the client bundle.
- `FIREBASE_*` server values stay server-only. `FIREBASE_PROJECT_ID` is used by
  backend token verification; service/admin/storage credentials are reserved for
  backend-mediated work.

```dotenv
# Application
NODE_ENV=development
APP_BASE_URL=http://localhost:3000

# PostgreSQL
DATABASE_URL=postgres://triskel:triskel_password@localhost:5432/triskelweb

# Firebase Auth / Storage
# NEXT_PUBLIC Firebase web config is public browser configuration, not a secret.
# It is required only when using the client login page.
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Auth token verification currently requires the server-only FIREBASE_PROJECT_ID.
# Storage/Admin SDK credentials are reserved for backend-mediated storage work.
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Correos
CORREOS_USERNAME=
CORREOS_PASSWORD=
CORREOS_CONTRACT_NUMBER=
CORREOS_CLIENT_NUMBER=

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# App security
# Required for /api/auth/session. Use a random value with at least 32 bytes.
SESSION_SECRET=

# Backups
BACKUP_DESTINATION=
```

Create `.env.local` for local development and `.env.production` on the VPS. Do not
commit either file.

## Private preview

The public entry is `/construccion`. Preview authentication is independent of Firebase and `SESSION_SECRET`; configure the server-only `PREVIEW_ORIGIN`, `PREVIEW_PASSWORD_HASH` and `PREVIEW_SESSION_SECRET` using the [private-preview setup guide](./private-preview.md). Missing or invalid configuration fails closed. No working preview credentials belong in this template or in version control.

The production Compose also requires a private `POSTGRES_PASSWORD`, internal `DATABASE_URL` and `TRISKEL_TLS_DIRECTORY`. Only proxy ports 80/443 are published. Its configuration does not provision certificates, apply migrations or validate the future VPS.

For a real Firebase Auth smoke test, follow
[`firebase-auth-real-validation.md`](./firebase-auth-real-validation.md).
