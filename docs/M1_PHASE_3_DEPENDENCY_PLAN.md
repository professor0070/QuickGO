# QuickGO M1 Phase 3 — Dependency and Package Change Plan

**Document**: Supporting document for M1_PHASE_3_IMPLEMENTATION_CONTRACT.md
**Status**: PLANNING ONLY

---

## 1. New Flutter Dependencies

### `cached_network_image` (^3.3.0)

**Purpose**: Disk-cached network image loading with placeholder and error widgets

**Added to**:
- `mobile/packages/shared_ui/pubspec.yaml`
- `mobile/customer_app/pubspec.yaml`

**Transitive dependencies**: `flutter_cache_manager`, `sqflite`

**Risk assessment**: LOW — widely used package (12K+ pub.dev likes), stable API, no platform-specific native code issues on Android

---

### `permission_handler` (^11.3.0)

**Purpose**: Runtime camera/storage permission requests, permanent-denial detection, Settings redirect

**Added to**:
- `mobile/packages/shared_ui/pubspec.yaml`
- `mobile/partner_app/pubspec.yaml`

**Transitive dependencies**: `permission_handler_platform_interface`, `permission_handler_android`

**Risk assessment**: LOW-MEDIUM — requires Android Gradle configuration for permission declarations. Must ensure `compileSdkVersion >= 33`.

**Android Gradle requirement**:
```gradle
android {
    compileSdkVersion 34  // Already satisfied in current project
}
```

---

## 2. Existing Dependencies (No Change)

| Package | Current Version | Status |
|:---|:---|:---|
| `flutter_riverpod` | ^2.6.1 | NO CHANGE |
| `dio` | ^5.7.0 | NO CHANGE |
| `image_picker` | ^1.1.2 | NO CHANGE |
| `firebase_core` | ^3.1.1 | NO CHANGE |
| `firebase_messaging` | ^15.1.6 | NO CHANGE |
| `url_launcher` | ^6.3.1 | NO CHANGE |
| `shared_preferences` | ^2.0.15 | NO CHANGE |

---

## 3. Backend Dependencies (NO CHANGES)

Phase 3 does not add, remove, or update any backend `package.json` dependencies.

---

## 4. Admin Panel Dependencies (NO CHANGES)

Phase 3 does not add, remove, or update any admin panel `package.json` dependencies.

---

## 5. Android Manifest Changes

### Partner App (`mobile/partner_app/android/app/src/main/AndroidManifest.xml`)

**Add**:
```xml
<uses-permission android:name="android.permission.CAMERA"/>
```

**Rationale**: Required for `ImagePicker` camera source. Currently missing — only `POST_NOTIFICATIONS` is declared.

### Customer App

**No changes** — Customer App does not use camera in Phase 3.

---

## 6. Shared Package Structure After Phase 3

```
mobile/packages/shared_ui/
├── lib/
│   ├── quickgo_ui.dart          (existing — re-export updated)
│   └── src/
│       ├── colors.dart          (existing)
│       ├── nav_bar.dart         (existing)
│       ├── image_picker_sheet.dart    (NEW)
│       ├── upload_progress_widget.dart (NEW)
│       ├── cached_image.dart          (NEW)
│       ├── avatar_widget.dart         (NEW)
│       ├── document_type_selector.dart (NEW)
│       └── permission_handler.dart    (NEW)
├── pubspec.yaml                  (modified)
└── test/
    ├── image_picker_sheet_test.dart    (NEW)
    ├── avatar_widget_test.dart        (NEW)
    ├── cached_image_test.dart         (NEW)
    ├── document_type_selector_test.dart (NEW)
    └── upload_progress_widget_test.dart (NEW)
```

---

## 7. Version Bump Strategy

| Package | Current Version | Phase 3 Version | Reason |
|:---|:---|:---|:---|
| `quickgo_customer_app` | 1.0.0+1 | 1.1.0+2 | Feature addition (cached images) |
| `quickgo_partner_app` | 1.0.0+1 | 1.1.0+2 | Feature addition (avatar, doc UX) |
| `quickgo_shared_ui` | (path dep) | (path dep) | No version needed for path deps |
| `quickgo_shared_api` | (path dep) | (path dep) | No version needed for path deps |

---

## 8. Lock File Impact

Both `pubspec.lock` files will be regenerated after adding new dependencies. This is expected and safe.

```bash
cd mobile/customer_app && flutter pub get
cd mobile/partner_app && flutter pub get
cd mobile/packages/shared_ui && flutter pub get
```
