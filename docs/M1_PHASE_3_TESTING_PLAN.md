# QuickGO M1 Phase 3 — Testing and Verification Plan

**Document**: Supporting document for M1_PHASE_3_IMPLEMENTATION_CONTRACT.md
**Status**: PLANNING ONLY

---

## 1. Automated Test Strategy

### Backend Regression Tests (NO NEW BACKEND TESTS REQUIRED)

Phase 3 does not modify backend code. Existing tests must pass as regression gate.

| Test Suite | Command | Expected Result |
|:---|:---|:---|
| Unit tests | `cd backend && npm test` | 47+ tests pass |
| E2E tests | `cd backend && npm run test:e2e` | 17+ tests pass |
| Phase 2 E2E | `cd backend && npx jest phase2-features` | All pass |

### Flutter Static Analysis

| App | Command | Expected Result |
|:---|:---|:---|
| Customer App | `cd mobile/customer_app && flutter analyze` | 0 issues |
| Partner App | `cd mobile/partner_app && flutter analyze` | 0 issues |
| Shared UI | `cd mobile/packages/shared_ui && flutter analyze` | 0 issues |
| Shared API | `cd mobile/packages/shared_api && flutter analyze` | 0 issues |

### Flutter Widget Tests (NEW — Phase 3)

| Test File | Coverage |
|:---|:---|
| `shared_ui/test/image_picker_sheet_test.dart` | Camera/Gallery/Cancel options render; tap callbacks fire |
| `shared_ui/test/avatar_widget_test.dart` | Placeholder renders; edit overlay visible; tap fires callback |
| `shared_ui/test/cached_image_test.dart` | Placeholder shown when URL null; error widget on failure |
| `shared_ui/test/document_type_selector_test.dart` | All types render; selection callback fires |
| `shared_ui/test/upload_progress_widget_test.dart` | Progress bar renders; cancel callback fires |

---

## 2. Manual Test Checklist

### Profile Image (Vendor)

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-01 | Vendor uploads avatar from gallery | Profile tab → Edit Avatar → Gallery → Select image | Avatar displays; persists after refresh | ☐ |
| M-02 | Vendor uploads avatar from camera | Profile tab → Edit Avatar → Camera → Capture | Avatar displays; persists after refresh | ☐ |
| M-03 | Vendor replaces avatar | Profile tab → Edit Avatar → Select new image | New avatar replaces old | ☐ |
| M-04 | Vendor removes avatar | Profile tab → Edit Avatar → Remove | Placeholder icon shown | ☐ |
| M-05 | Upload progress visible | Upload large image (2MB+) | Progress bar visible during upload | ☐ |
| M-06 | Camera permission denied → retry | Deny camera → try camera → grant | Works after granting | ☐ |
| M-07 | Camera permanently denied → Settings | Permanently deny camera → try camera | Settings redirect shown | ☐ |

### Profile Image (Rider)

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-08 | Rider uploads avatar from gallery | Profile tab → Edit Avatar → Gallery | Avatar displays | ☐ |
| M-09 | Rider uploads avatar from camera | Profile tab → Edit Avatar → Camera | Avatar displays | ☐ |
| M-10 | Rider removes avatar | Profile tab → Edit Avatar → Remove | Placeholder icon shown | ☐ |

### Product Image (Vendor)

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-11 | Create product with image | Catalog → Add Product → Pick image → Save | Product created with image | ☐ |
| M-12 | Create product without image | Catalog → Add Product → Save (no image) | Product created with placeholder | ☐ |
| M-13 | Edit product → add image | Catalog → Edit Product → Pick image | Image uploaded and displayed | ☐ |
| M-14 | Edit product → replace image | Catalog → Edit Product → Pick new image | New image replaces old | ☐ |
| M-15 | Edit product → remove image | Catalog → Edit Product → Remove Image | Placeholder shown | ☐ |
| M-16 | Camera capture for product | Edit Product → Camera → Capture | Image uploaded | ☐ |
| M-17 | Image >3MB rejected | Pick oversized image | Error message shown | ☐ |
| M-18 | Non-image file rejected | Pick PDF (if possible via gallery) | Error message shown | ☐ |
| M-19 | Upload failure → retry | Disconnect network → upload → reconnect → retry | Upload succeeds on retry | ☐ |
| M-20 | Double-tap prevention | Tap submit twice quickly | Only one upload occurs | ☐ |

### Document Upload (Vendor)

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-21 | Upload compliance document | Profile → Upload → Select type → Pick file → Submit | Document appears in list with PENDING status | ☐ |
| M-22 | Document type is dropdown | Open upload dialog | Dropdown with FSSAI, GST, PAN, etc. | ☐ |
| M-23 | Rejection reason visible | After admin rejects → refresh | Rejection reason text shown | ☐ |
| M-24 | Expiry date visible | Upload doc with expiry → view list | Expiry date shown | ☐ |
| M-25 | Re-upload after rejection | View rejected doc → Upload new version | New doc replaces old; old marked superseded | ☐ |

### Document Upload (Rider)

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-26 | Upload KYC document | Profile → Upload KYC → Select type → Pick file | Document appears with PENDING status | ☐ |
| M-27 | KYC type is dropdown | Open upload dialog | Dropdown with ID_PROOF, ADDRESS_PROOF, etc. | ☐ |
| M-28 | KYC rejection reason visible | After admin rejects → refresh | Reason text shown | ☐ |

### Customer Product Images

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-29 | Product card shows image | Browse products with images | Images render correctly in grid | ☐ |
| M-30 | Product card placeholder | Browse product without image | Shopping bag icon shown | ☐ |
| M-31 | Product detail shows image | Tap product with image | Large image renders | ☐ |
| M-32 | Product detail placeholder | Tap product without image | Large placeholder shown | ☐ |
| M-33 | Broken image URL | Product with invalid imageUrl | Broken image icon shown (no crash) | ☐ |
| M-34 | Cached image on revisit | View product → scroll away → scroll back | Image loads instantly from cache | ☐ |

### Admin Document Review

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-35 | View vendor documents | Admin → Vendor profile → Documents section | Documents listed | ☐ |
| M-36 | Approve vendor document | Click Approve on pending document | Status changes to APPROVED | ☐ |
| M-37 | Reject vendor document | Click Reject → enter reason → submit | Status changes to REJECTED; reason saved | ☐ |
| M-38 | Reject without reason fails | Click Reject → submit with empty reason | Validation error | ☐ |
| M-39 | View document preview | Click document link/preview | Document renders in viewer/new tab | ☐ |
| M-40 | View rider KYC documents | Admin → Rider profile → KYC section | KYC documents listed | ☐ |

### Lifecycle State Display

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-41 | Suspended vendor sees banner | Admin suspends vendor → vendor refreshes | Suspension banner with reason | ☐ |
| M-42 | Terminated vendor sees notice | Admin terminates → vendor refreshes | Termination notice displayed | ☐ |
| M-43 | Suspended rider sees banner | Admin suspends rider → rider refreshes | Suspension banner | ☐ |

### Regression

| # | Test Case | Steps | Expected Result | Pass? |
|:---|:---|:---|:---|:---|
| M-44 | Vendor order flow works | Accept order → Prepare → Ready | Order progresses normally | ☐ |
| M-45 | Customer checkout works | Add to cart → Checkout → Place order | Order placed successfully | ☐ |
| M-46 | Rider delivery flow works | Accept assignment → Pick up → Deliver | Assignment completed | ☐ |
| M-47 | Admin panel loads | Navigate to admin panel | All sections render | ☐ |

---

## 3. Test Summary

| Category | Count |
|:---|:---|
| Backend regression (automated) | 64+ existing tests |
| Flutter static analysis | 4 apps/packages |
| New widget tests | 5 new test files |
| Manual test cases | 47 cases |
| **Total verification points** | **120+** |

---

## 4. Certification Exit Gate

Phase 3 is certified when:

1. ✅ All backend unit tests pass (47+)
2. ✅ All backend E2E tests pass (17+)
3. ✅ `flutter analyze` clean for all 4 packages
4. ✅ All 5 widget test files pass
5. ✅ Manual test cases M-01 through M-47 pass
6. ✅ No RenderFlex overflow on tested screens
7. ✅ No console errors in admin panel
8. ✅ Walkthrough document published
