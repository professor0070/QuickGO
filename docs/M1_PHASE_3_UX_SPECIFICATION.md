# QuickGO M1 Phase 3 — UX and Accessibility Specification

**Document**: Supporting document for M1_PHASE_3_IMPLEMENTATION_CONTRACT.md
**Status**: PLANNING ONLY

---

## 1. Image Picker Bottom Sheet

### Visual Specification

```
┌─────────────────────────────┐
│  Choose Image               │
│                             │
│  📷  Take Photo             │
│  ─────────────────────────  │
│  🖼️  Choose from Gallery    │
│  ─────────────────────────  │
│  🗑️  Remove Current Image   │  ← Only shown when image exists
│  ─────────────────────────  │
│  ✕  Cancel                  │
│                             │
└─────────────────────────────┘
```

### Behavior
- Sheet appears with animation (standard `showModalBottomSheet`)
- "Remove Current Image" only visible when entity has an existing image
- Each option is a full-width ListTile with icon
- Tapping outside dismisses sheet
- Sheet is accessible: all items have semantic labels

---

## 2. Avatar Widget

### Visual Specification

```
  ┌───────────┐
  │           │
  │  [IMAGE]  │   ← 80dp circle, or placeholder icon
  │           │
  │     📷    │   ← Edit overlay (24dp camera icon in bottom-right)
  └───────────┘
```

### States
| State | Visual |
|:---|:---|
| No avatar | CircleAvatar with person icon, grey background |
| Avatar present | CircleAvatar with `CachedNetworkImage` |
| Uploading | CircleAvatar with progress overlay (semi-transparent) |
| Error | CircleAvatar with error icon |

### Accessibility
- Semantics label: "Profile picture. Tap to change."
- Edit button has separate semantic: "Change profile picture"

---

## 3. Upload Progress Widget

### Visual Specification

```
┌──────────────────────────────┐
│  Uploading...          67%   │
│  ████████████░░░░░░░░░       │
│                    [Cancel]  │
└──────────────────────────────┘
```

### Behavior
- Shows determinate progress when `onSendProgress` provides values
- Shows indeterminate spinner when progress unknown
- Cancel button aborts upload
- Widget overlays the upload trigger area
- Auto-dismisses on success or error

---

## 4. Document Type Selector

### Vendor Document Types
| Value | Display Label |
|:---|:---|
| `FSSAI` | FSSAI License |
| `GST` | GST Registration |
| `PAN` | PAN Card |
| `AADHAAR` | Aadhaar Card |
| `SHOP_LICENSE` | Shop License |
| `BANK_STATEMENT` | Bank Statement |
| `OTHER` | Other Document |

### Rider Document Types
| Value | Display Label |
|:---|:---|
| `ID_PROOF` | ID Proof |
| `ADDRESS_PROOF` | Address Proof |
| `DRIVING_LICENSE` | Driving License |
| `VEHICLE_RC` | Vehicle RC |
| `INSURANCE` | Vehicle Insurance |
| `PAN` | PAN Card |
| `AADHAAR` | Aadhaar Card |
| `OTHER` | Other Document |

### Visual Specification
- Standard Flutter `DropdownButtonFormField` with outlined border
- Selected value displayed
- Validation: required field

---

## 5. Compliance Document List Item

### Current Layout (Existing)
```
  ┌─────────────────────────────────┐
  │  📄  FSSAI                      │
  │                        [PENDING]│
  └─────────────────────────────────┘
```

### Phase 3 Enhanced Layout
```
  ┌─────────────────────────────────┐
  │  📄  FSSAI License              │
  │  Uploaded: 15 Jul 2026          │
  │  Expires: 15 Jul 2027           │  ← Only if expiresAt set
  │  ❌ Rejected: "Blurry image"    │  ← Only if REJECTED
  │                        [PENDING]│
  │                 [Re-upload ↑]   │  ← Only if REJECTED
  └─────────────────────────────────┘
```

### Status Chip Colors
| Status | Background | Text |
|:---|:---|:---|
| PENDING | Orange 100 | Orange 900 |
| APPROVED | Green 100 | Green 900 |
| REJECTED | Red 100 | Red 900 |
| EXPIRED | Grey 100 | Grey 900 |

---

## 6. Lifecycle State Banners

### Suspended Partner Banner
```
  ┌─────────────────────────────────┐
  │  ⚠️ Account Suspended           │
  │  Your account has been          │
  │  suspended. Contact support     │
  │  for more information.          │
  │                                 │
  │  Background: Yellow 50          │
  │  Border: Yellow 700             │
  └─────────────────────────────────┘
```

### Terminated Partner Banner
```
  ┌─────────────────────────────────┐
  │  🚫 Agreement Terminated        │
  │  Your partnership agreement     │
  │  has been terminated. You       │
  │  cannot access partner          │
  │  features.                      │
  │                                 │
  │  Background: Red 50             │
  │  Border: Red 700                │
  └─────────────────────────────────┘
```

### Placement
- Top of Dashboard tab (above all content)
- Dismissible: No (persistent until status changes)
- Conditionally rendered based on `onboardingStatus` field

---

## 7. Accessibility Requirements

| Element | Requirement |
|:---|:---|
| All buttons | `semanticsLabel` set |
| Image previews | `semanticsLabel: "Product image"` or "Profile picture" |
| Upload progress | Announce progress percentage to screen reader |
| Status chips | Announce full text: "Document status: Approved" |
| Error messages | Announced via `SnackBar` (auto-announced by Flutter) |
| Form fields | All have `labelText` |
| Dropdowns | All have `labelText` |
| Image placeholders | `semanticsLabel: "No image available"` |
| Edit avatar button | `semanticsLabel: "Change profile picture"` |
| Remove image button | `semanticsLabel: "Remove image"` |
| Lifecycle banners | Full text readable by screen reader |

---

## 8. Keyboard Safety

### Problem
Some forms with text fields extend below the keyboard, causing `RenderFlex overflow` errors.

### Solution
1. Wrap form content in `SingleChildScrollView`
2. Use `resizeToAvoidBottomInset: true` on `Scaffold` (default)
3. Ensure primary action button is above keyboard (use `Padding` with `MediaQuery.of(context).viewInsets.bottom`)

### Affected Screens
- `vendor_mode_screen.dart` — product form bottom sheet
- `rider_mode_screen.dart` — profile edit dialog
- Both compliance/KYC upload dialogs

---

## 9. Loading States

| Action | Loading State |
|:---|:---|
| Image upload | Progress overlay on avatar/image preview |
| Document upload | Progress bar in upload dialog |
| Profile load | `CircularProgressIndicator` (existing) |
| Product list load | `CircularProgressIndicator` (existing) |
| Document list load | `CircularProgressIndicator` (existing) |
| Image load in card | Shimmer/spinner via `CachedNetworkImage.placeholder` |
| Image load in detail | Shimmer/spinner via `CachedNetworkImage.placeholder` |
