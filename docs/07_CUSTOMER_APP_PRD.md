<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 07_CUSTOMER_APP_PRD.md

**Document Status:** Production MVP Customer App PRD  
**Platform:** Android-first Flutter app; iOS-compatible codebase but no iOS public launch in MVP.

---

## 1. Customer App Goal

Customer App must let a local customer in a serviceable zone order restaurant food, vegetables, fruits, and dairy from nearby vendors, pay COD/UPI on delivery, track order status, and raise support issues.

It must be simple, fast, and usable on low-end Android phones.

---

## 2. Customer App Scope

Included:

- OTP login
- Profile
- Address management
- Serviceability check
- Category browsing
- Vendor listing
- Product listing
- Single-vendor cart
- COD/UPI on delivery
- Order placement
- Order status
- Cancel before vendor acceptance
- Support issue creation
- App update check
- Push notifications

Excluded:

- Online payment gateway
- Wallet
- Subscription
- Referral
- Loyalty
- Live rider map
- Multi-vendor cart
- Train food/PNR/waitlist
- Kirana full catalog
- iOS public launch

---

## 3. Customer App Navigation

Recommended tabs:

1. Home
2. Orders
3. Support
4. Profile

Home includes categories:

- Restaurant Food
- Vegetables
- Fruits
- Dairy

---

## 4. Screen Requirements

### 4.1 Splash Screen

Checks:

- App version
- Maintenance mode
- Auth token

States:

- Continue to login
- Continue to home
- Force update
- Maintenance message

### 4.2 Login Screen

Fields:

- Phone number
- OTP

Rules:

- Validate Indian mobile number.
- OTP retry limit.
- Show privacy/terms acceptance.

### 4.3 Address Screen

Customer can:

- Add address
- Edit address
- Set default address
- Use current location if permission granted

Fields:

- Receiver name
- Receiver phone
- Address line
- Landmark
- City
- State
- Pincode optional
- Location pin optional


### 4.4A Service Center Radius Rule

Customer app must treat serviceability as a backend-controlled decision.

- MVP delivery/serviceability radius is approximately 3 km from the admin-defined service center / service zone center.
- Customer app must not hardcode the radius.
- Customer app must show `Coming soon in your area` when the backend returns `SERVICE_ZONE_UNAVAILABLE`.

### 4.4 Serviceability Result

If inside zone:

- Show categories/vendors.

If outside zone:

- Show “Coming soon in your area”.
- Do not allow order.

### 4.5 Home Screen

Show:

- Selected address
- Service status
- Categories
- Top local vendors
- Support shortcut

Do not show Train Food card.

### 4.6 Vendor List Screen

Show:

- Vendor name
- Category
- Open/closed status
- Approx delivery range if available
- FSSAI number where applicable
- Minimum order if configured

Filters:

- Category
- Open now

### 4.7 Product List Screen

Show:

- Product image
- Name
- Unit
- Price
- Available status
- Price last updated time for fresh items

Fresh item warning:

> Final weight may slightly vary. Final fulfilled quantity will be confirmed during packing/delivery.

### 4.8 Cart Screen

Rules:

- Single vendor only.
- Show item price, quantity, unit, subtotal.
- Show delivery fee.
- Show final total.
- Show payment methods: COD/UPI on delivery.
- If price stale, block checkout or require refresh.

### 4.9 Order Confirmation Screen

Show:

- Vendor
- Items
- Address
- Payment method
- Total
- Cancellation rule

Button:

- Place Order

### 4.10 Order Status Screen

Show lifecycle:

- Placed
- Accepted
- Preparing/Packing
- Ready for pickup
- Rider assigned
- Picked up
- Delivered
- Payment collected
- Completed

Show:

- Order number
- Items snapshot
- Vendor info
- Support button

### 4.11 Cancel Order

Allowed only before vendor acceptance.

Customer selects reason:

- Ordered by mistake
- Delivery taking too long
- Wrong address
- Other

### 4.12 Support Screen

Customer can create ticket:

- Late delivery
- Wrong item
- Missing item
- Bad quality
- Price mismatch
- Payment issue
- Other

Attach photo optional in future; MVP can be text + call/WhatsApp.

---

## 5. Push Notifications

Customer receives:

- Order placed confirmation
- Vendor accepted
- Vendor rejected
- Rider assigned
- Picked up
- Delivered
- Payment pending/collected
- Support update

---

## 6. Customer Permissions

Required:

- Notification permission
- Location permission optional for address pin

Do not request:

- Contact list
- SMS read
- Background location
- Microphone
- Camera unless later needed for support image upload

---

## 7. Slow Network Rules

- Show skeleton loaders.
- Show retry buttons.
- Do not silently create offline order.
- If order creation fails, show clear failure.
- Prevent duplicate checkout taps.
- Use idempotency key for order placement.

---

## 8. Error States

Required messages:

- Vendor closed
- Product unavailable
- Price changed; refresh cart
- Outside service area
- Payment method unavailable
- Order cannot be cancelled now
- Network error; retry
- Something went wrong; contact support

---

## 9. Customer Acceptance Criteria

App passes if:

- Customer can login with OTP.
- Customer can add address.
- Customer outside zone is blocked.
- Customer can browse categories/vendors/products.
- Customer can add items to single-vendor cart.
- Customer can place COD/UPI on delivery order.
- Customer can track status.
- Customer can cancel before vendor accepts.
- Customer can create support ticket.
- Customer cannot see blocked/future modules.

---

## 10. Final Customer App Lock

Customer App must be lightweight. Do not add train food, live tracking, subscription, wallet, referral, or multi-vendor cart in MVP.
