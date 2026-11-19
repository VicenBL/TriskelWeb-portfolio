# TriskelWeb admin flows

This document defines the MVP backoffice flows for payment review, order
preparation, Correos labels, shipment tracking, and cancellations.

The admin must operate on internal states. Stripe and Correos details should be
shown only when useful for diagnosis.

## Admin dashboard queues

| Queue | Included orders | Admin action |
| --- | --- | --- |
| Payment review | Manual transfer payments needing review | Confirm or reject |
| Paid orders | Paid orders not yet preparing | Start preparation |
| Preparing | Orders being prepared | Pack and generate label |
| Ready to ship | Label created or package ready | Mark handed to carrier |
| Shipping issues | Failed or returned shipments | Investigate and update |
| Expiring soon | Unpaid reservations near expiry | Remind or cancel |

## Manual transfer validation

### Transfer happy path

1. Customer places order with manual transfer.
2. System creates `Order.pending_payment`.
3. System creates `Payment.pending` with method `manual_transfer`.
4. System reserves finite stock for 72 hours.
5. Customer may upload optional transfer proof.
6. Admin checks bank account outside the app.
7. Admin marks payment as confirmed.
8. System moves payment to `confirmed`.
9. System moves order to `paid`.
10. System commits stock reservations.
11. System notifies the customer.

### Rejection path

1. Admin reviews proof or bank movement.
2. Admin marks payment as rejected.
3. System moves payment to `failed`.
4. System moves order to `cancelled` or keeps it pending by admin choice.
5. If cancelled, system releases stock reservation.
6. System notifies the customer with next instructions.

### Expiry path

1. Transfer deadline reaches 72 hours.
2. System moves payment to `expired`.
3. System moves order to `expired`.
4. System marks reservations as `expired` and releases stock.
5. System notifies the customer.

### Required admin fields

| Field | Purpose |
| --- | --- |
| Decision | Confirm, reject, or keep pending |
| Admin note | Internal reason or bank reference |
| Reviewed by | Audit trail |
| Reviewed at | Audit trail |
| Customer message | Optional message included in notification |

## Stripe payment review

Stripe payments should usually be automatic.

### Stripe happy path

1. Customer starts hosted checkout.
2. System creates a payment attempt.
3. Stripe sends a verified webhook.
4. Adapter maps webhook to internal payment confirmed event.
5. System moves payment to `confirmed`.
6. System moves order to `paid`.
7. System commits stock reservations.
8. System notifies the customer.

### Failure or expiry path

1. Stripe sends failure/expiry event, or timeout reaches 24 hours.
2. Adapter maps the event to an internal failure or expiry.
3. System moves payment to `failed` or `expired`.
4. System moves order to `cancelled` or `expired`.
5. System releases stock reservations.
6. System notifies the customer.

### Admin intervention

Admin should not manually confirm Stripe payments without provider evidence.
Allowed MVP actions:

- view provider reference;
- view provider event log;
- retry webhook processing;
- cancel pending unpaid order;
- add internal note.

## Order preparation

### Start preparation

1. Admin opens a `paid` order.
2. Admin verifies items, address, DNI/NIF, and shipping zone.
3. Admin clicks start preparation.
4. System moves order to `preparing`.
5. System moves shipment to `preparing`.

### Pack order

1. Admin checks physical items or made-to-order readiness.
2. Admin confirms package is ready.
3. System keeps order as `preparing` until label is generated.
4. System records preparation note when provided.

## Correos label generation

Labels are generated when the team prepares the order, not immediately after
payment.

### Label happy path

1. Admin opens a `preparing` order.
2. Admin confirms shipping address and service.
3. System creates Correos registration through the shipping adapter.
4. System generates or fetches label.
5. System stores provider IDs in `ProviderReference`.
6. System stores label URL on `Shipment`.
7. System moves shipment to `label_created`.
8. System moves order to `ready_to_ship`.

### Failure path

1. Correos request fails or returns invalid data.
2. System stores raw provider response in `ProviderEventLog`.
3. System keeps order in `preparing`.
4. System shows a retryable admin error.
5. Admin can fix address/service data and retry.

### Required admin checks

- Shipping address is complete.
- Postal code matches selected shipping zone.
- DNI/NIF is present.
- Customer phone is present when required.
- Package weight/dimensions are available if required by Correos.

## Handing package to carrier

1. Admin prints label and attaches it to package.
2. Admin hands package to Correos.
3. Admin marks shipment as handed to carrier.
4. System moves shipment to `shipped`.
5. System moves order to `shipped`.
6. System notifies customer with tracking code.

If Correos tracking already reports movement, the adapter can move shipment to
`in_transit` after the tracking event is verified.

## Shipment tracking

### Tracking update path

1. System fetches or receives Correos tracking update.
2. Adapter stores raw event in `ProviderEventLog`.
3. Adapter maps event to internal shipment event.
4. System creates `ShipmentEvent`.
5. System updates `ShipmentStatus` when appropriate.
6. System updates `OrderStatus` for delivered or returned outcomes.

### Customer-visible statuses

| Internal status | Customer copy intent |
| --- | --- |
| `pending` | Order paid, shipment not prepared yet |
| `preparing` | Team is preparing the package |
| `label_created` | Shipment is ready for carrier handoff |
| `shipped` | Package was handed to Correos |
| `in_transit` | Package is moving through Correos |
| `delivered` | Package was delivered |
| `failed` | Delivery had a problem |
| `returned` | Package is returning or returned |

## Unpaid order cancellation

Customers and admins can cancel unpaid orders.

### Customer cancellation

Allowed only when:

- order is `pending_payment`;
- payment is `pending` or `requires_manual_review`;
- stock reservation is not committed.

Effects:

1. Move payment to `cancelled`.
2. Move order to `cancelled`.
3. Release stock reservation.
4. Notify customer.

### Admin cancellation

Admin can cancel unpaid orders under the same state restrictions.
Admin must provide an internal note.

## Paid order cancellation

Customer-driven cancellation after payment is out of MVP.

Admin can record exceptional cancellation outside the normal happy path, but
refund execution is handled outside the app in MVP.

Recommended MVP behavior:

- require admin note;
- do not automatically move money;
- record external refund reference only if available;
- notify customer manually or through a controlled template.

## Backoffice permissions

Minimum admin roles:

| Role | Permissions |
| --- | --- |
| `admin` | Full backoffice access |
| `fulfillment` | Prepare orders and manage shipments |
| `payment_reviewer` | Review manual transfers |
| `support` | Read orders and add notes |

The MVP can start with one admin role if implementation needs to stay smaller.
The permission model should still leave room for these roles later.

## Audit log requirements

Every state-changing admin action should record:

- actor;
- action;
- previous state;
- next state;
- timestamp;
- internal note when provided;
- provider reference when relevant.

## Notifications

Minimum customer notifications:

- order placed;
- payment instructions for manual transfer;
- transfer proof received;
- payment confirmed;
- payment rejected;
- payment expired;
- order cancelled;
- order preparing;
- shipment handed to Correos;
- shipment delivered or delivery issue.

Exact copy can be written later.

## MVP exclusions

The MVP admin does not need:

- in-app refund execution;
- partial shipment management;
- advanced warehouse picking;
- automatic bank reconciliation;
- multi-carrier selection;
- bulk fulfillment actions;
- customer self-service cancellation after payment.

## Implementation checklist

- Admin can view orders by state queue.
- Admin can confirm/reject manual transfers.
- System expires unpaid transfer reservations after 72 hours.
- Stripe webhooks are idempotent.
- Admin can start preparation for paid orders.
- Admin can generate Correos labels during preparation.
- Admin can mark package handed to Correos.
- System can store provider references and raw provider events.
- Customer and admin can cancel unpaid orders.
- Every state-changing admin action is audited.
