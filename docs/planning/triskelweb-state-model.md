# TriskelWeb state model

This document defines MVP-neutral states for orders, payments, stock
reservations, and shipments.

The goal is to keep the business model stable while Stripe, Correos, Redsys,
Bizum, or other providers remain replaceable adapters.

## Core rule

Provider events must be translated into internal states before they affect the
domain model.

Do not let external names such as Stripe Checkout, Correos Preregister, Redsys,
or Bizum become order or stock states.

## OrderStatus

| Status | Meaning |
| --- | --- |
| `draft` | Cart/checkout exists, but order is not placed yet |
| `pending_payment` | Order was placed and waits for payment confirmation |
| `paid` | Payment is confirmed and the order can be fulfilled |
| `preparing` | Team is preparing the order |
| `ready_to_ship` | Order is packed and shipment can be created or used |
| `shipped` | Shipment has been handed to carrier |
| `delivered` | Carrier/customer confirms delivery |
| `cancelled` | Order was cancelled before completion |
| `expired` | Pending payment/reservation expired |
| `refunded` | Payment was returned after confirmation |

### Order transitions

| From | To | Trigger |
| --- | --- | --- |
| `draft` | `pending_payment` | Customer confirms checkout |
| `pending_payment` | `paid` | Payment becomes confirmed |
| `pending_payment` | `expired` | Payment window expires |
| `pending_payment` | `cancelled` | Customer/team cancels before payment |
| `paid` | `preparing` | Team starts fulfillment |
| `preparing` | `ready_to_ship` | Order is packed/prepared |
| `ready_to_ship` | `shipped` | Carrier shipment is active |
| `shipped` | `delivered` | Delivery is confirmed |
| `paid` | `refunded` | Full refund is confirmed |
| `preparing` | `refunded` | Full refund is confirmed |
| `ready_to_ship` | `refunded` | Full refund is confirmed before shipping |

## PaymentStatus

| Status | Meaning |
| --- | --- |
| `not_started` | No payment attempt exists yet |
| `pending` | Payment has been initiated but is not confirmed |
| `requires_manual_review` | Manual transfer or anomaly needs review |
| `confirmed` | Payment is confirmed by provider or team |
| `failed` | Provider rejected or failed payment |
| `expired` | Payment window expired |
| `cancelled` | Payment was intentionally cancelled |
| `refunded` | Full refund completed |

### Payment transitions

| From | To | Trigger |
| --- | --- | --- |
| `not_started` | `pending` | Payment attempt is created |
| `pending` | `confirmed` | Provider/team confirms payment |
| `pending` | `requires_manual_review` | Proof or anomaly appears |
| `requires_manual_review` | `confirmed` | Team validates payment |
| `requires_manual_review` | `failed` | Team rejects payment |
| `pending` | `failed` | Provider reports failure |
| `pending` | `expired` | Checkout/transfer window expires |
| `pending` | `cancelled` | Customer/team cancels |
| `confirmed` | `refunded` | Full refund succeeds |

## StockReservationStatus

| Status | Meaning |
| --- | --- |
| `none` | No stock reservation exists |
| `reserved` | Stock is temporarily held for a pending order/payment |
| `committed` | Stock has been consumed by a confirmed order |
| `released` | Reserved stock returned to available stock |
| `expired` | Reservation expired before payment confirmation |

### Stock reservation rules

| Scenario | Rule |
| --- | --- |
| Stripe checkout starts | Create reservation while payment is pending |
| Stripe payment confirms | Move reservation to `committed` |
| Stripe payment fails/expires | Release reservation |
| Bank transfer order starts | Reserve stock for 72 hours |
| Bank transfer confirms | Move reservation to `committed` |
| Bank transfer expires | Move reservation to `expired` and release stock |
| Made-to-order product | Record purchase need, but do not require stock units |

## ShipmentStatus

| Status | Meaning |
| --- | --- |
| `not_required` | No physical shipment is needed |
| `pending` | Shipment exists conceptually, but is not prepared |
| `preparing` | Team is preparing the package |
| `label_created` | Carrier label/shipment has been generated |
| `shipped` | Package was handed to carrier |
| `in_transit` | Carrier reports movement |
| `delivered` | Carrier reports delivery |
| `failed` | Delivery failed or carrier reports an issue |
| `returned` | Shipment is returning or returned |
| `cancelled` | Shipment was cancelled before dispatch |

### Shipment transitions

| From | To | Trigger |
| --- | --- | --- |
| `pending` | `preparing` | Team starts fulfillment |
| `preparing` | `label_created` | Correos label/shipment is generated |
| `label_created` | `shipped` | Package is handed to Correos |
| `shipped` | `in_transit` | Tracking reports movement |
| `in_transit` | `delivered` | Tracking reports delivery |
| `shipped` | `failed` | Carrier reports delivery problem |
| `in_transit` | `failed` | Carrier reports delivery problem |
| `failed` | `returned` | Carrier returns package |
| `pending` | `cancelled` | Order is cancelled before preparation |
| `preparing` | `cancelled` | Order is cancelled before dispatch |

## PaymentProvider boundary

A payment provider adapter should expose internal operations, not provider UI
or webhook details.

Minimum operations:

- create a hosted checkout session;
- create or register a manual transfer payment;
- parse and verify provider callbacks;
- map provider events to `PaymentStatus` changes;
- expire or cancel pending payment attempts;
- request or record refunds.

### Stripe adapter responsibilities

The Stripe adapter can know about Stripe session IDs, payment intent IDs,
signatures, and webhook event names.

The domain layer should only receive verified internal events such as:

- payment pending;
- payment confirmed;
- payment failed;
- payment expired;
- refund confirmed.

## ShippingProvider boundary

A shipping provider adapter should expose internal fulfillment operations, not
carrier-specific API concepts.

Minimum operations:

- calculate or read configured shipping price;
- create shipment draft/registration;
- generate label;
- fetch or receive tracking updates;
- cancel shipment when supported;
- map carrier updates to `ShipmentStatus` changes.

### Correos adapter responsibilities

The Correos adapter can know about Preregister, Labels, Trackpub, request
payloads, tracking codes, and API authentication.

The domain layer should only receive verified internal events such as:

- label created;
- shipment handed to carrier;
- shipment in transit;
- shipment delivered;
- shipment failed;
- shipment returned.

## MVP simplifications

The MVP does not need:

- partial payments;
- partial refunds;
- split shipments;
- multi-carrier routing;
- automated bank reconciliation;
- customer-driven order cancellation after payment;
- real-time Correos rate lookup.

These can be added later if the state model remains provider-neutral.

## Resolved MVP operation decisions

| Topic | Decision |
| --- | --- |
| Checkout identity | Allow guest checkout and optional account creation |
| Unpaid order cancellation | Customer and admin can cancel unpaid orders |
| Transfer validation | Admin can confirm or reject manual transfers |
| Refund execution | Out of MVP; refunds are handled outside the app |
| Refund state | Keep `refunded` as a future/record state |
| Stripe checkout timeout | 24 hours |
| Correos label timing | Generate label when preparing the order |

## Remaining implementation decisions

These should be decided before implementation:

- exact customer account creation flow after guest checkout;
- exact admin fields for transfer validation notes;
- whether an external refund reference is recorded manually;
- exact notification copy for cancellation and payment expiry.
