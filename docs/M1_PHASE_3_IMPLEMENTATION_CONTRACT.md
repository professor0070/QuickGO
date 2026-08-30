# QuickGO M1 Phase 3 — Implementation Contract

**Version**: 3.0
**Status**: PLANNING ONLY — NO IMPLEMENTATION PERFORMED
**Timestamp**: 2026-07-17T17:00:00+05:30

---

## 1. Executive Summary

Phase 3 connects the validated Phase 1/2 backend media, compliance, and lifecycle foundations with the Partner App, Customer App, and Admin Panel UIs. The smallest safe Phase 3 delivers:

1. Vendor/Rider profile-image management (upload, replace, remove)
2. Vendor product-image capture, upload, replacement, and removal
3. Customer-side product-image rendering with placeholder/error states
4. Partner document upload UX replacing free-text URL input
5. Minimum Admin document-review integration
6. Camera/gallery/file-picker reliability
7. Verification-status and lifecycle-state display
8. Relevant form, keyboard, and navigation UX corrections

**No schema changes are required.** All Phase 3 features connect to existing Phase 1/2 backend APIs and Prisma models.

---

## 2. Execution Safety Report

| Check | Result |
|:---|:---|
| Application code modified | **NO** |
| Prisma schema modified | **NO** |
| Migrations created | **NO** |
| Dependencies installed | **NO** |
| Database mutated | **NO** |
| Git operations performed | **NO** |
| Commands classified | READ_ONLY only |

---

## 3. Repository Evidence

| Fact | Value | Label |
|:---|:---|:---|
| Repository root | `D:\QuickGO` | VERIFIED FACT |
| Active branch | `main` | VERIFIED FACT |
| Git status | Multiple unstaged M1 Phase 1/2 changes | VERIFIED FACT |
| Backend root | `backend/` | VERIFIED FACT |
| Partner App root | `mobile/partner_app/` | VERIFIED FACT |
| Customer App root | `mobile/customer_app/` | VERIFIED FACT |
| Admin Panel root | `web/admin_panel/` | VERIFIED FACT |
| Shared API client | `mobile/packages/shared_api/` | VERIFIED FACT |
| Shared UI | `mobile/packages/shared_ui/` | VERIFIED FACT |
| Prisma schema | `backend/prisma/schema.prisma` (1221 lines) | VERIFIED FACT |
| Committed migrations | 4 new M1 migrations | VERIFIED FACT |

---

## 4. Git State

- Branch: `main`
- Dirty files: 64 modified (M), 17 untracked (??)
- All uncommitted changes are from M1 Phase 1/2 implementation
- No merge conflicts detected

---

## 5. Milestone Provenance

Phase 3 originates from the user's original M1 prompt (Section 14, "PHASE 3 — PARTNER APP"). It was defined as a **phase gate instruction**, not an independently approved contract. This document serves as the formal Phase 3 contract requiring explicit user approval before implementation begins.

---

## 6. Frozen Phase 1/2 Matrix

| Capability | Status | Location |
|:---|:---|:---|
| AES-256-GCM bank-detail encryption | VERIFIED AND REUSABLE | `crypto.util.ts` |
| Encryption-key validation | VERIFIED AND REUSABLE | `crypto.util.ts` |
| Fail-closed encryption behavior | VERIFIED AND REUSABLE | `crypto.util.spec.ts` |
| Bank-detail maker-checker workflow | VERIFIED AND REUSABLE | `admin.service.ts` |
| Bank-detail version history | VERIFIED AND REUSABLE | `BankDetailVersion` model |
| Compliance-document replacement | VERIFIED AND REUSABLE | `uploads.service.ts` |
| Compliance-document versioning | VERIFIED AND REUSABLE | `uploads.service.ts` (transaction) |
| Compliance-document supersession | VERIFIED AND REUSABLE | `supersededByDocumentId` field |
| Document expiry processing | VERIFIED AND REUSABLE | `admin.service.ts` |
| Verified-badge computation | VERIFIED AND REUSABLE | `catalog.service.ts` |
| Partner suspension | VERIFIED AND REUSABLE | `admin.controller.ts` L588 |
| Partner reinstatement | VERIFIED AND REUSABLE | `admin.controller.ts` L600 |
| Agreement termination | VERIFIED AND REUSABLE | `admin.controller.ts` L612 |
| Operational blocking | VERIFIED AND REUSABLE | `vendors.service.ts` |
| Role isolation | VERIFIED AND REUSABLE | `@Roles()` decorator |
| Zone-scope authorization | VERIFIED AND REUSABLE | `zone-scope.guard.ts` |
| Audit logging | VERIFIED AND REUSABLE | `AuditLog` model |
| Domain events | VERIFIED AND REUSABLE | `domain-event-bus.service.ts` |
| Upload validation (MIME+magic) | VERIFIED AND REUSABLE | `uploads.controller.ts` |
| EXIF removal | VERIFIED AND REUSABLE | `stripExifJpeg/stripExifPng` |
| Orphan-file cleanup | VERIFIED AND REUSABLE | `uploads.service.ts` catch blocks |
| Storage abstraction | VERIFIED AND REUSABLE | `LocalFileStorageService`, `CloudinaryFileStorageService` |

**No defects found in frozen capabilities. No changes proposed.**

---

## 7. Backend Capability Matrix

### Upload Routes (all READY AND VERIFIED)

| Route | Method | Controller | Roles | Status |
|:---|:---|:---|:---|:---|
| `profile/avatar` | POST | UploadsController | Any authenticated | READY |
| `profile/avatar` | DELETE | UploadsController | Any authenticated | READY |
| `vendor/products/:productId/image` | POST | UploadsController | VENDOR_OWNER, VENDOR_STAFF | READY |
| `admin/products/:productId/image` | POST | UploadsController | ADMIN, SUPER_ADMIN | READY |
| `partner/documents/upload` | POST | UploadsController | RIDER, VENDOR_OWNER, VENDOR_STAFF | READY |
| `admin/vendors/:vendorId/compliance-documents/upload` | POST | UploadsController | ADMIN, SUPER_ADMIN | READY |
| `admin/riders/:riderId/kyc-documents/upload` | POST | UploadsController | ADMIN, SUPER_ADMIN | READY |

### Admin Document Review Routes (all READY AND VERIFIED)

| Route | Method | Status |
|:---|:---|:---|
| `admin/vendors/:vendorId/compliance-documents` | GET | READY |
| `admin/riders/:riderId/kyc-documents` | GET | READY |
| `admin/vendor-compliance-documents/:documentId/review` | PATCH | READY |
| `admin/rider-kyc-documents/:documentId/review` | PATCH | READY |
| `admin/compliance-documents/:documentId/view` | GET | READY (secure stream) |
| `admin/compliance-documents/process-expiries` | POST | READY |

### Partner-Facing Routes (all READY AND VERIFIED)

| Route | Method | Status |
|:---|:---|:---|
| `vendor/profile` | GET | READY |
| `vendor/compliance-documents` | GET | READY |
| `vendor/products` | GET | READY |
| `rider/profile` | GET | READY |
| `rider/kyc-documents` | GET | READY |

### Bank Detail Routes (READY — Phase 3 UI CONDITIONAL)

| Route | Method | Status |
|:---|:---|:---|
| `vendor/bank-details` | POST | READY |
| `rider/bank-details` | POST | READY |
| `admin/vendors/:vendorId/bank-details` | GET | READY |
| `admin/riders/:riderId/bank-details` | GET | READY |
| `admin/bank-detail-versions/:versionId/review` | PATCH | READY |

### Lifecycle Routes (all READY AND VERIFIED)

| Route | Method | Status |
|:---|:---|:---|
| `admin/partners/:partnerId/suspend` | PATCH | READY |
| `admin/partners/:partnerId/reinstate` | PATCH | READY |
| `admin/partners/:partnerId/terminate` | PATCH | READY |

---

## 8. Partner App Capability Inventory

### Current Vendor Mode (`vendor_mode_screen.dart` — 1261 lines)
- ✅ 4-tab navigation (Dashboard, Orders, Catalog, Profile)
- ✅ Product form with `_ProductFormDialog` (line 747+)
- ✅ Product image picker — camera + gallery (`_pickImage`, line 828)
- ✅ Product image upload to `/vendor/products/:id/image` (line 854)
- ✅ Product image removal via PATCH (line 894)
- ✅ Product image preview in form (line 774+)
- ✅ Compliance document upload dialog (line 42+)
- ✅ Compliance status display (line 640+)
- ✅ Verified badge display (line 597+)
- ❌ No profile avatar upload/replace/remove UI
- ❌ No camera permission handling
- ❌ No permanent-denial Settings redirect
- ❌ No upload progress indicator
- ❌ No document rejection reason display
- ❌ No document expiry display
- ❌ Document type is free-text input, not dropdown

### Current Rider Mode (`rider_mode_screen.dart` — 897 lines)
- ✅ 4-tab navigation
- ✅ KYC document upload dialog (line 123+)
- ✅ Uses `/partner/documents/upload` route
- ✅ KYC document status display
- ✅ Profile edit dialog (line 63+)
- ❌ No profile avatar upload/replace/remove UI
- ❌ No camera source option (gallery only)
- ❌ No upload progress indicator
- ❌ No document rejection reason display
- ❌ Document type is free-text input

### Shared API Client (`quickgo_api_client.dart`)
- ✅ `uploadFile()` method with multipart support
- ✅ Bearer token management
- ❌ No upload progress callback
- ❌ No retry mechanism

### Dependencies
- ✅ `image_picker: ^1.1.2` already in both apps
- ❌ No `permission_handler` package
- ❌ No `cached_network_image` package

---

## 9. Customer App Image Capability Inventory

### Product Card (`product_card.dart`)
- ✅ Renders `imageUrl` via `Image.network` with `resolveMediaUrl()` (line 56–76)
- ✅ Loading indicator (CircularProgressIndicator)
- ✅ Error builder (broken_image icon)
- ✅ Placeholder when no image (shopping_bag icon)
- ❌ No `cached_network_image` (uses raw `Image.network`)

### Product Detail (`product_detail_screen.dart`)
- ✅ Renders `imageUrl` with `resolveMediaUrl()` (line 86–108)
- ✅ Loading indicator
- ✅ Error builder
- ✅ Placeholder
- ❌ No cache strategy

### Utils (`utils.dart`)
- ✅ `resolveMediaUrl()` correctly resolves relative paths to API base

---

## 10. Admin Panel Capability Inventory

- Single page: `web/admin_panel/app/page.tsx` (173,026 bytes)
- Framework: Next.js with Tailwind CSS
- Current capabilities include vendor/rider management, order management, compliance documents, bank details
- **REQUIRES AUDIT** of existing document review, verification badge, and lifecycle display code
- This is a very large single-file application

---

## 11. Phase 3 Core Scope

| ID | Requirement | Classification |
|:---|:---|:---|
| P3-01 | Vendor profile image upload/replace/remove | PHASE 3 CORE |
| P3-02 | Rider profile image upload/replace/remove | PHASE 3 CORE |
| P3-03 | Vendor product image camera capture | ALREADY COMPLETE — EXISTS in `_pickImage()` |
| P3-04 | Vendor product image gallery selection | ALREADY COMPLETE — EXISTS in `_pickImage()` |
| P3-05 | Vendor product image upload to backend | ALREADY COMPLETE — EXISTS but needs hardening |
| P3-06 | Vendor product image replacement | ALREADY COMPLETE — EXISTS |
| P3-07 | Vendor product image removal | ALREADY COMPLETE — EXISTS in `_clearImage()` |
| P3-08 | Customer product card image display | ALREADY COMPLETE — EXISTS |
| P3-09 | Customer product detail image display | ALREADY COMPLETE — EXISTS |
| P3-10 | Missing image placeholder | ALREADY COMPLETE — EXISTS |
| P3-11 | Broken image error state | ALREADY COMPLETE — EXISTS |
| P3-12 | Document type dropdown selector | PHASE 3 CORE |
| P3-13 | Camera permission handling | PHASE 3 CORE |
| P3-14 | Permanent denial → Settings redirect | PHASE 3 CORE |
| P3-15 | Upload progress indicator | PHASE 3 CORE |
| P3-16 | Duplicate-submit prevention | PHASE 3 CORE |
| P3-17 | Document rejection reason display | PHASE 3 CORE |
| P3-18 | Document expiry date display | PHASE 3 CORE |
| P3-19 | Document version history awareness | PHASE 3 CORE |
| P3-20 | Partner verification badge display | ALREADY COMPLETE — basic badge exists |
| P3-21 | Suspended/terminated state display | PHASE 3 CORE |
| P3-22 | Minimum Admin doc review integration | PHASE 3 CORE |
| P3-23 | Admin secure document preview | PHASE 3 REQUIRED DEPENDENCY |
| P3-24 | Admin approve/reject with reason | PHASE 3 REQUIRED DEPENDENCY |
| P3-25 | Cached network images | PHASE 3 CORE |
| P3-26 | Android CAMERA permission declaration | PHASE 3 CORE |
| P3-27 | Image compression before upload | ALREADY COMPLETE — `maxWidth:1600, imageQuality:85` |
| P3-28 | Form keyboard safety | PHASE 3 CORE |
| P3-29 | Upload retry on failure | PHASE 3 CORE |

---

## 12. Later Milestones (Deferred)

| Item | Classification | Reason |
|:---|:---|:---|
| Customer profile-picture upload | LATER MILESTONE | Not core to partner media delivery |
| Complete Admin Panel redesign | LATER MILESTONE | Phase 3 needs minimum integration only |
| Zone Admin management UI | LATER MILESTONE | Backend exists; full UI is Phase 5 |
| Service-zone creation UI | LATER MILESTONE | Phase 5 |
| Bank-detail Partner UI | PRODUCT DECISION REQUIRED | Backend ready but scope risk |
| Real MSG91 OTP | OUT OF SCOPE | Infrastructure dependency |
| Real FCM delivery | OUT OF SCOPE | Infrastructure dependency |
| Production cloud storage | OUT OF SCOPE | Configuration-only at deploy time |
| iOS release | OUT OF SCOPE | No iOS configuration exists |
| Malware scanning provider | DEFERRED INFRASTRUCTURE | Hook exists; provider not required locally |

---

## 13. Data Model Assessment

**NO SCHEMA CHANGES REQUIRED.**

All Phase 3 features consume existing models:

| Model | Phase 3 Usage | Status |
|:---|:---|:---|
| `User` (avatarUrl, avatarStorageKey, etc.) | Profile image | EXISTS |
| `Product` (imageUrl, imageStorageKey, etc.) | Product image | EXISTS |
| `VendorComplianceDocument` | Vendor doc upload | EXISTS |
| `RiderKycDocument` | Rider doc upload | EXISTS |
| `BankDetails` / `BankDetailVersion` | Bank detail UI (conditional) | EXISTS |
| `AuditLog` | Audit trail | EXISTS |

---

## 14. Product Decisions Required

| Decision | Current Behavior | Options | Recommendation | Phase 3 Blocking |
|:---|:---|:---|:---|:---|
| Single product image vs gallery | Single `imageUrl` | A) Keep single B) Add gallery | **A) Keep single** — schema supports only one | No |
| Product image mandatory | Optional (`imageUrl` nullable) | A) Keep optional B) Make required | **A) Keep optional** — existing products have no image | No |
| Max image file size | 3MB product, 5MB client-side | A) Keep B) Increase to 5MB | **A) Keep current** limits | No |
| Allowed image types | JPEG, PNG, WebP | A) Keep B) Add HEIF | **A) Keep** — HEIF needs server processing | No |
| Vendor profile image public? | Avatar stored on `User` model | A) Public B) Private | **A) Public** — same as product images | No |
| Bank-detail UI in Phase 3? | Backend ready, no UI | A) Include B) Defer | **B) Defer** to Phase 4 or separate milestone | No |
| Document types dropdown values | Free-text input | A) Client hardcoded B) Backend-driven | **A) Client list initially** — backend has no requirement model yet | No |
| Hindi localization scope | No localization exists | A) English only B) English+Hindi | **A) English only** — add localization structure, defer translations | No |

---

## 15. Recommended Implementation Checkpoints

### Checkpoint 1: Shared Media Foundation
- **Objective**: Create reusable image picker, upload progress, permission handling, and cached image widgets
- **Scope**: `shared_ui` and `shared_api` packages only
- **Entry**: Phase 3 contract approved
- **Exit**: Widget tests pass; `flutter analyze` clean

### Checkpoint 2: Partner Profile Image
- **Objective**: Vendor and Rider can upload, replace, remove profile avatars
- **Scope**: `vendor_mode_screen.dart`, `rider_mode_screen.dart` profile tabs
- **API**: `POST profile/avatar`, `DELETE profile/avatar`
- **Exit**: Avatar persists after app restart; placeholder shown when absent

### Checkpoint 3: Vendor Product Image Hardening
- **Objective**: Harden existing product image flow with progress, retry, permission handling
- **Scope**: `_ProductFormDialog` in `vendor_mode_screen.dart`
- **API**: `POST vendor/products/:id/image` (existing)
- **Exit**: Camera + gallery work; progress visible; retry works; no duplicate submit

### Checkpoint 4: Document Upload UX
- **Objective**: Replace free-text document dialogs with proper upload UX
- **Scope**: Vendor compliance dialog, Rider KYC dialog
- **API**: `POST partner/documents/upload` (existing)
- **Exit**: Document type dropdown; rejection reason visible; expiry visible; upload progress

### Checkpoint 5: Customer Product Image
- **Objective**: Add cached image loading to product cards and detail screen
- **Scope**: `product_card.dart`, `product_detail_screen.dart`
- **API**: No change (imageUrl already in product response)
- **Exit**: Images load with cache; placeholder/error states work

### Checkpoint 6: Minimum Admin Document Review
- **Objective**: Ensure Admin Panel can review, approve, reject partner documents
- **Scope**: `web/admin_panel/app/page.tsx`
- **API**: Existing admin document review routes
- **Exit**: Documents visible under partner profile; approve/reject works

### Checkpoint 7: UX Polish and Android Permissions
- **Objective**: Camera permission declaration, keyboard safety, navigation fixes
- **Scope**: AndroidManifest, form layouts, bottom navigation
- **Exit**: No RenderFlex overflow; keyboard doesn't hide actions

### Checkpoint 8: Testing and Certification
- **Objective**: Run all automated tests; document manual device checks
- **Exit**: `flutter analyze` clean; backend tests pass; manual checklist documented

---

## 16. Acceptance Criteria

1. Vendor can upload profile image from camera or gallery
2. Vendor can replace and remove profile image
3. Rider can upload profile image from camera or gallery
4. Rider can replace and remove profile image
5. Vendor product image upload works with camera and gallery
6. Product image replacement preserves existing image until success
7. Product image removal works with confirmation
8. Customer product card shows image or stable placeholder
9. Customer product detail shows image correctly
10. Missing-image placeholder renders without layout shift
11. Broken image URL shows error icon, not crash
12. Document type uses dropdown selector, not free-text
13. Android camera permission is declared and requested
14. Permanent denial shows Settings redirect action
15. Upload progress is visible during upload
16. Duplicate tap prevention blocks double submission
17. Document rejection reason is visible to partner
18. Document expiry date is displayed
19. Suspended partner sees restriction explanation
20. Terminated partner sees termination state
21. Admin can see partner documents under profile
22. Admin can approve documents
23. Admin can reject documents with mandatory reason
24. Anonymous private-file request returns 401
25. Cross-partner document access returns 403
26. Cross-zone document access returns 403
27. Vendor/Rider navigation remains isolated
28. No RenderFlex overflow at standard screen widths
29. Keyboard does not hide primary action button
30. Phase 1/2 backend regression tests still pass
31. `flutter analyze` passes for both apps
32. No paid provider required locally
33. Existing clients remain backward-compatible
34. No hardcoded user-visible strings (localization-ready structure)
35. Accessibility semantic labels on interactive elements
36. Private documents not cached in public storage

---

## 17. Risk Register (Summary)

| Risk | Severity | Mitigation |
|:---|:---|:---|
| Camera permission not declared in AndroidManifest | HIGH | Add `<uses-permission android:name="android.permission.CAMERA"/>` |
| No `permission_handler` package for runtime checks | MEDIUM | Add dependency; implement permission flow |
| Large product images may OOM on low-end devices | MEDIUM | `maxWidth: 1600`, `imageQuality: 85` already set; add `cached_network_image` |
| Admin Panel is single 173KB file | MEDIUM | Scope Phase 3 admin work narrowly |
| Document type free-text allows invalid types | MEDIUM | Replace with dropdown |
| No upload progress in shared API client | MEDIUM | Add `onSendProgress` callback to `uploadFile()` |
| Private document URLs could be cached by HTTP client | LOW | Backend already sets `Cache-Control: no-store` |
| `image_picker` on Android 14+ needs photo picker | LOW | `image_picker: ^1.1.2` already supports modern picker |

---

## 18. File-Change Forecast

### New Files
| File | Purpose |
|:---|:---|
| `mobile/packages/shared_ui/lib/src/image_picker_sheet.dart` | Reusable camera/gallery picker bottom sheet |
| `mobile/packages/shared_ui/lib/src/upload_progress_widget.dart` | Upload progress indicator widget |
| `mobile/packages/shared_ui/lib/src/cached_image.dart` | Cached network image wrapper |
| `mobile/packages/shared_ui/lib/src/avatar_widget.dart` | Profile avatar with edit overlay |
| `mobile/packages/shared_ui/lib/src/document_type_selector.dart` | Document type dropdown |
| `mobile/packages/shared_ui/lib/src/permission_handler.dart` | Camera/storage permission utilities |

### Modified Files
| File | Change |
|:---|:---|
| `mobile/partner_app/pubspec.yaml` | Add `permission_handler`, `cached_network_image` |
| `mobile/customer_app/pubspec.yaml` | Add `cached_network_image` |
| `mobile/packages/shared_ui/pubspec.yaml` | Add `cached_network_image`, `permission_handler` |
| `mobile/packages/shared_api/lib/quickgo_api_client.dart` | Add upload progress callback |
| `mobile/partner_app/lib/src/screens/vendor_mode_screen.dart` | Add avatar UI; harden product image flow |
| `mobile/partner_app/lib/src/screens/rider_mode_screen.dart` | Add avatar UI; harden KYC upload |
| `mobile/partner_app/android/app/src/main/AndroidManifest.xml` | Add CAMERA permission |
| `mobile/customer_app/lib/src/widgets/product_card.dart` | Use cached image widget |
| `mobile/customer_app/lib/src/screens/product_detail_screen.dart` | Use cached image widget |
| `web/admin_panel/app/page.tsx` | Add document review UI section |

### Frozen Files (DO NOT MODIFY)
- `backend/prisma/schema.prisma`
- `backend/src/modules/uploads/uploads.service.ts`
- `backend/src/modules/uploads/uploads.controller.ts`
- `backend/src/modules/admin/admin.controller.ts`
- `backend/src/modules/admin/admin.service.ts`
- `backend/src/common/crypto.util.ts`
- All migration files
- All backend test files

---

## 19. Plan Quality-Gate Result

| Criterion | Status |
|:---|:---|
| Scope is bounded | ✅ |
| Core and later milestones separated | ✅ |
| Every requirement classified | ✅ |
| Traceability addressed | ✅ (detailed in supporting doc) |
| Phase 1/2 remains protected | ✅ |
| No false production claim | ✅ |
| No unresolved BLOCKER | ✅ |
| Product decisions explicit | ✅ |
| Schema changes justified | ✅ (none required) |
| Private-media security defined | ✅ (detailed in storage plan) |
| Role/zone rules mapped | ✅ (detailed in auth matrix) |
| API backward compatibility addressed | ✅ (no API changes) |
| Error contract defined | ✅ (detailed in error contract doc) |
| Acceptance criteria measurable | ✅ |
| First checkpoint independently auditable | ✅ |
| No implementation occurred | ✅ |
| Git diff shows no app-code changes | ✅ |

---

## 20. Final Verdict

**PASS — READY FOR USER REVIEW**

---

## 21. Exact Next User Command

```
APPROVE M1 PHASE 3 IMPLEMENTATION CONTRACT
```

or

```
REVISE M1 PHASE 3 IMPLEMENTATION CONTRACT
```
