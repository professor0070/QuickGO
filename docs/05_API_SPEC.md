<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 05_API_SPEC.md

**Document Status:** Production MVP API Specification  
**API Style:** REST JSON  
**Backend:** NestJS / Node.js  
**Authentication:** OTP login + bearer token  
**Authorization:** RBAC

---

## 1. API Principles

- Every endpoint must validate user role.
- Every mutation must validate request body.
- Order creation and critical updates must use idempotency keys.
- Customer can access only own data.
- Vendor can access only own vendor data.
- Rider can access only assigned orders.
- Admin can control operations with audit logs.
- No railway/train food APIs in MVP.
- No auto-dispatch APIs in MVP.
- No online payment gateway APIs in MVP unless later approved.

---

## 2. Base URLs

```txt
Local:   http://localhost:3000/api/v1
Staging: https://staging-api.quickgo.example/api/v1
Prod:    https://api.quickgo.example/api/v1
```

---

## 3. Common Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
X-Request-Id: <uuid>
Idempotency-Key: <uuid>   # required for critical mutations
```

Critical mutations requiring idempotency:

- Create order
- Cancel order
- Accept/reject order
- Assign rider
- Mark delivered
- Mark payment collected
- Reconcile payment
- Approve payouts

---

## 4. Common Response Format

### Success

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

---

## 5. Common Error Codes

```txt
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
NOT_FOUND
SERVICE_ZONE_UNAVAILABLE
VENDOR_CLOSED
PRODUCT_UNAVAILABLE
PRICE_STALE
ORDER_STATE_INVALID
PAYMENT_RECONCILIATION_REQUIRED
DUPLICATE_REQUEST
RATE_LIMITED
INTERNAL_ERROR
```

---

## 6. Auth APIs

### 6.1 Send OTP

`POST /auth/send-otp`

Role: Public

```json
{
  "phone": "9876543210",
  "purpose": "LOGIN"
}
```

Response:

```json
{
  "success": true,
  "message": "OTP sent if phone is valid."
}
```

### 6.2 Verify OTP

`POST /auth/verify-otp`

```json
{
  "phone": "9876543210",
  "otp": "123456",
  "device": {
    "platform": "ANDROID",
    "app_version": "1.0.0",
    "fcm_token": "token"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "user": {
      "id": "uuid",
      "phone": "9876543210",
      "roles": ["CUSTOMER"]
    }
  }
}
```

### 6.3 Me

`GET /auth/me`

Returns user profile, roles, and partner mode eligibility.

---

## 7. Customer APIs

### 7.1 Get Customer Profile

`GET /customer/profile`

Role: CUSTOMER

### 7.2 Update Customer Profile

`PATCH /customer/profile`

```json
{
  "name": "Ashok Kumar"
}
```

### 7.3 Add Address

`POST /customer/addresses`

```json
{
  "receiver_name": "Ashok Kumar",
  "receiver_phone": "9876543210",
  "line1": "House no / street",
  "line2": "Near landmark",
  "city": "Jhajha",
  "state": "Bihar",
  "pincode": "811308",
  "latitude": 24.775,
  "longitude": 86.38
}
```

### 7.4 List Addresses

`GET /customer/addresses`


### 7.5A Service Center Radius Rule

All serviceability APIs must enforce the PRD lock:

- The MVP delivery/serviceability radius is approximately 3 km from the admin-defined service center / service zone center.
- If the customer address is outside this service center radius, the API must return `SERVICE_ZONE_UNAVAILABLE`.
- Service center coordinates must be admin-managed, not hardcoded in the app.

### 7.5 Check Serviceability

`POST /customer/serviceability`

```json
{
  "latitude": 24.775,
  "longitude": 86.38,
  "city": "Jhajha"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "serviceable": true,
    "service_zone_id": "uuid",
    "message": "Service available"
  }
}
```

---

## 8. Catalog APIs

### 8.1 List Categories

`GET /catalog/categories`

Role: Public/Customer

### 8.2 List Vendors

`GET /catalog/vendors?category=VEGETABLES&service_zone_id=uuid&page=1&limit=20`

Role: Customer

Rules:

- Only active vendors
- Only serviceable zone
- Only compliance-approved where applicable

### 8.3 Vendor Detail

`GET /catalog/vendors/:vendorId`

### 8.4 List Products

`GET /catalog/products?vendor_id=uuid&category_id=uuid&page=1&limit=50`

Product response includes:

```json
{
  "id": "uuid",
  "name": "Tamatar",
  "unit": "kg",
  "price_paise": 4000,
  "is_available": true,
  "price_last_updated_at": "2026-06-18T08:30:00+05:30",
  "is_price_stale": false
}
```

---

## 9. Cart APIs

### 9.1 Get Active Cart

`GET /cart`

### 9.2 Add Item

`POST /cart/items`

```json
{
  "vendor_id": "uuid",
  "product_id": "uuid",
  "quantity": 1
}
```

Rules:

- Single-vendor cart only.
- If vendor differs from active cart, return error or require cart reset.

### 9.3 Update Item Quantity

`PATCH /cart/items/:cartItemId`

```json
{
  "quantity": 2
}
```

### 9.4 Clear Cart

`DELETE /cart`

---

## 10. Order APIs — Customer

### 10.1 Create Order

`POST /orders`

Role: CUSTOMER  
Idempotency-Key required.

```json
{
  "cart_id": "uuid",
  "address_id": "uuid",
  "payment_method": "COD",
  "customer_note": "Call before delivery"
}
```

Validations:

- Customer address serviceable
- Vendor active/open
- Vendor compliance OK
- Product available
- Price not stale
- Cart has one vendor only
- No blocked category

Response:

```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "QG100001",
    "status": "PLACED",
    "total_paise": 25000
  }
}
```

### 10.2 List My Orders

`GET /orders?page=1&limit=20`

### 10.3 Get Order Detail

`GET /orders/:orderId`

### 10.4 Cancel Order

`POST /orders/:orderId/cancel`

Role: CUSTOMER  
Allowed only before vendor accepts.

```json
{
  "reason": "Ordered by mistake"
}
```

---

## 11. Vendor Mode APIs

### 11.1 Vendor Dashboard

`GET /vendor/dashboard`

Role: VENDOR_OWNER/VENDOR_STAFF

Returns:

- shop status
- pending orders
- preparing orders
- ready orders
- today orders
- earnings estimate

### 11.2 Toggle Shop Status

`PATCH /vendor/shop-status`

```json
{
  "is_open": true
}
```

### 11.3 List Vendor Orders

`GET /vendor/orders?status=PLACED&page=1&limit=20`

### 11.4 Accept Order

`POST /vendor/orders/:orderId/accept`

Idempotency-Key required.

### 11.5 Reject Order

`POST /vendor/orders/:orderId/reject`

```json
{
  "reason": "Item not available"
}
```

### 11.6 Mark Preparing/Packing

`POST /vendor/orders/:orderId/preparing`

### 11.7 Mark Ready For Pickup

`POST /vendor/orders/:orderId/ready`

### 11.8 List Vendor Products

`GET /vendor/products`

### 11.9 Toggle Product Availability

`PATCH /vendor/products/:productId/availability`

```json
{
  "is_available": false
}
```

### 11.10 Update Product Price

`PATCH /vendor/products/:productId/price`

```json
{
  "price_paise": 4000,
  "reason": "Daily fresh price update"
}
```

Rule: price update creates new `product_prices` record.

---

## 12. Rider Mode APIs

### 12.1 Rider Dashboard

`GET /rider/dashboard`

### 12.2 Toggle Online Status

`PATCH /rider/online-status`

```json
{
  "is_online": true
}
```

### 12.3 List Assigned Orders

`GET /rider/orders?status=RIDER_ASSIGNED`

### 12.4 Get Assigned Order Detail

`GET /rider/orders/:orderId`

Rules:

- Rider can access only assigned order.

### 12.5 Mark Picked Up

`POST /rider/orders/:orderId/picked-up`

### 12.6 Mark Delivered

`POST /rider/orders/:orderId/delivered`

```json
{
  "delivery_pin": "1234",
  "note": "Delivered to customer"
}
```

### 12.7 Mark Payment Collected

`POST /rider/orders/:orderId/payment-collected`

```json
{
  "payment_method": "COD",
  "amount_collected_paise": 25000,
  "reference_number": null,
  "note": "Cash collected"
}
```

### 12.8 Report Issue

`POST /rider/issues`

```json
{
  "category": "CUSTOMER_UNREACHABLE",
  "description": "Customer phone not reachable"
}
```

---

## 13. Admin APIs

### 13.1 Admin Dashboard

`GET /admin/dashboard`

Returns:

- today orders
- pending orders
- stuck orders
- active vendors
- online riders
- payment pending
- support open
- validation metrics

### 13.2 Vendor Management

```txt
GET    /admin/vendors
POST   /admin/vendors
GET    /admin/vendors/:vendorId
PATCH  /admin/vendors/:vendorId
POST   /admin/vendors/:vendorId/approve
POST   /admin/vendors/:vendorId/pause
POST   /admin/vendors/:vendorId/activate
```

### 13.3 Product Management

```txt
GET    /admin/products
POST   /admin/vendors/:vendorId/products
PATCH  /admin/products/:productId
POST   /admin/products/:productId/approve
POST   /admin/products/:productId/reject
```

### 13.4 Rider Management

```txt
GET    /admin/riders
POST   /admin/riders
GET    /admin/riders/:riderId
PATCH  /admin/riders/:riderId
POST   /admin/riders/:riderId/approve
POST   /admin/riders/:riderId/pause
```

### 13.5 Order Operations

```txt
GET    /admin/orders
GET    /admin/orders/:orderId
POST   /admin/orders/:orderId/assign-rider
POST   /admin/orders/:orderId/cancel
POST   /admin/orders/:orderId/force-status-change
```

Assign rider body:

```json
{
  "rider_id": "uuid",
  "note": "Assigned manually by admin"
}
```

### 13.6 Payment Reconciliation

```txt
GET    /admin/payments/pending
GET    /admin/orders/:orderId/payments
POST   /admin/orders/:orderId/reconcile-payment
```

Reconcile body:

```json
{
  "status": "VERIFIED",
  "amount_collected": 250,
  "reason": "Cash received from rider and verified"
}
```

### 13.7 Settlement/Payout APIs

```txt
GET    /admin/payouts
POST   /admin/payouts/:payoutId/approve
```

### 13.8 Support APIs

```txt
GET    /admin/support-tickets
PATCH  /admin/support-tickets/:ticketId
POST   /admin/support/tickets/:ticketId/events
```

### 13.9 Compliance APIs

```txt
GET    /admin/compliance/vendors
POST   /admin/vendors/:vendorId/compliance-documents
PATCH  /admin/compliance-documents/:documentId/verify
PATCH  /admin/compliance-documents/:documentId/reject
```

### 13.10 Reports APIs

```txt
GET /admin/reports/validation-dashboard
GET /admin/reports/daily-closing?date=YYYY-MM-DD
GET /admin/reports/orders/export
GET /admin/reports/payments/export
```

---

## 14. System APIs

### 14.1 App Version Check

`GET /system/version?app=CUSTOMER_ANDROID&version=1.0.0`

Response:

```json
{
  "force_update": false,
  "recommended_update": false,
  "message": "App is up to date"
}
```

### 14.2 Feature Flags

`GET /system/feature-flags`

Must return blocked flags false.

---

## 15. Webhook APIs

No external payment gateway webhook in MVP.

Internal event endpoints only if needed:

- Notification send retry
- Daily closing report generation

---

## 16. Pagination Format

Query:

```txt
?page=1&limit=20&sort=created_at_desc
```

Response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "has_next": true
  }
}
```

---

## 17. Audit Requirements

Admin mutations must create audit logs:

- vendor approve/pause
- rider approve/pause
- product approve/reject
- order cancel
- rider assignment
- payment reconciliation
- payout marked paid
- compliance document verification
- role change

---

## 18. Blocked API Routes

Do not create:

```txt
/train-food/*
/railway/*
/pnr/*
/auto-dispatch/*
/live-tracking/*
/wallet/*
/subscription/*
/referral/*
/agri-exchange/*
```

---

## 19. Final API Lock

This API spec supports only the locked QuickGO production MVP. Any endpoint outside this file needs a change request and must be checked against PRD lock rules.


## 23A. Legal Documents and Privacy APIs

These APIs support DPDP/privacy readiness, legal document display, consent records, and user privacy requests.

### 23A.1 Get Active Legal Documents

`GET /legal-documents`

Returns active Terms, Privacy Policy, Refund/Cancellation Policy, Delivery Policy, Vendor Policy, Rider Policy, and Grievance Contact.

### 23A.2 Accept Legal Document

`POST /legal-documents/:id/accept`

Creates a consent record for the authenticated user.

### 23A.3 Create Privacy Request

`POST /privacy-requests`

Allowed request types:

- DATA_CORRECTION
- DATA_DELETION
- CONSENT_WITHDRAWAL
- ACCOUNT_SUPPORT
- GRIEVANCE

### 23A.4 Admin List Privacy Requests

`GET /admin/privacy-requests`

Admin/SUPPORT only.

### 23A.5 Admin Update Privacy Request

`PATCH /admin/privacy-requests/:id`

Admin/SUPPORT only. Every update must create an audit log.
