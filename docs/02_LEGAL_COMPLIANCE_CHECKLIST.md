# 02_LEGAL_COMPLIANCE_CHECKLIST.md
<!--
Source of Truth: PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

**Project:** QuickGO  
**Document Type:** Legal & Compliance Checklist  
**Version:** v1.0 — Aligned with Final Locked Production MVP PRD v1.2  
**Status:** Draft for CA/Lawyer Review  
**Scope:** QuickGO Production MVP only  
**Market:** Tier-3 Bihar/India hyperlocal delivery marketplace  
**MVP Scope:** Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding  
**Excluded From MVP:** Railway/train food, agri exchange, QuickGO Delivery OS, subscription, live tracking, auto-dispatch, wallet, referral, loyalty, dark store, warehouse, iOS public launch, separate vendor app, separate rider app  

---

## 1. Compliance Philosophy

QuickGO is a market-playground MVP, but it still touches food, local delivery, e-commerce, consumer complaints, personal data, cash/UPI collection, vendor onboarding, rider onboarding, and future packaged goods.

This checklist makes QuickGO **compliance-ready**, not legally certified. Before full public commercial launch, the founder must validate the operating model with a CA and a lawyer.

**Founder rule:**

> Do not treat QuickGO as “just an app.” QuickGO is a food/local-commerce coordination platform and must be built with compliance records from day one.

---

## 2. Legal Review Boundary

This document is not legal advice. It is a product and operations checklist that helps the founder prepare for legal/CA review.

Mandatory professional review before full public commercial launch:

- FSSAI applicability for QuickGO platform
- Vendor FSSAI verification process
- GST registration and tax model
- Restaurant-service e-commerce operator treatment
- Whether TCS applies to non-restaurant goods if QuickGO collects consideration
- Invoice/receipt model
- Vendor agreement
- Rider agreement
- Refund/cancellation policy
- Privacy policy and DPDP compliance
- Local business registration / Shops & Establishment requirement
- Payment collection and reconciliation process

---

## 3. Compliance Ownership Matrix

| Compliance Area | QuickGO Owner | Vendor / Shopkeeper | Rider | Admin/System Requirement |
|---|---|---|---|---|
| FSSAI vendor verification | Responsible to collect, store, display where applicable | Responsible to maintain valid license/registration | Basic food handling | Vendor compliance status |
| Food quality | Platform support + complaint routing | Primary responsibility | Safe delivery handling | Quality issue workflow |
| Product pricing | Show clear price and timestamp | Keep prices accurate | Not responsible | Price update logs |
| Variable weight | Show final fulfilment rules | Confirm fulfilled weight | Delivery proof only | Fulfilled quantity fields |
| COD/UPI collection | Reconciliation owner | May collect if configured | May collect if assigned | Collector model and audit logs |
| GST/tax | CA-reviewed model required | Vendor tax details where applicable | Not applicable | Invoice/tax records |
| Consumer complaints | Grievance workflow owner | Cooperate in resolution | Cooperate in delivery issues | Support tickets + SLA events |
| Personal data | Data fiduciary-like responsibility | Limited access only | Limited access only | PII masking, access logs |
| Packaged goods | Future support fields | Accurate label info | Not responsible | Legal metrology fields |
| Delivery safety | Define SOP | Packaging responsibility | Conduct and safety responsibility | Rider agreement + issue reports |

---

## 4. Entity and Business Registration Checklist

### 4.1 MVP Beta Stage

Allowed for early internal/local testing:

- Founder-led local trial
- Limited vendors
- Limited riders
- COD/UPI on delivery
- Manual dispatch
- Manual reconciliation
- No large public marketing before compliance review

Recommended entity options:

- Proprietorship for early local test
- LLP or Private Limited if paid public operations expand
- Private Limited preferred before investor approach

### 4.2 Pre-Public Launch Gate

Before public commercial launch, complete:

- [ ] Decide business entity type
- [ ] Register business/entity if needed
- [ ] Open business bank account if collecting platform money
- [ ] Finalize GST model with CA
- [ ] Finalize FSSAI platform/vendor model with lawyer/FSSAI consultant if needed
- [ ] Prepare vendor agreement
- [ ] Prepare rider agreement
- [ ] Prepare customer policies
- [ ] Confirm local Shops & Establishment applicability

### 4.3 Owner

- Founder / QuickGO Admin
- CA
- Lawyer

---

## 5. FSSAI Compliance Checklist

QuickGO lists restaurant food, vegetables, fruits, and dairy. Food safety compliance is mandatory to handle carefully.

### 5.1 QuickGO Platform Responsibilities

QuickGO must:

- [ ] Collect FSSAI License/Registration number from food-related vendors where applicable
- [ ] Collect FSSAI certificate image/PDF
- [ ] Store FSSAI validity date
- [ ] Display valid FSSAI License/Registration details on vendor profile where applicable
- [ ] Block or hide vendors with expired/rejected compliance status
- [ ] Avoid listing food sellers without valid compliance review
- [ ] Keep vendor compliance status in Admin Panel
- [ ] Maintain food safety complaint workflow
- [ ] Maintain vendor pause/suspension rule for serious complaints
- [ ] Ensure delivery personnel receive basic food-handling instructions
- [ ] Avoid misleading food images, claims, or descriptions

### 5.2 Vendor Responsibilities

Vendor must:

- [ ] Maintain valid FSSAI registration/license where applicable
- [ ] Maintain hygiene and food safety
- [ ] Provide accurate product/menu information
- [ ] Provide accurate pricing
- [ ] Use safe packaging
- [ ] Cooperate in customer complaint investigation
- [ ] Notify QuickGO before FSSAI expiry or license change

### 5.3 Required Vendor Compliance Fields

Admin Panel must store:

- vendor_id
- legal_business_name
- shop_name
- owner_name
- phone
- shop_address
- food_category
- fssai_license_number
- fssai_certificate_file_url
- fssai_valid_from
- fssai_valid_until
- fssai_status
- verification_note
- verified_by_admin_id
- verified_at
- renewal_reminder_date

### 5.4 FSSAI Status Values

Use exactly these statuses:

- FSSAI_PENDING
- FSSAI_VERIFIED
- FSSAI_EXPIRED
- FSSAI_REJECTED
- FSSAI_NOT_APPLICABLE_REVIEW_REQUIRED

### 5.5 FSSAI Launch Gate

Before vendor goes live:

- [ ] Vendor compliance profile created
- [ ] FSSAI number/certificate captured where applicable
- [ ] Admin reviewed certificate
- [ ] Expiry date stored
- [ ] Vendor status set to approved
- [ ] FSSAI details display checked in customer-facing vendor profile where applicable

---

## 6. GST and Tax Checklist

GST is model-dependent. QuickGO must not finalize tax treatment without CA review.

### 6.1 Key GST Questions for CA

Ask CA:

- [ ] Does QuickGO qualify as an e-commerce operator under GST for this model?
- [ ] Does QuickGO need GST registration from day one?
- [ ] If QuickGO collects money, does TCS apply for non-restaurant goods?
- [ ] How should restaurant service through QuickGO be treated?
- [ ] Who issues invoice to customer: vendor, QuickGO, or both?
- [ ] How should delivery fee be invoiced?
- [ ] How should QuickGO commission/platform fee be invoiced to vendor?
- [ ] How should COD/UPI collected by rider/vendor be recorded?
- [ ] How should refunds/adjustments be recorded?
- [ ] What reports are needed monthly?

### 6.2 MVP Tax-Safe Operating Rule

For MVP:

- [ ] Use COD/UPI on delivery only
- [ ] Do not enable full online payment gateway before CA review
- [ ] Maintain order-level records
- [ ] Maintain payment collection records
- [ ] Maintain vendor commission records
- [ ] Maintain rider payout records
- [ ] Maintain refund/adjustment records
- [ ] Keep product payment traceable

### 6.3 Required Tax/Invoice Data Fields

System should support future tax readiness:

- order_id
- invoice_number nullable
- receipt_number nullable
- customer_id
- vendor_id
- vendor_gstin nullable
- quickgo_gstin nullable
- product_total
- delivery_fee
- platform_fee nullable
- vendor_commission
- tax_amount nullable
- tax_rate nullable
- payment_method
- payment_status
- collector_type
- collector_id
- settlement_status
- created_at

### 6.4 GST Review Status

Admin/system setting:

- GST_MODEL_UNREVIEWED
- GST_MODEL_REVIEW_IN_PROGRESS
- GST_MODEL_APPROVED_BY_CA
- GST_MODEL_NEEDS_CHANGE

Public scale is blocked until GST model is at least reviewed.

---

## 7. Consumer Protection / E-Commerce Checklist

QuickGO must be transparent to customers.

### 7.1 Required Public Pages

Customer App and website/admin static pages must include:

- [ ] Terms & Conditions
- [ ] Privacy Policy
- [ ] Refund & Cancellation Policy
- [ ] Delivery Policy
- [ ] Vendor Policy
- [ ] Rider Policy
- [ ] Contact / Grievance Support Page

### 7.2 Required Customer-Facing Information

Customer App must show:

- [ ] QuickGO legal/business name
- [ ] Customer care contact
- [ ] Grievance contact
- [ ] Vendor/shop name
- [ ] Vendor area/location
- [ ] Product price
- [ ] Price last updated time for fresh items
- [ ] Delivery fee
- [ ] Platform fee if used
- [ ] Final payable amount
- [ ] Payment method
- [ ] Cancellation policy
- [ ] Refund/adjustment policy
- [ ] Support mechanism

### 7.3 Grievance SLA

Support workflow must track:

- Complaint received time
- Acknowledgement time
- Target acknowledgement: within 48 hours
- Resolution target: within one month
- Issue category
- Admin owner
- Resolution note
- Customer communication log

### 7.4 Support Ticket Categories

Use these categories:

- LATE_DELIVERY
- WRONG_ITEM
- MISSING_ITEM
- BAD_QUALITY
- PRICE_MISMATCH
- PAYMENT_ISSUE
- ORDER_CANCELLED
- RIDER_BEHAVIOUR
- VENDOR_BEHAVIOUR
- REFUND_ADJUSTMENT
- FOOD_SAFETY_INCIDENT
- OTHER

---

## 8. Refund, Cancellation, and Adjustment Checklist

### 8.1 Cancellation Rules

- [ ] Before vendor accepts: customer can cancel
- [ ] After vendor accepts: admin approval required
- [ ] After rider pickup: cancellation normally not allowed
- [ ] Vendor reject: auto-cancel order
- [ ] Rider unavailable: admin reassigns or cancels
- [ ] Food safety issue: admin can cancel and pause vendor if needed

### 8.2 Refund / Adjustment Rules for MVP

Since MVP uses COD/UPI on delivery:

- [ ] If no payment collected, mark order cancelled/failed
- [ ] If over-collected, admin records adjustment
- [ ] If short-collected, admin records short collection
- [ ] If bad quality complaint is valid, admin can record partial adjustment
- [ ] If item missing, admin can record refund/discount/credit note manually
- [ ] Refunds are manual in MVP

### 8.3 Required Fields

- adjustment_id
- order_id
- customer_id
- vendor_id
- adjustment_type
- reason
- amount
- approved_by_admin_id
- proof_file_url nullable
- status
- created_at

---

## 9. Payment Collection and Reconciliation Checklist

### 9.1 Allowed MVP Payment Methods

Allowed:

- COD
- UPI on delivery

Not allowed in MVP unless CA/legal reviewed:

- Full online prepaid order payment
- Wallet
- QuickGO credit
- Subscription billing

### 9.2 Collector Model

Every payment collection must record:

- collector_type: RIDER / VENDOR / QUICKGO_ADMIN / QUICKGO_QR
- collector_id
- amount_expected
- amount_collected
- payment_method
- collection_time
- collection_proof nullable
- payment_status
- reconciliation_status

### 9.3 Reconciliation Status

Use these statuses:

- PENDING_COLLECTION
- COLLECTED
- SHORT_COLLECTED
- OVER_COLLECTED
- FAILED_COLLECTION
- RECONCILED
- DISPUTED

### 9.4 Daily Closing Checklist

Every day admin must verify:

- [ ] Total orders
- [ ] Delivered orders
- [ ] Cancelled orders
- [ ] Payment collected orders
- [ ] Cash collected by rider
- [ ] Cash collected by vendor
- [ ] UPI collected by vendor
- [ ] UPI collected by QuickGO QR
- [ ] Short/over collection cases
- [ ] Vendor payouts due
- [ ] Rider payouts due
- [ ] Support issues pending

---

## 10. Vendor Agreement Checklist

Vendor agreement must cover:

- [ ] Vendor legal name and owner details
- [ ] Shop address
- [ ] FSSAI/GST responsibility
- [ ] Product quality responsibility
- [ ] Hygiene responsibility
- [ ] Packaging responsibility
- [ ] Accurate price responsibility
- [ ] Fresh item weight/quantity responsibility
- [ ] Substitution rule
- [ ] Commission rule
- [ ] Payment settlement cycle
- [ ] Cancellation responsibility
- [ ] Complaint cooperation
- [ ] Misleading listing prohibition
- [ ] Customer data confidentiality
- [ ] Vendor suspension/pause rule
- [ ] Termination rights

### 10.1 Vendor Suspension Triggers

Vendor can be paused if:

- FSSAI expired/rejected
- Repeated bad quality complaints
- Food safety incident
- Repeated price mismatch
- Repeated order rejection
- Fraudulent listing
- Abusive behaviour
- Unauthorized substitution

---

## 11. Rider Agreement Checklist

Rider agreement must cover:

- [ ] Rider identity details
- [ ] Phone number
- [ ] Vehicle details
- [ ] License requirement where applicable
- [ ] KYC/manual verification
- [ ] Independent delivery partner status
- [ ] Payout rules
- [ ] Food handling rules
- [ ] Customer/vendor conduct rules
- [ ] Cash/UPI collection rules
- [ ] Delivery proof/PIN rules
- [ ] False delivery prohibition
- [ ] Safety responsibility
- [ ] Fraud prevention
- [ ] Data confidentiality
- [ ] Suspension/termination rule

### 11.1 Rider KYC Fields

- rider_id
- full_name
- phone
- address
- vehicle_type
- vehicle_number nullable
- driving_license_number nullable
- id_proof_type
- id_proof_file_url
- emergency_contact
- verification_status
- verified_by_admin_id
- verified_at

### 11.2 Rider Suspension Triggers

Rider can be paused if:

- False delivery
- Cash mismatch
- Repeated late delivery
- Customer complaint
- Vendor complaint
- Misconduct
- Unsafe driving/handling
- Fraud attempt

---

## 12. Privacy and DPDP Readiness Checklist

QuickGO processes personal data: customer phone, address, location, order history, vendor data, rider data, support complaints, payment collection records, and device/session information.

### 12.1 Privacy Requirements

QuickGO must:

- [ ] Show privacy notice during signup
- [ ] Explain purpose of data collection
- [ ] Collect only required data
- [ ] Avoid unnecessary contact-list permission
- [ ] Avoid unnecessary background location collection in MVP
- [ ] Mask customer phone/address where possible
- [ ] Limit vendor/rider visibility to active order data only
- [ ] Keep admin access role-based
- [ ] Maintain audit logs for sensitive actions
- [ ] Support correction/deletion requests where legally possible
- [ ] Maintain data retention policy
- [ ] Maintain incident/breach response process

### 12.2 Privacy Request Types

- DATA_ACCESS_REQUEST
- DATA_CORRECTION_REQUEST
- DATA_DELETION_REQUEST
- CONSENT_WITHDRAWAL_REQUEST
- ACCOUNT_DEACTIVATION_REQUEST

### 12.3 Personal Data Access Rules

- Vendor sees customer phone/address only for accepted active order
- Rider sees customer phone/address only for assigned active order
- Admin sees full details only with authorized role
- Support role sees masked data unless escalation requires full access
- Completed order data should be protected from unnecessary exposure

---

## 13. Legal Metrology and Packaged Goods Checklist

This is mostly future-proofing for kirana/packaged goods, but database fields should support it early.

### 13.1 When Applicable

Applies when QuickGO lists packaged goods such as:

- Packaged dairy
- Branded groceries
- Packaged snacks
- Packaged fruits/dry fruits
- Kirana items
- FMCG items

### 13.2 Required Product Fields for Packaged Goods

- MRP
- Selling price
- Net quantity
- Unit
- Common/generic name
- Brand
- Manufacturer/packer/importer name
- Manufacturer/packer/importer address
- Country of origin where applicable
- Manufacture/packing date where applicable
- Expiry/best-before/use-by date where applicable
- Batch/lot number where applicable
- Consumer care details where applicable
- Product label image where applicable

### 13.3 MVP Rule

For MVP restaurant/fresh categories:

- Use clear unit price: kg, gram, piece, bunch, litre, packet
- Show price last updated time
- Block stale prices
- Confirm substitutions
- Store fulfilled quantity

---

## 14. Food Safety Incident Checklist

### 14.1 Incident Types

- SUSPECTED_FOOD_POISONING
- SPOILED_FOOD
- CONTAMINATED_FOOD
- WRONG_NON_VEG_OR_ALLERGEN
- FOREIGN_OBJECT_FOUND
- REPEATED_BAD_QUALITY
- HYGIENE_COMPLAINT

### 14.2 Immediate Actions

- [ ] Create support ticket
- [ ] Mark incident severity
- [ ] Contact customer
- [ ] Capture photos/proof
- [ ] Pause vendor temporarily if serious
- [ ] Contact vendor
- [ ] Preserve order snapshot
- [ ] Record refund/adjustment decision
- [ ] Escalate to founder/admin

### 14.3 Severity Levels

- SEV_1: Serious food safety or legal risk
- SEV_2: Major customer complaint / repeated vendor issue
- SEV_3: Normal quality complaint
- SEV_4: Minor support issue

---

## 15. Product and Pricing Compliance Checklist

### 15.1 Fresh Item Price Rules

- [ ] Vendor/admin must update fresh prices daily
- [ ] Customer app must show price last updated time
- [ ] Stale price should be blocked or flagged
- [ ] Final fulfilled quantity must be stored
- [ ] Customer must approve substitution before replacement
- [ ] Partial fulfilment must be visible to admin/customer

### 15.2 Restaurant Menu Rules

- [ ] Price must be clear
- [ ] Availability status must be clear
- [ ] Veg/non-veg indicator should be supported
- [ ] Packaging charge should be shown if used
- [ ] Misleading food images should be avoided

---

## 16. Platform Policy Checklist

### 16.1 Customer Policies

Must create:

- Terms & Conditions
- Privacy Policy
- Refund & Cancellation Policy
- Delivery Policy
- Support/Grievance Policy

### 16.2 Vendor Policies

Must create:

- Vendor Onboarding Policy
- Food Safety Policy
- Product Listing Policy
- Pricing Policy
- Substitution Policy
- Settlement Policy
- Vendor Suspension Policy

### 16.3 Rider Policies

Must create:

- Rider Onboarding Policy
- Delivery Conduct Policy
- Payment Collection Policy
- Delivery Proof Policy
- Rider Payout Policy
- Rider Suspension Policy

---

## 17. Records and Retention Checklist

QuickGO must preserve key records for audit and dispute resolution.

### 17.1 Records to Keep

- User profiles
- Vendor compliance records
- Rider KYC records
- Orders
- Order snapshots
- Payment collections
- Reconciliation logs
- Vendor payouts
- Rider payouts
- Support tickets
- Food safety incidents
- Refund/adjustment records
- Admin audit logs
- Privacy requests
- Consent records
- Release notes
- Incident reports

### 17.2 Retention Policy Placeholder

Retention policy must be finalized with lawyer/CA.

Suggested operational default until reviewed:

- Order records: retain for business/tax audit period as advised by CA
- Vendor compliance: retain while active and for post-termination dispute period
- Rider KYC: retain while active and for post-termination dispute period
- Support tickets: retain for dispute history
- Privacy requests: retain as compliance evidence

---

## 18. Admin Compliance Features Checklist

Admin Panel must include:

- [ ] Vendor compliance document upload
- [ ] FSSAI status tracking
- [ ] GST/tax detail fields
- [ ] Rider KYC document upload
- [ ] Vendor pause/unpause
- [ ] Rider pause/unpause
- [ ] Order cancellation reason
- [ ] Support ticket lifecycle
- [ ] Food safety incident flag
- [ ] Payment collection status
- [ ] Reconciliation status
- [ ] Vendor payout status
- [ ] Rider payout status
- [ ] Audit logs
- [ ] Privacy request tracking
- [ ] Daily closing report

---

## 19. Pre-Launch Compliance Gate

QuickGO cannot go public until these are done:

- [ ] Legal name/entity decision made
- [ ] Vendor agreement drafted
- [ ] Rider agreement drafted
- [ ] Terms & Conditions drafted
- [ ] Privacy Policy drafted
- [ ] Refund/Cancellation Policy drafted
- [ ] Delivery Policy drafted
- [ ] Grievance contact defined
- [ ] FSSAI vendor onboarding fields implemented
- [ ] Vendor FSSAI verification process tested
- [ ] Payment reconciliation flow tested
- [ ] GST model reviewed or marked as beta-limited pending review
- [ ] Admin audit logs working
- [ ] Support ticket workflow working
- [ ] Data access restrictions tested

---

## 20. MVP Exclusion Compliance Lock

The following are not allowed in Production MVP:

- Railway/train food ordering
- Train food waitlist/card
- PNR collection
- Train number collection
- Coach/seat collection
- Platform/seat delivery promise
- Agri exchange
- QuickGO Delivery OS
- Subscription billing
- Wallet
- Referral rewards
- Loyalty points
- Auto-dispatch
- Live rider tracking
- Dark store inventory
- Warehouse operations
- iOS public launch
- Separate vendor app
- Separate rider app

Any attempt to add these requires a new PRD version and founder approval.

---

## 21. Compliance Risk Register

| Risk | Severity | Mitigation |
|---|---:|---|
| Vendor has no valid FSSAI | High | Do not list publicly until reviewed |
| GST model wrong | High | CA review before online payment/full launch |
| Food quality complaint | High | Ticket + proof + vendor pause rule |
| Customer data misuse | High | PII masking + RBAC + audit logs |
| Rider false delivery | High | Delivery proof/PIN + admin review |
| Cash mismatch | High | Collector model + daily reconciliation |
| Price mismatch in fresh items | Medium | Daily price update + stale price block |
| Unauthorized substitution | Medium | Customer confirmation required |
| Complaint not handled | Medium | SLA tracking and escalation |
| Packaged goods label missing | Medium | Do not launch kirana until fields ready |
| Legal policy missing | High | Policy pages required before public launch |

---

## 22. Official Reference Links

Use these as official/current references during legal and CA review:

1. FSSAI e-commerce food advisory: https://www.fssai.gov.in/upload/advisories/2024/12/674efa161d756Adobe%20Scan%203%20Dec%202024.pdf
2. FoSCoS/FSSAI portal: https://foscos.fssai.gov.in/
3. Consumer Protection (E-Commerce) Rules, 2020: https://thc.nic.in/Central%20Governmental%20Rules/Consumer%20Protection%20%28E-Commerce%29%20Rules%2C%202020.pdf
4. CBIC Circular 167/23/2021-GST on restaurant services through e-commerce operators: https://cbic-gst.gov.in/pdf/Circular-167-17-12-2021-GST.pdf
5. DPDP Act / MeitY data protection framework: https://www.meity.gov.in/data-protection-framework
6. Legal Metrology overview: https://consumeraffairs.gov.in/pages/legal-metrology-overview
7. PIB packaged commodity mandatory declaration summary: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2033114&lang=2&reg=3
8. Google Play closed testing requirement: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en

---

## 23. Final Compliance Decision

QuickGO Production MVP may proceed only as a limited local market playground with:

- Customer App
- Partner App
- Admin Web Panel
- Backend API
- Manual Dispatch
- COD/UPI on Delivery
- Payment Reconciliation
- Vendor/Rider Compliance-Ready Onboarding
- Support Workflow
- Validation Dashboard

The MVP should not become a full public scale food/e-commerce platform until FSSAI, GST, privacy, agreements, and payment flow are professionally reviewed.

**Final rule:** Build compliance records from day one, even if the launch is small.
