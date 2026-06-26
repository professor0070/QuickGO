"use client";

import React, { useState, useEffect } from "react";

// Nav items in role order / operational order
const navItems = [
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

const normalizePhone = (input: string): string => {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  let ten = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    ten = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    ten = digits.slice(1);
  } else if (digits.length === 10) {
    ten = digits;
  }
  return `+91${ten}`;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [apiUrl, setApiUrl] = useState("http://localhost:3000/api/v1");
  const [authToken, setAuthToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth states
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Data states
  const [stats, setStats] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderOperations, setRiderOperations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [serviceZones, setServiceZones] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [reconciliationAlerts, setReconciliationAlerts] = useState<any[]>([]);
  const [reconciliationSummary, setReconciliationSummary] = useState<any>(null);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [payoutFilter, setPayoutFilter] = useState<string>("ALL");

  // Action / Form states
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null); // Order ID
  const [showReconcileModal, setShowReconcileModal] = useState<string | null>(null); // Payment ID or Order ID
  const [selectedVendorCompliance, setSelectedVendorCompliance] = useState<any[]>([]);
  const [showComplianceModal, setShowComplianceModal] = useState<string | null>(null);
  const [selectedRiderKyc, setSelectedRiderKyc] = useState<any[]>([]);
  const [showRiderKycModal, setShowRiderKycModal] = useState<string | null>(null);

  // Support ticket detail modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Form inputs
  const [newZone, setNewZone] = useState({
    name: "",
    city: "Jhajha",
    state: "Bihar",
    centerLatitude: 24.775,
    centerLongitude: 86.38,
    radiusKm: 3.0,
    isActive: true
  });
  const [newVendor, setNewVendor] = useState({
    shopName: "",
    legalName: "",
    ownerName: "",
    ownerPhone: "",
    categoryCode: "VEGETABLES",
    serviceZoneId: "",
    addressLine: "",
    city: "Jhajha",
    state: "Bihar"
  });

  const [newRider, setNewRider] = useState({
    name: "",
    phone: "",
    vehicleType: "BIKE",
    vehicleNumber: "",
    serviceZoneId: "",
    payoutUpiId: ""
  });

  const [newProduct, setNewProduct] = useState({
    vendorId: "",
    categoryId: "",
    name: "",
    description: "",
    unit: "kg",
    productType: "FRESH",
    price: 40
  });

  const [assignRiderId, setAssignRiderId] = useState("");
  const [reconcileData, setReconcileData] = useState({
    status: "VERIFIED",
    amount_collected: 0,
    reason: ""
  });

  // Local storage for config & check token
  useEffect(() => {
    let activeUrl = "http://localhost:3000/api/v1";
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const isLocalhost = !hostname || hostname === "localhost" || hostname === "127.0.0.1";
    const savedUrl = localStorage.getItem("quickgo_api_url");

    if (!isLocalhost) {
      if (!savedUrl || savedUrl.includes("localhost") || savedUrl.includes("127.0.0.1")) {
        activeUrl = `http://${hostname}:3000/api/v1`;
        localStorage.setItem("quickgo_api_url", activeUrl);
      } else {
        activeUrl = savedUrl;
      }
    } else {
      if (savedUrl) {
        activeUrl = savedUrl;
      } else {
        activeUrl = "http://localhost:3000/api/v1";
      }
    }

    setApiUrl(activeUrl);

    const savedToken = localStorage.getItem("quickgo_auth_token");
    if (savedToken) {
      setAuthToken(savedToken);
      fetch(`${activeUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then(res => res.json())
        .then(data => {
          const profile = data?.data ?? data;
          if (profile && profile.roles && (profile.roles.includes("ADMIN") || profile.roles.includes("SUPER_ADMIN"))) {
            setUserProfile(profile);
          } else {
            localStorage.removeItem("quickgo_auth_token");
            setAuthToken("");
          }
        })
        .catch(() => {
          localStorage.removeItem("quickgo_auth_token");
          setAuthToken("");
        });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedPhone = normalizePhone(loginPhone);
      setLoginPhone(normalizedPhone);
      const res = await fetch(`${apiUrl}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, purpose: "LOGIN" })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to send OTP");
      setOtpSent(true);
      alert("OTP sent! If on Mock Provider, code is 123456.");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedPhone = normalizePhone(loginPhone);
      setLoginPhone(normalizedPhone);
      const res = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, otp: loginOtp })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Verification failed");
      
      const { access_token, user } = json.data;
      if (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN")) {
        throw new Error("Access denied. Admin permissions required.");
      }
      
      localStorage.setItem("quickgo_auth_token", access_token);
      setAuthToken(access_token);
      setUserProfile(user);
      setOtpSent(false);
      setLoginOtp("");
      alert("Successfully logged in!");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("quickgo_auth_token");
    setAuthToken("");
    setUserProfile(null);
  };

  const saveConfig = (url: string, token: string) => {
    localStorage.setItem("quickgo_api_url", url);
    localStorage.setItem("quickgo_auth_token", token);
    setApiUrl(url);
    setAuthToken(token);
    alert("Configuration saved. Fetching data...");
  };

  // Helper for requests
  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers
    };
    const response = await fetch(`${apiUrl}${endpoint}`, { ...options, headers });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || json.message || "API request failed");
    }
    return json.data !== undefined ? json.data : json;
  };

  const requireReason = (action: string) => {
    const reason = window.prompt(`Reason required for ${action}`);
    const trimmed = reason?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  };

  const idempotencyHeaders = (scope: string) => ({
    "Idempotency-Key": `${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  });

  const money = (value: unknown) => Number(value ?? 0).toFixed(2);

  const loadData = async () => {
    if (!authToken || !userProfile) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "Dashboard") {
        const d = await fetchWithAuth("/admin/dashboard");
        setStats(d || {});
      } else if (activeTab === "Orders") {
        const o = await fetchWithAuth("/admin/orders");
        setOrders(o || []);
        const r = await fetchWithAuth("/admin/riders");
        setRiders(r || []);
      } else if (activeTab === "Vendors") {
        const v = await fetchWithAuth("/admin/vendors");
        setVendors(v || []);
      } else if (activeTab === "Riders") {
        const [r, operations] = await Promise.all([
          fetchWithAuth("/admin/riders"),
          fetchWithAuth("/admin/rider-operations")
        ]);
        setRiders(r || []);
        setRiderOperations(operations || []);
      } else if (activeTab === "Products") {
        const p = await fetchWithAuth("/admin/products");
        setProducts(p || []);
      } else if (activeTab === "Payments & Reconciliation") {
        const [o, alerts, summary, payments] = await Promise.all([
          fetchWithAuth("/admin/orders"),
          fetchWithAuth("/admin/reconciliation/alerts"),
          fetchWithAuth("/admin/reconciliation/summary"),
          fetchWithAuth("/admin/payments")
        ]);
        setOrders(o || []);
        setReconciliationAlerts(alerts || []);
        setReconciliationSummary(summary || null);
        setAllPayments(payments || []);
      } else if (activeTab === "Settlements/Payouts") {
        const [p, summary] = await Promise.all([
          fetchWithAuth("/admin/payouts"),
          fetchWithAuth("/admin/reconciliation/summary")
        ]);
        setPayouts(p || []);
        setReconciliationSummary(summary || null);
      } else if (activeTab === "Support Tickets") {
        const s = await fetchWithAuth("/admin/support-tickets");
        setSupportTickets(s || []);
      } else if (activeTab === "Compliance") {
        const [v, r] = await Promise.all([
          fetchWithAuth("/admin/vendors"),
          fetchWithAuth("/admin/riders")
        ]);
        setVendors(v || []);
        setRiders(r || []);
      } else if (activeTab === "Audit Logs") {
        const a = await fetchWithAuth("/admin/audit-logs");
        setAuditLogs(a || []);
      } else if (activeTab === "Service Zones") {
        const sz = await fetchWithAuth("/admin/service-zones");
        setServiceZones(sz || []);
      } else if (activeTab === "Reports") {
        const r = await fetchWithAuth("/admin/reports/validation-dashboard");
        setReport(r || null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data from API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, authToken, apiUrl, userProfile]);

  // Actions
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth("/admin/vendors", {
        method: "POST",
        body: JSON.stringify({
          shop_name: newVendor.shopName,
          owner_name: newVendor.ownerName,
          owner_phone: newVendor.ownerPhone,
          category_code: newVendor.categoryCode,
          service_zone_id: newVendor.serviceZoneId,
          address_line: newVendor.addressLine,
          city: newVendor.city,
          state: newVendor.state,
          commission_rate: 0
        })
      });
      setShowVendorModal(false);
      alert("Vendor created successfully");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateRider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth("/admin/riders", {
        method: "POST",
        body: JSON.stringify({
          name: newRider.name,
          phone: newRider.phone,
          service_zone_id: newRider.serviceZoneId
        })
      });
      setShowRiderModal(false);
      alert("Rider created successfully");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth("/admin/products", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: newProduct.vendorId,
          category_id: newProduct.categoryId,
          name: newProduct.name,
          unit: newProduct.unit,
          price: newProduct.price,
          description: newProduct.description
        })
      });
      setShowProductModal(false);
      alert("Product created successfully");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleAssignRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal) return;
    const reason = requireReason("manual rider assignment");
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/orders/${showAssignModal}/assign-rider`, {
        method: "POST",
        headers: idempotencyHeaders("assign-rider"),
        body: JSON.stringify({ rider_id: assignRiderId, reason })
      });
      setShowAssignModal(null);
      alert("Rider assigned to order");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleReconcilePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReconcileModal) return;
    if (!reconcileData.reason.trim()) {
      alert("Reconciliation reason is required.");
      return;
    }
    try {
      await fetchWithAuth(`/admin/payments/${showReconcileModal}/reconcile`, {
        method: "PATCH",
        headers: idempotencyHeaders("reconcile-payment"),
        body: JSON.stringify(reconcileData)
      });
      setShowReconcileModal(null);
      alert("Payment reconciled successfully");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleVendorStatus = async (vendorId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "APPROVED" ? "PAUSED" : "APPROVED";
    const reason = requireReason(`${nextStatus.toLowerCase()} vendor`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/vendors/${vendorId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason })
      });
      alert(`Vendor status updated to ${nextStatus}`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const loadVendorCompliance = async (vendorId: string) => {
    try {
      const data = await fetchWithAuth(`/admin/vendors/${vendorId}/compliance-documents`);
      setSelectedVendorCompliance(data || []);
      setShowComplianceModal(vendorId);
    } catch (err: any) {
      alert("Error loading compliance documents: " + err.message);
    }
  };

  const handleReviewCompliance = async (docId: string, status: string, fssaiStatus?: string) => {
    const reason = requireReason(`${status.toLowerCase()} vendor compliance document`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/vendor-compliance-documents/${docId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status, fssai_status: fssaiStatus, reason })
      });
      alert("Compliance document status updated");
      if (showComplianceModal) {
        loadVendorCompliance(showComplianceModal);
      }
      loadData();
    } catch (err: any) {
      alert("Error reviewing document: " + err.message);
    }
  };

  const loadRiderKyc = async (riderId: string) => {
    try {
      const data = await fetchWithAuth(`/admin/riders/${riderId}/kyc-documents`);
      setSelectedRiderKyc(data || []);
      setShowRiderKycModal(riderId);
    } catch (err: any) {
      alert("Error loading KYC documents: " + err.message);
    }
  };

  const handleReviewRiderKyc = async (docId: string, status: string) => {
    const reason = requireReason(`${status.toLowerCase()} rider KYC document`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/rider-kyc-documents/${docId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason })
      });
      alert("KYC document status updated");
      if (showRiderKycModal) {
        loadRiderKyc(showRiderKycModal);
      }
      loadData();
    } catch (err: any) {
      alert("Error reviewing KYC: " + err.message);
    }
  };

  const handleToggleRiderStatus = async (riderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "APPROVED" ? "SUSPENDED" : "APPROVED";
    const reason = requireReason(`${nextStatus.toLowerCase()} rider`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/riders/${riderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason })
      });
      alert(`Rider status updated to ${nextStatus}`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const reason = requireReason("create service zone");
    if (!reason) return;
    try {
      await fetchWithAuth("/admin/service-zones", {
        method: "POST",
        body: JSON.stringify({
          name: newZone.name,
          city: newZone.city,
          state: newZone.state,
          center_latitude: newZone.centerLatitude,
          center_longitude: newZone.centerLongitude,
          radius_km: newZone.radiusKm,
          is_active: newZone.isActive,
          reason
        })
      });
      setShowZoneModal(false);
      alert("Service zone created successfully");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleZoneStatus = async (zoneId: string, currentStatus: boolean) => {
    const reason = requireReason(`${currentStatus ? "pause" : "activate"} service zone`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/service-zones/${zoneId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !currentStatus, reason })
      });
      alert(`Service zone status updated`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleProductAvailability = async (productId: string, currentAvailable: boolean, currentStatus: string) => {
    const reason = requireReason(`${currentAvailable ? "disable" : "enable"} product availability`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/products/${productId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: !currentAvailable, status: currentStatus, reason })
      });
      alert("Product availability updated");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleProductApproval = async (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "APPROVED" ? "PAUSED" : "APPROVED";
    const reason = requireReason(`${nextStatus.toLowerCase()} product`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/products/${productId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason })
      });
      alert(`Product status updated to ${nextStatus}`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateProductPrice = async (productId: string, priceRupees: string, currentStatus: string) => {
    const price = parseFloat(priceRupees);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price");
      return;
    }
    const reason = requireReason("update product price");
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/products/${productId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ price, status: currentStatus, reason })
      });
      alert("Product price updated");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateSupportTicket = async (ticketId: string, status: string) => {
    const reason = requireReason(`${status.toLowerCase()} support ticket`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/support-tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason })
      });
      alert("Support ticket updated");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    try {
      const data = await fetchWithAuth(`/admin/support-tickets/${ticketId}`);
      setSelectedTicket(data || null);
      setShowTicketModal(true);
    } catch (err: any) {
      alert("Error loading support ticket details: " + err.message);
    }
  };

  const handleUpdateTicketDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    const reason = requireReason("update support ticket status/notes");
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/support-tickets/${selectedTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selectedTicket.status,
          priority: selectedTicket.priority,
          admin_note: selectedTicket.adminNote || "",
          reason
        })
      });
      alert("Support ticket updated successfully");
      setShowTicketModal(false);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdatePayout = async (payoutId: string, status: string) => {
    const reason = requireReason(`${status.toLowerCase().split("_").join(" ")} payout`);
    if (!reason) return;
    try {
      await fetchWithAuth(`/admin/payouts/${payoutId}/approve`, {
        method: "POST",
        headers: idempotencyHeaders("approve-payout"),
        body: JSON.stringify({ status, reason })
      });
      alert("Payout updated");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const paymentAttentionStatuses = new Set([
    "PENDING",
    "PENDING_COLLECTION",
    "COLLECTION_PENDING",
    "COLLECTED_UNVERIFIED",
    "SHORT_COLLECTED",
    "OVER_COLLECTED",
    "DISPUTED"
  ]);
  const pendingPayments = orders.flatMap((order) =>
    ((order.payments as any[] | undefined) ?? [])
      .filter((payment) => paymentAttentionStatuses.has(payment.status))
      .map((payment) => ({ order, payment }))
  );
  const pendingPayouts = payouts.filter((payout) => payout.status !== "PAYOUT_PAID");

  if (!authToken || !userProfile) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-sans p-6 animate-fade-in">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl p-8">
          <div className="text-center mb-8">
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">QuickGO</span>
            <span className="ml-2 rounded bg-indigo-900 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">Admin Portal</span>
            <p className="mt-2 text-sm text-slate-405">Sign in with phone number & OTP verification</p>
          </div>

          {error && (
            <div className="mb-6 rounded-md bg-red-950 border border-red-800 p-4 text-sm text-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Admin Phone Number</label>
                <input
                  type="tel"
                  placeholder="+919999999999"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  onBlur={() => {
                    if (loginPhone) {
                      setLoginPhone(normalizePhone(loginPhone));
                    }
                  }}
                  className="mt-1 block w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-sm font-semibold shadow transition disabled:opacity-50"
              >
                {loading ? "Sending..." : "Request OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-350">Verify phone {loginPhone}</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP (e.g. 123456)"
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value)}
                  className="mt-1 block w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center tracking-widest text-lg"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-1/3 rounded-lg border border-slate-700 hover:bg-slate-750 py-3 text-sm font-semibold text-slate-300 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-sm font-semibold shadow transition disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Local DB Target URL</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setApiUrl(val);
                  localStorage.setItem("quickgo_api_url", val);
                }}
                className="mt-1 block w-full rounded bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1.5 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="border-b border-slate-200 bg-white px-4 py-6 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-indigo-600">QuickGO</span>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">Admin</span>
          </div>
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setActiveTab(item);
                  setError(null);
                }}
                className={`rounded-md px-3 py-2 text-left text-sm font-medium transition-all ${
                  activeTab === item
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <section className="px-6 py-6 lg:px-8 max-w-7xl w-full mx-auto">
          {/* Header */}
          <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{activeTab}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Operations cockpit for manual dispatch, verification, reconciliation, and compliance.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {userProfile && (
                <div className="mr-2 flex flex-col items-end text-xs">
                  <span className="font-semibold text-slate-700">Phone: {userProfile.phone}</span>
                  <span className="text-slate-500 font-mono">({userProfile.roles?.join(", ")})</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="rounded-md bg-white border border-red-200 text-red-650 hover:bg-red-50 px-3 py-2 text-sm font-semibold transition"
              >
                Log Out
              </button>
              <button
                onClick={() => setShowVendorModal(true)}
                className="rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 text-sm font-semibold transition"
              >
                Create Vendor
              </button>
              <button
                onClick={() => setShowRiderModal(true)}
                className="rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 text-sm font-semibold transition"
              >
                Add Rider
              </button>
              <button
                onClick={() => setShowProductModal(true)}
                className="rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold shadow transition"
              >
                Add Product
              </button>
            </div>
          </header>

          {/* Configuration Banner */}
          {!authToken && (
            <div className="mb-6 rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span><strong>Warning:</strong> You must configure a JWT Auth Token in the "Settings" tab to fetch live data.</span>
              <button
                onClick={() => setActiveTab("Settings")}
                className="font-bold underline"
              >
                Go to Settings
              </button>
            </div>
          )}

          {/* Loading / Error States */}
          {loading && (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}
          {error && !loading && (
            <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Tab Views */}
          {!loading && !error && (
            <div>
              {activeTab === "Dashboard" && (
                <div className="grid gap-6">
                  {/* Metric Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Orders</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight">{stats.today_orders ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Online Riders</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight">{stats.active_riders ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unassigned Orders</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight text-amber-600">{stats.unassigned_orders ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment Pending Verification</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight text-red-500">{stats.payment_pending ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Tickets</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight">{stats.open_support_tickets ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cancellations Today</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight text-red-650">{stats.cancellation_count ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Vendor Commission</div>
                      <div className="mt-2 text-2xl font-bold tracking-tight text-indigo-650">Rs {money(stats.today_vendor_commission)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Delivery Fees</div>
                      <div className="mt-2 text-2xl font-bold tracking-tight text-indigo-650">Rs {money(stats.today_delivery_fee_collected)}</div>
                    </div>
                  </div>

                  {/* Manual Dispatch Quick View */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="text-lg font-bold">Unassigned Orders Queue (Manual Dispatch)</h2>
                    </div>
                    <div className="p-5 text-center text-slate-500">
                      Go to the <strong>Orders</strong> tab to manually assign riders or review active deliveries.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Orders" && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-5 py-3">Order Number</th>
                          <th className="px-5 py-3">Vendor</th>
                          <th className="px-5 py-3">Amount</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Rider</th>
                          <th className="px-5 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                              No orders found.
                            </td>
                          </tr>
                        ) : (
                          orders.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold">{order.orderNumber}</td>
                              <td className="px-5 py-3">{(order.vendorSnapshot as any)?.shopName || "Unknown"}</td>
                              <td className="px-5 py-3">Rs {money(order.totalAmount)}</td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                  order.status === "DELIVERED" || order.status === "COMPLETED"
                                    ? "bg-green-50 text-green-700 border border-green-150"
                                    : order.status === "PLACED"
                                    ? "bg-blue-50 text-blue-700 border border-blue-150 animate-pulse"
                                    : "bg-amber-50 text-amber-700 border border-amber-150"
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-slate-600">
                                {order.riderId ? `Rider ID: ${order.riderId.substring(0, 8)}` : "Unassigned"}
                              </td>
                              <td className="px-5 py-3 flex gap-2">
                                {!order.riderId && order.status === "PLACED" && (
                                  <button
                                    onClick={() => {
                                      setShowAssignModal(order.id);
                                    }}
                                    className="rounded bg-indigo-650 hover:bg-indigo-750 px-2 py-1 text-xs font-bold text-white shadow-sm"
                                  >
                                    Assign
                                  </button>
                                )}
                                {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                                  <button
                                    onClick={async () => {
                                      const reason = requireReason("admin order cancellation");
                                      if (reason && confirm("Cancel this order?")) {
                                        try {
                                          await fetchWithAuth(`/admin/orders/${order.id}/cancel`, {
                                            method: "POST",
                                            headers: idempotencyHeaders("admin-cancel-order"),
                                            body: JSON.stringify({ reason })
                                          });
                                          alert("Order cancelled");
                                          loadData();
                                        } catch (err: any) {
                                          alert("Error: " + err.message);
                                        }
                                      }
                                    }}
                                    className="rounded border border-red-300 hover:bg-red-50 px-2 py-1 text-xs font-semibold text-red-650"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "Vendors" && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-5 py-3">Shop Name</th>
                          <th className="px-5 py-3">Owner</th>
                          <th className="px-5 py-3">Category</th>
                          <th className="px-5 py-3">FSSAI Status</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vendors.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                              No vendors found.
                            </td>
                          </tr>
                        ) : (
                          vendors.map((vendor) => (
                            <tr key={vendor.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold">{vendor.shopName}</td>
                              <td className="px-5 py-3">{vendor.ownerName} ({vendor.ownerPhone})</td>
                              <td className="px-5 py-3 text-slate-600">{vendor.categoryCode}</td>
                              <td className="px-5 py-3">
                                <span
                                  onClick={() => loadVendorCompliance(vendor.id)}
                                  className="cursor-pointer inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 underline"
                                >
                                  {vendor.fssaiStatus || "PENDING"}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                  vendor.status === "APPROVED" || vendor.status === "ACTIVE"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}>
                                  {vendor.status}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleToggleVendorStatus(vendor.id, vendor.status)}
                                    className="rounded border border-slate-300 hover:bg-slate-50 px-2 py-1 text-xs font-semibold"
                                  >
                                    {vendor.status === "APPROVED" ? "Pause" : "Approve"}
                                  </button>
                                  <button
                                    onClick={() => loadVendorCompliance(vendor.id)}
                                    className="rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-semibold"
                                  >
                                    Docs
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "Riders" && (
                <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-5 py-3">Rider Name</th>
                          <th className="px-5 py-3">Phone</th>
                          <th className="px-5 py-3">Vehicle</th>
                          <th className="px-5 py-3">Online Status</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">KYC Documents</th>
                          <th className="px-5 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {riders.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                              No riders found.
                            </td>
                          </tr>
                        ) : (
                          riders.map((rider) => (
                            <tr key={rider.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold">{rider.name}</td>
                              <td className="px-5 py-3">{rider.phone}</td>
                              <td className="px-5 py-3 text-slate-600">{rider.vehicleType} ({rider.vehicleNumber || "N/A"})</td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                  rider.isOnline ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {rider.isOnline ? "Online" : "Offline"}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                  rider.status === "APPROVED" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {rider.status}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  onClick={() => loadRiderKyc(rider.id)}
                                  className="cursor-pointer inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 underline"
                                >
                                  {rider.onboardingStatus || "PENDING"}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleToggleRiderStatus(rider.id, rider.status)}
                                    className="rounded border border-slate-300 hover:bg-slate-50 px-2 py-1 text-xs font-semibold"
                                  >
                                    {rider.status === "APPROVED" ? "Suspend" : "Approve"}
                                  </button>
                                  <button
                                    onClick={() => loadRiderKyc(rider.id)}
                                    className="rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-semibold"
                                  >
                                    KYC
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <h2 className="text-sm font-bold text-slate-700">Recent Rider Operations</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-5 py-3">Order</th>
                          <th className="px-5 py-3">Rider</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Assignment</th>
                          <th className="px-5 py-3">Pickup/Delivery</th>
                          <th className="px-5 py-3">Proofs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {riderOperations.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                              No rider operations recorded.
                            </td>
                          </tr>
                        ) : (
                          riderOperations.map((operation) => (
                            <tr key={operation.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold">
                                #{operation.order?.orderNumber || operation.orderId}
                                <div className="text-xs font-normal text-slate-500">
                                  {operation.order?.vendor?.shopName || "Vendor"}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                {operation.rider?.name || operation.riderId}
                                <div className="text-xs text-slate-500">{operation.rider?.phone}</div>
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                  {operation.order?.status || "UNKNOWN"}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-slate-600">
                                <div>Assigned: {operation.assignedAt ? new Date(operation.assignedAt).toLocaleString() : "-"}</div>
                                <div>Accepted: {operation.acceptedAt ? new Date(operation.acceptedAt).toLocaleString() : "-"}</div>
                                {operation.rejectedAt && (
                                  <div className="text-red-700">
                                    Rejected: {operation.rejectionReason || "No reason"}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3 text-slate-600">
                                <div>Pickup: {operation.pickedAt ? new Date(operation.pickedAt).toLocaleString() : "-"}</div>
                                <div>Delivery: {operation.deliveredAt ? new Date(operation.deliveredAt).toLocaleString() : "-"}</div>
                              </td>
                              <td className="px-5 py-3 text-slate-600">
                                {operation.order?.deliveryProofs?.length || 0}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                </div>
              )}

              {activeTab === "Products" && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-5 py-3">Product Name</th>
                          <th className="px-5 py-3">Vendor</th>
                          <th className="px-5 py-3">Unit</th>
                          <th className="px-5 py-3">Price</th>
                          <th className="px-5 py-3">Availability</th>
                          <th className="px-5 py-3">Approval</th>
                          <th className="px-5 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                              No products found.
                            </td>
                          </tr>
                        ) : (
                          products.map((product) => (
                            <tr key={product.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold">{product.name}</td>
                              <td className="px-5 py-3 text-slate-600">{product.vendor?.shopName || "Unknown"}</td>
                              <td className="px-5 py-3">{product.unit}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-500">Rs</span>
                                  <input
                                    id={`price-${product.id}`}
                                    type="number"
                                    step="0.01"
                                    defaultValue={money(product.prices?.[0]?.price)}
                                    className="w-16 rounded border px-1.5 py-0.5 text-xs text-slate-850"
                                  />
                                  <button
                                    onClick={() => {
                                      const val = (document.getElementById(`price-${product.id}`) as HTMLInputElement)?.value;
                                      handleUpdateProductPrice(product.id, val, product.approvalStatus);
                                    }}
                                    className="rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1 py-0.5 text-[10px] font-bold"
                                  >
                                    Save
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  onClick={() => handleToggleProductAvailability(product.id, product.isAvailable, product.approvalStatus)}
                                  className={`cursor-pointer inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                    product.isAvailable ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {product.isAvailable ? "Available" : "Out of stock"}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                  product.approvalStatus === "APPROVED" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {product.approvalStatus || "PENDING"}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleToggleProductApproval(product.id, product.approvalStatus)}
                                    className="rounded border border-slate-300 hover:bg-slate-50 px-2 py-1 text-xs font-semibold"
                                  >
                                    {product.approvalStatus === "APPROVED" ? "Pause" : "Approve"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "Payments & Reconciliation" && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  {reconciliationSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {[
                        { label: "Total Expected", value: `₹${money(reconciliationSummary.payments?.total_expected)}`, color: "bg-blue-50 text-blue-700 border-blue-200" },
                        { label: "Total Collected", value: `₹${money(reconciliationSummary.payments?.total_collected)}`, color: "bg-green-50 text-green-700 border-green-200" },
                        { label: "Pending", value: reconciliationSummary.payments?.pending_count ?? 0, color: "bg-amber-50 text-amber-700 border-amber-200" },
                        { label: "Reconciled", value: reconciliationSummary.payments?.reconciled_count ?? 0, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                        { label: "Mismatched", value: reconciliationSummary.payments?.mismatch_count ?? 0, color: reconciliationSummary.payments?.mismatch_count > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200" },
                        { label: "Open Alerts", value: reconciliationSummary.alerts?.open_total ?? 0, color: reconciliationSummary.alerts?.open_total > 0 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-slate-50 text-slate-600 border-slate-200" }
                      ].map((card) => (
                        <div key={card.label} className={`rounded-xl border p-4 ${card.color} shadow-sm`}>
                          <div className="text-xs font-medium opacity-75">{card.label}</div>
                          <div className="mt-1 text-2xl font-bold">{card.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reconciliation Alerts */}
                  {reconciliationAlerts.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-3">
                        <h2 className="text-lg font-bold">Reconciliation Alerts</h2>
                        <span className="rounded-full bg-orange-100 text-orange-700 px-2.5 py-0.5 text-xs font-bold">{reconciliationAlerts.length} open</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                              <th className="px-5 py-3">Severity</th>
                              <th className="px-5 py-3">Type</th>
                              <th className="px-5 py-3">Order</th>
                              <th className="px-5 py-3">Expected</th>
                              <th className="px-5 py-3">Collected</th>
                              <th className="px-5 py-3">Message</th>
                              <th className="px-5 py-3">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reconciliationAlerts.map((alert: any) => (
                              <tr key={alert.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                                    alert.severity === "URGENT" ? "bg-red-100 text-red-800" :
                                    alert.severity === "HIGH" ? "bg-orange-100 text-orange-800" :
                                    "bg-yellow-100 text-yellow-800"
                                  }`}>{alert.severity}</span>
                                </td>
                                <td className="px-5 py-3 font-mono text-xs">{alert.type}</td>
                                <td className="px-5 py-3 font-semibold">{alert.order?.orderNumber || "—"}</td>
                                <td className="px-5 py-3">₹{money(alert.expectedAmount)}</td>
                                <td className="px-5 py-3">₹{money(alert.collectedAmount)}</td>
                                <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{alert.message}</td>
                                <td className="px-5 py-3 text-xs text-slate-500">{new Date(alert.createdAt).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pending Collections */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="text-lg font-bold">Pending Collections</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-5 py-3">Order</th>
                            <th className="px-5 py-3">Method</th>
                            <th className="px-5 py-3">Expected</th>
                            <th className="px-5 py-3">Collected</th>
                            <th className="px-5 py-3">Collector</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendingPayments.length === 0 ? (
                            <tr>
                              <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                                No payment collection tasks pending review.
                              </td>
                            </tr>
                          ) : (
                            pendingPayments.map(({ order, payment }) => (
                              <tr key={payment.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-semibold">{order.orderNumber}</td>
                                <td className="px-5 py-3">{payment.paymentMethodActual || payment.paymentMethodRequested || payment.method}</td>
                                <td className="px-5 py-3">₹{money(payment.amount)}</td>
                                <td className="px-5 py-3">₹{money(payment.amountCollected)}</td>
                                <td className="px-5 py-3">{payment.collectorType || "Pending"}</td>
                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                    payment.status === "COLLECTED_UNVERIFIED" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                    payment.status === "SHORT_COLLECTED" || payment.status === "OVER_COLLECTED" ? "bg-red-50 text-red-700 border border-red-200" :
                                    payment.status === "DISPUTED" ? "bg-red-100 text-red-800 border border-red-300" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>{payment.status}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <button
                                    onClick={() => {
                                      setShowReconcileModal(payment.id);
                                      setReconcileData({
                                        status: "VERIFIED",
                                        amount_collected: Number(payment.amountCollected || payment.amount || 0),
                                        reason: ""
                                      });
                                    }}
                                    className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-xs font-semibold"
                                  >
                                    Reconcile
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* All Payments Table */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="text-lg font-bold">All Payments</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-4 py-3">Order</th>
                            <th className="px-4 py-3">Vendor</th>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Collected</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Verification</th>
                            <th className="px-4 py-3">Gateway</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allPayments.length === 0 ? (
                            <tr>
                              <td className="px-4 py-8 text-center text-slate-500" colSpan={10}>
                                No payment records found.
                              </td>
                            </tr>
                          ) : (
                            allPayments.map((payment: any) => {
                              const isTerminal = ["VERIFIED", "SETTLED", "RECONCILED", "SUCCESS", "NOT_REQUIRED", "FAILED", "REFUNDED"].includes(payment.status);
                              const isMismatch = ["SHORT_COLLECTED", "OVER_COLLECTED"].includes(payment.status);
                              const hasOpenAlerts = payment.reconciliationAlerts?.length > 0;
                              return (
                                <tr key={payment.id} className={`hover:bg-slate-50 ${isMismatch ? "bg-red-50/40" : ""} ${hasOpenAlerts ? "border-l-2 border-l-orange-400" : ""}`}>
                                  <td className="px-4 py-3 font-semibold">{payment.order?.orderNumber || "—"}</td>
                                  <td className="px-4 py-3 text-xs">{payment.order?.vendor?.shopName || "—"}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      payment.method === "RAZORPAY" ? "bg-blue-50 text-blue-700" :
                                      payment.method === "UPI" ? "bg-purple-50 text-purple-700" :
                                      "bg-slate-100 text-slate-600"
                                    }`}>{payment.paymentMethodActual || payment.method}</span>
                                  </td>
                                  <td className="px-4 py-3">₹{money(payment.amount)}</td>
                                  <td className={`px-4 py-3 ${isMismatch ? "text-red-700 font-bold" : ""}`}>₹{money(payment.amountCollected)}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                      payment.status === "SUCCESS" || payment.status === "VERIFIED" || payment.status === "SETTLED" ? "bg-green-50 text-green-700 border border-green-200" :
                                      payment.status === "FAILED" ? "bg-red-50 text-red-700 border border-red-200" :
                                      payment.status === "DISPUTED" ? "bg-red-100 text-red-800 border border-red-300" :
                                      isMismatch ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                      payment.status === "PROCESSING" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                      "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}>{payment.status}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      payment.adminVerificationStatus === "VERIFIED" ? "bg-green-50 text-green-700" :
                                      payment.adminVerificationStatus === "REJECTED" ? "bg-red-50 text-red-700" :
                                      "bg-slate-100 text-slate-500"
                                    }`}>{payment.adminVerificationStatus}</span>
                                  </td>
                                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{payment.gatewayPaymentId ? payment.gatewayPaymentId.slice(0, 14) + "…" : "—"}</td>
                                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(payment.createdAt).toLocaleString()}</td>
                                  <td className="px-4 py-3">
                                    {!isTerminal && (
                                      <button
                                        onClick={() => {
                                          setShowReconcileModal(payment.id);
                                          setReconcileData({
                                            status: "VERIFIED",
                                            amount_collected: Number(payment.amountCollected || payment.amount || 0),
                                            reason: ""
                                          });
                                        }}
                                        className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-xs font-semibold"
                                      >
                                        Reconcile
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Settlements/Payouts" && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  {reconciliationSummary?.payouts && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {[
                        { label: "Vendor Payable", value: `₹${money(reconciliationSummary.payouts.vendor_payable_amount)}`, sub: `${reconciliationSummary.payouts.vendor_payable_count} pending`, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
                        { label: "Rider Payable", value: `₹${money(reconciliationSummary.payouts.rider_payable_amount)}`, sub: `${reconciliationSummary.payouts.rider_payable_count} pending`, color: "bg-purple-50 text-purple-700 border-purple-200" },
                        { label: "Vendor Paid", value: `₹${money(reconciliationSummary.payouts.vendor_paid_amount)}`, sub: `${reconciliationSummary.payouts.vendor_paid_count} completed`, color: "bg-green-50 text-green-700 border-green-200" },
                        { label: "Rider Paid", value: `₹${money(reconciliationSummary.payouts.rider_paid_amount)}`, sub: `${reconciliationSummary.payouts.rider_paid_count} completed`, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                        { label: "On Hold", value: reconciliationSummary.payouts.hold_count, sub: "payouts held", color: reconciliationSummary.payouts.hold_count > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200" }
                      ].map((card) => (
                        <div key={card.label} className={`rounded-xl border p-4 ${card.color} shadow-sm`}>
                          <div className="text-xs font-medium opacity-75">{card.label}</div>
                          <div className="mt-1 text-2xl font-bold">{card.value}</div>
                          <div className="mt-0.5 text-xs opacity-60">{card.sub}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payouts Table */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h2 className="text-lg font-bold">Settlements & Payouts</h2>
                      <div className="flex gap-1">
                        {["ALL", "PAYOUT_PENDING", "PAYOUT_PAID", "PAYOUT_HOLD", "PAYOUT_DISPUTED"].map((f) => (
                          <button
                            key={f}
                            onClick={() => setPayoutFilter(f)}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              payoutFilter === f
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {f === "ALL" ? "All" : f.replace("PAYOUT_", "").charAt(0) + f.replace("PAYOUT_", "").slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-4 py-3">Payee</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Approved By</th>
                            <th className="px-4 py-3">Paid At</th>
                            <th className="px-4 py-3">Notes</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const filtered = payoutFilter === "ALL" ? payouts : payouts.filter((p: any) => p.status === payoutFilter);
                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                                    {payoutFilter === "ALL" ? "No payout records. Payouts are generated after payment reconciliation." : `No ${payoutFilter.replace("PAYOUT_", "").toLowerCase()} payouts.`}
                                  </td>
                                </tr>
                              );
                            }
                            return filtered.map((payout: any) => (
                              <tr key={payout.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold">
                                  {payout.vendor?.shopName || payout.rider?.name || "Unknown"}
                                  <div className="text-xs text-slate-400 font-normal">{payout.vendor?.ownerPhone || payout.rider?.phone || ""}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    payout.payeeType === "VENDOR" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                                  }`}>{payout.payeeType}</span>
                                </td>
                                <td className="px-4 py-3 font-semibold">₹{money(payout.amount)}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                    payout.status === "PAYOUT_PAID" ? "bg-green-50 text-green-700 border border-green-200" :
                                    payout.status === "PAYOUT_PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                    payout.status === "PAYOUT_HOLD" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                    payout.status === "PAYOUT_DISPUTED" ? "bg-red-50 text-red-700 border border-red-200" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>{payout.status.replace("PAYOUT_", "")}</span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500">{new Date(payout.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3 text-xs text-slate-500">{payout.approvedBy || "—"}</td>
                                <td className="px-4 py-3 text-xs text-slate-500">{payout.paidAt ? new Date(payout.paidAt).toLocaleString() : "—"}</td>
                                <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{payout.adjustmentNote || "—"}</td>
                                <td className="px-4 py-3">
                                  {payout.status !== "PAYOUT_PAID" && (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleUpdatePayout(payout.id, "PAYOUT_PAID")}
                                        className="rounded bg-green-600 hover:bg-green-700 text-white px-2 py-1 text-xs font-semibold"
                                      >
                                        Pay
                                      </button>
                                      {payout.status !== "PAYOUT_HOLD" && (
                                        <button
                                          onClick={() => handleUpdatePayout(payout.id, "PAYOUT_HOLD")}
                                          className="rounded border border-amber-300 hover:bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                                        >
                                          Hold
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Support Tickets" && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-5 py-3">Subject</th>
                          <th className="px-5 py-3">Priority</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Description</th>
                          <th className="px-5 py-3">Created At</th>
                          <th className="px-5 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supportTickets.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                              No support tickets found.
                            </td>
                          </tr>
                        ) : (
                          supportTickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold">{ticket.subject}</td>
                              <td className="px-5 py-3 font-bold text-red-650">{ticket.priority}</td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                  ticket.status === "OPEN" ? "bg-amber-50 text-amber-700 border border-amber-150" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {ticket.status}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-slate-600">{ticket.description}</td>
                              <td className="px-5 py-3">{new Date(ticket.createdAt).toLocaleString()}</td>
                              <td className="px-5 py-3 flex gap-2">
                                <button
                                  onClick={() => loadTicketDetail(ticket.id)}
                                  className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-xs font-semibold"
                                >
                                  Details
                                </button>
                                {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                                  <button
                                    onClick={() => handleUpdateSupportTicket(ticket.id, "RESOLVED")}
                                    className="rounded bg-green-600 hover:bg-green-700 text-white px-2 py-1 text-xs font-semibold"
                                  >
                                    Resolve
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "Compliance" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="text-lg font-bold">Vendor Compliance</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-5 py-3">Vendor</th>
                            <th className="px-5 py-3">FSSAI</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vendors.length === 0 ? (
                            <tr>
                              <td className="px-5 py-8 text-center text-slate-500" colSpan={4}>
                                No vendors found.
                              </td>
                            </tr>
                          ) : (
                            vendors.map((vendor) => (
                              <tr key={vendor.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-semibold">{vendor.shopName}</td>
                                <td className="px-5 py-3">{vendor.fssaiStatus}</td>
                                <td className="px-5 py-3">{vendor.onboardingStatus || vendor.status}</td>
                                <td className="px-5 py-3">
                                  <button
                                    onClick={() => loadVendorCompliance(vendor.id)}
                                    className="rounded border border-slate-300 hover:bg-slate-50 px-2 py-1 text-xs font-semibold"
                                  >
                                    Review Docs
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="text-lg font-bold">Rider KYC</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-5 py-3">Rider</th>
                            <th className="px-5 py-3">Phone</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {riders.length === 0 ? (
                            <tr>
                              <td className="px-5 py-8 text-center text-slate-500" colSpan={4}>
                                No riders found.
                              </td>
                            </tr>
                          ) : (
                            riders.map((rider) => (
                              <tr key={rider.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-semibold">{rider.name}</td>
                                <td className="px-5 py-3">{rider.phone}</td>
                                <td className="px-5 py-3">{rider.onboardingStatus || rider.status}</td>
                                <td className="px-5 py-3">
                                  <button
                                    onClick={() => loadRiderKyc(rider.id)}
                                    className="rounded border border-slate-300 hover:bg-slate-50 px-2 py-1 text-xs font-semibold"
                                  >
                                    Review KYC
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Reports" && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-bold">Validation Dashboard</h2>
                  </div>
                  {!report ? (
                    <div className="p-5 text-center text-slate-500">No validation report loaded.</div>
                  ) : (
                    <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(report).map(([section, values]) => (
                        <div key={section} className="rounded border border-slate-200 p-4">
                          <h3 className="font-bold capitalize">{section.split("_").join(" ")}</h3>
                          <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-600">
                            {JSON.stringify(values, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Audit Logs" && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-5 py-3">Action</th>
                          <th className="px-5 py-3">Entity Type</th>
                          <th className="px-5 py-3">Entity ID</th>
                          <th className="px-5 py-3">Reason</th>
                          <th className="px-5 py-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                              No audit logs recorded.
                            </td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold text-indigo-750">{log.action}</td>
                              <td className="px-5 py-3">{log.entityType}</td>
                              <td className="px-5 py-3 text-slate-500 font-mono text-xs">{log.entityId}</td>
                              <td className="px-5 py-3 text-slate-600">{log.reason}</td>
                              <td className="px-5 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "Service Zones" && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
                  <div className="border-b border-slate-200 px-5 py-4 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold">Service Zones</h2>
                    <button
                      onClick={() => setShowZoneModal(true)}
                      className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold shadow transition"
                    >
                      Create Zone
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-5 py-3">Zone Name</th>
                          <th className="px-5 py-3">City/State</th>
                          <th className="px-5 py-3">Center Coordinate</th>
                          <th className="px-5 py-3">Radius</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {serviceZones.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                              No service zones defined.
                            </td>
                          </tr>
                        ) : (
                          serviceZones.map((zone) => (
                            <tr key={zone.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold">{zone.name}</td>
                              <td className="px-5 py-3">{zone.city}, {zone.state}</td>
                              <td className="px-5 py-3 text-slate-500 font-mono text-xs">
                                {zone.centerLatitude}, {zone.centerLongitude}
                              </td>
                              <td className="px-5 py-3">{zone.radiusKm} km</td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                  zone.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                }`}>
                                  {zone.isActive ? "Active" : "Paused"}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <button
                                  onClick={() => handleToggleZoneStatus(zone.id, zone.isActive)}
                                  className="rounded border border-slate-300 hover:bg-slate-50 px-2 py-1 text-xs font-semibold"
                                >
                                  {zone.isActive ? "Pause" : "Activate"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "Settings" && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 max-w-lg">
                  <h2 className="text-xl font-bold mb-4">Operations Config</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">API URL Connection</label>
                      <input
                        type="text"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Admin JWT Auth Token</label>
                      <textarea
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm font-mono h-24"
                        placeholder="Bearer token"
                      />
                    </div>
                    <button
                      onClick={() => saveConfig(apiUrl, authToken)}
                      className="rounded bg-indigo-650 hover:bg-indigo-750 px-4 py-2 text-sm font-semibold text-white shadow"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Create New Vendor</h2>
            <form onSubmit={handleCreateVendor} className="space-y-3">
              <input
                type="text"
                placeholder="Shop Name"
                value={newVendor.shopName}
                onChange={(e) => setNewVendor({ ...newVendor, shopName: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Owner Name"
                value={newVendor.ownerName}
                onChange={(e) => setNewVendor({ ...newVendor, ownerName: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Owner Phone"
                value={newVendor.ownerPhone}
                onChange={(e) => setNewVendor({ ...newVendor, ownerPhone: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={newVendor.addressLine}
                onChange={(e) => setNewVendor({ ...newVendor, addressLine: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Service Zone UUID"
                value={newVendor.serviceZoneId}
                onChange={(e) => setNewVendor({ ...newVendor, serviceZoneId: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-indigo-650 hover:bg-indigo-750 text-white px-4 py-2 text-sm font-semibold"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRiderModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Add New Rider</h2>
            <form onSubmit={handleCreateRider} className="space-y-3">
              <input
                type="text"
                placeholder="Rider Name"
                value={newRider.name}
                onChange={(e) => setNewRider({ ...newRider, name: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Phone"
                value={newRider.phone}
                onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Payout UPI ID"
                value={newRider.payoutUpiId}
                onChange={(e) => setNewRider({ ...newRider, payoutUpiId: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Service Zone UUID"
                value={newRider.serviceZoneId}
                onChange={(e) => setNewRider({ ...newRider, serviceZoneId: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowRiderModal(false)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-indigo-650 hover:bg-indigo-750 text-white px-4 py-2 text-sm font-semibold"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Create Product</h2>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <input
                type="text"
                placeholder="Vendor UUID"
                value={newProduct.vendorId}
                onChange={(e) => setNewProduct({ ...newProduct, vendorId: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Category UUID"
                value={newProduct.categoryId}
                onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Unit, e.g. kg, plate, packet"
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <textarea
                placeholder="Description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-20"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-indigo-650 hover:bg-indigo-750 text-white px-4 py-2 text-sm font-semibold"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showZoneModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Create New Service Zone</h2>
            <form onSubmit={handleCreateZone} className="space-y-3">
              <input
                type="text"
                placeholder="Zone Name"
                value={newZone.name}
                onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="City"
                value={newZone.city}
                onChange={(e) => setNewZone({ ...newZone, city: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="State"
                value={newZone.state}
                onChange={(e) => setNewZone({ ...newZone, state: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Center Lat</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Center Lat"
                    value={newZone.centerLatitude}
                    onChange={(e) => setNewZone({ ...newZone, centerLatitude: parseFloat(e.target.value) })}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Center Lng</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Center Lng"
                    value={newZone.centerLongitude}
                    onChange={(e) => setNewZone({ ...newZone, centerLongitude: parseFloat(e.target.value) })}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Radius (km)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Radius (in km)"
                  value={newZone.radiusKm}
                  onChange={(e) => setNewZone({ ...newZone, radiusKm: parseFloat(e.target.value) })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Manual Dispatch Assignment</h2>
            <form onSubmit={handleAssignRider} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Select Available Rider</label>
                <select
                  value={assignRiderId}
                  onChange={(e) => setAssignRiderId(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm mt-1 bg-white text-slate-800"
                  required
                >
                  <option value="">-- Select Rider --</option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.phone}) - {r.isOnline ? "ONLINE" : "OFFLINE"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(null)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold"
                >
                  Confirm Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReconcileModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Reconcile Payment</h2>
            <form onSubmit={handleReconcilePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Reconciliation Status</label>
                <select
                  value={reconcileData.status}
                  onChange={(e) => setReconcileData({ ...reconcileData, status: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm mt-1 bg-white text-slate-800"
                  required
                >
                  <option value="VERIFIED">Verified</option>
                  <option value="SHORT_COLLECTED">Short Collected</option>
                  <option value="OVER_COLLECTED">Over Collected</option>
                  <option value="DISPUTED">Disputed</option>
                  <option value="SETTLED">Settled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Amount Collected</label>
                <input
                  type="number"
                  step="0.01"
                  value={reconcileData.amount_collected}
                  onChange={(e) =>
                    setReconcileData({ ...reconcileData, amount_collected: Number(e.target.value) })
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason</label>
                <textarea
                  value={reconcileData.reason}
                  onChange={(e) => setReconcileData({ ...reconcileData, reason: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm mt-1 h-20"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(null)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold"
                >
                  Confirm Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showComplianceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold">Vendor Compliance Documents</h2>
              <button 
                onClick={() => setShowComplianceModal(null)}
                className="text-slate-500 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {selectedVendorCompliance.length === 0 ? (
              <p className="text-center text-slate-500 py-6">No compliance documents uploaded for this vendor.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {selectedVendorCompliance.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">{doc.type} Document</div>
                      <div className="text-xs text-slate-500 mt-1">Status: <span className="font-bold">{doc.status}</span></div>
                      {doc.expiresAt && (
                        <div className="text-xs text-slate-500">Expires: {new Date(doc.expiresAt).toLocaleDateString()}</div>
                      )}
                      <a 
                        href={doc.documentUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline mt-2 inline-block font-semibold"
                      >
                        View Original File
                      </a>
                    </div>
                    {doc.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewCompliance(doc.id, "APPROVED", "FSSAI_VERIFIED")}
                          className="rounded bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-semibold transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewCompliance(doc.id, "REJECTED", "FSSAI_REJECTED")}
                          className="rounded bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-semibold transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowComplianceModal(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showRiderKycModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold">Rider KYC Documents</h2>
              <button 
                onClick={() => setShowRiderKycModal(null)}
                className="text-slate-500 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {selectedRiderKyc.length === 0 ? (
              <p className="text-center text-slate-500 py-6">No KYC documents uploaded for this rider.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {selectedRiderKyc.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">{doc.type} Document</div>
                      <div className="text-xs text-slate-500 mt-1">Status: <span className="font-bold">{doc.status}</span></div>
                      <a 
                        href={doc.documentUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline mt-2 inline-block font-semibold"
                      >
                        View Original File
                      </a>
                    </div>
                    {doc.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewRiderKyc(doc.id, "APPROVED")}
                          className="rounded bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-semibold transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewRiderKyc(doc.id, "REJECTED")}
                          className="rounded bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-semibold transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowRiderKycModal(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold">Support Ticket Details</h2>
              <button 
                onClick={() => setShowTicketModal(false)}
                className="text-slate-500 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Details & Edit */}
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subject</div>
                  <div className="text-base font-bold text-slate-800">{selectedTicket.subject}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</div>
                  <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{selectedTicket.description}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Created By (User ID)</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{selectedTicket.createdBy}</div>
                </div>

                <form onSubmit={handleUpdateTicketDetails} className="space-y-3 pt-3 border-t">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => setSelectedTicket({ ...selectedTicket, status: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white text-slate-800"
                      required
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_FOR_VENDOR">Waiting for Vendor</option>
                      <option value="WAITING_FOR_RIDER">Waiting for Rider</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => setSelectedTicket({ ...selectedTicket, priority: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white text-slate-800"
                      required
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Internal Note (Admin Note)</label>
                    <textarea
                      value={selectedTicket.adminNote || ""}
                      onChange={(e) => setSelectedTicket({ ...selectedTicket, adminNote: e.target.value })}
                      placeholder="Add internal resolution or follow-up note..."
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-24"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowTicketModal(false)}
                      className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-indigo-650 hover:bg-indigo-750 text-white px-4 py-2 text-sm font-semibold shadow"
                    >
                      Save Ticket
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: History / Timeline */}
              <div className="border-l pl-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ticket Event History</div>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {!selectedTicket.events || selectedTicket.events.length === 0 ? (
                      <div className="text-sm text-slate-550 italic">No events logged for this ticket.</div>
                    ) : (
                      selectedTicket.events.map((event: any) => (
                        <div key={event.id} className="p-3 rounded border border-slate-100 bg-slate-50 text-xs">
                          <div className="font-semibold text-slate-700">{event.message}</div>
                          <div className="text-slate-400 mt-2 flex justify-between">
                            <span>By: {event.actorId ? event.actorId.slice(0, 8) + "…" : "System"}</span>
                            <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
