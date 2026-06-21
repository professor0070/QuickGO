<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 03_DATABASE_SCHEMA.md

**Document Status:** Production MVP Database Blueprint  
**Database:** PostgreSQL  
**ORM:** Prisma recommended  
**Architecture:** Modular monolith first; microservices later only after market validation.

---

## 1. Database Principles

QuickGO database must protect the core order loop:

> Customer places order → vendor accepts → admin assigns rider → rider delivers → payment collected → reconciliation completed → support/audit preserved.

Core principles:

- Store immutable order snapshots.
- Use role-based access from day one.
- Keep payment collection and reconciliation separate.
- Keep compliance documents separate from public vendor data.
- Do not store train/railway/PNR fields in MVP.
- Do not support multi-vendor cart in MVP.
- Keep manual dispatch first.
- Add audit logs for sensitive admin actions.
- Design for one city first, multi-city later.

---

## 2. Naming Conventions

- Table names: `snake_case`, plural where natural.
- Primary key: `id UUID PRIMARY KEY`.
- Timestamps: `created_at`, `updated_at`, optional `deleted_at`.
- Soft delete: use `deleted_at` for vendors/products/users where required.
- Status fields: uppercase enum-like strings.
- Money: store in paise as integer where possible: `amount_paise`.
- Coordinates: decimal latitude/longitude.
- JSON snapshots: use `jsonb` for immutable order snapshots.

---

## 3. Core Enums

### 3.1 User Roles

```txt
CUSTOMER
VENDOR_OWNER
VENDOR_STAFF
RIDER
ADMIN
SUPER_ADMIN
SUPPORT
```

### 3.2 Product Categories

```txt
RESTAURANT_FOOD
VEGETABLE
FRUIT
DAIRY
```

MVP rule: do not create `KIRANA`, `LOCAL_SHOP`, train-food, agri, subscription, wallet, or other future-category enum values in the production MVP database. Future categories require a new PRD and migration.

### 3.3 Order Statuses

```txt
PLACED
VENDOR_ACCEPTED
PREPARING_OR_PACKING
READY_FOR_PICKUP
RIDER_ASSIGNED
PICKED_UP
DELIVERED
PAYMENT_COLLECTED
COMPLETED
CUSTOMER_CANCELLED
VENDOR_REJECTED
ADMIN_CANCELLED
RIDER_FAILED
PAYMENT_PENDING
REFUND_PENDING
REFUNDED
```

### 3.4 Payment Methods

```txt
COD
UPI_ON_DELIVERY
```

MVP rule: do not create `ONLINE_GATEWAY`, `WALLET`, prepaid, subscription, or credit payment enum values in the production MVP database. Payment gateway support requires CA/legal review and a future PRD.

### 3.5 Payment Statuses

```txt
NOT_REQUIRED
PENDING
COLLECTED
SHORT_COLLECTED
OVER_COLLECTED
FAILED
REFUND_PENDING
REFUNDED
RECONCILED
DISPUTED
```

### 3.6 Collector Types

```txt
RIDER
VENDOR
QUICKGO_ADMIN
QUICKGO_QR
```

### 3.7 FSSAI Statuses

```txt
FSSAI_PENDING
FSSAI_VERIFIED
FSSAI_EXPIRED
FSSAI_REJECTED
FSSAI_NOT_APPLICABLE_REVIEW_REQUIRED
```

---

## 4. Table Groups

1. Identity and access
2. Customer data
3. Vendor data
4. Rider data
5. Service zones
6. Catalog and pricing
7. Cart and ordering
8. Delivery assignment
9. Payments and reconciliation
10. Settlement/payouts
11. Support and incidents
12. Notifications/devices
13. Compliance/legal documents
14. Audit/security/system tables
15. Reporting/operations

---

## 5. Identity and Access Tables

### 5.1 `users`

Stores all login-capable people.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| phone | varchar(15) | yes | unique, normalized Indian phone |
| name | varchar(120) | no | display name |
| email | varchar(160) | no | optional |
| is_phone_verified | boolean | yes | default false |
| status | varchar(30) | yes | ACTIVE/BLOCKED/DELETED |
| last_login_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |
| deleted_at | timestamptz | no | soft delete |

Indexes:

- unique `phone`
- index `status`

### 5.2 `roles`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| code | varchar(40) | yes | CUSTOMER, VENDOR_OWNER etc. |
| description | text | no |  |

### 5.3 `user_roles`

Allows one user to have multiple roles if needed.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| user_id | uuid | yes | FK users |
| role_id | uuid | yes | FK roles |
| assigned_by | uuid | no | admin user |
| created_at | timestamptz | yes |  |

Unique: `(user_id, role_id)`

### 5.4 `otp_sessions`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| phone | varchar(15) | yes |  |
| otp_hash | text | yes | never store plain OTP |
| purpose | varchar(40) | yes | LOGIN/SIGNUP |
| attempts | int | yes | default 0 |
| max_attempts | int | yes | default 5 |
| expires_at | timestamptz | yes |  |
| verified_at | timestamptz | no |  |
| ip_address | inet | no |  |
| device_id | uuid | no |  |
| created_at | timestamptz | yes |  |

---

## 6. Customer Tables

### 6.1 `customers`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| user_id | uuid | yes | FK users, unique |
| default_address_id | uuid | no | FK addresses |
| status | varchar(30) | yes | ACTIVE/BLOCKED |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

### 6.2 `addresses`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| customer_id | uuid | yes | FK customers |
| label | varchar(40) | no | Home/Work/etc. |
| receiver_name | varchar(120) | yes |  |
| receiver_phone | varchar(15) | yes |  |
| line1 | text | yes | house/street |
| line2 | text | no | landmark |
| city | varchar(80) | yes |  |
| state | varchar(80) | yes | Bihar initially |
| pincode | varchar(10) | no |  |
| latitude | decimal(10,7) | no |  |
| longitude | decimal(10,7) | no |  |
| service_zone_id | uuid | no | FK service_zones |
| is_default | boolean | yes | false |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Rule: store address snapshot into order when order is placed.

---

## 7. Vendor Tables

### 7.1 `vendors`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| owner_user_id | uuid | yes | FK users |
| shop_name | varchar(160) | yes | public |
| legal_name | varchar(160) | no | private/admin |
| phone | varchar(15) | yes | public/support |
| category_primary | varchar(40) | yes | RESTAURANT_FOOD/VEGETABLE/FRUIT/DAIRY |
| address_line | text | yes |  |
| city | varchar(80) | yes |  |
| state | varchar(80) | yes |  |
| latitude | decimal(10,7) | no |  |
| longitude | decimal(10,7) | no |  |
| service_zone_id | uuid | yes | FK |
| is_open | boolean | yes | default false |
| status | varchar(30) | yes | PENDING/ACTIVE/PAUSED/BLOCKED |
| fssai_status | varchar(60) | yes | see enum |
| commission_percentage | decimal(5,2) | yes | current default |
| opening_hours | jsonb | no | simple weekly schedule |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |
| deleted_at | timestamptz | no |  |

### 7.2 `vendor_staff`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| vendor_id | uuid | yes | FK vendors |
| user_id | uuid | yes | FK users |
| role | varchar(40) | yes | OWNER/STAFF |
| status | varchar(30) | yes | ACTIVE/REMOVED |
| created_at | timestamptz | yes |  |

Unique: `(vendor_id, user_id)`

### 7.3 `vendor_compliance_documents`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| vendor_id | uuid | yes | FK vendors |
| document_type | varchar(60) | yes | FSSAI/GST/PAN/etc. |
| document_number | varchar(120) | no |  |
| file_url | text | no | protected/signed URL |
| status | varchar(40) | yes | PENDING/VERIFIED/REJECTED/EXPIRED |
| valid_from | date | no |  |
| valid_until | date | no |  |
| verified_by | uuid | no | FK users admin |
| verified_at | timestamptz | no |  |
| rejection_reason | text | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

---

## 8. Rider Tables

### 8.1 `riders`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| user_id | uuid | yes | FK users unique |
| full_name | varchar(120) | yes |  |
| phone | varchar(15) | yes |  |
| vehicle_type | varchar(40) | no | BIKE/CYCLE/etc. |
| vehicle_number | varchar(30) | no | optional MVP |
| service_zone_id | uuid | yes | FK |
| is_online | boolean | yes | default false |
| status | varchar(30) | yes | PENDING/ACTIVE/PAUSED/BLOCKED |
| payout_upi_id | varchar(120) | no | protected |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

### 8.2 `rider_kyc_documents`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| rider_id | uuid | yes | FK riders |
| document_type | varchar(60) | yes | ID_PROOF/DRIVING_LICENSE/VEHICLE_RC/etc. |
| document_number | varchar(120) | no | masked in UI |
| file_url | text | no | protected |
| status | varchar(40) | yes | PENDING/VERIFIED/REJECTED/EXPIRED |
| verified_by | uuid | no | FK users |
| verified_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |

---

## 9. Service Zone Tables

### 9.1 `service_zones`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| name | varchar(120) | yes | e.g., Jhajha Core |
| city | varchar(80) | yes |  |
| state | varchar(80) | yes |  |
| center_latitude | decimal(10,7) | yes |  |
| center_longitude | decimal(10,7) | yes |  |
| radius_km | decimal(5,2) | yes | approx 3 km MVP |
| is_active | boolean | yes |  |
| operating_hours | jsonb | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Rule: unsupported zones must show “Coming soon in your area”.

---

## 10. Catalog and Pricing Tables

### 10.1 `categories`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| code | varchar(40) | yes | RESTAURANT_FOOD etc. |
| name | varchar(100) | yes | display name |
| sort_order | int | yes |  |
| is_active | boolean | yes |  |

### 10.2 `products`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| vendor_id | uuid | yes | FK vendors |
| category_id | uuid | yes | FK categories |
| name | varchar(160) | yes |  |
| description | text | no |  |
| image_url | text | no |  |
| unit | varchar(30) | yes | plate/kg/litre/packet/piece/bunch |
| product_type | varchar(40) | yes | FOOD/FRESH/PACKAGED_FUTURE |
| is_stock_managed | boolean | yes | false for most restaurant items |
| is_available | boolean | yes |  |
| approval_status | varchar(30) | yes | PENDING/APPROVED/REJECTED |
| created_by | uuid | no | user/admin/vendor |
| approved_by | uuid | no | admin |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |
| deleted_at | timestamptz | no |  |

### 10.3 `product_prices`

Price history and daily fresh pricing.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| product_id | uuid | yes | FK products |
| price_paise | int | yes | selling price |
| mrp_paise | int | no | future packaged goods |
| effective_from | timestamptz | yes |  |
| effective_to | timestamptz | no | null active |
| price_updated_by | uuid | no | vendor/admin |
| created_at | timestamptz | yes |  |

Fresh rule: if price is stale beyond configured time, product should be blocked from order or flagged for confirmation.

---

## 11. Cart Tables

### 11.1 `carts`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| customer_id | uuid | yes | FK customers |
| vendor_id | uuid | yes | Single-vendor cart only |
| status | varchar(30) | yes | ACTIVE/ORDERED/ABANDONED |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Unique active cart per customer.

### 11.2 `cart_items`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| cart_id | uuid | yes | FK carts |
| product_id | uuid | yes | FK products |
| quantity | decimal(10,3) | yes | supports kg/litre/units |
| unit | varchar(30) | yes | snapshot-like cart unit |
| price_paise_at_add | int | yes | preview only; final snapshot on order |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

---

## 12. Order Tables

### 12.1 `orders`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| order_number | varchar(30) | yes | unique human-readable |
| customer_id | uuid | yes | FK customers |
| vendor_id | uuid | yes | FK vendors |
| rider_id | uuid | no | assigned later |
| service_zone_id | uuid | yes | FK |
| status | varchar(40) | yes | order status enum |
| payment_method | varchar(40) | yes | COD/UPI_ON_DELIVERY |
| payment_status | varchar(40) | yes | see payment enum |
| subtotal_paise | int | yes | item total |
| delivery_fee_paise | int | yes | snapshot |
| platform_fee_paise | int | yes | default 0 |
| discount_paise | int | yes | default 0 |
| total_paise | int | yes |  |
| commission_percentage_snapshot | decimal(5,2) | yes |  |
| commission_amount_paise | int | yes |  |
| customer_snapshot | jsonb | yes | immutable |
| vendor_snapshot | jsonb | yes | immutable |
| delivery_address_snapshot | jsonb | yes | immutable |
| payment_snapshot | jsonb | yes | immutable summary |
| cancellation_reason | text | no |  |
| accepted_at | timestamptz | no |  |
| ready_at | timestamptz | no |  |
| assigned_at | timestamptz | no |  |
| picked_at | timestamptz | no |  |
| delivered_at | timestamptz | no |  |
| completed_at | timestamptz | no |  |
| cancelled_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Indexes:

- `order_number` unique
- `(customer_id, created_at)`
- `(vendor_id, status)`
- `(rider_id, status)`
- `(service_zone_id, created_at)`
- `(status, created_at)`

### 12.2 `order_items`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| order_id | uuid | yes | FK orders |
| product_id | uuid | yes | FK products |
| product_name_snapshot | varchar(160) | yes | immutable |
| product_unit_snapshot | varchar(30) | yes | immutable |
| unit_price_paise_snapshot | int | yes | immutable |
| ordered_quantity | decimal(10,3) | yes | requested |
| fulfilled_quantity | decimal(10,3) | no | final for fresh items |
| item_total_paise | int | yes | based on ordered/final rule |
| substitution_status | varchar(40) | no | NONE/PENDING/APPROVED/REJECTED |
| substitution_note | text | no |  |
| created_at | timestamptz | yes |  |

### 12.3 `order_status_history`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| order_id | uuid | yes | FK orders |
| from_status | varchar(40) | no |  |
| to_status | varchar(40) | yes |  |
| changed_by_user_id | uuid | no | customer/vendor/rider/admin/system |
| changed_by_role | varchar(40) | yes |  |
| reason | text | no |  |
| metadata | jsonb | no |  |
| created_at | timestamptz | yes |  |

---

## 13. Delivery Assignment Tables

### 13.1 `delivery_assignments`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| order_id | uuid | yes | FK orders |
| rider_id | uuid | yes | FK riders |
| assigned_by_admin_id | uuid | yes | FK users |
| status | varchar(40) | yes | ASSIGNED/ACCEPTED/PICKED/DELIVERED/FAILED/CANCELLED |
| pickup_address_snapshot | jsonb | yes | vendor snapshot |
| drop_address_snapshot | jsonb | yes | customer address snapshot |
| assigned_at | timestamptz | yes |  |
| picked_at | timestamptz | no |  |
| delivered_at | timestamptz | no |  |
| failure_reason | text | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

### 13.2 `delivery_proofs`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| order_id | uuid | yes | FK orders |
| rider_id | uuid | yes | FK riders |
| proof_type | varchar(40) | yes | OTP/PIN/PHOTO/SIGNATURE optional |
| proof_value_hash | text | no | PIN hash if used |
| photo_url | text | no | optional |
| collected_amount_paise | int | no |  |
| note | text | no |  |
| created_at | timestamptz | yes |  |

---

## 14. Payment and Reconciliation Tables

### 14.1 `payments`

Payment intent/summary per order.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| order_id | uuid | yes | FK orders unique |
| payment_method | varchar(40) | yes | COD/UPI_ON_DELIVERY |
| payment_status | varchar(40) | yes |  |
| amount_due_paise | int | yes |  |
| amount_collected_paise | int | yes | default 0 |
| amount_short_paise | int | yes | default 0 |
| amount_over_paise | int | yes | default 0 |
| reconciled_at | timestamptz | no |  |
| reconciled_by | uuid | no | admin |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

### 14.2 `payment_collections`

Actual collection events.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| order_id | uuid | yes | FK orders |
| payment_id | uuid | yes | FK payments |
| collector_type | varchar(40) | yes | RIDER/VENDOR/QUICKGO_ADMIN/QUICKGO_QR |
| collector_id | uuid | no | user/rider/vendor/admin depending type |
| amount_collected_paise | int | yes |  |
| payment_method | varchar(40) | yes | COD/UPI_ON_DELIVERY |
| reference_number | varchar(120) | no | UPI ref optional |
| proof_url | text | no | screenshot optional |
| status | varchar(40) | yes | PENDING/CONFIRMED/DISPUTED/REVERSED |
| confirmed_by_admin_id | uuid | no |  |
| confirmed_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |

Rule: No order becomes `COMPLETED` until payment is reconciled or admin explicitly marks exception.

---

## 15. Settlement and Payout Tables

### 15.1 `commissions`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| vendor_id | uuid | yes | FK vendors |
| category_code | varchar(40) | no | optional category-based |
| commission_percentage | decimal(5,2) | yes |  |
| effective_from | timestamptz | yes |  |
| effective_to | timestamptz | no |  |
| approved_by | uuid | yes | admin |
| created_at | timestamptz | yes |  |

### 15.2 `settlements`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| settlement_type | varchar(40) | yes | VENDOR/RIDER |
| party_id | uuid | yes | vendor_id or rider_id |
| period_start | date | yes |  |
| period_end | date | yes |  |
| gross_amount_paise | int | yes |  |
| deductions_paise | int | yes |  |
| payable_amount_paise | int | yes |  |
| status | varchar(40) | yes | DRAFT/APPROVED/PAID/DISPUTED |
| approved_by | uuid | no |  |
| paid_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |

### 15.3 `vendor_payouts`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| vendor_id | uuid | yes | FK vendors |
| settlement_id | uuid | no | FK settlements |
| amount_paise | int | yes |  |
| status | varchar(40) | yes | PENDING/PAID/FAILED/DISPUTED |
| reference_number | varchar(120) | no |  |
| paid_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |

### 15.4 `rider_payouts`

Similar to vendor payouts.

---

## 16. Support and Incident Tables

### 16.1 `support_tickets`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| ticket_number | varchar(30) | yes | unique |
| order_id | uuid | no | FK orders |
| raised_by_user_id | uuid | yes | FK users |
| category | varchar(60) | yes | LATE_DELIVERY etc. |
| priority | varchar(20) | yes | LOW/MEDIUM/HIGH/CRITICAL |
| status | varchar(40) | yes | OPEN/IN_PROGRESS/RESOLVED/CLOSED |
| description | text | yes |  |
| resolution_note | text | no |  |
| assigned_to_admin_id | uuid | no |  |
| acknowledged_at | timestamptz | no |  |
| resolved_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

### 16.2 `support_ticket_events`

Stores ticket history.

### 16.3 `incident_reports`

For serious incidents: food safety, fraud, payment dispute, system outage, rider/customer safety.

---

## 17. Notification and Device Tables

### 17.1 `notifications`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| user_id | uuid | yes | receiver |
| channel | varchar(30) | yes | PUSH/SMS/WHATSAPP_FUTURE/IN_APP |
| type | varchar(60) | yes | ORDER_PLACED etc. |
| title | varchar(160) | yes |  |
| body | text | yes |  |
| payload | jsonb | no |  |
| status | varchar(40) | yes | PENDING/SENT/FAILED/READ |
| sent_at | timestamptz | no |  |
| read_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |

### 17.2 `customer_devices`, `rider_devices`, `device_sessions`

Store FCM tokens, app version, OS, device model, last active time.

---

## 18. Compliance, Privacy, Audit Tables

### 18.1 `legal_documents`

Stores versions of Terms, Privacy Policy, Refund Policy, Vendor Policy, Rider Policy.

### 18.2 `consent_records`

Tracks user acceptance of policies.

### 18.3 `privacy_requests`

Tracks correction/deletion/data requests.

### 18.4 `audit_logs`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| actor_user_id | uuid | no | user/admin/system |
| actor_role | varchar(40) | yes |  |
| action | varchar(120) | yes | e.g., VENDOR_PAUSED |
| entity_type | varchar(80) | yes | orders/vendors/payments |
| entity_id | uuid | no |  |
| old_value | jsonb | no |  |
| new_value | jsonb | no |  |
| ip_address | inet | no |  |
| user_agent | text | no |  |
| created_at | timestamptz | yes |  |

Audit required for:

- vendor approval/pause
- rider approval/pause
- product approval
- order cancellation
- payment reconciliation
- payout approval
- compliance document verification
- admin role change

---

## 19. System/Operations Tables

### 19.1 `app_versions`

Tracks minimum supported app versions.

### 19.2 `feature_flags`

MVP-safe operational flags only:

- `ORDER_CREATION_ENABLED`
- `COD_ON_DELIVERY_ENABLED`
- `UPI_ON_DELIVERY_ENABLED`
- `CUSTOMER_APP_FORCE_UPDATE`
- `PARTNER_APP_FORCE_UPDATE`
- `SUPPORT_INTAKE_ENABLED`
- `SERVICE_ZONE_LOCK_ENABLED`
- `MAINTENANCE_MODE`

Do not create feature flags for blocked future modules in MVP. No train-food, PNR, auto-dispatch, live-tracking, online-payment, wallet, subscription, referral, kirana, agri, warehouse, dark-store, or QuickGO Delivery OS flags should exist in MVP code or database.

### 19.3 `daily_closing_reports`

End-of-day operational report.

### 19.4 `release_notes`

Tracks app/backend/admin release versions.

### 19.5 `sla_events`

Records important SLA events: vendor response time, rider assignment time, delivery time, support acknowledgement, support resolution.

### 19.6 `idempotency_keys`

Prevents duplicate orders/payment confirmations.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| key | varchar(120) | yes | unique |
| user_id | uuid | no |  |
| endpoint | varchar(160) | yes |  |
| request_hash | text | yes |  |
| response_body | jsonb | no |  |
| status | varchar(40) | yes | PROCESSING/SUCCEEDED/FAILED |
| expires_at | timestamptz | yes |  |
| created_at | timestamptz | yes |  |

---

## 20. Core Relationships

- User has many roles.
- Customer belongs to user.
- Vendor belongs to owner user.
- Vendor has many products.
- Product has price history.
- Customer has many addresses.
- Customer has one active single-vendor cart.
- Order belongs to customer and vendor.
- Order may have one rider after assignment.
- Order has many order items.
- Order has one payment summary and many collection events.
- Order has many status history events.
- Vendor/rider payouts are derived from completed/reconciled orders.
- Support tickets may link to order.
- Audit logs link to sensitive actions.

---

## 21. Required Indexes

Minimum production indexes:

```sql
CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX idx_orders_vendor_status ON orders(vendor_id, status);
CREATE INDEX idx_orders_rider_status ON orders(rider_id, status);
CREATE INDEX idx_orders_zone_created ON orders(service_zone_id, created_at DESC);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id, created_at);
CREATE INDEX idx_products_vendor_available ON products(vendor_id, is_available, approval_status);
CREATE INDEX idx_payment_collections_order ON payment_collections(order_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status, priority);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, created_at DESC);
```

---

## 22. Snapshot Rules

Never compute old orders from current vendor/product/customer data.

Snapshot on order creation:

- customer name and phone
- delivery address
- vendor name, phone, address
- product name, unit, price
- delivery fee
- platform fee
- commission percentage
- payment method
- service zone

Snapshot on delivery assignment:

- pickup address
- drop address
- rider assignment metadata

Snapshot on payment collection:

- collector type
- collector identity
- amount collected
- method and proof

---

## 23. Data Retention Guidance

To be finalized by lawyer/CA:

- Order/tax/payment records: retain per tax/accounting requirements.
- KYC/compliance documents: retain while partner active and as legally required.
- Support tickets: retain for operational/legal period.
- Device/session logs: rotate after defined security period.
- Deleted customers: anonymize where legally possible but preserve required transaction records.

---

## 24. Migration Strategy

1. Create base auth and roles.
2. Create service zones.
3. Create vendors/riders/customers.
4. Create catalog/pricing.
5. Create cart/order/payment/delivery tables.
6. Create support/audit/compliance tables.
7. Add indexes.
8. Add seed data.
9. Add feature flags with blocked features disabled.

---

## 25. Seed Data

Minimum seed:

- Roles
- One super admin
- One service zone
- Categories: Restaurant Food, Vegetables, Fruits, Dairy
- Feature flags all future features disabled
- Legal document placeholders
- Order status enum configuration if stored

---

## 26. Final Database Lock

This schema is MVP-ready. Do not add railway/train, agri, subscription, wallet, live tracking, auto-dispatch, or kirana-heavy tables until a future PRD is approved.
