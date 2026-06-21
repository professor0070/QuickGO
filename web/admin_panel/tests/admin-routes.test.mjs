const requiredNav = [
  "Dashboard",
  "Orders",
  "Vendors",
  "Products",
  "Riders",
  "Payments & Reconciliation",
  "Settlements/Payouts",
  "Support Tickets",
  "Compliance",
  "Service Zones",
  "Reports",
  "Audit Logs",
  "Settings"
];

const source = await import("node:fs/promises").then((fs) =>
  fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
);

const missing = requiredNav.filter((item) => !source.includes(item));

if (missing.length > 0) {
  console.error(`Missing admin nav items: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Admin route surface test passed.");

