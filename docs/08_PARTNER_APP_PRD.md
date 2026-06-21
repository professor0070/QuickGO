<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 08_PARTNER_APP_PRD.md

**Document Status:** Production MVP Partner App PRD  
**Platform:** Android-first Flutter app; iOS-compatible codebase but no iOS public launch in MVP.  
**Modes:** Vendor Mode + Rider Mode in one Partner App.

---

## 1. Partner App Goal

Partner App must let vendors receive/accept/prepare orders and riders receive/pick/deliver assigned orders. It replaces separate vendor and rider apps for MVP to reduce maintenance.

---

## 2. Partner App Scope

Included:

- OTP login
- Role detection
- Vendor Mode
- Rider Mode
- Push notification
- App update check
- Basic profile
- Logout

Excluded:

- Separate vendor app
- Separate rider app
- Advanced inventory
- Auto-dispatch
- Live map tracking
- Wallet
- Subscription
- Train food

---

## 3. Common Partner Flow

```txt
Open app
↓
Login with OTP
↓
Backend returns role
↓
If vendor: open Vendor Mode
If rider: open Rider Mode
If both: show mode switch
```

---

## 4. Common Screens

### 4.1 Splash/Version Check

- Force update if below minimum version.
- Check auth token.
- Check role.

### 4.2 Login

- Phone number
- OTP

### 4.3 Role Detection

Show only authorized mode.

### 4.4 Profile

Show:

- Name
- Phone
- Role
- Status
- Support contact

### 4.5 Notifications

Partner app must support loud/in-app order alerts.

---

# Part A — Vendor Mode

## 5. Vendor Mode Goal

Vendor Mode must be ultra-simple for busy shopkeepers.

Vendor should be able to:

- Open/close shop
- Receive new order alert
- Accept/reject order
- Mark preparing/packing
- Mark ready for pickup
- Toggle product availability
- Update price for approved products
- See today orders/earnings estimate

---

## 6. Vendor Home Screen

Show:

- Shop Open/Closed toggle
- New Orders count
- Preparing/Packing count
- Ready for Pickup count
- Today Orders
- Today Earnings Estimate

---

## 7. Vendor New Order Screen

Show:

- Order number
- Items
- Quantities
- Customer note if any
- Total item value
- Payment method
- Accept button
- Reject button

New order alert must be visible and audible.

---

## 8. Vendor Order Actions

### 8.1 Accept

Allowed only from `PLACED`.

Result:

- Status becomes `VENDOR_ACCEPTED`.
- Customer notified.
- Admin sees order ready for dispatch planning.

### 8.2 Reject

Required reason:

- Item unavailable
- Shop busy
- Closing soon
- Price issue
- Other

Result:

- Status becomes `VENDOR_REJECTED`.
- Customer notified.
- Order cancelled.

### 8.3 Mark Preparing/Packing

Status: `PREPARING_OR_PACKING`

### 8.4 Mark Ready

Status: `READY_FOR_PICKUP`

---

## 9. Vendor Product Management

MVP product actions:

- View products
- Toggle available/unavailable
- Update price for approved products

No advanced stock management in MVP.

Fresh categories:

- Price updated daily
- Price last updated time visible
- Stale price warning

---

## 10. Vendor Payment/Earnings View

Show estimate only:

- Today orders
- Gross order value
- Commission estimate
- Payable estimate

Final settlement controlled by admin.

---

## 11. Vendor Rules

- Vendor can see only own orders/products.
- Vendor cannot assign rider.
- Vendor cannot mark delivered.
- Vendor cannot change order price after acceptance except substitution/partial fulfilment workflow via admin/support.
- Vendor must maintain compliance.

---

# Part B — Rider Mode

## 12. Rider Mode Goal

Rider Mode must let rider complete assigned deliveries with minimal steps.

Rider should be able to:

- Go online/offline
- See assigned order
- View pickup/drop address
- Call vendor/customer
- Open Google Maps
- Mark picked up
- Mark delivered
- Mark payment collected if applicable
- Report issue

---

## 13. Rider Home Screen

Show:

- Online/Offline toggle
- Assigned orders
- Today deliveries
- Today payout estimate
- Support contact

---

## 14. Rider Assigned Order Detail

Show:

- Order number
- Pickup vendor name/address
- Drop customer address
- Call vendor button
- Call customer button
- Open Google Maps button
- Payment method
- Amount to collect
- Status action button

PII rule:

- Customer phone/address visible only for assigned active order.
- Hide/mask after completion unless needed for support.

---

## 15. Rider Actions

### 15.1 Mark Picked Up

Allowed only when assigned and order ready.

### 15.2 Mark Delivered

Requires delivery confirmation:

- Delivery PIN/OTP if enabled
- Or admin/manual confirmation in MVP

### 15.3 Mark Payment Collected

Fields:

- Payment method: COD / UPI on delivery
- Amount collected
- UPI reference/proof optional
- Note optional

### 15.4 Report Issue

Categories:

- Vendor not ready
- Customer unreachable
- Address issue
- Payment refused
- Item damaged
- Vehicle issue
- Other

---

## 16. Rider Rules

- Rider cannot see unassigned orders.
- Rider cannot self-assign.
- Rider cannot change item prices.
- Rider cannot cancel order directly.
- Rider can report issue; admin resolves.
- Rider must follow payment collection rules.

---

## 17. Partner App Notifications

Vendor:

- New order
- Order cancelled
- Rider assigned/pickup pending

Rider:

- New assignment
- Order cancelled/reassigned
- Payment pending reminder

---

## 18. Partner App Acceptance Criteria

Partner app passes if:

- User logs in with OTP.
- Role detection works.
- Vendor can open/close shop.
- Vendor gets new order alert.
- Vendor can accept/reject.
- Vendor can mark ready.
- Vendor can toggle availability/price.
- Rider can go online/offline.
- Rider sees only assigned orders.
- Rider can mark picked/delivered.
- Rider can record payment collected.
- All sensitive actions update backend and audit/status history.

---

## 19. Final Partner App Lock

Partner App must remain simple. No separate apps, no live tracking, no auto-dispatch, no wallet, no train food, no advanced analytics in MVP.


## 17A. Service Zone and Manual Dispatch Rules

Partner App must follow the same service-zone lock as PRD.md.

- MVP delivery/serviceability radius is approximately 3 km from the admin-defined service center / service zone center.
- Vendors and riders must not override serviceability from the app.
- Riders must only see orders assigned by admin.
- Vendor Mode must not expose auto-dispatch controls.
- Rider Mode must not expose live tracking controls.

## 17B. Future-Ready Guardrail

Partner App is future-ready by keeping role-based architecture clean, but future modules must not be hidden inside MVP.

Do not add:

- Separate Vendor App code path
- Separate Rider App code path
- Train food or railway delivery screens
- PNR, coach, seat, berth, platform, or journey-date fields
- Wallet, subscription, referral, loyalty, dark-store, warehouse, or agri screens
- Auto-dispatch or live tracking modules
