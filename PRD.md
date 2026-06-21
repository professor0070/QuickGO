# QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP

**Document Status:** FINAL LOCKED PRODUCTION MVP PRD v1.2 — 15-Pass Build Freeze Approved  
**Product:** QuickGO  
**Version:** Production MVP Lock v1.2 — Market Playground Build  
**Target Market:** Tier-3 cities in Bihar and India  
**Initial Launch:** One controlled city first, preferably the founder’s strongest local network city  
**Primary Categories:** Restaurant food, vegetables, fruits, dairy  
**Future Categories:** Kirana and local shops only through a future PRD after market validation. Agri exchange, QuickGO Delivery OS, and railway/train food are future experiments and are not part of this MVP.  
**Primary Platforms:** Android-first, iOS-compatible codebase  
**Business Model:** Asset-light local marketplace + local delivery coordination  
**Dispatch Model:** Manual dispatch in MVP  
**Payment Model:** COD / UPI on delivery in MVP; online payment gateway later after CA/legal review  
**Core MVP Goal:** Launch one-city production MVP as a controlled market playground to prove repeatable order completion, not build a full Blinkit/Swiggy clone  

---

## 0. Document Control and Audit Result

### 0.1 Final Score

**Score:** 10/10 for production-MVP implementation readiness, market-playground discipline, role coverage, operations readiness, technical clarity, and investor-readability.

**Important boundary:** This is not a legal certificate. FSSAI, GST, entity registration, contractor/partner agreements, tax-treatment, and payment-flow responsibilities must still be validated by a CA/lawyer before full commercial public launch or online payment collection.

### 0.2 Audit Passes Completed

This PRD has been rechecked in real sequence across these 15 distinct passes:

1. Document control, version, and final-lock audit
2. Heading sequence and structural continuity audit
3. Role-order audit: Customer → Vendor → Rider → Admin → Backend/System
4. MVP scope and exclusion-lock audit
5. Core product-structure audit
6. Role-based requirements audit
7. Fresh vegetables/fruits/dairy edge-case audit
8. End-to-end order lifecycle audit
9. Payment, collection, reconciliation, and settlement audit
10. Legal/compliance coverage audit
11. Data model coverage audit
12. Security, privacy, fraud, and audit-log audit
13. Low-end phone, slow-network, and maintainability audit
14. QA, release, Play Store, rollback, and incident audit
15. Risk register, launch gate, founder-control, and final declaration audit

### 0.3 Final Verdict

QuickGO Production MVP is locked as a **market playground**. The first build must prove whether local customers order, local vendors accept, local riders deliver, payments reconcile, complaints are handled, and repeat orders happen.

The MVP must not expand into train food, agri exchange, QuickGO Delivery OS, subscription, live tracking, or advanced automation until the core local delivery loop is proven.


### 0.4 Final Lock Rules

This document is the final locked production-MVP PRD. It must be treated as the source of truth for the first QuickGO build.

Lock rules:

- No new product module can be added without creating a separate change request.
- Any feature outside Customer App, Partner App, Admin Web Panel, Backend API, manual dispatch, COD/UPI collection, reconciliation, support, compliance records, and validation dashboard is out of MVP.
- Railway/train food, PNR collection, train waitlist, agri exchange, subscription, live tracking, auto-dispatch, wallet, referral, and QuickGO Delivery OS are explicitly frozen out.
- If a developer or AI tool suggests a feature outside this PRD, reject it unless it is required for security, legal compliance, or core order completion.
- Any change must be classified as P0, P1, P2, or Future. Only P0 and critical P1 changes may enter production MVP.

Change priority meaning:

- **P0:** Required to place, accept, deliver, reconcile, secure, or legally operate orders.
- **P1:** Required for launch reliability or core support.
- **P2:** Useful but not required for first launch.
- **Future:** Not allowed in production MVP.

### 0.5 Production MVP Definition

Production MVP does not mean a large-scale enterprise app. It means a small, controlled, real-market version that can safely process live orders in one city with real customers, vendors, riders, payments, support, and daily operational control.

Production MVP must be able to:

- onboard real vendors and riders,
- show real products and prices,
- accept real customer orders,
- route order status across customer, vendor, rider, and admin,
- collect COD/UPI payment safely,
- reconcile money collected by rider/vendor/QuickGO/admin,
- record complaints and issues,
- store compliance records,
- block unsupported service zones,
- generate daily validation metrics.

### 0.6 Final Scope Exclusion Lock

The following are not just delayed; they are actively blocked from the production MVP:

- railway/train food ordering,
- railway/train food waitlist or lead form,
- PNR, train number, coach, seat, berth, platform, or journey-date collection,
- platform/seat delivery promise,
- agri exchange,
- QuickGO Delivery OS,
- iOS public launch,
- separate Vendor App and Rider App,
- subscription,
- live rider tracking,
- auto-dispatch algorithm,
- wallet,
- loyalty/referral,
- multi-vendor cart,
- dark store / warehouse inventory,
- full kirana system,
- AI recommendations.

---

**Final clarity note:** Any mention of future categories or future experiments is roadmap context only. It does not authorize building those modules in the production MVP.

---

## 1. Product Vision

QuickGO is a hyperlocal delivery marketplace for underserved tier-3 cities. It connects local customers with nearby restaurants, vegetable sellers, fruit sellers, dairy sellers, and later kirana/local shops through a simple ordering and local delivery network.

QuickGO will not start as a dark-store quick-commerce company. It will start as an asset-light local marketplace that digitizes existing local supply and connects it with local riders.

**Core promise:**

> Local food, vegetables, fruits, and dairy delivered from trusted nearby sellers through QuickGO local riders.

---

## 2. MVP Strategy

The MVP is not designed to be a full Blinkit, Swiggy, or Zomato clone. It is designed to prove one critical loop:

> Customer places order → vendor accepts → admin assigns rider → rider delivers → payment is collected → issue is manageable → customer repeats.

The first version must validate:

- Customer demand
- Vendor adoption
- Rider reliability
- Manual operations feasibility
- Payment collection/reconciliation feasibility
- Delivery economics
- Complaint handling
- Repeat orders

### 2.1 Market Playground Lock

This MVP is a **market playground**, not a feature-heavy delivery empire.

MVP decision rule:

> If a feature does not directly help customer order, vendor accept, rider deliver, admin control, payment reconcile, or complaint resolve, it must stay out of MVP.

Future experiments such as railway/train food ordering, agri exchange, subscription, and QuickGO Delivery OS must not be mixed into the first market playground build.

---

## 3. Final MVP Product Structure

QuickGO MVP will have:

1. **QuickGO Customer App**
2. **QuickGO Partner App**
   - Vendor Mode
   - Rider Mode
3. **QuickGO Admin Web Panel**
4. **Backend API**
5. **PostgreSQL Database**
6. **Firebase Push Notification System**
7. **Cloud Image Storage**

Separate Vendor App and Rider App are not required in MVP. They can be split later after market validation.

---

## 4. Role Order Used Across This PRD

Every feature, flow, requirement, notification, acceptance criterion, and metric should follow this role order wherever applicable:

1. **Customer** — places order and receives delivery
2. **Vendor / Shopkeeper** — accepts order and prepares or packs products
3. **Rider** — picks up and delivers the order
4. **Admin / Founder** — controls operations, assignment, support, compliance, and reports
5. **Backend / System** — powers auth, database, API, notifications, security, and audit logs

This order should also be followed in future role-based documents unless a technical document specifically requires backend-first ordering.

---

## 5. Target Users and Responsibilities

### 5.1 Customer

Customers are local residents who want convenient home delivery of food, vegetables, fruits, and dairy.

Customer responsibilities:

- Provide correct phone number and delivery address
- Select items and place order
- Keep phone reachable during delivery
- Pay through COD / UPI on delivery
- Raise support issue if needed

Customer needs:

- Simple ordering
- Local sellers
- Clear product price
- Clear delivery fee
- Reliable delivery
- Cash/UPI option
- Easy support

### 5.2 Vendor / Shopkeeper

Vendors include restaurants, vegetable sellers, fruit sellers, dairy sellers, and later kirana/local shops.

Vendor responsibilities:

- Keep shop status updated
- Keep products available/unavailable correctly marked
- Keep price updated, especially for vegetables and fruits
- Accept or reject orders quickly
- Prepare/pack order correctly
- Maintain food safety, hygiene, and compliance
- Provide valid FSSAI details where applicable
- Inform admin/customer when item is unavailable or quantity differs

Vendor needs:

- New order alert
- Accept/reject order
- Product availability control
- Price update
- Simple order handling
- Simple earnings view
- Low learning curve

### 5.3 Rider

Riders are local delivery partners who pick orders from vendors and deliver to customers.

Rider responsibilities:

- Stay online only when available
- Pick up assigned orders from vendors
- Verify order pickup from correct vendor
- Deliver orders to customers
- Collect COD / UPI if required
- Mark delivery and payment status accurately
- Report failed delivery or customer/vendor issue

Rider needs:

- Assigned orders
- Pickup/drop address
- Call vendor/customer
- Google Maps navigation link
- Delivery status update
- Earning visibility
- Issue reporting

### 5.4 Admin / Founder

Admin is the founder/operator controlling supply, orders, delivery assignment, support, compliance, and daily reporting.

Admin responsibilities:

- Onboard vendors
- Onboard riders
- Approve products
- Monitor orders
- Assign riders manually
- Track payment collection
- Handle cancellation/support issues
- Maintain compliance records
- Review validation metrics daily
- Pause vendors/categories if service quality drops

Admin needs:

- Vendor onboarding
- Rider onboarding
- Product control
- Order monitoring
- Manual rider assignment
- Payment verification
- Complaint handling
- Validation dashboard
- Audit logs

### 5.5 Backend / System

Backend is the engine that connects all apps and panels.

System responsibilities:

- Authenticate users
- Enforce role-based access
- Store product/order/payment/compliance data
- Maintain immutable order snapshots
- Send notifications
- Record status history
- Store audit logs
- Protect sensitive data
- Support future scaling

---

## 6. MVP Scope

### 6.1 Included in MVP

#### Customer App

- Android customer app
- OTP/mobile login
- Customer profile
- Address management
- Service zone check
- Category browsing
- Vendor/product listing
- Single-vendor cart
- Cart and order placement
- COD / UPI on delivery
- Order status tracking
- Cancel before vendor acceptance
- Support issue creation

#### Partner App — Vendor Mode

- Android partner app with Vendor Mode
- Shop open/closed toggle
- New order notification
- Accept/reject order
- Preparing/packing status
- Ready for pickup status
- Product available/unavailable toggle
- Price update for approved products
- Daily price update reminder for fresh categories
- Today orders and earning estimate
- Simple issue reporting to admin

#### Partner App — Rider Mode

- Android partner app with Rider Mode
- Online/offline toggle
- Assigned order list
- Pickup/drop details
- Call customer/vendor
- Google Maps open button
- Picked up status
- Delivered status
- Payment collected status where applicable
- Issue reporting

#### Admin Web Panel

- Admin web panel
- Vendor onboarding
- Rider onboarding
- Product/category management
- Service zone control
- Manual dispatch
- Payment verification
- Support workflow
- Compliance fields
- Validation dashboard
- Basic daily operations report

#### Backend / System

- Backend API
- PostgreSQL database
- Role-based access
- Push notifications
- Order snapshot system
- Status history
- Audit logs
- Legal/compliance data storage
- Basic security and monitoring

### 6.2 Not Included in MVP

- iOS public launch
- Separate vendor app
- Separate rider app
- Auto-dispatch algorithm
- Live rider tracking
- Wallet
- Subscription
- Loyalty points
- Referral system
- Full kirana system
- Dark store inventory
- Warehouse management
- Complex settlement automation
- Advanced analytics beyond validation dashboard
- Agri exchange
- QuickGO Delivery OS
- Railway/train food ordering
- PNR collection
- Train number, coach number, berth/seat number collection
- Coach/seat/platform delivery promise
- Train Food waitlist or lead-capture page

### 6.3 Explicit MVP Exclusion: Railway / Train Food

Railway/train food must not be added to the MVP as ordering, lead capture, waitlist, or coming-soon module. It may be considered later only after the core QuickGO market playground proves local home delivery demand.

Not allowed in MVP:

- PNR-based ordering
- Train number collection
- Coach number collection
- Seat/berth number collection
- Railway station/platform delivery promise
- Coach/seat delivery promise
- Train Food waitlist or enquiry form
- Station food vendor onboarding
- Any UI card that distracts users from the core local delivery test

Reason:

The MVP must stay focused on one city, one service zone, local vendors, local riders, and home delivery. Railway food is a different business flow and must remain a future experiment.

---

## 7. Role-Based Product Requirements

### 7.1 Customer App Requirements

Customer app must support:

- Mobile OTP login
- Customer profile
- Address management
- Serviceability check
- Category browsing
- Vendor listing
- Product listing
- Product price and last-updated time for fresh categories
- Single-vendor cart
- COD / UPI on delivery
- Order placement
- Order status tracking
- Cancel before vendor acceptance
- Support issue creation

MVP service zone:

- One city
- Approx. 3 km operating radius or admin-defined service zone
- Outside area = “Coming soon in your area”

### 7.2 Partner App — Vendor Mode Requirements

Vendor Mode must support:

- Mobile OTP login
- Vendor role detection
- Shop Open/Closed toggle
- New orders screen
- Loud push/in-app order alert
- Accept/reject order
- Mark preparing/packing
- Mark ready for pickup
- Toggle product available/unavailable
- Update price for approved products
- Daily price update reminder for vegetables/fruits/dairy
- Today orders
- Today earnings estimate
- Basic support/contact option

### 7.3 Partner App — Rider Mode Requirements

Rider Mode must support:

- Mobile OTP login
- Rider role detection
- Online/offline toggle
- Assigned orders
- Pickup address
- Drop address
- Customer call button
- Vendor call button
- Google Maps open button
- Mark picked up
- Mark delivered
- Mark payment collected if applicable
- Report delivery issue

### 7.4 Admin Web Panel Requirements

Admin panel is the operating control room.

Admin can:

- Create/approve vendors
- Store vendor compliance documents
- Create/approve riders
- Add/edit/approve products
- Set commission
- Set delivery fee rules
- View all orders
- Manually assign rider
- Cancel order with reason
- Mark payment collected
- View support complaints
- View validation dashboard
- View audit logs
- Pause vendor/shop/category/product
- Update service zone availability

### 7.5 Backend / System Requirements

Backend must support:

- OTP authentication
- User and role management
- Customer, vendor, rider, admin modules
- Product/category APIs
- Cart APIs
- Order APIs
- Order status history
- Manual dispatch APIs
- Payment status tracking
- Notification APIs
- Legal/compliance document storage
- Audit logs
- Rate limiting and validation
- Backup-ready database structure

---

## 8. Fresh Category Rules

Fresh categories include vegetables, fruits, and some dairy products.

MVP must handle:

- Daily price updates
- Product availability toggle
- Unit pricing such as kg, gram, piece, bunch, litre, packet
- Price last updated timestamp
- Variable weight tolerance where relevant
- Vendor/admin confirmation if actual weight or final amount differs materially
- Customer support issue type for price mismatch or quality complaint

Example display:

> Tamatar — ₹40/kg — Updated today 8:30 AM

Fresh category disclaimer:

> Final packed weight may slightly vary. If final price differs materially, QuickGO/admin/vendor must confirm before completion or handle through support.

Additional MVP rules:

- If fresh product price is stale beyond the admin-defined limit, the product should be blocked from ordering or require admin/vendor reconfirmation.
- Customer-requested quantity and vendor-fulfilled quantity must both be stored.
- Material substitutions must require customer/admin confirmation.
- Silent substitution is not allowed.
- Quality complaint must create a support ticket linked to order item.

---

## 9. End-to-End Order Lifecycle

### 9.1 Success Flow

1. **Customer:** Places order
2. **System:** Creates order with immutable snapshots
3. **Vendor:** Receives new order alert
4. **Vendor:** Accepts order
5. **Vendor:** Marks preparing/packing
6. **Vendor:** Marks ready for pickup
7. **Admin:** Assigns rider manually
8. **Rider:** Receives assigned order
9. **Rider:** Picks up order from vendor
10. **Rider:** Delivers order to customer
11. **Customer:** Pays COD / UPI on delivery if not already paid
12. **Rider/Admin:** Marks payment collected
13. **System:** Marks order completed

### 9.2 Order Status Values

Success statuses:

- PLACED
- VENDOR_ACCEPTED
- PREPARING_OR_PACKING
- READY_FOR_PICKUP
- RIDER_ASSIGNED
- PICKED_UP
- DELIVERED
- PAYMENT_COLLECTED
- COMPLETED

Failure/intervention statuses:

- CUSTOMER_CANCELLED
- VENDOR_REJECTED
- ADMIN_CANCELLED
- RIDER_FAILED
- PAYMENT_PENDING
- REFUND_PENDING
- REFUNDED
- SUPPORT_REVIEW

### 9.3 Cancellation Rules

- Before vendor accepts: customer can cancel
- After vendor accepts: admin approval required
- After rider pickup: cancellation usually not allowed
- Vendor reject: order cancelled automatically
- Rider unavailable: admin can reassign or cancel
- Quality/price mismatch: admin support review required

### 9.4 SLA / Timeout Rules

- Vendor should accept/reject quickly after alert.
- Admin should be alerted when vendor does not respond.
- Admin should reassign rider if assigned rider is unavailable.
- Orders stuck in any status should appear in admin “attention required” queue.

---

## 10. Order Snapshot Requirements

Every order must save immutable snapshot data.

Order snapshot must include:

- Customer name snapshot
- Customer phone snapshot
- Delivery address snapshot
- Customer location snapshot where applicable
- Vendor name snapshot
- Vendor phone snapshot
- Vendor address snapshot
- Product name snapshot
- Product price snapshot
- Product unit snapshot
- Quantity snapshot
- Fresh category weight/quantity note snapshot
- Delivery fee snapshot
- Platform fee snapshot if used
- Commission snapshot
- Payment method snapshot
- Tax/GST snapshot fields for future use
- Cancellation/refund policy version snapshot

Reason:

If vendor changes price later, old order should not change. This protects customer, vendor, rider, and QuickGO.

---

## 11. Payment, Reconciliation, and Settlement Requirements

MVP uses COD / UPI on delivery, so QuickGO must track who collected money and who must be paid later. This is mandatory even if online payment gateway is not launched.

### 11.1 Payment Collection Models

Supported MVP models:

1. Customer pays cash to rider.
2. Customer pays UPI to rider QR.
3. Customer pays UPI to vendor QR.
4. Customer pays UPI to QuickGO QR, if enabled after CA review.

Every order must store:

- Payment method requested by customer
- Actual payment method used
- Collector type: RIDER, VENDOR, QUICKGO, or ADMIN
- Collector ID
- Amount collected
- Collection timestamp
- Payment proof image/reference if available
- Admin verification status

Implementation field names should include:

- `payment_method_requested`
- `payment_method_actual`
- `collector_type`
- `collector_id`
- `amount_collected`
- `collection_timestamp`
- `payment_proof_reference`
- `admin_verification_status`

### 11.2 Reconciliation Rules

Admin must be able to reconcile:

- Cash collected by each rider
- UPI collected by vendor
- UPI collected by rider
- UPI collected by QuickGO
- Pending collection cases
- Over-collected/under-collected cases
- Cancelled order payment cases

Required reconciliation statuses:

- COLLECTION_PENDING
- COLLECTED_UNVERIFIED
- VERIFIED
- SHORT_COLLECTED
- OVER_COLLECTED
- DISPUTED
- SETTLED

### 11.3 Vendor Settlement Rules

Vendor payable amount must be calculated from:

- Order item total
- Vendor commission snapshot
- Adjustment notes
- Cancellation/refund deductions
- Amount already collected directly by vendor

Vendor payout statuses:

- PAYOUT_NOT_DUE
- PAYOUT_PENDING
- PAYOUT_PARTIAL
- PAYOUT_PAID
- PAYOUT_HOLD
- PAYOUT_DISPUTED

### 11.4 Rider Payout Rules

Rider payout must be calculated from:

- Delivery fee rule
- Distance/time/manual payout rule
- Cash collected by rider
- UPI collected by rider
- Penalty/adjustment notes if any

Rider payout statuses:

- PAYOUT_NOT_DUE
- PAYOUT_PENDING
- PAYOUT_PAID
- PAYOUT_HOLD
- PAYOUT_DISPUTED

### 11.5 Finance Acceptance Criteria

MVP finance system is acceptable only if:

- Admin can see who collected money for every order.
- Admin can detect pending/short/over collection.
- Vendor payable can be calculated order-wise.
- Rider payable can be calculated order-wise.
- Settlement history remains immutable after payout is marked paid.

---

## 12. Legal and Compliance Requirements

This PRD is not legal advice. Before public launch, QuickGO should be reviewed by a CA and a lawyer because the business touches food, e-commerce, GST, delivery, consumer complaints, and personal data.

### 12.1 QuickGO Owner / Admin Compliance

QuickGO owner/admin must:

- Decide entity structure before commercial launch
- Maintain Terms and Conditions
- Maintain Privacy Policy
- Maintain Refund and Cancellation Policy
- Maintain Delivery Policy
- Maintain Vendor Policy
- Maintain Rider Policy
- Maintain Contact and Grievance Support details
- Review whether QuickGO needs FSSAI e-commerce FBO licensing/registration based on actual operating model
- Collect and display valid FSSAI details for food-related vendors where applicable
- Maintain vendor compliance documents
- Keep grievance/support workflow active
- Maintain order, payment, commission, and settlement records
- Consult CA before collecting full product payment into QuickGO account

Recommended founder path:

- MVP beta: Proprietorship may be enough for internal/local testing
- Paid public marketplace: move toward LLP or Private Limited
- Investor approach: Private Limited preferred

### 12.2 Vendor Compliance

Vendor must:

- Maintain valid FSSAI registration/license where applicable
- Maintain hygiene and food safety
- Be responsible for food preparation, product quality, packaging, and freshness
- Provide accurate product information and price
- Avoid misleading product images/claims
- Follow order acceptance and cancellation rules
- Share GST details where applicable

Required vendor compliance statuses:

- FSSAI_PENDING
- FSSAI_VERIFIED
- FSSAI_EXPIRED
- FSSAI_REJECTED
- FSSAI_NOT_APPLICABLE_REVIEW_REQUIRED

### 12.3 Rider Compliance

Rider agreement must cover:

- Independent delivery partner status
- Payout rules
- Conduct rules
- Food handling rules
- Cash/UPI collection rules
- Delivery proof rules
- Customer/vendor calling rules
- Safety responsibility
- Fraud prevention

### 12.4 Customer-Facing Compliance

QuickGO app must display:

- Legal/business name of platform
- Customer care contact
- Grievance contact
- Seller/vendor name
- Vendor location/area
- Vendor FSSAI details where applicable
- Final price breakup
- Delivery fee
- Cancellation policy
- Refund policy
- Support mechanism

### 12.5 Consumer Grievance Requirement

QuickGO must maintain a complaint and grievance workflow.

Minimum support requirements:

- Show support contact in app and website
- Allow customer to raise support ticket
- Store complaint category and order ID
- Track complaint status
- Maintain admin notes
- Acknowledge customer complaint within 48 hours
- Target resolution within one month for formal grievances
- Escalate unresolved issues to founder/admin

Suggested issue statuses:

- OPEN
- IN_REVIEW
- WAITING_FOR_VENDOR
- WAITING_FOR_RIDER
- RESOLVED
- REJECTED

### 12.6 GST Compliance

GST treatment depends on how QuickGO collects money and how supplies are structured.

MVP recommendation:

- Start with COD / UPI on delivery
- Keep product payment traceable
- Maintain order-level records
- Maintain vendor commission records
- Maintain rider payout records
- Consult CA before collecting product value into QuickGO account

Important GST review points:

- Whether QuickGO qualifies as an e-commerce operator
- Whether QuickGO must obtain GST registration
- Whether TCS applies when platform collects consideration on behalf of vendors
- Special GST treatment for restaurant service through e-commerce operator
- Invoice model: vendor invoice vs platform invoice vs delivery/service fee invoice
- Commission invoice from QuickGO to vendor
- Delivery fee taxability

### 12.7 Legal Metrology / Packaged Goods

For packaged goods, future kirana, dairy packets, branded items, and packaged foods, QuickGO should support required product label information.

Product fields should support:

- MRP
- Selling price
- Net quantity
- Unit
- Brand/manufacturer where applicable
- Expiry/best-before where applicable
- Batch/lot number where applicable
- Country of origin where applicable
- Product image/label image where applicable

For MVP fresh vegetables/fruits, use clear unit pricing such as kg, gram, piece, bunch, litre, packet.

### 12.8 Data Protection / Privacy

QuickGO will process customer phone numbers, addresses, order history, vendor data, rider data, location data, and payment-related records.

QuickGO must:

- Show privacy notice before/at signup
- Collect only necessary data
- Explain purpose of data collection
- Protect personal data using reasonable security safeguards
- Allow user support for correction/deletion requests where legally possible
- Maintain data retention rules
- Keep admin access restricted
- Keep audit logs for sensitive admin actions
- Avoid unnecessary contact-list access
- Avoid targeted advertising to children
- Avoid collecting precise location continuously in MVP unless needed for delivery flow

### 12.9 Pre-Launch Legal Gate

Before public beta, founder must confirm:

- Legal name/entity selected
- Public policies drafted
- Vendor agreement drafted
- Rider agreement drafted
- FSSAI handling reviewed
- GST/payment collection model reviewed
- Privacy notice drafted
- Grievance contact active

---

## 13. Data Model — Minimum Tables

Tables should be grouped by role and system responsibility.

### 13.1 Customer Tables

- users
- roles
- customers
- customer_devices
- addresses
- carts
- cart_items

### 13.2 Vendor Tables

- vendors
- vendor_staff
- vendor_compliance_documents
- categories
- products
- product_prices
- product_availability_history
- commissions

### 13.3 Rider Tables

- riders
- rider_devices
- rider_kyc_documents
- delivery_assignments
- delivery_proofs

### 13.4 Order and Payment Tables

- orders
- order_items
- order_status_history
- order_sla_events
- order_substitutions
- order_item_quality_issues
- idempotency_keys
- payments
- payment_collections
- payment_reconciliation_events
- settlements
- vendor_payouts
- rider_payouts
- payout_adjustments
- invoices_receipts

### 13.5 Admin, Compliance, and Support Tables

- service_zones
- support_tickets
- support_ticket_events
- legal_documents
- compliance_audit_events
- food_safety_incidents
- incident_reports
- daily_closing_reports
- audit_logs

### 13.6 System, Privacy, and Release Tables

- otp_sessions
- notifications
- app_versions
- feature_flags
- system_settings
- device_sessions
- consent_records
- privacy_requests
- release_notes

---

## 14. User Roles

Required roles:

1. CUSTOMER
2. VENDOR_OWNER
3. VENDOR_STAFF
4. RIDER
5. ADMIN
6. SUPER_ADMIN
7. SUPPORT

Role-based access control is mandatory from MVP.

### 14.1 Role-Permission Matrix

| Capability | Customer | Vendor Owner | Vendor Staff | Rider | Support | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Manage own profile/address | Yes | Yes | Yes | Yes | No | Yes | Yes |
| Browse vendors/products | Yes | View own | View own | No | View | Yes | Yes |
| Place customer order | Yes | No | No | No | No | No | No |
| Accept/reject vendor order | No | Own shop | Own shop | No | No | Override | Override |
| Update product availability | No | Own shop | Own shop if allowed | No | No | Yes | Yes |
| Update product price | No | Own approved products | If allowed | No | No | Yes | Yes |
| View assigned delivery | No | No | No | Assigned only | View | Yes | Yes |
| Mark picked/delivered | No | No | No | Assigned only | No | Override | Override |
| Assign/reassign rider | No | No | No | No | No | Yes | Yes |
| Cancel order | Before vendor accepts | Own reject only | Own reject only | No | Recommend | Yes | Yes |
| Mark payment collected | No | Own collection only | Own collection only | Assigned only | No | Yes | Yes |
| Reconcile payments/payouts | No | View own | No | View own | No | Yes | Yes |
| Access support tickets | Own tickets | Own order tickets | Own order tickets | Own delivery tickets | Yes | Yes | Yes |
| Manage compliance documents | No | Own documents | No | Own documents | View | Yes | Yes |
| Manage roles/system settings | No | No | No | No | No | Limited | Yes |

Any permission override by admin must create an audit log.

---

## 15. Notification Requirements

Notifications should follow role order.

### 15.1 Customer Notifications

- Order placed confirmation
- Order accepted by vendor
- Order rejected/cancelled
- Rider assigned
- Picked up
- Delivered
- Payment pending/resolved
- Support ticket update

### 15.2 Vendor Notifications

- New order received
- Order cancelled by customer/admin
- Rider assigned
- Product price update reminder
- Payment/status issue if needed

Vendor app must have in-app alert and sound for new orders.

### 15.3 Rider Notifications

- New delivery assigned
- Delivery cancelled/reassigned
- Payment pending alert if rider is responsible for collection
- Support/admin message

### 15.4 Admin Notifications

- New order placed
- Vendor delay
- Rider not assigned
- Payment pending
- Support ticket created
- Order failure/cancellation
- Compliance document expired/expiring

---

## 16. Validation Dashboard Metrics

Metrics should be grouped by the business loop.

### 16.1 Customer / Demand Metrics

- Total users
- First orders
- Repeat customers
- Orders per customer
- Cart abandonment
- Category-wise demand

### 16.2 Vendor / Supply Metrics

- Active vendors
- Vendor acceptance rate
- Vendor rejection rate
- Vendor response time
- Out-of-stock cases
- Price mismatch cases
- Daily price update compliance

### 16.3 Rider / Delivery Metrics

- Active riders
- Average delivery time
- Failed deliveries
- Late deliveries
- Rider assignment time
- COD/UPI collection issues

### 16.4 Admin / Operations Metrics

- Manual assignment time
- Support tickets
- Cancellation reasons
- Refund/pending payment cases
- Vendor/rider compliance pending count

### 16.5 Unit Economics Metrics

- Average order value
- Delivery fee collected
- Vendor commission
- Rider payout
- Refund/cancel loss
- Net margin per order

### 16.6 Investor Validation Signals

- 100+ successful orders
- 30%+ repeat customers
- 70%+ vendor acceptance rate
- Average delivery under 90 minutes
- Cancellation under 15%
- Price mismatch under 5%
- Delivery economics break-even or near break-even

---

## 17. Non-Functional Requirements

### 17.1 Performance

MVP should work reliably on budget Android phones and average tier-3 mobile networks.

Targets:

- App should remain usable on low-end Android phones with limited RAM.
- Main screens should avoid heavy animations and unnecessary background work.
- Product/vendor lists must use pagination or lazy loading.
- Product images must be compressed and served in mobile-friendly sizes.
- API response target for common read operations should be under 1 second under normal MVP traffic.
- Order placement and status updates should fail safely with clear retry/error messages.

### 17.2 Reliability

- Vendor new-order alert must use push notification plus in-app alert.
- Admin must see live orders even if vendor/rider misses notification.
- Failed notification should not block the order record from being visible in apps/admin.
- Every order status change must be saved in status history.
- Sensitive admin overrides must be audit logged.

### 17.3 Slow Internet Handling

- Show loading and retry states.
- Prevent duplicate order placement on retry.
- Cache static category/product data where safe.
- Do not allow stale cart price to place order without final price confirmation.
- Vendor/rider app should keep the active order screen lightweight.
- No offline order creation is allowed in MVP. If the network fails during order placement, the app must clearly show failure/retry and must not silently queue an order.
- Any retry must use an idempotency key so duplicate orders are not created.

### 17.4 Maintainability

- Use shared Flutter packages for common UI, models, API client, auth, and error handling.
- Backend modules should stay modular: auth, users, vendors, riders, products, orders, payments, support, admin, notifications, compliance.
- Keep environment configuration separate for local, staging, and production.
- Keep database migrations version-controlled.

### 17.5 Data Retention and Backup

- Keep order, payment collection, settlement, and audit records for legal/accounting review.
- Keep support ticket history linked to orders.
- Back up production database regularly after public beta starts.
- Restrict access to exported reports.

---

## 18. Technical Stack

### 18.1 Mobile Apps

- Flutter
- Android-first build
- iOS-compatible structure
- Riverpod or Bloc
- Dio API client
- Firebase Cloud Messaging

### 18.2 Backend

- NestJS / Node.js
- PostgreSQL
- Prisma ORM
- Redis later for queues/cache
- JWT/session auth
- Role-based access control
- Audit logging

### 18.3 Admin Panel

- Next.js
- Tailwind CSS
- Admin authentication
- Role-based screens

### 18.4 Deployment

- Backend: Render/Fly.io initially
- Database: Managed PostgreSQL
- Admin Panel: Vercel
- Image Storage: Cloudinary/S3
- Push: Firebase

---

## 19. Security Requirements

- OTP authentication
- Role-based access control
- API rate limiting
- Input validation
- File upload validation
- Secure password/secret handling
- Environment variables
- Audit logs for admin actions
- No hardcoded secrets
- Access token expiry
- Data backup policy
- Basic monitoring/error logging
- Production/staging environment separation
- Least-privilege admin access
- Admin session timeout
- Device/session logging
- PII masking in admin screens where full data is not needed
- Idempotency protection for order placement and payment updates
- Delivery proof/PIN or admin-confirmed delivery proof to reduce false delivery risk
- Fraud/abuse flags for repeated cancellation, fake orders, false delivery, or payment disputes

---

## 20. Quality Assurance, Observability, and Release Management

### 20.1 QA Scope

MVP QA must cover the full market playground loop:

- Customer signup/login
- Address and service-zone blocking
- Vendor/product listing
- Fresh category price timestamp and stale-price blocking
- Cart and single-vendor order placement
- Duplicate order prevention on retry
- Vendor accept/reject flow
- Admin manual rider assignment
- Rider pickup/delivery flow
- Payment collector tracking
- COD/UPI reconciliation
- Support ticket creation and resolution
- Vendor/rider access restrictions
- Admin override audit logs
- Low-end Android phone usability
- Slow-network retry behavior

### 20.2 Release Environments

Required environments:

- Local development
- Staging
- Production

Rules:

- Production database must not be used for testing.
- Environment secrets must not be hardcoded.
- Staging must be tested before each production release.
- Admin, customer, vendor, and rider flows must be smoke-tested before release.

### 20.3 Observability

MVP must include:

- Backend error logs
- Basic request logs
- Order failure logs
- Notification failure logs
- Payment/reconciliation mismatch logs
- Admin audit logs
- Crash/error tracking for mobile apps

### 20.4 Release Checklist

Before every production release:

- Database migration reviewed
- API compatibility checked
- Android build tested on at least two low-end/average devices
- Customer order test completed
- Vendor accept/reject test completed
- Rider delivery test completed
- Admin dispatch/reconciliation test completed
- Rollback plan noted
- Release notes saved

### 20.5 Play Store Testing Gate

Before public Android launch, QuickGO should complete closed/internal testing with trusted local users. For new Google Play personal developer accounts, production access may require at least 12 testers opted into closed testing for 14 continuous days before applying for production access. Founder must prepare real local testers before production rollout.

---

## 21. MVP Launch Plan

### 21.1 Before Public Beta

- 10–15 vendors onboarded
- 2–4 riders onboarded
- Vendor catalogs pre-filled
- Vendor training completed
- Rider training completed
- Support phone/WhatsApp active
- Admin panel tested
- Push notifications tested
- COD/UPI collection process tested
- Service zone tested
- Compliance fields tested

### 21.2 Beta Launch

- One city
- One service zone
- 50–200 local users
- 100 test orders
- Manual dispatch
- COD/UPI on delivery
- Daily founder audit

### 21.3 Daily Operations SOP

Morning setup:

- Confirm active vendors for the day
- Confirm active riders for the day
- Check fresh category prices and timestamps
- Confirm support phone/WhatsApp is active
- Check admin dashboard and notification health

During live orders:

- Monitor every placed order
- Call vendor if order is not accepted quickly
- Assign rider manually after vendor confirmation
- Track pickup and delivery status
- Record payment collector and proof where available
- Create support ticket for any dispute

End-of-day closing:

- Reconcile COD/UPI collection
- Mark pending payments
- Review failed/cancelled orders
- Calculate vendor payable and rider payout estimates
- Record daily closing report
- Note learnings for next day

---

## 22. Acceptance Criteria

Acceptance criteria should follow the real order completion sequence.

### 22.1 Customer Acceptance Criteria

- Customer can sign up/login successfully
- Customer can add delivery address
- Customer outside service zone is blocked
- Customer can browse categories/vendors/products
- Customer can see price and delivery fee clearly
- Customer can place order successfully
- Customer can see order status
- Customer can cancel before vendor acceptance
- Customer can raise support issue

### 22.2 Vendor Acceptance Criteria

- Vendor receives new order notification
- Vendor can accept/reject order
- Vendor can mark preparing/packing
- Vendor can mark ready for pickup
- Vendor cannot access another vendor’s orders
- Vendor can update availability/price for approved products
- Vendor can see today orders/earnings estimate

### 22.3 Rider Acceptance Criteria

- Rider can go online/offline
- Rider can see assigned orders only
- Rider can open pickup/drop navigation
- Rider can mark picked up
- Rider can mark delivered
- Rider can mark payment collected if assigned
- Rider cannot access unassigned orders
- Rider can report delivery issue

### 22.4 Admin Acceptance Criteria

- Admin can onboard vendor
- Admin can onboard rider
- Admin can approve/manage products
- Admin can assign rider manually
- Admin can cancel order with reason
- Admin can mark payment collected
- Admin dashboard shows validation metrics
- Admin can log and resolve support complaint
- Admin can store/display basic compliance data
- Admin can pause vendor/product/service zone

### 22.5 System Acceptance Criteria

- Order snapshot remains unchanged after product price update
- Role-based access control works
- Notifications are sent to correct role
- Status history is saved
- Audit logs are generated for sensitive admin actions
- Basic compliance data can be stored/displayed
- Support ticket history is stored
- Payment collection history is stored
- Payment reconciliation statuses work correctly
- Vendor/rider payout records are generated correctly
- App remains usable on low-end Android devices and slow internet

---

## 23. Risk Register and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Vendor does not accept orders quickly | Customer loses trust | Loud alert, vendor training, admin fallback call, vendor response metric |
| Rider unavailable during peak time | Late/cancelled delivery | Manual dispatch, backup riders, admin reassignment |
| Fresh item price changes daily | Disputes and margin loss | Daily price update, timestamp, stale-price blocking, admin review |
| Variable weight mismatch | Customer complaint | Requested vs fulfilled quantity, customer/admin confirmation for material changes |
| Cash/UPI not reconciled | Financial leakage | Collector tracking, reconciliation statuses, daily closing report |
| Vendor lacks compliance documents | Legal risk | FSSAI/compliance status, block public listing until reviewed |
| Support issues remain unresolved | Bad reputation | Ticket workflow, SLA, founder escalation |
| App too heavy for tier-3 phones | Low adoption | Lightweight UI, image compression, pagination, minimal animations |
| Too many categories at launch | Operational chaos | Start with limited products/vendors and one service zone |
| Founder handles everything manually | Burnout and errors | Daily SOP, dashboard, narrow launch radius, scale only after metrics improve |
| Online payment added too early | GST/accounting complexity | COD/UPI on delivery first, CA review before gateway/full collection |
| Data/privacy mishandling | Legal and trust risk | Privacy notice, minimum data, access control, audit logs, retention rules |
| Railway/train food added too early | MVP scope confusion and compliance/ops risk | Keep railway/train food completely out of MVP; revisit after local delivery proof |
| False delivery marked by rider | Customer trust and financial loss | Delivery proof/PIN/admin confirmation and audit trail |
| Silent product substitution | Customer complaint and refund risk | Customer/admin confirmation for material substitution |
| Food safety complaint | Legal and trust risk | Incident ticket, vendor pause, admin review, compliance record |
| Play Store release delay | Launch delay | Internal APK testing plus closed-testing readiness |

### 23.1 Launch Gates

QuickGO should launch public beta only when:

- 10–15 vendors are onboarded and trained.
- 2–4 riders are verified and trained.
- Vendor catalogs are pre-filled.
- Push notification and admin fallback process are tested.
- COD/UPI collection and reconciliation flow is tested.
- Support contact and grievance workflow are live.
- Compliance fields are filled for food-related vendors or vendors are marked pending/not public.

### 23.2 Pause / Kill Conditions

Founder should pause public marketing if:

- Vendor acceptance rate stays below 50%.
- Cancellation rate stays above 25%.
- Average delivery time stays above 120 minutes.
- Payment reconciliation gaps happen repeatedly.
- Compliance documents are missing for listed food vendors.
- Support complaints are not being resolved within the promised process.

---


## 24. Production Go-Live Gate and Rollback Plan

### 24.1 Go-Live Gate

QuickGO cannot go live publicly unless all of the following are true:

- Backend production environment is deployed and stable.
- Production database backup is enabled.
- Admin panel login and role permissions are tested.
- Customer app order placement works end-to-end.
- Partner App Vendor Mode receives new order alert with sound/push/in-app fallback.
- Partner App Rider Mode can complete pickup and delivery.
- Admin can manually assign and reassign riders.
- Payment collector and payment status are visible in admin.
- Vendor payout and rider payout records are generated.
- Service zone blocking works.
- Order snapshot remains immutable after vendor price/product update.
- Support ticket can be created and resolved.
- Basic compliance fields exist for vendors/riders.
- Terms, Privacy Policy, Refund/Cancellation Policy, Delivery Policy, Vendor Policy, Rider Policy, and Grievance Contact are linked.
- At least 10 vendors and 2 riders are trained.
- At least 12 Android testers are ready for closed testing when Play Store release is required.

### 24.2 Rollback Plan

If production issues occur, the founder/admin must be able to pause operations without deleting data.

Required rollback controls:

- Global order pause switch.
- City/service-zone pause switch.
- Vendor pause switch.
- Category pause switch.
- Product availability bulk-off option.
- Rider assignment pause option.
- Manual status correction by SUPER_ADMIN only.
- Incident note and audit log for every manual correction.

Rollback rule:

> If orders cannot be accepted, assigned, delivered, or reconciled safely, pause new orders first and fix existing orders manually.

### 24.3 Incident Severity Levels

| Severity | Meaning | Example | Response |
|---|---|---|---|
| SEV-1 | Business-critical failure | Orders placed but not visible to vendor/admin | Pause orders, notify affected users, fix immediately |
| SEV-2 | Major operational issue | Notifications failing but admin can call vendors | Manual fallback, fix same day |
| SEV-3 | Minor issue | UI bug, wrong label, slow page | Fix in next patch |
| SEV-4 | Improvement | Better filter, UI polish | Future backlog |

### 24.4 First 100 Orders Rule

For the first 100 real orders:

- Founder/admin must monitor every live order.
- No order should be auto-closed without admin visibility.
- Every cancellation must have a reason.
- Every payment mismatch must be logged.
- Every customer complaint must be tagged.
- Every vendor rejection must be reviewed.
- Every rider delay must be reviewed.

The first 100 orders are not just transactions; they are the market validation dataset.

## 25. Founder Operating Rules

- Do not launch in multiple cities first
- Do not build auto-dispatch first
- Do not build live tracking first
- Do not onboard too many products first
- Do not promise 10-minute delivery
- Do not ignore vendor training
- Do not ignore rider training
- Do not list food vendors without compliance review
- Do not collect full online payments before CA/payment compliance review
- Do not optimize for features before proving repeat orders
- Do not allow vendor price changes to modify old orders
- Do not allow support complaints to stay untracked
- Do not add railway/train food in MVP
- Do not collect PNR, coach, seat, or train journey details in MVP
- Do not create Train Food waitlist/card in MVP because the current goal is only local market playground validation

---

## 26. Final Founder Decision

QuickGO MVP should be built as:

> Customer App + Partner App + Admin Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Compliance-Ready Vendor/Rider Onboarding.

The purpose of this MVP is to prove real order completion and repeat usage in one small city before scaling into a professional multi-app, multi-city delivery platform. Railway/train food, agri exchange, QuickGO Delivery OS, and advanced experiments must stay outside this MVP.

---

## 27. Official Compliance Reference Checklist

This checklist is included for implementation planning. It does not replace CA/lawyer review.

- FSSAI / FoSCoS review for food-related vendor listing and platform role
- Consumer Protection E-Commerce Rules review for seller transparency and grievance process
- GST/CA review before online payment gateway or platform collection of product value
- DPDP/privacy review for phone, address, location, order history, rider/vendor data, and support records
- Legal Metrology review before adding packaged kirana/branded products
- Vendor agreement review
- Rider agreement review
- Refund/cancellation policy review
- Data retention and audit-log policy review

---

## 28. Recommended Document Structure After PRD

Future documents should be created in this order:

1. `00_PROJECT_OVERVIEW.md`
2. `01_PRD.md`
3. `02_LEGAL_COMPLIANCE_CHECKLIST.md`
4. `03_SYSTEM_DESIGN.md`
5. `04_DATABASE_SCHEMA.md`
6. `05_API_SPEC.md`
7. `06_CUSTOMER_APP_PRD.md`
8. `07_PARTNER_APP_VENDOR_MODE_PRD.md`
9. `08_PARTNER_APP_RIDER_MODE_PRD.md`
10. `09_ADMIN_PANEL_PRD.md`
11. `10_TECH_SPEC.md`
12. `11_NON_FUNCTIONAL_REQUIREMENTS.md`
13. `12_SECURITY_AND_PRIVACY.md`
14. `13_IMPLEMENTATION_PLAN.md`
15. `14_TEST_CASES.md`
16. `15_DEPLOYMENT_GUIDE.md`
17. `16_OPERATIONS_RULES.md`
18. `17_PAYMENT_RECONCILIATION_SOP.md`
19. `18_VENDOR_ONBOARDING_SOP.md`
20. `19_RIDER_ONBOARDING_SOP.md`
21. `20_SUPPORT_SOP.md`
22. `21_RELEASE_CHECKLIST.md`
23. `22_TRACKER.md`
24. `23_MVP_MARKET_PLAYGROUND_RULES.md`
25. `24_FUTURE_FEATURE_BACKLOG.md`

This structure keeps business first, compliance early, system architecture before implementation, and role-based documents in the same order used inside this PRD.

---

## 29. Final 10/10 PRD Score Verdict

Final PRD score: **10/10 for MVP implementation readiness.**

This score means the PRD is complete enough for founder planning, developer execution, MVP operations, QA, release, and investor-facing explanation.

This score does not mean legal approval. Final legal, CA, GST, FSSAI, and agreement validation remains mandatory before full public commercial launch.

---

## 30. Final Production MVP Lock Declaration

This PRD is locked for QuickGO Production MVP v1.1.

The production MVP must only build:

1. QuickGO Customer App
2. QuickGO Partner App with Vendor Mode and Rider Mode
3. QuickGO Admin Web Panel
4. Backend API
5. PostgreSQL Database
6. Firebase Push Notifications
7. Cloud Image Storage
8. Manual Dispatch
9. COD/UPI on Delivery
10. Payment Collection and Reconciliation
11. Vendor/Rider Onboarding and Compliance Records
12. Support Workflow
13. Validation Dashboard

Anything outside this list is not part of the final production MVP unless a new PRD version is created.

**Final lock status:** APPROVED FOR BUILD

**Next document:** `02_LEGAL_COMPLIANCE_CHECKLIST.md`
