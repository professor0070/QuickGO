import { readdir, readFile } from "node:fs/promises";
import { join, relative as relativePath } from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".dart_tool"
]);

const allowedDocs = new Set(["PRD.md"]);
const allowedDocDir = "docs/";
const allowedPolicyFiles = new Set([
  "README.md",
  "package-lock.json",
  "scripts/check-mvp-blocklist.mjs",
  "backend/src/common/constants.ts",
  "PHASE_12_TEST_REPORT.md",
  "TESTING_BACKLOG.md",
  "PHASE_13_CHECKLIST.md",
  "PHASE_13_DEPLOYMENT_AUDIT.md",
  "PHASE_13_VERIFICATION_CHECKLIST.md",
  "PHASE_13_CERTIFICATION.md"
]);
const blocked = [
  "pnr",
  "train food",
  "train-food",
  "railway ordering",
  "wallet",
  "loyalty points",
  "referral",
  "subscription",
  "auto-dispatch",
  "autodispatch",
  "live rider tracking",
  "multi-vendor cart",
  "online payment gateway"
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...await walk(join(dir, entry.name)));
      }
    } else {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

const files = await walk(root);
const hits = [];

for (const file of files) {
  const relative = relativePath(root, file).replaceAll("\\", "/");
  if (
    relative.startsWith(allowedDocDir) ||
    allowedDocs.has(relative) ||
    allowedPolicyFiles.has(relative)
  ) {
    continue;
  }
  if (!/\.(ts|tsx|js|jsx|dart|md|json|yaml|yml|prisma|css)$/i.test(file)) {
    continue;
  }
  const content = await readFile(file, "utf8");
  const lowered = content.toLowerCase();
  for (const term of blocked) {
    if (lowered.includes(term)) {
      hits.push({ file, term });
    }
  }
}

if (hits.length > 0) {
  console.error("MVP blocklist terms found outside source docs:");
  for (const hit of hits) {
    console.error(`- ${hit.term}: ${hit.file}`);
  }
  process.exit(1);
}

console.log("MVP blocklist check passed.");
