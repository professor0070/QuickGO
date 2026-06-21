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
  const [products, setProducts] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [serviceZones, setServiceZones] = useState<any[]>([]);

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
    pricePaise: 4000
  });

  const [assignRiderId, setAssignRiderId] = useState("");
  const [reconcileData, setReconcileData] = useState({
    status: "RECONCILED",
    amountCollectedPaise: 0,
    collectorType: "RIDER",
    collectorId: "",
    note: "Cash received from rider"
  });

  // Local storage for config & check token
  useEffect(() => {
    const savedUrl = localStorage.getItem("quickgo_api_url");
    const savedToken = localStorage.getItem("quickgo_auth_token");
    if (savedUrl) setApiUrl(savedUrl);
    if (savedToken) {
      setAuthToken(savedToken);
      fetch(`${savedUrl || apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.roles && (data.roles.includes("ADMIN") || data.roles.includes("SUPER_ADMIN"))) {
            setUserProfile(data);
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
      const res = await fetch(`${apiUrl}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone })
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
      const res = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, otp: loginOtp })
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

  const loadData = async () => {
    if (!authToken) {
      setError("Please set a valid Admin JWT Auth Token in Settings.");
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
        const r = await fetchWithAuth("/admin/riders");
        setRiders(r || []);
      } else if (activeTab === "Products") {
        const p = await fetchWithAuth("/admin/products");
        setProducts(p || []);
      } else if (activeTab === "Support Tickets") {
        const s = await fetchWithAuth("/admin/support-tickets");
        setSupportTickets(s || []);
      } else if (activeTab === "Audit Logs") {
        const a = await fetchWithAuth("/admin/audit-logs");
        setAuditLogs(a || []);
      } else if (activeTab === "Service Zones") {
        const sz = await fetchWithAuth("/admin/service-zones");
        setServiceZones(sz || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data from API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, authToken, apiUrl]);

  // Actions
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth("/admin/vendors", {
        method: "POST",
        body: JSON.stringify(newVendor)
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
        body: JSON.stringify(newRider)
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
        body: JSON.stringify(newProduct)
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
    try {
      await fetchWithAuth(`/admin/orders/${showAssignModal}/assign-rider`, {
        method: "POST",
        body: JSON.stringify({ rider_id: assignRiderId, reason: "Manual assignment" })
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
    try {
      await fetchWithAuth(`/admin/payments/${showReconcileModal}/reconcile`, {
        method: "PATCH",
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
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await fetchWithAuth(`/admin/vendors/${vendorId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
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
    try {
      await fetchWithAuth(`/admin/vendor-compliance-documents/${docId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status, fssai_status: fssaiStatus, reason: "Reviewed by Admin" })
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
    try {
      await fetchWithAuth(`/admin/rider-kyc-documents/${docId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: "Reviewed by Admin" })
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
    try {
      await fetchWithAuth(`/admin/riders/${riderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason: "Status toggled by Admin" })
      });
      alert(`Rider status updated to ${nextStatus}`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth("/admin/service-zones", {
        method: "POST",
        body: JSON.stringify(newZone)
      });
      setShowZoneModal(false);
      alert("Service zone created successfully");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleZoneStatus = async (zoneId: string, currentStatus: boolean) => {
    try {
      await fetchWithAuth(`/admin/service-zones/${zoneId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !currentStatus })
      });
      alert(`Service zone status updated`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleProductAvailability = async (productId: string, currentAvailable: boolean, currentStatus: string) => {
    try {
      await fetchWithAuth(`/admin/products/${productId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: !currentAvailable, status: currentStatus, reason: "Availability toggled by Admin" })
      });
      alert("Product availability updated");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleProductApproval = async (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "APPROVED" ? "PAUSED" : "APPROVED";
    try {
      await fetchWithAuth(`/admin/products/${productId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason: "Approval status updated by Admin" })
      });
      alert(`Product status updated to ${nextStatus}`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateProductPrice = async (productId: string, priceRupees: string, currentStatus: string) => {
    const price = Math.round(parseFloat(priceRupees) * 100);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price");
      return;
    }
    try {
      await fetchWithAuth(`/admin/products/${productId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ price, status: currentStatus, reason: "Price updated by Admin" })
      });
      alert("Product price updated");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

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
                  placeholder="9999999999"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
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
                onChange={(e) => setApiUrl(e.target.value)}
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
                      <div className="mt-2 text-2xl font-bold tracking-tight text-indigo-650">Rs {((stats.today_vendor_commission ?? 0) / 100).toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Delivery Fees</div>
                      <div className="mt-2 text-2xl font-bold tracking-tight text-indigo-650">Rs {((stats.today_delivery_fee_collected ?? 0) / 100).toFixed(2)}</div>
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
                              <td className="px-5 py-3">Rs {order.totalAmount}</td>
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
                                      if (confirm("Cancel this order?")) {
                                        try {
                                          await fetchWithAuth(`/admin/orders/${order.id}/cancel`, {
                                            method: "POST",
                                            body: JSON.stringify({ reason: "Admin cancelled" })
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
                                    {vendor.status === "ACTIVE" ? "Pause" : "Activate"}
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
                                    defaultValue={((product.prices?.[0]?.price ?? 0) / 100).toFixed(2)}
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
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-bold">Pending Collections</h2>
                  </div>
                  <div className="p-5 text-center text-slate-500">
                    No payment collection tasks pending review. All COD/UPI rider balances are reconciled.
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supportTickets.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
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
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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
    </main>
  );
}
