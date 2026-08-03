/**
 * QuickGO Avatar Privacy Gate — Deterministic Source Fingerprint Tool
 *
 * Requirements:
 * 1. Deterministic manifest of all avatar-privacy task input files.
 * 2. Normalizes CRLF / CR to LF in memory for text files.
 * 3. Sorts relative paths with '/' separators.
 * 4. Produces per-file SHA-256 and a combined SHA-256 fingerprint.
 * 5. Fails with non-zero exit code if required manifest paths are missing.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");

// Task-relevant manifest paths (relative to repository root using '/')
const TASK_MANIFEST_PATHS = [
  "scripts/fingerprint.js",
  "backend/prisma/schema.prisma",
  "backend/prisma/migrate-data.ts",
  "backend/prisma/migrations/20260715032108_add_partner_media_and_multizone/migration.sql",
  "backend/prisma/migrations/20260715042746_add_product_image_metadata/migration.sql",
  "backend/prisma/migrations/20260716222047_add_avatar_metadata_fields/migration.sql",
  "backend/prisma/migrations/20260716232949_add_bank_detail_version/migration.sql",
  "backend/prisma/migrations/20260728014340_add_isolated_avatar_fields/migration.sql",
  "backend/src/common/auth/current-user.decorator.ts",
  "backend/src/common/auth/roles.guard.ts",
  "backend/src/common/auth/zone-scope.guard.ts",
  "backend/src/common/crypto.util.ts",
  "backend/src/common/crypto.util.spec.ts",
  "backend/src/modules/auth/auth.controller.ts",
  "backend/src/modules/auth/auth.service.ts",
  "backend/src/modules/auth/dto.ts",
  "backend/src/modules/auth/jwt.strategy.ts",
  "backend/src/modules/customers/customers.service.ts",
  "backend/src/modules/riders/riders.service.ts",
  "backend/src/modules/vendors/vendors.service.ts",
  "backend/src/modules/uploads/file-storage.service.ts",
  "backend/src/modules/uploads/upload.dto.ts",
  "backend/src/modules/uploads/uploads.controller.ts",
  "backend/src/modules/uploads/uploads.controller.spec.ts",
  "backend/src/modules/uploads/uploads.module.ts",
  "backend/src/modules/uploads/uploads.service.ts",
  "backend/src/modules/uploads/uploads.service.spec.ts",
  "backend/test/auth-legacy-token.e2e-spec.ts",
  "mobile/customer_app/pubspec.yaml",
  "mobile/customer_app/pubspec.lock",
  "mobile/customer_app/android/app/build.gradle.kts",
  "mobile/customer_app/android/app/src/main/AndroidManifest.xml",
  "mobile/customer_app/lib/src/customer_app.dart",
  "mobile/customer_app/lib/src/providers.dart",
  "mobile/customer_app/lib/src/screens/profile_screen.dart",
  "mobile/customer_app/lib/src/screens/login_screen.dart",
  "mobile/customer_app/lib/src/utils.dart",
  "mobile/partner_app/pubspec.yaml",
  "mobile/partner_app/pubspec.lock",
  "mobile/partner_app/android/app/build.gradle.kts",
  "mobile/partner_app/android/app/src/main/AndroidManifest.xml",
  "mobile/partner_app/lib/src/partner_app.dart",
  "mobile/partner_app/lib/src/providers.dart",
  "mobile/partner_app/lib/src/screens/rider_mode_screen.dart",
  "mobile/partner_app/lib/src/screens/vendor_mode_screen.dart",
  "mobile/partner_app/lib/src/screens/partner_navigation.dart",
  "mobile/partner_app/lib/src/screens/role_selection_screen.dart",
  "mobile/partner_app/lib/src/widgets/partner_profile_card.dart",
  "mobile/packages/shared_api/lib/quickgo_api_client.dart",
  "mobile/packages/shared_auth/lib/quickgo_auth.dart",
];

// Helper to check git status of a file
function getGitTrackedStatus(relPath) {
  try {
    const out = execSync(`git ls-files --error-unmatch "${relPath}"`, {
      cwd: ROOT_DIR,
      stdio: ["pipe", "pipe", "ignore"],
    }).toString().trim();
    return out ? "TRACKED" : "UNTRACKED";
  } catch (_) {
    return "UNTRACKED";
  }
}

function computeFingerprint() {
  const sortedPaths = Array.from(new Set(TASK_MANIFEST_PATHS)).sort();

  if (sortedPaths.length === 0) {
    console.error("ERROR: Task manifest is empty!");
    process.exit(1);
  }

  const fileHashes = [];
  let missingCount = 0;
  const combinedHasher = crypto.createHash("sha256");

  for (const relPath of sortedPaths) {
    const absPath = path.join(ROOT_DIR, relPath.split("/").join(path.sep));

    if (!fs.existsSync(absPath)) {
      console.error(`MISSING MANIFEST FILE: ${relPath}`);
      missingCount++;
      continue;
    }

    const trackedStatus = getGitTrackedStatus(relPath);

    // Read file and normalize line endings to LF (\n)
    const rawContent = fs.readFileSync(absPath);
    let contentString = rawContent.toString("utf8");
    // Standardize CRLF and CR to LF
    contentString = contentString.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const fileHasher = crypto.createHash("sha256");
    fileHasher.update(relPath + "\n");
    fileHasher.update(contentString);
    const fileHash = fileHasher.digest("hex");

    fileHashes.push({
      path: relPath,
      hash: fileHash,
      status: trackedStatus,
    });

    // Update combined hash
    combinedHasher.update(relPath + "\n");
    combinedHasher.update(fileHash + "\n");
  }

  if (missingCount > 0) {
    console.error(`ERROR: ${missingCount} manifest path(s) missing from filesystem!`);
    process.exit(1);
  }

  const combinedFingerprint = combinedHasher.digest("hex");

  return {
    combinedFingerprint,
    totalFiles: fileHashes.length,
    missingFiles: missingCount,
    files: fileHashes,
    timestamp: new Date().toISOString(),
  };
}

function main() {
  const isJson = process.argv.includes("--json");
  const result = computeFingerprint();

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("==================================================");
    console.log("QUICKGO DETERMINISTIC TASK SOURCE FINGERPRINT");
    console.log("==================================================");
    console.log(`Combined Fingerprint : ${result.combinedFingerprint}`);
    console.log(`Manifest File Count  : ${result.totalFiles}`);
    console.log(`Missing Files        : ${result.missingFiles}`);
    console.log(`Timestamp            : ${result.timestamp}`);
    console.log("--------------------------------------------------");
    result.files.forEach((f) => {
      console.log(`[${f.status}] ${f.hash.slice(0, 16)}... ${f.path}`);
    });
    console.log("==================================================");
  }
}

if (require.main === module) {
  main();
}

module.exports = { computeFingerprint, TASK_MANIFEST_PATHS };
