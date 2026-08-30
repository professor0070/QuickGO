# QuickGO M1 Phase 3 — Requirement Traceability Matrix

**Document**: Supporting document for M1_PHASE_3_IMPLEMENTATION_CONTRACT.md
**Status**: PLANNING ONLY

---

## Traceability Key

| Column | Meaning |
|:---|:---|
| REQ-ID | Unique requirement identifier |
| Source | Origin (PRD, User Prompt, Repository) |
| Backend API | Backend route required |
| Backend Status | API readiness |
| Flutter Widget | Widget(s) involved |
| Admin Panel | Admin Panel involvement |
| Checkpoint | Implementation checkpoint |
| Acceptance Test | How to verify |

---

## Requirements Matrix

| REQ-ID | Requirement | Source | Backend API | Backend Status | Flutter Component | Checkpoint | Acceptance Test |
|:---|:---|:---|:---|:---|:---|:---|:---|
| P3-01 | Vendor profile image upload | PRD 08, User M1 Prompt | `POST profile/avatar` | READY | VendorModeScreen profile tab + AvatarWidget | CP-2 | Avatar displays after upload |
| P3-02 | Vendor profile image replace | PRD 08 | `POST profile/avatar` | READY | AvatarWidget | CP-2 | Old avatar replaced |
| P3-03 | Vendor profile image remove | PRD 08 | `DELETE profile/avatar` | READY | AvatarWidget | CP-2 | Placeholder shown after removal |
| P3-04 | Rider profile image upload | PRD 08, User M1 Prompt | `POST profile/avatar` | READY | RiderModeScreen profile tab + AvatarWidget | CP-2 | Avatar displays after upload |
| P3-05 | Rider profile image replace | PRD 08 | `POST profile/avatar` | READY | AvatarWidget | CP-2 | Old avatar replaced |
| P3-06 | Rider profile image remove | PRD 08 | `DELETE profile/avatar` | READY | AvatarWidget | CP-2 | Placeholder shown after removal |
| P3-07 | Vendor product image camera | PRD 08 | `POST vendor/products/:id/image` | READY | _ProductFormDialog (EXISTS) | CP-3 | Camera captures and uploads |
| P3-08 | Vendor product image gallery | PRD 08 | `POST vendor/products/:id/image` | READY | _ProductFormDialog (EXISTS) | CP-3 | Gallery picks and uploads |
| P3-09 | Product image replacement | PRD 08 | `POST vendor/products/:id/image` | READY | _ProductFormDialog (EXISTS) | CP-3 | New image replaces old |
| P3-10 | Product image removal | PRD 08 | `PATCH vendor/products/:id` | READY | _ProductFormDialog (EXISTS) | CP-3 | Image removed, placeholder shown |
| P3-11 | Customer product card image | PRD 07 | Product `imageUrl` in catalog response | READY | ProductCard (EXISTS) | CP-5 | Image renders in grid |
| P3-12 | Customer product detail image | PRD 07 | Product `imageUrl` in catalog response | READY | ProductDetailScreen (EXISTS) | CP-5 | Image renders in detail |
| P3-13 | Missing image placeholder | UX Standard | N/A | N/A | ProductCard, ProductDetailScreen (EXISTS) | CP-5 | Placeholder icon shown |
| P3-14 | Broken image error state | UX Standard | N/A | N/A | ProductCard, ProductDetailScreen (EXISTS) | CP-5 | Error icon shown |
| P3-15 | Document type dropdown | UX Improvement | N/A | N/A | DocumentTypeSelector (NEW) | CP-4 | Dropdown replaces free-text |
| P3-16 | Camera permission declaration | Android Requirement | N/A | N/A | AndroidManifest.xml | CP-7 | Permission declared |
| P3-17 | Camera permission request | Android Requirement | N/A | N/A | PermissionHandler (NEW) | CP-7 | User prompted at first use |
| P3-18 | Permission denial → Settings | UX Standard | N/A | N/A | PermissionHandler (NEW) | CP-7 | Settings link shown |
| P3-19 | Upload progress indicator | UX Standard | N/A | N/A | UploadProgressWidget (NEW) | CP-1 | Progress bar visible during upload |
| P3-20 | Duplicate submit prevention | UX/Safety | N/A | N/A | Submit button state | CP-3/CP-4 | Button disabled during upload |
| P3-21 | Document rejection reason display | PRD 08 | `GET vendor/compliance-documents` | READY | VendorModeScreen compliance tab | CP-4 | Rejection reason text visible |
| P3-22 | Document expiry date display | PRD 08 | `GET vendor/compliance-documents` | READY | VendorModeScreen compliance tab | CP-4 | Expiry date visible |
| P3-23 | Document version history awareness | PRD 08 | `supersededByDocumentId` in response | READY | VendorModeScreen compliance tab | CP-4 | "Replaced" label on old docs |
| P3-24 | Partner verification badge | PRD 08, User M1 Prompt | `vendor/profile` response | READY | VendorModeScreen (EXISTS) | CP-3 | Badge reflects verification state |
| P3-25 | Suspended state display | PRD 08 | `vendor/profile` response | READY | VendorModeScreen | CP-7 | Restriction banner visible |
| P3-26 | Terminated state display | PRD 08 | `vendor/profile` response | READY | VendorModeScreen | CP-7 | Termination notice visible |
| P3-27 | Admin doc review section | PRD 06 | `GET admin/vendors/:id/compliance-documents` | READY | Admin Panel page.tsx | CP-6 | Docs listed under vendor profile |
| P3-28 | Admin approve document | PRD 06 | `PATCH admin/vendor-compliance-documents/:id/review` | READY | Admin Panel page.tsx | CP-6 | Status changes to APPROVED |
| P3-29 | Admin reject with reason | PRD 06 | `PATCH admin/vendor-compliance-documents/:id/review` | READY | Admin Panel page.tsx | CP-6 | Reason required; status REJECTED |
| P3-30 | Cached network images | Performance | N/A | N/A | CachedImage widget (NEW) | CP-5 | Images load from cache on revisit |
| P3-31 | Keyboard safety | UX | N/A | N/A | Form layouts | CP-7 | No RenderFlex overflow |
| P3-32 | Upload retry on failure | UX/Reliability | N/A | N/A | Upload flow | CP-3 | Retry button on failure |
| P3-33 | Image loading builder | UX | N/A | N/A | CachedImage | CP-5 | Shimmer/spinner during load |
| P3-34 | API upload progress callback | API Enhancement | N/A | N/A | QuickGoApiClient | CP-1 | `onSendProgress` parameter |

---

## Coverage Summary

- **Total requirements**: 34
- **Already complete (EXISTS)**: 8
- **Phase 3 core work**: 26
- **Backend changes needed**: 0
- **Schema changes needed**: 0
- **New Flutter packages**: 2 (`cached_network_image`, `permission_handler`)
- **New shared widgets**: 6
