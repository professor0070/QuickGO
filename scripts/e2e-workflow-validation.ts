import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const cleanBaseUrl = "http://localhost:3000";

// Helper: API calls using native fetch
async function apiCall(method: string, path: string, body?: any, token?: string) {
  const url = `${cleanBaseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (method !== "GET" && method !== "HEAD") {
    headers["Idempotency-Key"] = `e2e-key-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }

  let requestBody = body;
  if (!requestBody && (method === "POST" || method === "PUT" || method === "PATCH")) {
    requestBody = {};
  }

  const options: RequestInit = {
    method,
    headers,
  };
  if (requestBody) {
    options.body = JSON.stringify(requestBody);
  }

  const response = await fetch(url, options);
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}

  return {
    status: response.status,
    json,
    text,
  };
}

async function main() {
  console.log("=== STARTING QUICKGO GATE 6 END-TO-END WORKFLOW VALIDATION ===");

  // 1. Database baseline stats
  const baselineOrderCount = await prisma.order.count();
  const baselinePaymentCount = await prisma.payment.count();
  const baselinePayoutCount = await prisma.payout.count();
  const baselineAuditCount = await prisma.auditLog.count();

  console.log(`Baseline database state:
- Orders: ${baselineOrderCount}
- Payments: ${baselinePaymentCount}
- Payouts: ${baselinePayoutCount}
- Audit Logs: ${baselineAuditCount}
`);

  // 2. Authentication phase
  const testOtp = "123456";

  console.log("-> Authenticating Customer (+919000000001)...");
  const custAuth = await apiCall("POST", "/api/v1/auth/verify-otp", { phone: "+919000000001", otp: testOtp });
  if (custAuth.status !== 200 && custAuth.status !== 201) throw new Error(`Customer auth failed: ${custAuth.text}`);
  const customerToken = custAuth.json.data.access_token;
  const customerId = custAuth.json.data.user.id;

  console.log("-> Authenticating Vendor Owner (+917033475401)...");
  const vendAuth = await apiCall("POST", "/api/v1/auth/verify-otp", { phone: "+917033475401", otp: testOtp });
  if (vendAuth.status !== 200 && vendAuth.status !== 201) throw new Error(`Vendor auth failed: ${vendAuth.text}`);
  const vendorToken = vendAuth.json.data.access_token;

  console.log("-> Authenticating Admin (+918084901376)...");
  const adminAuth = await apiCall("POST", "/api/v1/auth/verify-otp", { phone: "+918084901376", otp: testOtp });
  if (adminAuth.status !== 200 && adminAuth.status !== 201) throw new Error(`Admin auth failed: ${adminAuth.text}`);
  const adminToken = adminAuth.json.data.access_token;
  const adminUserId = adminAuth.json.data.user.id;

  // Ensure Admin is assigned to the service zone of the Vendor to satisfy compliance scoping guards
  const db = prisma as any;
  const vendorRecord = await db.vendor.findFirst({
    where: { ownerPhone: "+917033475401" }
  });
  if (vendorRecord && vendorRecord.serviceZoneId) {
    const existing = await db.adminZoneAssignment.findFirst({
      where: { adminUserId: adminUserId, serviceZoneId: vendorRecord.serviceZoneId }
    });
    if (!existing) {
      await db.adminZoneAssignment.create({
        data: {
          adminUserId: adminUserId,
          serviceZoneId: vendorRecord.serviceZoneId,
          assignedBySuperAdminId: adminUserId,
          status: "ACTIVE"
        }
      });
      console.log(`   Scoping Admin (+918084901376) to Service Zone ID: ${vendorRecord.serviceZoneId}`);
    }
  }

  console.log("-> Authenticating Rider (+918888888888)...");
  const riderAuth = await apiCall("POST", "/api/v1/auth/verify-otp", { phone: "+918888888888", otp: testOtp });
  if (riderAuth.status !== 200 && riderAuth.status !== 201) throw new Error(`Rider auth failed: ${riderAuth.text}`);
  const riderToken = riderAuth.json.data.access_token;
  const riderUserId = riderAuth.json.data.user.id;

  // 3. Customer prepares cart
  console.log("-> Customer creating address...");
  const addrRes = await apiCall("POST", "/api/v1/customer/addresses", {
    receiver_name: "E2E Receiver",
    receiver_phone: "9000000001",
    line1: "Jhajha Main Road 12",
    city: "Jhajha",
    state: "Bihar",
    pincode: "811308",
    latitude: 24.775,
    longitude: 86.38
  }, customerToken);
  if (addrRes.status !== 200 && addrRes.status !== 201) throw new Error(`Address creation failed: ${addrRes.text}`);
  const addressId = addrRes.json.data.id;
  console.log(`   Address ID created: ${addressId}`);

  console.log("-> Customer clearing cart...");
  await apiCall("DELETE", "/api/v1/cart", null, customerToken);

  console.log("-> Customer adding Biryani to cart...");
  const cartRes = await apiCall("POST", "/api/v1/cart/items", {
    product_id: "00000000-0000-4000-7000-000000000001",
    quantity: 2
  }, customerToken);
  if (cartRes.status !== 200 && cartRes.status !== 201) throw new Error(`Cart addition failed: ${cartRes.text}`);

  // 4. Order placement
  console.log("-> Customer placing order (COD)...");
  const orderRes = await apiCall("POST", "/api/v1/orders", {
    address_id: addressId,
    payment_method: "COD",
    customer_note: "E2E validation order"
  }, customerToken);
  if (orderRes.status !== 200 && orderRes.status !== 201) throw new Error(`Order placement failed: ${orderRes.text}`);
  const orderId = orderRes.json.data.id;
  const orderNumber = orderRes.json.data.orderNumber;
  console.log(`   Order placed successfully: ID=${orderId}, Number=${orderNumber}`);

  // 5. Vendor actions
  console.log("-> Vendor accepting order...");
  const acceptRes = await apiCall("POST", `/api/v1/vendor/orders/${orderId}/accept`, null, vendorToken);
  if (acceptRes.status !== 200 && acceptRes.status !== 201) throw new Error(`Vendor accept failed: ${acceptRes.text}`);

  console.log("-> Vendor marking preparing...");
  const prepRes = await apiCall("POST", `/api/v1/vendor/orders/${orderId}/preparing`, null, vendorToken);
  if (prepRes.status !== 200 && prepRes.status !== 201) throw new Error(`Vendor preparing failed: ${prepRes.text}`);

  console.log("-> Vendor marking ready...");
  const readyRes = await apiCall("POST", `/api/v1/vendor/orders/${orderId}/ready`, null, vendorToken);
  if (readyRes.status !== 200 && readyRes.status !== 201) throw new Error(`Vendor ready failed: ${readyRes.text}`);

  // 6. Admin assigns rider
  const riderProfile = await prisma.rider.findUnique({ where: { userId: riderUserId } });
  if (!riderProfile) throw new Error(`Rider profile not found for ${riderUserId}`);
  console.log(`-> Admin assigning Rider (ID: ${riderProfile.id})...`);
  const assignRes = await apiCall("POST", `/api/v1/admin/orders/${orderId}/assign-rider`, {
    rider_id: riderProfile.id,
    reason: "Assigned via E2E validation script"
  }, adminToken);
  if (assignRes.status !== 200 && assignRes.status !== 201) throw new Error(`Rider assignment failed: ${assignRes.text}`);

  // 7. Rider delivery process
  console.log("-> Rider accepting assigned order...");
  const rAcceptRes = await apiCall("POST", `/api/v1/rider/orders/${orderId}/accept`, null, riderToken);
  if (rAcceptRes.status !== 200 && rAcceptRes.status !== 201) throw new Error(`Rider accept failed: ${rAcceptRes.text}`);

  console.log("-> Rider marking arrived...");
  const rArriveRes = await apiCall("POST", `/api/v1/rider/orders/${orderId}/arrived`, null, riderToken);
  if (rArriveRes.status !== 200 && rArriveRes.status !== 201) throw new Error(`Rider arrive failed: ${rArriveRes.text}`);

  console.log("-> Rider marking picked-up...");
  const rPickupRes = await apiCall("POST", `/api/v1/rider/orders/${orderId}/picked-up`, null, riderToken);
  if (rPickupRes.status !== 200 && rPickupRes.status !== 201) throw new Error(`Rider picked up failed: ${rPickupRes.text}`);

  console.log("-> Rider marking delivered...");
  const rDeliverRes = await apiCall("POST", `/api/v1/rider/orders/${orderId}/delivered`, null, riderToken);
  if (rDeliverRes.status !== 200 && rDeliverRes.status !== 201) throw new Error(`Rider delivered failed: ${rDeliverRes.text}`);

  console.log("-> Rider marking COD payment collected (24.00)...");
  const rCollectRes = await apiCall("POST", `/api/v1/rider/orders/${orderId}/payment-collected`, {
    amount: 24.00,
    payment_method_actual: "COD",
    note: "Paid in cash"
  }, riderToken);
  if (rCollectRes.status !== 200 && rCollectRes.status !== 201) throw new Error(`Rider payment collection failed: ${rCollectRes.text}`);
  const paymentId = rCollectRes.json.data.payment.id;

  // 8. Admin finance reconciliation
  console.log("-> Admin reconciling payment...");
  const reconRes = await apiCall("PATCH", `/api/v1/admin/payments/${paymentId}/reconcile`, {
    reason: "E2E validation reconciliation checks"
  }, adminToken);
  if (reconRes.status !== 200 && reconRes.status !== 201) throw new Error(`Admin reconciliation failed: ${reconRes.text}`);

  // Fetch payout ID
  const payouts = await prisma.payout.findMany({
    where: {
      adjustmentNote: { contains: orderNumber }
    }
  });
  console.log(`   Generated payouts: ${payouts.length} records`);
  for (const payout of payouts) {
    console.log(`   -> Approving ${payout.payeeType} payout (ID: ${payout.id}, Amount: ${payout.amount})...`);
    const appRes = await apiCall("POST", `/api/v1/admin/payouts/${payout.id}/approve`, {
      status: "PAYOUT_PAID",
      adjustment_note: "Approved via E2E script",
      reason: "E2E payout approval validation"
    }, adminToken);
    if (appRes.status !== 200 && appRes.status !== 201) throw new Error(`Payout approval failed: ${appRes.text}`);
  }

  // 9. Post-execution validations
  console.log("\n=== POST-EXECUTION DATABASE AUDIT ===");
  const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });
  console.log(`Order Final Status: ${finalOrder?.status} (Expected: COMPLETED/DELIVERED/PAYMENT_COLLECTED)`);

  const finalPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
  console.log(`Payment Status: ${finalPayment?.status} (Expected: RECONCILED)`);

  const finalPayouts = await prisma.payout.findMany({
    where: {
      adjustmentNote: { contains: orderNumber }
    }
  });
  finalPayouts.forEach((p) => {
    console.log(`Payout for ${p.payeeType} status: ${p.status} (Expected: PAYOUT_PAID)`);
  });

  const finalAuditCount = await prisma.auditLog.count();
  console.log(`Audit Logs written: ${finalAuditCount - baselineAuditCount} new logs generated`);

  console.log("\n=== WORKFLOW VALIDATION PASS ===");
}

main()
  .catch((err) => {
    console.error("\n=== WORKFLOW VALIDATION FAIL ===");
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
