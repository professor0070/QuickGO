# QuickGO M1 Phase 3 — Error Contract

**Document**: Supporting document for M1_PHASE_3_IMPLEMENTATION_CONTRACT.md
**Status**: PLANNING ONLY

---

## 1. Upload Error Responses (Backend — Already Implemented)

All upload endpoints return standard HTTP error responses:

| HTTP Status | Error | When | Response Body |
|:---|:---|:---|:---|
| 400 | `Expected multipart/form-data` | Request is not multipart | `{ statusCode: 400, message: "Expected multipart/form-data" }` |
| 400 | `File is required` | No file field in multipart | `{ statusCode: 400, message: "File is required" }` |
| 400 | `File is too large` | File exceeds size limit | `{ statusCode: 400, message: "File is too large" }` |
| 400 | `Unsupported file type` | MIME type not allowed | `{ statusCode: 400, message: "Unsupported file type" }` |
| 400 | `File content does not match declared type` | Magic bytes mismatch | `{ statusCode: 400, message: "File content does not match declared type" }` |
| 400 | `Unexpected file field` | File field is not named `file` | `{ statusCode: 400, message: "Unexpected file field" }` |
| 400 | `Only one file is allowed` | Multiple files in request | `{ statusCode: 400, message: "Only one file is allowed" }` |
| 400 | Validation errors | DTO validation failed | `{ statusCode: 400, message: [...validation errors] }` |
| 401 | Unauthorized | No valid JWT token | `{ statusCode: 401, message: "Unauthorized" }` |
| 403 | Forbidden | Role not permitted | `{ statusCode: 403, message: "Forbidden resource" }` |
| 403 | `Access denied: You do not own this product` | Vendor product ownership | `{ statusCode: 403, message: "Access denied: You do not own this product" }` |
| 404 | `Product not found` | Invalid product ID | `{ statusCode: 404, message: "Product not found" }` |
| 404 | `Vendor not found` | Invalid vendor ID | `{ statusCode: 404, message: "Vendor not found" }` |
| 404 | `Rider not found` | Invalid rider ID | `{ statusCode: 404, message: "Rider not found" }` |
| 404 | `Rider profile not found` | No rider record for user | `{ statusCode: 404, message: "Rider profile not found" }` |
| 404 | `Vendor staff profile not found` | No staff record for user | `{ statusCode: 404, message: "Vendor staff profile not found" }` |
| 404 | `User not found` | Avatar upload for missing user | `{ statusCode: 404, message: "User not found" }` |
| 503 | `Cloudinary storage is not configured` | Production without env vars | `{ statusCode: 503, message: "Cloudinary storage is not configured: ..." }` |

---

## 2. Document Review Error Responses (Backend — Already Implemented)

| HTTP Status | Error | When |
|:---|:---|:---|
| 400 | `Status must be APPROVED or REJECTED` | Invalid review status |
| 400 | `Rejection reason is required` | REJECTED without reason |
| 404 | `Document not found` | Invalid document ID |

---

## 3. Partner Lifecycle Error Responses (Backend — Already Implemented)

| HTTP Status | Error | When |
|:---|:---|:---|
| 400 | `Partner already suspended` | Suspending already-suspended partner |
| 400 | `Partner not suspended` | Reinstating non-suspended partner |
| 404 | `Partner not found` | Invalid partner ID |

---

## 4. Flutter Client-Side Error Handling

### Current Pattern (Vendor Mode Screen)
```dart
} catch (e) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('Error: $e')),
  );
}
```

### Phase 3 Required Improvements

| Scenario | Current Behavior | Phase 3 Behavior |
|:---|:---|:---|
| Upload fails (network) | Generic "Error: ..." snackbar | Specific message + retry button |
| Upload fails (validation) | Generic "Error: ..." snackbar | Specific validation message |
| Upload fails (413 too large) | Generic "Error: ..." snackbar | "File too large (max 3MB)" message |
| Upload fails (415 unsupported type) | Generic "Error: ..." snackbar | "Only JPEG, PNG, and WebP images allowed" |
| Upload timeout | Generic "Error: ..." snackbar | "Upload timed out. Check your connection and try again." |
| Permission denied | Crash or silent failure | Permission dialog with Settings link |
| No camera available | Crash or silent failure | Graceful fallback to gallery only |

### Recommended Error Helper

```dart
String humanizeUploadError(dynamic error) {
  if (error is DioException) {
    final statusCode = error.response?.statusCode;
    final message = error.response?.data?['message'];
    
    if (statusCode == 400) {
      if (message?.contains('too large') == true) {
        return 'File is too large. Maximum size is 3MB for images.';
      }
      if (message?.contains('Unsupported file type') == true) {
        return 'Only JPEG, PNG, and WebP images are allowed.';
      }
      if (message?.contains('does not match') == true) {
        return 'File appears corrupted. Please try a different image.';
      }
      return message ?? 'Invalid upload request.';
    }
    if (statusCode == 401) return 'Session expired. Please log in again.';
    if (statusCode == 403) return 'You do not have permission for this action.';
    if (statusCode == 404) return 'The resource was not found.';
    if (error.type == DioExceptionType.connectionTimeout) {
      return 'Connection timed out. Check your internet and try again.';
    }
    if (error.type == DioExceptionType.sendTimeout) {
      return 'Upload timed out. Try a smaller image or check your connection.';
    }
  }
  return 'An unexpected error occurred. Please try again.';
}
```

---

## 5. Admin Panel Error Handling

### Current Pattern
Admin panel uses `fetch()` with try/catch. Error messages are displayed in alert boxes.

### Phase 3 Requirements
| Scenario | Required Behavior |
|:---|:---|
| Document approve succeeds | Success toast; refresh document list |
| Document reject succeeds | Success toast; refresh document list |
| Document approve fails (network) | Error toast with retry |
| Document reject fails (missing reason) | Inline validation error |
| Secure document view fails | Error message; link to re-authenticate |

---

## 6. Network Timeout Configuration

| Client | Connect Timeout | Receive Timeout | Send Timeout (Upload) |
|:---|:---|:---|:---|
| Flutter (Dio) | 12s | 30s | 60s (RECOMMENDED for uploads) |
| Admin Panel (fetch) | browser default | browser default | browser default |

### Recommendation
Add explicit `sendTimeout` for upload requests in `QuickGoApiClient.uploadFile()`:
```dart
options: Options(
  sendTimeout: const Duration(seconds: 60),
  receiveTimeout: const Duration(seconds: 30),
)
```
