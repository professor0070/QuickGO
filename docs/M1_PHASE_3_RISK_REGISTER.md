# QuickGO M1 Phase 3 — Risk Register

**Document**: Supporting document for M1_PHASE_3_IMPLEMENTATION_CONTRACT.md
**Status**: PLANNING ONLY

---

## Risk Severity Scale

| Severity | Impact |
|:---|:---|
| CRITICAL | Blocks release; data loss or security vulnerability |
| HIGH | Major feature broken; user-facing regression |
| MEDIUM | Degraded UX; workaround available |
| LOW | Minor inconvenience; cosmetic issue |

---

## Risk Registry

### RISK-01: Camera Permission Not Declared

| Field | Value |
|:---|:---|
| ID | RISK-01 |
| Severity | **HIGH** |
| Category | Android Platform |
| Description | Partner App `AndroidManifest.xml` does not declare `android.permission.CAMERA`. Camera-based image capture will fail silently or crash on some Android versions. |
| Evidence | `partner_app/android/app/src/main/AndroidManifest.xml` — only `POST_NOTIFICATIONS` declared |
| Mitigation | Add `<uses-permission android:name="android.permission.CAMERA"/>` in Checkpoint 7 |
| Status | OPEN |

---

### RISK-02: No Runtime Permission Handler

| Field | Value |
|:---|:---|
| ID | RISK-02 |
| Severity | **MEDIUM** |
| Category | Android Platform |
| Description | Neither Partner App nor Customer App includes `permission_handler` package. Runtime permission requests rely solely on `image_picker` internals. Some devices require explicit request before `image_picker` can access camera. |
| Evidence | `partner_app/pubspec.yaml`, `customer_app/pubspec.yaml` — no `permission_handler` dependency |
| Mitigation | Add `permission_handler` package; implement permission flow in shared_ui |
| Status | OPEN |

---

### RISK-03: No Upload Progress Feedback

| Field | Value |
|:---|:---|
| ID | RISK-03 |
| Severity | **MEDIUM** |
| Category | UX |
| Description | `QuickGoApiClient.uploadFile()` does not expose upload progress. Large file uploads (up to 8MB for compliance docs) will appear frozen during upload. Users may tap submit again or navigate away. |
| Evidence | `shared_api/lib/quickgo_api_client.dart` — `uploadFile()` has no `onSendProgress` callback |
| Mitigation | Add `onSendProgress` to `uploadFile()` via Dio options; consume in upload widgets |
| Status | OPEN |

---

### RISK-04: Duplicate Submit on Slow Connection

| Field | Value |
|:---|:---|
| ID | RISK-04 |
| Severity | **MEDIUM** |
| Category | Data Integrity |
| Description | Vendor product form submit button is not disabled during upload. Compliance document upload button is not disabled during upload. Slow connections could cause duplicate submissions. |
| Evidence | `vendor_mode_screen.dart` — `_submitting` flag exists but not applied to all submit buttons |
| Mitigation | Apply `_submitting` flag to all upload/submit actions; disable buttons during operation |
| Status | OPEN |

---

### RISK-05: Document Type Free-Text Input

| Field | Value |
|:---|:---|
| ID | RISK-05 |
| Severity | **MEDIUM** |
| Category | Data Quality |
| Description | Both vendor compliance upload and rider KYC upload use free-text `TextField` for document type. Users may enter arbitrary values, typos, or inconsistent casing. Backend does not validate document type values. |
| Evidence | `vendor_mode_screen.dart` L43: `TextEditingController(text: 'FSSAI')` — free-text; `rider_mode_screen.dart` L124: `TextEditingController(text: 'ID_PROOF')` — free-text |
| Mitigation | Replace with dropdown selector; define allowed document types for each partner type |
| Status | OPEN |

---

### RISK-06: Admin Panel Monolith Size

| Field | Value |
|:---|:---|
| ID | RISK-06 |
| Severity | **MEDIUM** |
| Category | Maintainability |
| Description | Admin Panel is a single file (`page.tsx`) at 173,026 bytes. Adding document review UI increases this monolith further. |
| Evidence | `web/admin_panel/app/page.tsx` — 173KB single file |
| Mitigation | Scope Phase 3 admin changes minimally; defer component extraction to separate milestone |
| Status | ACCEPTED |

---

### RISK-07: Temporary Camera Files Not Cleaned

| Field | Value |
|:---|:---|
| ID | RISK-07 |
| Severity | **LOW** |
| Category | Storage/Privacy |
| Description | After `ImagePicker.pickImage()`, the temporary file is not explicitly deleted after successful upload. Over time, temporary images accumulate in app cache. |
| Evidence | `vendor_mode_screen.dart` `_pickImage()` — no `File.delete()` after upload |
| Mitigation | Delete temporary file after successful upload or on form close |
| Status | OPEN |

---

### RISK-08: No Network Image Caching

| Field | Value |
|:---|:---|
| ID | RISK-08 |
| Severity | **LOW** |
| Category | Performance |
| Description | Customer App uses raw `Image.network()` for product images. Each scroll causes re-download. |
| Evidence | `product_card.dart` L57: `Image.network(...)` — no caching |
| Mitigation | Replace with `CachedNetworkImage` from `cached_network_image` package |
| Status | OPEN |

---

### RISK-09: No Image Resize on Client Upload

| Field | Value |
|:---|:---|
| ID | RISK-09 |
| Severity | **LOW** |
| Category | Performance |
| Description | Product image picker already uses `maxWidth: 1600, imageQuality: 85`. Compliance document upload does not compress (which is correct for documents). Risk is minimal. |
| Evidence | `vendor_mode_screen.dart` L832-835 — compression already applied |
| Mitigation | No action needed — already handled |
| Status | **MITIGATED** |

---

### RISK-10: Local Storage Path Predictability

| Field | Value |
|:---|:---|
| ID | RISK-10 |
| Severity | **LOW** |
| Category | Security |
| Description | Local file storage uses predictable paths (`public/uploads/quickgo/<env>/<type>/<entityId>/`). In development this is acceptable. In production, Cloudinary provides signed URLs. |
| Evidence | `file-storage.service.ts` L50-58 — predictable path construction |
| Mitigation | Development-only risk. Production uses Cloudinary authenticated URLs. No action needed for Phase 3. |
| Status | **ACCEPTED** |

---

### RISK-11: Customer App Has Unused image_picker Dependency

| Field | Value |
|:---|:---|
| ID | RISK-11 |
| Severity | **LOW** |
| Category | Code Quality |
| Description | Customer App includes `image_picker: ^1.1.2` in pubspec.yaml but it is not used anywhere. Customer profile image upload is deferred. |
| Evidence | `customer_app/pubspec.yaml` L25 |
| Mitigation | Keep for future customer profile image; no action in Phase 3 |
| Status | **ACCEPTED** |

---

## Risk Summary

| Severity | Count | Open | Mitigated/Accepted |
|:---|:---|:---|:---|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 1 | 1 | 0 |
| MEDIUM | 4 | 4 | 0 |
| LOW | 4 | 1 | 3 |
| ACCEPTED | 2 | — | 2 |
| **Total** | **11** | **6** | **5** |

**No CRITICAL or BLOCKING risks identified.**
