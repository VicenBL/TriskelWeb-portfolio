# TriskelWeb domain data model

This document defines the MVP domain entities before choosing a framework,
database, or ORM.

The model follows one rule: domain records use internal concepts. Provider data
from Stripe or Correos is stored as adapter metadata or references.

## Entity map

| Area | Entities |
| --- | --- |
| Identity | `Customer`, `CustomerAccount`, `GuestIdentity` |
| Catalog | `Product`, `ProductVariant`, `ProductImage` |
| Stock | `InventoryItem`, `StockReservation` |
| Checkout | `Cart`, `CartItem` |
| Orders | `Order`, `OrderItem`, `OrderAddress` |
| Payments | `Payment`, `PaymentAttempt`, `ManualTransferProof` |
| Shipping | `Shipment`, `ShipmentEvent`, `ShippingRate` |
| Providers | `ProviderReference`, `ProviderEventLog` |

## Identity model

### Customer

Represents the buyer known by email and order history.

Recommended fields:

- `id`
- `email`
- `name`
- `phone`
- `dni_or_nif`
- `created_at`
- `updated_at`

### CustomerAccount

Represents login credentials and account-specific settings.

Recommended fields:

- `id`
- `customer_id`
- `password_hash` or external auth reference
- `email_verified_at`
- `created_at`
- `updated_at`

### GuestIdentity

Used when the customer checks out without an account.

Recommended fields:

- `id`
- `customer_id`
- `checkout_email`
- `order_id`
- `created_at`

A guest order should still create or reuse a `Customer` by email. Account
creation is optional after checkout.

## Catalog model

### Product

Represents the product shown in the shop.

Recommended fields:

- `id`
- `slug`
- `name`
- `description`
- `status`
- `stock_mode`
- `made_to_order_lead_time`
- `base_price_amount`
- `base_price_currency`
- `created_at`
- `updated_at`

Recommended `status` values:

- `draft`
- `active`
- `archived`

Recommended `stock_mode` values:

- `finite`
- `made_to_order`

### ProductVariant

Represents purchasable combinations such as size, color, or format.

Recommended fields:

- `id`
- `product_id`
- `sku`
- `name`
- `attributes_json`
- `price_amount`
- `price_currency`
- `is_active`
- `created_at`
- `updated_at`

If a product has variants, stock is tracked at variant level. If it has no
variants, stock is tracked at product level through a single inventory item.

### ProductImage

Recommended fields:

- `id`
- `product_id`
- `variant_id`
- `url`
- `alt_text`
- `sort_order`

## Stock model

### InventoryItem

Represents stock available for a product or variant.

Recommended fields:

- `id`
- `product_id`
- `variant_id`
- `stock_mode`
- `quantity_available`
- `quantity_reserved`
- `quantity_committed`
- `updated_at`

For `made_to_order`, physical quantity can be ignored. The order records the
purchase need and fulfillment lead time.

### StockReservation

Represents temporary stock held for a pending payment.

Recommended fields:

- `id`
- `order_id`
- `order_item_id`
- `inventory_item_id`
- `quantity`
- `status`
- `reserved_until`
- `committed_at`
- `released_at`
- `created_at`

`status` uses `StockReservationStatus` from the state model.

## Checkout model

### Cart

Represents a pre-order checkout container.

Recommended fields:

- `id`
- `customer_id`
- `guest_identity_id`
- `status`
- `expires_at`
- `created_at`
- `updated_at`

Recommended `status` values:

- `active`
- `converted`
- `abandoned`
- `expired`

### CartItem

Recommended fields:

- `id`
- `cart_id`
- `product_id`
- `variant_id`
- `quantity`
- `unit_price_amount`
- `unit_price_currency`
- `created_at`

## Order model

### Order

Represents the placed purchase.

Recommended fields:

- `id`
- `public_reference`
- `customer_id`
- `status`
- `payment_status`
- `shipment_status`
- `subtotal_amount`
- `shipping_amount`
- `tax_amount`
- `total_amount`
- `currency`
- `placed_at`
- `paid_at`
- `cancelled_at`
- `expired_at`
- `created_at`
- `updated_at`

`status`, `payment_status`, and `shipment_status` use the state model.

### OrderItem

Recommended fields:

- `id`
- `order_id`
- `product_id`
- `variant_id`
- `sku_snapshot`
- `name_snapshot`
- `attributes_snapshot_json`
- `quantity`
- `unit_price_amount`
- `total_amount`
- `stock_mode_snapshot`
- `lead_time_snapshot`

Snapshots protect historical orders when catalog data changes.

### OrderAddress

Use separate address rows for billing and shipping.

Recommended fields:

- `id`
- `order_id`
- `type`
- `name`
- `phone`
- `dni_or_nif`
- `line1`
- `line2`
- `city`
- `province`
- `postal_code`
- `country_code`

Recommended `type` values:

- `billing`
- `shipping`

## Payment model

### Payment

Represents the internal payment record for an order.

Recommended fields:

- `id`
- `order_id`
- `method`
- `provider`
- `status`
- `amount`
- `currency`
- `expires_at`
- `confirmed_at`
- `failed_at`
- `cancelled_at`
- `created_at`
- `updated_at`

Recommended `method` values:

- `card_checkout`
- `manual_transfer`

Recommended `provider` values:

- `stripe`
- `manual_transfer`

Future values can include `redsys`, `bizum`, `paypal`, or `mollie`.

### PaymentAttempt

Represents a concrete payment session or attempt.

Recommended fields:

- `id`
- `payment_id`
- `provider`
- `status`
- `provider_reference_id`
- `checkout_url`
- `expires_at`
- `created_at`
- `updated_at`

Stripe Checkout should live here as a provider reference, not on `Order`.

### ManualTransferProof

Represents optional proof uploaded by the customer.

Recommended fields:

- `id`
- `payment_id`
- `uploaded_by_customer_id`
- `file_url`
- `status`
- `admin_note`
- `reviewed_by_admin_id`
- `reviewed_at`
- `created_at`

Recommended `status` values:

- `uploaded`
- `accepted`
- `rejected`

The proof helps manual review, but it does not confirm payment by itself.

## Shipping model

### ShippingRate

Represents a configured manual shipping tariff.

Recommended fields:

- `id`
- `zone`
- `province`
- `postal_code_prefix`
- `service_level`
- `price_amount`
- `price_currency`
- `is_active`

MVP rates are read from this table instead of a live Correos rate API.

### Shipment

Represents a shipment for an order.

Recommended fields:

- `id`
- `order_id`
- `provider`
- `status`
- `shipping_rate_id`
- `tracking_code`
- `label_url`
- `provider_reference_id`
- `prepared_at`
- `label_created_at`
- `shipped_at`
- `delivered_at`
- `created_at`
- `updated_at`

`provider` starts as `correos`.

### ShipmentEvent

Represents provider tracking or manual shipment events.

Recommended fields:

- `id`
- `shipment_id`
- `status`
- `message`
- `occurred_at`
- `provider_event_log_id`
- `created_at`

## Provider model

### ProviderReference

Stores provider-specific identifiers without polluting domain entities.

Recommended fields:

- `id`
- `provider`
- `resource_type`
- `resource_id`
- `external_id`
- `external_type`
- `metadata_json`
- `created_at`

Examples:

- Stripe Checkout Session ID;
- Stripe Payment Intent ID;
- Correos shipment/preregistration ID;
- Correos tracking code.

### ProviderEventLog

Stores raw provider events for audit and idempotency.

Recommended fields:

- `id`
- `provider`
- `event_id`
- `event_type`
- `received_at`
- `processed_at`
- `status`
- `payload_json`
- `error_message`

Recommended `status` values:

- `received`
- `processed`
- `ignored`
- `failed`

Provider webhooks must be idempotent. Repeated event IDs should not apply the
same state transition twice.

## Money rule

Store money as integer minor units plus currency.

Examples:

- `1299` + `EUR` means 12.99 EUR;
- never store prices as floating-point numbers.

## MVP relationships

| Parent | Children |
| --- | --- |
| `Customer` | `CustomerAccount`, `GuestIdentity`, `Order` |
| `Product` | `ProductVariant`, `ProductImage`, `InventoryItem` |
| `Cart` | `CartItem` |
| `Order` | `OrderItem`, `Payment`, `Shipment`, `OrderAddress` |
| `Payment` | `PaymentAttempt`, `ManualTransferProof` |
| `Shipment` | `ShipmentEvent` |
| Domain entity | `ProviderReference` |
| Provider reference | `ProviderEventLog` |

## MVP exclusions

The MVP model intentionally excludes:

- partial payments;
- partial refunds;
- split shipments;
- multi-warehouse stock;
- complex promotions;
- gift cards;
- subscriptions;
- automated bank reconciliation;
- live carrier rate shopping.

## Open implementation choices

These can wait until framework/database selection:

- exact UUID or numeric ID strategy;
- exact JSON field support;
- whether provider metadata is encrypted;
- whether customer email uniqueness is global;
- whether carts persist for anonymous browser sessions;
- exact admin roles and permissions.
