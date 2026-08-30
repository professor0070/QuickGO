# QuickGO M1 Phase 3 — Authorization and Security Matrix

**Document**: Supporting document for M1_PHASE_3_IMPLEMENTATION_CONTRACT.md
**Status**: PLANNING ONLY

---

## 1. Role-Permission Matrix for Phase 3 Features

### Upload Operations

| Operation | CUSTOMER | VENDOR_OWNER | VENDOR_STAFF | RIDER | ADMIN | SUPER_ADMIN | ZONE_ADMIN |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Upload own avatar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Remove own avatar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload product image (own products) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload product image (any product) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Upload vendor compliance doc (own vendor) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload vendor compliance doc (any vendor) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Upload rider KYC doc (self) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Upload rider KYC doc (any rider) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Upload partner doc via unified route | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Read Operations

| Operation | CUSTOMER | VENDOR_OWNER | VENDOR_STAFF | RIDER | ADMIN | SUPER_ADMIN | ZONE_ADMIN |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View own avatar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View product images (catalog) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| List own compliance documents | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| List own KYC documents | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View vendor compliance docs (any) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |
| View rider KYC docs (any) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |
| View secure document (stream) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |
| View bank details (any partner) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |

\* Zone Admin: scoped to assigned zones via `ZoneScopeGuard`

### Review/Lifecycle Operations

| Operation | CUSTOMER | VENDOR_OWNER | VENDOR_STAFF | RIDER | ADMIN | SUPER_ADMIN | ZONE_ADMIN |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Approve/reject vendor doc | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |
| Approve/reject rider KYC | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |
| Suspend partner | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |
| Reinstate partner | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |
| Terminate agreement | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Review bank details | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅* |

---

## 2. Zone-Scope Guard Summary

The `ZoneScopeGuard` (at `backend/src/common/auth/zone-scope.guard.ts`) enforces:

- **ZONE_ADMIN** users can only access entities within their assigned zones
- **ADMIN** and **SUPER_ADMIN** bypass zone filtering
- Zone assignment is tracked via `AdminZoneAssignment` model
- All admin controller endpoints are protected by `@UseGuards(ZoneScopeGuard)`

**Phase 3 Impact**: No changes required to zone-scope logic. Partner App UI does not expose zone admin features.

---

## 3. Storage Access Control

| Content Type | Access Mode | URL Pattern | Authentication Required |
|:---|:---|:---|:---|
| Product images | Public | `/uploads/quickgo/...` | No (served via static file middleware) |
| User avatars | Public | `/uploads/quickgo/...` | No |
| Compliance documents | Authenticated | `/uploads/quickgo/...` or Cloudinary authenticated URL | Admin API only (stream route) |
| KYC documents | Authenticated | Same as compliance | Admin API only (stream route) |

### Local Development Storage

- Files stored at: `backend/public/uploads/quickgo/<env>/<type>/<entityId>/`
- Static serving via Fastify's `@fastify/static` plugin
- No authentication for static file serving (by design for local dev)

### Production Storage (Cloudinary)

- Product images: `upload` type (public)
- Avatars: `upload` type (public)
- Compliance docs: `authenticated` type (requires Cloudinary signed URL)
- KYC docs: `authenticated` type (requires Cloudinary signed URL)

---

## 4. Input Validation Matrix

| Upload Type | Max Size | Allowed MIME Types | Magic Byte Check | EXIF Stripped |
|:---|:---|:---|:---|:---|
| Product image | 3 MB | `image/jpeg`, `image/png`, `image/webp` | ✅ | ✅ (JPEG, PNG) |
| Avatar | 3 MB | `image/jpeg`, `image/png`, `image/webp` | ✅ | ✅ (JPEG, PNG) |
| Compliance doc | 8 MB | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | ✅ | ✅ (JPEG, PNG) |
| KYC document | 8 MB | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | ✅ | ✅ (JPEG, PNG) |

All validation is enforced server-side in `UploadsController.parseUploadRequest()`.

---

## 5. Client-Side Security Checklist

| Check | Implementation Notes |
|:---|:---|
| Bearer token on all API calls | ✅ Handled by `QuickGoApiClient.setBearerToken()` |
| Token cleared on logout | ✅ `SessionNotifier.logout()` |
| No token stored in plain text | ✅ In-memory only (via Riverpod state) |
| Private documents not cached client-side | ✅ Compliance docs accessed via admin API only |
| Camera images cleaned after upload | ⚠️ TODO: Delete temporary file after upload |
| No PII in upload metadata | ✅ Only `reason` field; document numbers encrypted server-side |
| Upload field sanitization | ✅ `class-validator` on server; `class-transformer` whitelist |

---

## 6. Audit Trail Coverage

| Action | Audit Log Created | Domain Event Published |
|:---|:---|:---|
| Avatar uploaded | ✅ `user.avatar_uploaded` | ❌ |
| Avatar removed | ✅ `user.avatar_removed` | ❌ |
| Product image uploaded | ✅ `admin.product_image_uploaded` | ❌ |
| Compliance doc uploaded | ✅ `admin.vendor_compliance_document_uploaded` | ✅ `compliance.document_submitted` |
| KYC doc uploaded | ✅ `admin.rider_kyc_document_uploaded` | ✅ `compliance.document_submitted` |
| Document reviewed | ✅ (in admin service) | ❌ |
| Partner suspended | ✅ (in admin service) | ❌ |
| Partner reinstated | ✅ (in admin service) | ❌ |
| Agreement terminated | ✅ (in admin service) | ❌ |
