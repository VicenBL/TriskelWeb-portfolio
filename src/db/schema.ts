import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const productStatus = pgEnum("product_status", [
	"draft",
	"active",
	"archived",
]);

export const stockMode = pgEnum("stock_mode", ["finite", "made_to_order"]);

export const cartStatus = pgEnum("cart_status", [
	"active",
	"converted",
	"abandoned",
	"expired",
]);

export const orderStatus = pgEnum("order_status", [
	"draft",
	"pending_payment",
	"paid",
	"preparing",
	"ready_to_ship",
	"shipped",
	"delivered",
	"cancelled",
	"expired",
	"refunded",
]);

export const paymentStatus = pgEnum("payment_status", [
	"not_started",
	"pending",
	"requires_manual_review",
	"confirmed",
	"failed",
	"expired",
	"cancelled",
	"refunded",
]);

export const paymentMethod = pgEnum("payment_method", [
	"card_checkout",
	"manual_transfer",
]);

export const paymentProvider = pgEnum("payment_provider", [
	"stripe",
	"manual_transfer",
]);

export const proofStatus = pgEnum("manual_transfer_proof_status", [
	"uploaded",
	"accepted",
	"rejected",
]);

export const stockReservationStatus = pgEnum("stock_reservation_status", [
	"none",
	"reserved",
	"committed",
	"released",
	"expired",
]);

export const shipmentStatus = pgEnum("shipment_status", [
	"not_required",
	"pending",
	"preparing",
	"label_created",
	"shipped",
	"in_transit",
	"delivered",
	"failed",
	"returned",
	"cancelled",
]);

export const shipmentProvider = pgEnum("shipment_provider", ["correos"]);

export const orderAddressType = pgEnum("order_address_type", [
	"billing",
	"shipping",
]);

export const providerEventStatus = pgEnum("provider_event_status", [
	"received",
	"processed",
	"ignored",
	"failed",
]);

const timestamps = {
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
};

export const customers = pgTable(
	"customers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		email: varchar("email", { length: 320 }).notNull(),
		name: varchar("name", { length: 200 }),
		phone: varchar("phone", { length: 50 }),
		dniOrNif: varchar("dni_or_nif", { length: 50 }),
		...timestamps,
	},
	(table) => [uniqueIndex("customers_email_unique").on(table.email)],
);

export const customerAccounts = pgTable(
	"customer_accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "cascade" }),
		firebaseUid: varchar("firebase_uid", { length: 128 }).notNull(),
		provider: varchar("provider", { length: 64 }).notNull(),
		emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
		isAdmin: boolean("is_admin").notNull().default(false),
		role: varchar("role", { length: 64 }),
		...timestamps,
	},
	(table) => [
		uniqueIndex("customer_accounts_firebase_uid_unique").on(table.firebaseUid),
		index("customer_accounts_customer_id_idx").on(table.customerId),
	],
);

export const products = pgTable(
	"products",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: varchar("slug", { length: 160 }).notNull(),
		name: varchar("name", { length: 200 }).notNull(),
		description: text("description"),
		status: productStatus("status").notNull().default("draft"),
		stockMode: stockMode("stock_mode").notNull().default("finite"),
		madeToOrderLeadTime: varchar("made_to_order_lead_time", { length: 120 }),
		basePriceAmount: integer("base_price_amount").notNull(),
		basePriceCurrency: varchar("base_price_currency", { length: 3 })
			.notNull()
			.default("EUR"),
		...timestamps,
	},
	(table) => [uniqueIndex("products_slug_unique").on(table.slug)],
);

export const productVariants = pgTable(
	"product_variants",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		sku: varchar("sku", { length: 120 }),
		name: varchar("name", { length: 200 }).notNull(),
		attributesJson: jsonb("attributes_json"),
		priceAmount: integer("price_amount").notNull(),
		priceCurrency: varchar("price_currency", { length: 3 })
			.notNull()
			.default("EUR"),
		isActive: boolean("is_active").notNull().default(true),
		...timestamps,
	},
	(table) => [
		uniqueIndex("product_variants_sku_unique").on(table.sku),
		index("product_variants_product_id_idx").on(table.productId),
	],
);

export const productImages = pgTable(
	"product_images",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		variantId: uuid("variant_id").references(() => productVariants.id, {
			onDelete: "set null",
		}),
		url: text("url").notNull(),
		objectPath: text("object_path"),
		altText: varchar("alt_text", { length: 240 }),
		sortOrder: integer("sort_order").notNull().default(0),
		...timestamps,
	},
	(table) => [index("product_images_product_id_idx").on(table.productId)],
);

export const inventoryItems = pgTable(
	"inventory_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		variantId: uuid("variant_id").references(() => productVariants.id, {
			onDelete: "cascade",
		}),
		stockMode: stockMode("stock_mode").notNull(),
		quantityAvailable: integer("quantity_available").notNull().default(0),
		quantityReserved: integer("quantity_reserved").notNull().default(0),
		quantityCommitted: integer("quantity_committed").notNull().default(0),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("inventory_items_product_id_idx").on(table.productId),
		index("inventory_items_variant_id_idx").on(table.variantId),
	],
);

export const carts = pgTable(
	"carts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		customerId: uuid("customer_id").references(() => customers.id, {
			onDelete: "set null",
		}),
		status: cartStatus("status").notNull().default("active"),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		...timestamps,
	},
	(table) => [index("carts_customer_id_idx").on(table.customerId)],
);

export const cartItems = pgTable(
	"cart_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		cartId: uuid("cart_id")
			.notNull()
			.references(() => carts.id, { onDelete: "cascade" }),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "restrict" }),
		variantId: uuid("variant_id").references(() => productVariants.id, {
			onDelete: "restrict",
		}),
		quantity: integer("quantity").notNull(),
		unitPriceAmount: integer("unit_price_amount").notNull(),
		unitPriceCurrency: varchar("unit_price_currency", { length: 3 })
			.notNull()
			.default("EUR"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("cart_items_cart_id_idx").on(table.cartId)],
);

export const orders = pgTable(
	"orders",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		publicReference: varchar("public_reference", { length: 40 }).notNull(),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "restrict" }),
		status: orderStatus("status").notNull().default("pending_payment"),
		paymentStatus: paymentStatus("payment_status")
			.notNull()
			.default("not_started"),
		shipmentStatus: shipmentStatus("shipment_status")
			.notNull()
			.default("pending"),
		subtotalAmount: integer("subtotal_amount").notNull(),
		shippingAmount: integer("shipping_amount").notNull().default(0),
		taxAmount: integer("tax_amount").notNull().default(0),
		totalAmount: integer("total_amount").notNull(),
		currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
		placedAt: timestamp("placed_at", { withTimezone: true }),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		expiredAt: timestamp("expired_at", { withTimezone: true }),
		...timestamps,
	},
	(table) => [
		uniqueIndex("orders_public_reference_unique").on(table.publicReference),
		index("orders_customer_id_idx").on(table.customerId),
		index("orders_status_idx").on(table.status),
	],
);

export const guestIdentities = pgTable(
	"guest_identities",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "cascade" }),
		checkoutEmail: varchar("checkout_email", { length: 320 }).notNull(),
		orderId: uuid("order_id").references(() => orders.id, {
			onDelete: "cascade",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("guest_identities_customer_id_idx").on(table.customerId)],
);

export const orderItems = pgTable(
	"order_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "restrict" }),
		variantId: uuid("variant_id").references(() => productVariants.id, {
			onDelete: "restrict",
		}),
		skuSnapshot: varchar("sku_snapshot", { length: 120 }),
		nameSnapshot: varchar("name_snapshot", { length: 240 }).notNull(),
		attributesSnapshotJson: jsonb("attributes_snapshot_json"),
		quantity: integer("quantity").notNull(),
		unitPriceAmount: integer("unit_price_amount").notNull(),
		totalAmount: integer("total_amount").notNull(),
		stockModeSnapshot: stockMode("stock_mode_snapshot").notNull(),
		leadTimeSnapshot: varchar("lead_time_snapshot", { length: 120 }),
	},
	(table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const orderAddresses = pgTable(
	"order_addresses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		type: orderAddressType("type").notNull(),
		name: varchar("name", { length: 200 }).notNull(),
		phone: varchar("phone", { length: 50 }),
		dniOrNif: varchar("dni_or_nif", { length: 50 }),
		line1: varchar("line1", { length: 240 }).notNull(),
		line2: varchar("line2", { length: 240 }),
		city: varchar("city", { length: 120 }).notNull(),
		province: varchar("province", { length: 120 }).notNull(),
		postalCode: varchar("postal_code", { length: 20 }).notNull(),
		countryCode: varchar("country_code", { length: 2 }).notNull().default("ES"),
	},
	(table) => [index("order_addresses_order_id_idx").on(table.orderId)],
);

export const payments = pgTable(
	"payments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		method: paymentMethod("method").notNull(),
		provider: paymentProvider("provider").notNull(),
		status: paymentStatus("status").notNull().default("pending"),
		amount: integer("amount").notNull(),
		currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
		failedAt: timestamp("failed_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		...timestamps,
	},
	(table) => [index("payments_order_id_idx").on(table.orderId)],
);

export const providerReferences = pgTable(
	"provider_references",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		provider: varchar("provider", { length: 64 }).notNull(),
		resourceType: varchar("resource_type", { length: 80 }).notNull(),
		resourceId: uuid("resource_id").notNull(),
		externalId: varchar("external_id", { length: 240 }).notNull(),
		externalType: varchar("external_type", { length: 120 }),
		metadataJson: jsonb("metadata_json"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("provider_references_provider_external_unique").on(
			table.provider,
			table.externalId,
		),
		index("provider_references_resource_idx").on(
			table.resourceType,
			table.resourceId,
		),
	],
);

export const paymentAttempts = pgTable(
	"payment_attempts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => payments.id, { onDelete: "cascade" }),
		provider: paymentProvider("provider").notNull(),
		status: paymentStatus("status").notNull().default("pending"),
		providerReferenceId: uuid("provider_reference_id").references(
			() => providerReferences.id,
			{ onDelete: "set null" },
		),
		checkoutUrl: text("checkout_url"),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		...timestamps,
	},
	(table) => [index("payment_attempts_payment_id_idx").on(table.paymentId)],
);

export const manualTransferProofs = pgTable(
	"manual_transfer_proofs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => payments.id, { onDelete: "cascade" }),
		uploadedByCustomerId: uuid("uploaded_by_customer_id").references(
			() => customers.id,
			{ onDelete: "set null" },
		),
		fileUrl: text("file_url").notNull(),
		objectPath: text("object_path"),
		status: proofStatus("status").notNull().default("uploaded"),
		adminNote: text("admin_note"),
		reviewedByAdminId: uuid("reviewed_by_admin_id").references(
			() => customerAccounts.id,
			{ onDelete: "set null" },
		),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("manual_transfer_proofs_payment_id_idx").on(table.paymentId),
	],
);

export const stockReservations = pgTable(
	"stock_reservations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		orderItemId: uuid("order_item_id")
			.notNull()
			.references(() => orderItems.id, { onDelete: "cascade" }),
		inventoryItemId: uuid("inventory_item_id")
			.notNull()
			.references(() => inventoryItems.id, { onDelete: "restrict" }),
		quantity: integer("quantity").notNull(),
		status: stockReservationStatus("status").notNull().default("reserved"),
		reservedUntil: timestamp("reserved_until", {
			withTimezone: true,
		}).notNull(),
		committedAt: timestamp("committed_at", { withTimezone: true }),
		releasedAt: timestamp("released_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("stock_reservations_order_id_idx").on(table.orderId),
		index("stock_reservations_inventory_item_id_idx").on(table.inventoryItemId),
	],
);

export const shippingRates = pgTable("shipping_rates", {
	id: uuid("id").primaryKey().defaultRandom(),
	zone: varchar("zone", { length: 120 }).notNull(),
	province: varchar("province", { length: 120 }),
	postalCodePrefix: varchar("postal_code_prefix", { length: 20 }),
	serviceLevel: varchar("service_level", { length: 120 }).notNull(),
	priceAmount: integer("price_amount").notNull(),
	priceCurrency: varchar("price_currency", { length: 3 })
		.notNull()
		.default("EUR"),
	isActive: boolean("is_active").notNull().default(true),
});

export const shipments = pgTable(
	"shipments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		provider: shipmentProvider("provider").notNull().default("correos"),
		status: shipmentStatus("status").notNull().default("pending"),
		shippingRateId: uuid("shipping_rate_id").references(
			() => shippingRates.id,
			{
				onDelete: "set null",
			},
		),
		trackingCode: varchar("tracking_code", { length: 120 }),
		labelUrl: text("label_url"),
		labelObjectPath: text("label_object_path"),
		providerReferenceId: uuid("provider_reference_id").references(
			() => providerReferences.id,
			{ onDelete: "set null" },
		),
		preparedAt: timestamp("prepared_at", { withTimezone: true }),
		labelCreatedAt: timestamp("label_created_at", { withTimezone: true }),
		shippedAt: timestamp("shipped_at", { withTimezone: true }),
		deliveredAt: timestamp("delivered_at", { withTimezone: true }),
		...timestamps,
	},
	(table) => [index("shipments_order_id_idx").on(table.orderId)],
);

export const providerEventLogs = pgTable(
	"provider_event_logs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		provider: varchar("provider", { length: 64 }).notNull(),
		eventId: varchar("event_id", { length: 240 }).notNull(),
		eventType: varchar("event_type", { length: 160 }).notNull(),
		receivedAt: timestamp("received_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		processedAt: timestamp("processed_at", { withTimezone: true }),
		status: providerEventStatus("status").notNull().default("received"),
		payloadJson: jsonb("payload_json").notNull(),
		errorMessage: text("error_message"),
	},
	(table) => [
		uniqueIndex("provider_event_logs_provider_event_unique").on(
			table.provider,
			table.eventId,
		),
		index("provider_event_logs_status_idx").on(table.status),
	],
);

export const shipmentEvents = pgTable(
	"shipment_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		shipmentId: uuid("shipment_id")
			.notNull()
			.references(() => shipments.id, { onDelete: "cascade" }),
		status: shipmentStatus("status").notNull(),
		message: text("message"),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		providerEventLogId: uuid("provider_event_log_id").references(
			() => providerEventLogs.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("shipment_events_shipment_id_idx").on(table.shipmentId)],
);

export const adminAuditLogs = pgTable(
	"admin_audit_logs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		actorAccountId: uuid("actor_account_id").references(
			() => customerAccounts.id,
			{
				onDelete: "set null",
			},
		),
		action: varchar("action", { length: 160 }).notNull(),
		resourceType: varchar("resource_type", { length: 80 }).notNull(),
		resourceId: uuid("resource_id"),
		previousState: varchar("previous_state", { length: 80 }),
		nextState: varchar("next_state", { length: 80 }),
		note: text("note"),
		providerReferenceId: uuid("provider_reference_id").references(
			() => providerReferences.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("admin_audit_logs_resource_idx").on(
			table.resourceType,
			table.resourceId,
		),
		index("admin_audit_logs_actor_idx").on(table.actorAccountId),
	],
);
