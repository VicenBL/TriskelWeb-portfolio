<!-- markdownlint-disable MD013 -->

# TriskelWeb implementation backlog

This backlog converts the TriskelWeb planning decisions into an implementation
order.

It is not a sprint plan. It is the safest construction sequence for the MVP so
that provider integrations, payments, stock, admin operations, deployment, and
recovery are built on stable foundations.

## Build principles

- Build the domain core before provider adapters.
- Keep PostgreSQL as the ecommerce source of truth.
- Keep Firebase, Stripe, Correos, and Piensa SMTP behind adapter boundaries.
- Make money integer minor units plus currency from the first migration.
- Implement state transitions as application services, not scattered UI logic.
- Add audit and idempotency before production provider webhooks.
- Prefer small reviewable work units over one large ecommerce rewrite.
- Do not launch without restore-tested backups.

## Recommended implementation order

| Phase | Goal | Depends on |
| --- | --- | --- |
| 0. Project foundation | Create the app skeleton, tooling, and local database | None |
| 1. Domain schema | Implement PostgreSQL schema and migrations | Phase 0 |
| 2. Domain services | Implement state transitions, money, stock reservation logic | Phase 1 |
| 3. Auth and authorization | Connect Firebase Auth and internal roles | Phase 1 |
| 4. Catalog/admin base | Manage products, variants, images, and stock | Phases 1-3 |
| 5. Files adapter | Backend-mediated Firebase Storage uploads | Phases 1, 3 |
| 6. Checkout core | Cart, order placement, address, shipping-rate selection | Phases 1-5 |
| 7. Manual transfer | Transfer instructions, proof upload, admin validation | Phase 6 |
| 8. Stripe adapter | Hosted checkout, webhook, idempotent payment confirmation | Phase 6 |
| 9. Fulfillment/admin | Preparation queues, labels, shipment status, audit logs | Phases 6-8 |
| 10. Correos adapter | Preregistration, label creation, tracking sync | Phase 9 |
| 11. Notifications | Transactional emails through Piensa SMTP adapter | Phases 6-10 |
| 12. Jobs | Expiry jobs, tracking sync, cleanup, backup checks | Phases 7-11 |
| 13. VPS deployment | Docker Compose, nginx, HTTPS, env, deploy script | Phase 0 onward |
| 14. Backup/restore | Daily dumps, off-server copy, restore test | Phase 13 |
| 15. Production hardening | Monitoring, security checklist, provider production checks | Phases 8-14 |

## Phase 0: Project foundation

Goal: create a deployable Next.js foundation with repeatable local development.

Tasks:

- initialize Next.js application;
- choose package manager and lockfile policy;
- configure TypeScript strictness;
- configure linting/formatting;
- add test runner;
- add environment variable validation;
- add health endpoint skeleton;
- add Dockerfile;
- add local Docker Compose with PostgreSQL;
- add `.env.example` without secrets.

Acceptance evidence:

- app boots locally;
- tests run;
- lint/typecheck run;
- local PostgreSQL starts through Docker Compose;
- health endpoint returns a basic OK response.

## Phase 1: Domain schema

Goal: persist the provider-neutral ecommerce model.

Tasks:

- select ORM/query layer;
- implement migrations for identity, catalog, inventory, checkout, orders,
  payments, shipping, provider references, provider event logs, and audit logs;
- enforce money columns as integer amount plus currency;
- add unique/index constraints for public references, provider events, and stock
  lookups;
- seed minimal shipping rates and admin bootstrap data.

Acceptance evidence:

- migrations apply from empty database;
- migrations can reset a local development database;
- schema contains no Stripe/Correos/Firebase concepts outside provider reference/log
  tables and adapter metadata;
- repeated provider event IDs cannot be processed as separate events.

## Phase 2: Domain services

Goal: implement the internal business operations before UI and providers.

Tasks:

- implement money helpers;
- implement order/payment/shipment state transition guards;
- implement inventory reservation, commit, release, and expiry operations;
- implement provider event ingestion/idempotency service;
- implement admin audit logging service.

Acceptance evidence:

- unit tests cover valid and invalid state transitions;
- stock reservation tests cover finite stock, made-to-order, commit, release, and
  expiry;
- idempotency tests prove repeated provider events do not apply twice;
- audit logs are written for state-changing admin operations.

## Phase 3: Auth and authorization

Goal: connect identity without confusing it with ecommerce permissions.

Tasks:

- create Firebase project configuration for local/development;
- enable Google provider;
- enable email/password provider;
- implement server-side Firebase ID token verification;
- create secure HTTP-only app session;
- map Firebase `uid` to internal `CustomerAccount`;
- implement verified-email requirement for sensitive account actions;
- implement internal role checks for admin routes.

Acceptance evidence:

- Google login creates/links an internal account;
- email/password login works with email verification and password reset flow;
- guest checkout remains possible without login;
- non-admin authenticated users cannot access admin mutations;
- admin mutation attempts are audited.

## Phase 4: Catalog/admin base

Goal: let the operator manage products and stock.

Tasks:

- implement product/variant CRUD;
- implement product status workflow: draft, active, archived;
- implement inventory item management;
- implement shipping-rate admin seed/edit flow if needed;
- implement public catalog listing and product detail pages.

Acceptance evidence:

- admin can create a finite-stock product;
- admin can create a made-to-order product;
- public catalog shows only active products;
- product edits do not mutate historical order snapshots.

## Phase 5: Files adapter

Goal: implement backend-mediated Firebase Storage without exposing sensitive files.

Tasks:

- configure EU Firebase Storage bucket;
- implement storage adapter using Firebase Admin SDK;
- implement object path generation;
- validate MIME type and size limits;
- store file metadata in PostgreSQL;
- serve product images through public/cacheable URL strategy;
- serve transfer proofs and labels through authenticated backend routes only.

Acceptance evidence:

- product image upload works from admin;
- invalid file types/sizes are rejected;
- transfer proof files are not publicly readable;
- Correos label placeholder files are not publicly readable;
- PostgreSQL metadata can resolve files after app restart.

## Phase 6: Checkout core

Goal: place provider-neutral orders from carts.

Tasks:

- implement cart and cart item flows;
- implement customer/guest identity capture;
- implement shipping address and DNI/NIF capture;
- implement shipping-rate selection from manual rates;
- implement order creation with item snapshots;
- implement pending payment creation;
- implement stock reservation on order placement.

Acceptance evidence:

- guest checkout can create a pending order;
- logged-in checkout can create a pending order;
- finite stock is reserved transactionally;
- insufficient stock blocks checkout;
- order totals use integer money calculations;
- customer receives a stable public order reference.

## Phase 7: Manual transfer

Goal: support the low-cost fallback payment method from MVP.

Tasks:

- generate transfer instructions;
- set 72h payment/reservation expiry;
- implement proof upload route;
- implement admin review queue;
- implement accept/reject actions with note/customer message;
- commit or release stock according to review result.

Acceptance evidence:

- pending manual transfer order expires after 72h;
- proof upload is attached to the correct pending payment;
- admin acceptance marks payment confirmed and order paid;
- admin rejection marks payment failed and releases stock;
- all admin decisions are audited.

## Phase 8: Stripe adapter

Goal: support card payment without handling card data.

Tasks:

- create Stripe Checkout Session server-side;
- store Checkout Session and Payment Intent references;
- implement raw-body webhook endpoint;
- verify Stripe webhook signature;
- store provider event logs;
- map Stripe events into internal payment events;
- expire unpaid Stripe attempts after 24h.

Acceptance evidence:

- checkout redirects to Stripe hosted payment page;
- successful Stripe webhook confirms payment/order and commits stock;
- failed/expired Stripe payment releases stock;
- duplicate Stripe webhook events are idempotent;
- invalid webhook signature is rejected.

## Phase 9: Fulfillment/admin

Goal: let the operator process paid orders safely.

Tasks:

- implement admin order queues;
- implement paid to preparing transition;
- implement preparing to ready-to-ship transition;
- implement shipment record creation;
- implement shipment status updates;
- implement admin audit views.

Acceptance evidence:

- paid orders appear in fulfillment queue;
- admin can move orders through preparation states;
- shipment state stays provider-neutral;
- every state-changing admin operation is audited.

## Phase 10: Correos adapter

Goal: generate labels and track shipments through Correos without polluting the
shipping domain.

Tasks:

- configure Correos credentials as secrets;
- implement preregistration/label adapter;
- store Correos references and raw responses;
- store labels privately through the files adapter;
- implement tracking sync or tracking ingestion;
- map carrier states into internal `ShipmentStatus` values.

Acceptance evidence:

- label generation creates internal shipment/provider references;
- generated label is downloadable only by admin;
- tracking updates create `ShipmentEvent` rows;
- repeated tracking/provider events are idempotent;
- Correos failures leave the order recoverable from admin.

## Phase 11: Notifications

Goal: send required MVP customer/admin emails through an adapter.

Tasks:

- implement notification templates;
- implement Piensa SMTP mailer adapter;
- log sent/failed notifications;
- send order placed, transfer instructions, proof received, payment confirmed,
  payment rejected, expired/cancelled, preparing, shipped/tracking, and shipping
  issue emails;
- keep provider swap seam for later transactional email service.

Acceptance evidence:

- Piensa SMTP sends test emails from VPS/staging;
- Gmail and Outlook receive test messages;
- failed sends are logged and visible to admin/operator;
- notification logic does not mutate domain state directly.

## Phase 12: Jobs

Goal: make low-traffic operations reliable without a heavy queue.

Tasks:

- implement Stripe pending expiry job;
- implement manual transfer expiry job;
- implement Correos tracking sync job;
- implement temporary upload cleanup job;
- implement cron wrappers and failure logging;
- add optional alert hooks.

Acceptance evidence:

- expiry jobs are idempotent;
- stock is released once, not repeatedly;
- tracking sync can be rerun safely;
- failed cron job produces an alert/log entry.

## Phase 13: VPS deployment

Goal: deploy repeatably to Piensa VPS.

Tasks:

- provision non-root deploy user;
- configure SSH keys only;
- configure firewall;
- configure nginx reverse proxy;
- configure Let's Encrypt;
- prepare production Docker Compose;
- write deploy script;
- store production environment outside git;
- expose `/api/health` for monitoring.

Acceptance evidence:

- fresh VPS can deploy from documented steps;
- app is served over HTTPS;
- only SSH/HTTP/HTTPS are open;
- deploy script records deployed git SHA;
- rollback path is documented.

## Phase 14: Backup/restore

Goal: prove production data can be recovered.

Tasks:

- enable Piensa VPS backup;
- create daily PostgreSQL dump script;
- copy dumps off-server;
- alert on backup failure;
- write restore runbook;
- perform restore test against a clean database;
- verify Firebase file metadata still resolves after restore.

Acceptance evidence:

- backup runs automatically;
- off-server copy exists;
- restore test is completed before launch;
- restored app can inspect an order with payment, shipment, provider references, and
  file metadata.

## Phase 15: Production hardening

Goal: turn the implemented MVP into a safe launch candidate.

Tasks:

- configure UptimeRobot health check;
- configure disk and backup alerts;
- verify SPF/DKIM/DMARC;
- verify Piensa SMTP deliverability;
- validate Stripe production account and webhook endpoint;
- validate Correos contract/API credentials;
- run security checklist;
- run full checkout/payment/fulfillment rehearsal;
- document operator runbook.

Acceptance evidence:

- launch checklist in `docs/planning/triskelweb-nextjs-vps-architecture.md` is
  complete;
- test purchase can be paid, fulfilled, shipped, notified, and audited;
- restore test evidence exists;
- provider production blockers are resolved or explicitly deferred outside launch.

## First reviewable implementation slices

Start with small slices that can be reviewed independently:

1. Next.js skeleton, tooling, health endpoint, Docker Compose PostgreSQL.
2. Database migrations for core domain entities.
3. State transition and stock reservation service tests.
4. Firebase Auth session bridge and internal admin role guard.
5. Product/catalog/admin CRUD without file uploads.
6. Firebase Storage adapter and product image uploads.
7. Checkout core with manual shipping rates and stock reservations.
8. Manual transfer flow and admin validation.
9. Stripe Checkout/webhook adapter.
10. Fulfillment admin queues.
11. Correos label adapter.
12. Notification adapter and Piensa SMTP tests.
13. VPS deploy/backup/restore runbook.

## External blockers before public launch

These can run in parallel with implementation, but they block public launch:

- Piensa checkout package purchased and confirmed;
- `.es` domain chosen and configured;
- Firebase production project and EU bucket created;
- Stripe production account validated;
- Correos contract/API credentials obtained;
- Piensa SMTP limits and deliverability tested;
- UptimeRobot account/check configured;
- off-server backup destination chosen;
- restore test performed.

## Non-goals for MVP implementation

Do not build these unless a later decision changes scope:

- partial payments;
- partial refunds;
- split shipments;
- multi-carrier checkout;
- live Correos rate lookup;
- automated bank reconciliation;
- microservices;
- Firestore ecommerce database;
- custom password storage;
- public access to transfer proofs or labels;
- Plesk-dependent deployment.

## Recommended next action

Start implementation with Phase 0 and Phase 1 only.

That creates the deployable foundation and persistent domain model without taking
on payment provider risk too early.
