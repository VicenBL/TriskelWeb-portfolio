# Validate Firebase Auth against a real project

Use this checklist when validating TriskelWeb authentication against a real Firebase development or staging project. Keep secrets outside git and record only evidence, not credentials.

## Quick path

1. Create or choose a Firebase project for development/staging.
2. Enable the Firebase Auth providers required for the MVP.
3. Fill `.env.local` from `env.example`.
4. Seed or create a matching internal `CustomerAccount` row for the Firebase UID.
5. Run the app locally and complete the browser login flow.
6. Verify the TriskelWeb app session endpoints and protected admin/account checks.

## What this proves

| Layer | What to verify |
| --- | --- |
| Firebase Web SDK | The browser can sign in with the configured Firebase project. |
| Firebase ID token verifier | The server accepts a real Firebase ID token for the expected project only. |
| Account mapping | A Firebase UID maps to an internal `CustomerAccount`. |
| App session | The server sets the signed HTTP-only TriskelWeb session cookie. |
| Authorization | Session, admin, audit, and verified-email helpers consume internal claims, not Firebase identity directly. |

## Firebase console setup

Use a non-production project first.

- Create or select the Firebase project.
- Add a Web App and copy the public web configuration.
- In **Authentication → Sign-in method**, enable:
  - Google provider;
  - Email/password provider.
- Add local authorized domains if needed:
  - `localhost`;
  - the staging domain when available.

Do not add Firebase service account JSON to the repository. This auth flow currently verifies Firebase ID tokens through Google's public certificates and only requires `FIREBASE_PROJECT_ID` server-side.

## Local environment

Copy the template and fill values locally:

```bash
cp env.example .env.local
```

Required for the real auth bridge:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase web api key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase web app id>

FIREBASE_PROJECT_ID=<same project id>
SESSION_SECRET=<random value with at least 32 bytes>
DATABASE_URL=<local or staging postgres url>
```

Expected consistency check:

| Value | Must match |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Web App project ID. |
| `FIREBASE_PROJECT_ID` | Same Firebase project ID used by server token verification. |
| Firebase ID token `aud` / `iss` | The server-side `FIREBASE_PROJECT_ID`. |

## Internal account prerequisite

`POST /api/auth/session` does not auto-create accounts yet. It maps a verified Firebase UID to an existing internal `CustomerAccount`.

Expected outcomes:

| Situation | Expected result |
| --- | --- |
| Firebase login works but no internal account exists | `POST /api/auth/session` returns `403` with `Account is not linked`. |
| Firebase UID has an internal account row | `POST /api/auth/session` returns `200` and sets the app session cookie. |
| Firebase token belongs to a different project | `POST /api/auth/session` returns `401` with `Invalid authentication token`. |

Before a full successful validation, create or seed:

- one `customers` row;
- one `customer_accounts` row with the Firebase `uid`;
- `email_verified_at` when validating verified-email behavior;
- `is_admin = true` only for an admin validation account.

## Manual browser validation

Run the app:

```bash
npm run dev
```

Then validate:

1. Open `http://localhost:3000/login`.
2. Sign in with Firebase email/password or Google.
3. Confirm the login call reaches `POST /api/auth/session`.
4. Confirm a `triskelweb_session` HTTP-only cookie is set.
5. Open or fetch `GET /api/auth/session`.
6. Expect:

```json
{
  "authenticated": true,
  "session": {
    "accountId": "...",
    "customerId": "...",
    "emailVerified": true,
    "isAdmin": false,
    "role": "customer",
    "issuedAt": 0,
    "expiresAt": 0
  }
}
```

The exact timestamps will differ.

## Admin validation

Use a Firebase UID mapped to an internal account with `is_admin = true`.

1. Sign in as that Firebase user.
2. Confirm `POST /api/auth/session` succeeds.
3. Fetch `GET /api/admin/session`.
4. Expect `200` and safe internal admin claims only.

For a non-admin account, `GET /api/admin/session` must return `403`.

## Verified-email validation

Use an internal account whose Firebase token and internal row agree on verified email.

| Firebase token email | Internal `email_verified_at` | App session `emailVerified` |
| --- | --- | --- |
| verified | present | `true` |
| verified | missing | `false` |
| unverified | present or missing | `false` |

Sensitive account actions must use `emailVerified: true` plus same-account authorization.

## Evidence checklist

Record these in the issue or PR when real validation is performed:

- [ ] Firebase project ID used, without secrets.
- [ ] Providers enabled: Google and email/password.
- [ ] `.env.local` filled locally, not committed.
- [ ] Linked-account case returns `200` and sets the HTTP-only app session cookie.
- [ ] Unlinked-account case returns `403 Account is not linked`.
- [ ] Wrong-project token returns `401 Invalid authentication token`.
- [ ] Non-admin account cannot access `GET /api/admin/session`.
- [ ] Admin account can access `GET /api/admin/session`.
- [ ] Verified-email matrix checked for at least one positive and one negative case.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `Firebase client configuration is incomplete` | Missing `NEXT_PUBLIC_FIREBASE_*` value. |
| `Invalid authentication token` | Wrong `FIREBASE_PROJECT_ID`, expired token, malformed token, or provider mismatch. |
| `Account is not linked` | Firebase UID has no internal `customer_accounts` row. |
| `Authentication service unavailable` | Missing `SESSION_SECRET`, DB error, or account mapping configuration issue. |
| Login succeeds but session status is unauthenticated | Cookie not set, cookie cleared, wrong host, or invalid `SESSION_SECRET` across restarts. |

## Next step

Once this checklist passes locally, repeat it against staging before production. Keep production Firebase credentials and project administration outside pull requests.
