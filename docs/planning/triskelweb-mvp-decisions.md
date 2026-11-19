# TriskelWeb MVP decisions

Current MVP decisions for architecture, checkout, stock, payments, and
shipping.

## Current answer

Build the MVP with:

1. Manual bank transfer with a 72-hour stock reservation.
2. Stripe as the baseline external payment service provider.
3. Correos shipping across Spain using a manual tariff table.
4. Provider abstractions for future Redsys/Bizum support.

The key rule is that Stripe and Correos are adapters, not domain concepts.
Orders, stock, payments, and shipments must stay provider-neutral.

## Payment decisions

| Topic | MVP decision |
| --- | --- |
| External PSP baseline | Stripe |
| PSP criterion | No fixed monthly fee |
| Card checkout | Hosted/secure provider checkout |
| Confirmation | Backend webhook/provider confirmation |
| PayPal | Post-MVP |
| Redsys/Bizum | Post-MVP research |
| Bank transfer | Supported in MVP |
| Transfer reservation | Reserve stock for 72 hours |
| Transfer proof | Optional screenshot/proof upload |
| Transfer validation | Manual team validation |
| Provider validation | Required before production activation |

## External PSP meaning

An external PSP is a payment provider such as Stripe, Mollie, PayPal, or
SumUp.

The shop does not process card data directly. Instead, it creates a payment
session, sends the customer through a secure provider checkout, and receives
backend payment confirmation from the provider.

## Stripe rationale

Stripe is the current baseline because it fits the MVP preference:

- no fixed monthly fee according to the official Spain pricing page;
- hosted Checkout available;
- mature webhook-based confirmation flow;
- good developer documentation;
- common ecommerce integration patterns.

Official references checked during planning:

- <https://stripe.com/es/pricing>
- <https://stripe.com/es/payments/checkout>

## Payment architecture rule

The domain model should not hard-code Stripe-specific concepts. Use a provider
boundary such as `PaymentProvider` so future providers can be added later.

Minimum provider operations:

- create payment intent/session;
- handle provider callback/webhook;
- confirm payment success/failure;
- cancel or expire pending payment;
- map provider events to internal order/payment states.

## Stock and order payment rules

| Scenario | Rule |
| --- | --- |
| Finite stock product | Track stock per variant when variants exist |
| Made-to-order product | Allow purchase with visible lead time |
| PSP checkout started | Reserve stock while payment is pending |
| PSP payment confirmed | Commit payment and stock |
| PSP payment failed | Release reservation |
| Bank transfer selected | Reserve stock for 72 hours |
| Bank transfer confirmed | Commit order, payment, and stock |
| Bank transfer expired | Cancel or release reservation |

## Shipping decisions

| Topic | MVP decision |
| --- | --- |
| Carrier | Correos |
| Geography | All Spain |
| Areas | Península, Baleares, Canarias, Ceuta, Melilla |
| Pricing | Manual tariff table |
| Customer ID | Request DNI/NIF from all customers |
| Delivery mode | Standard home delivery |
| Label generation | Prefer generation when preparing the order |
| Minimum APIs | Preregister, Labels, and Trackpub |
| Conditional API | Requests only if pickup is contracted |

## MVP non-goals

- Automated Bizum payment.
- Redsys/bank TPV as the first payment implementation.
- PayPal as an initial required payment method.
- Live Correos rate calculation during checkout.
- Citypaq/offices pickup flow.
- Automated bank transfer reconciliation.
- Final legal/fiscal production readiness.

## Production blockers and checks

These do not block MVP planning, but must be resolved before real launch:

- Validate Stripe account eligibility.
- Validate required business/legal data for Stripe.
- Validate current Stripe pricing for Spain.
- Validate the legal/fiscal entity that will sell.
- Validate Correos contract/API access.
- Confirm exact Correos services available.
- Confirm customs/data rules for Canarias, Ceuta, and Melilla.
- Define data retention and backup policy with legal review.

## Next architecture implications

The architecture should define stable internal state machines before choosing
framework details:

- `OrderStatus`
- `PaymentStatus`
- `StockReservationStatus`
- `ShipmentStatus`
- `PaymentProvider`
- `ShippingProvider`
