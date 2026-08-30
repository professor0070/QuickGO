# QuickGO M1 Phase 3 — Storage and Privacy Plan

**Document**: Supporting document for M1_PHASE_3_IMPLEMENTATION_CONTRACT.md
**Status**: PLANNING ONLY

---

## 1. Storage Architecture

### Storage Provider Selection (Phase 1/2 — Frozen)

| Environment | Provider | Class | Configuration |
|:---|:---|:---|:---|
| Development | Local filesystem | `LocalFileStorageService` | `STORAGE_PROVIDER=local` (default) |
| Production | Cloudinary | `CloudinaryFileStorageService` | `STORAGE_PROVIDER=cloudinary` + credentials |

**Phase 3 does not modify the storage provider.** Both providers implement `FileStorageService` interface.

---

## 2. File Organization

### Local Storage Paths

```
backend/public/uploads/quickgo/<NODE_ENV>/
├── avatars/<userId>/
│   └── avatar-<userId>-<timestamp>.jpg
├── products/<productId>/
│   └── product-<productId>-<timestamp>.jpg
├── compliance/vendors/<vendorId>/
│   └── vendor-document-<vendorId>-<timestamp>.pdf
└── compliance/riders/<riderId>/
    └── rider-document-<riderId>-<timestamp>.pdf
```

### URL Patterns

| Content | URL Format | Access |
|:---|:---|:---|
| Avatar | `/uploads/quickgo/<env>/avatars/<userId>/<file>` | Public (static serve) |
| Product image | `/uploads/quickgo/<env>/products/<productId>/<file>` | Public (static serve) |
| Vendor compliance doc | `/uploads/quickgo/<env>/compliance/vendors/<vendorId>/<file>` | Public path but admin-only via API stream |
| Rider KYC doc | `/uploads/quickgo/<env>/compliance/riders/<riderId>/<file>` | Public path but admin-only via API stream |

### Cloudinary Paths (Production)

| Content | Folder | Access Type |
|:---|:---|:---|
| Avatar | `quickgo/production/avatars/<userId>` | `upload` (public) |
| Product image | `quickgo/production/products/<productId>` | `upload` (public) |
| Vendor doc | `quickgo/production/compliance/vendors/<vendorId>` | `authenticated` (signed URL) |
| Rider doc | `quickgo/production/compliance/riders/<riderId>` | `authenticated` (signed URL) |

---

## 3. Privacy Classification

| Data Type | Classification | Retention | Access Control | Encryption at Rest |
|:---|:---|:---|:---|:---|
| User avatar | PERSONAL | Until user removes | Public URL | Provider-managed |
| Product image | BUSINESS | Until product deleted | Public URL | Provider-managed |
| Vendor compliance doc | SENSITIVE | Until superseded + archive period | Admin-only API stream | Provider-managed + MD5 checksum |
| Rider KYC doc | SENSITIVE | Until superseded + archive period | Admin-only API stream | Provider-managed + MD5 checksum |
| Document numbers | PII | Encrypted at rest | Server-side only | AES-256-GCM (Phase 1/2 foundation) |

---

## 4. Data Lifecycle

### Product Image Lifecycle

```
1. Vendor picks image → 2. Client validates (size, type) →
3. Server validates (MIME, magic bytes, size) → 4. EXIF stripped →
5. Stored (local/cloud) → 6. DB updated (imageUrl, imageStorageKey) →
7. Old image deleted (if replacing) → 8. Audit log created
```

### Compliance Document Lifecycle

```
1. Partner uploads doc → 2. Client validates (size, type) →
3. Server validates (MIME, magic bytes, size) → 4. EXIF stripped →
5. Stored (authenticated access) → 6. MD5 checksum computed →
7. Document number encrypted → 8. DB record created →
9. Previous version superseded → 10. Audit log + domain event →
11. Admin reviews → 12. APPROVED or REJECTED →
13. If REJECTED → partner re-uploads (return to step 1) →
14. If expired → expiry processor marks EXPIRED
```

### Avatar Lifecycle

```
1. User picks image → 2. Client validates →
3. Server validates → 4. EXIF stripped →
5. Stored (public) → 6. DB updated (avatarUrl etc.) →
7. Old avatar deleted (if replacing) → 8. Audit log created
```

---

## 5. Cleanup and Orphan Prevention

### Current Implementation (Phase 1/2 — Frozen)

| Scenario | Handling |
|:---|:---|
| DB write fails after file upload | `catch` block deletes uploaded file |
| Image replacement | Old file deleted after new file confirmed in DB |
| Avatar removal | File deleted after DB cleared |
| Compliance doc replacement | Old doc superseded (not deleted — retained for audit) |

### Phase 3 Additions

| Scenario | Required Handling |
|:---|:---|
| Temporary camera file after upload | Delete temp file after successful upload |
| Failed upload mid-progress | No orphan risk — file not yet stored |
| User cancels upload | No orphan risk — upload not initiated |

---

## 6. Client-Side Cache Strategy

### Product Images (Public)
- Use `CachedNetworkImage` with disk cache
- Default cache duration: 24 hours (image CDN cache header)
- Stale-while-revalidate: Yes
- Maximum cache size: 200MB (Flutter default)

### Avatars (Public)
- Use `CachedNetworkImage` with disk cache
- Invalidate on `avatarUpdatedAt` change

### Compliance Documents (Private)
- **Do NOT cache on client**
- Documents only viewable via admin API stream
- Backend sets `Cache-Control: no-store`

---

## 7. File Size Budget

| Content Type | Max Upload | Max Stored | Typical |
|:---|:---|:---|:---|
| Product image | 3 MB | ~2 MB (after EXIF strip) | 200KB–1MB |
| Avatar | 3 MB | ~2 MB | 100KB–500KB |
| Compliance doc | 8 MB | ~8 MB (no compression for PDF) | 500KB–4MB |
| KYC doc | 8 MB | ~8 MB | 500KB–4MB |

### Storage Projection (per 1000 vendors)

| Content | Files/Vendor | Avg Size | Total |
|:---|:---|:---|:---|
| Avatars | 1 | 500KB | 500MB |
| Product images | 20 | 500KB | 10GB |
| Compliance docs | 5 active + 10 archived | 2MB | 30GB |
| **Total per 1000 vendors** | — | — | **~40GB** |

---

## 8. GDPR/Privacy Request Handling

**Existing infrastructure** (Phase 1/2):
- `PrivacyRequest` model exists with `OPEN`, `IN_PROGRESS`, `COMPLETED`, `REJECTED` statuses
- Admin can process privacy requests

**Phase 3 impact**:
- Avatar deletion is self-service via `DELETE profile/avatar`
- Product images are business data (not personal)
- Compliance documents are retained for regulatory compliance
- Document numbers are encrypted — deletion requires coordinated cleanup

**No changes required for Phase 3.**

---

## 9. Backup and Recovery

**Development**: Local files are not backed up (acceptable for dev)
**Production**: Cloudinary provides automatic backup and versioning

**No changes required for Phase 3.**
