// Move-out requests: real API for list/accept; dummy data only for search/initiate
import { moveOutApi, userApi } from "../utils/api";
import { DUMMY_TENANTS, Tenant as CentralTenant } from "../data/dummyTenants";

/** Fetch customer name (and phone) from user-service by uniqueId. Returns null on 404/error. */
async function fetchCustomerProfile(uniqueId: string): Promise<{ customerName: string; phone?: string; email?: string } | null> {
  if (!uniqueId || !uniqueId.trim()) return null;
  try {
    const res = await userApi.get(`/api/users/${encodeURIComponent(uniqueId.trim())}/profile`, { timeout: 8000 });
    const user = res.data?.user;
    if (!user) return null;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return {
      customerName: name || uniqueId,
      phone: user.phone,
      email: user.email,
    };
  } catch {
    return null;
  }
}

function looksLikeMyStayUniqueId(value?: string | null): boolean {
  if (!value) return false;
  const v = String(value).trim();
  // Typical MyStay ids contain letters (e.g., MYS..., MYS25A...)
  return /[A-Za-z]/.test(v);
}

interface Tenant {
  customerId: string;
  customerName: string;
  mystayId: string;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomNumber: string;
  bookingId: string;
  checkInDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  phone: string;
  email: string;
}

interface SearchTenantsParams {
  query: string;
  includeBookingDetails?: boolean;
}

interface InitiateMoveOutParams {
  customerId: string;
  propertyId: string;
  roomId: string;
  bookingId: string;
  moveOutDate: string;
  reason: string;
  adminComments?: string;
  type: 'admin_initiated' | 'tenant_requested';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface MoveOutRequest {
  requestId: string;
  customerId: string;
  mystayId?: string;
  customerName?: string;
  propertyId: string;
  roomId: string;
  bookingId: string;
  requestedDate: Date;
  submissionDate: Date;
  reason: string;
  customerComments?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminId?: string;
  adminComments?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  noticePeriodDays: number;
  isWithinNotice: boolean;
  penaltyAmount?: number;
  securityDepositAmount: number;
  deductions: any[];
  finalRefundAmount: number;
  settlementStatus: 'pending' | 'processed' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  currentDue?: number;
  /** 'admin_initiated' = created by admin; 'tenant_requested' = requested by tenant from customer app */
  type?: 'admin_initiated' | 'tenant_requested';
}

interface ScheduledMoveOut {
  processId: string;
  customerId: string;
  customerName: string;
  mystayId: string;
  propertyName: string;
  roomNumber: string;
  moveOutDate: Date;
  type: 'customer_initiated' | 'admin_initiated';
  securityDepositAmount: number;
  currentDue?: number;
  status: string;
}

// Map centralized tenant data to service format
const HARDCODED_TENANTS: Tenant[] = DUMMY_TENANTS
  .filter(t => t.status === "active")
  .map(tenant => ({
    customerId: tenant.id,
    customerName: tenant.name,
    mystayId: tenant.mystayId,
    propertyId: tenant.propertyId,
    propertyName: tenant.propertyName,
    roomId: `room_${tenant.roomNumber}`,
    roomNumber: tenant.roomNumber,
    bookingId: tenant.bookingId || `booking_${tenant.id}`,
    checkInDate: tenant.checkInDate,
    monthlyRent: tenant.monthlyRent,
    securityDeposit: tenant.securityDeposit,
    phone: tenant.phone,
    email: tenant.email
  }));

// Hardcoded move-out requests - using IDs from centralized tenant data
const HARDCODED_MOVE_OUT_REQUESTS: MoveOutRequest[] = [
  {
    requestId: "MOR001234567890",
    customerId: "customer_001", // John Doe
    propertyId: "property_001",
    roomId: "room_101",
    bookingId: "booking_001",
    requestedDate: new Date("2026-03-15"),
    submissionDate: new Date("2026-02-10"),
    reason: "Job Relocation",
    customerComments: "Got a new job in another city, need to move out by mid-March",
    status: "pending",
    noticePeriodDays: 33,
    isWithinNotice: false,
    securityDepositAmount: 15000,
    deductions: [],
    finalRefundAmount: 15000,
    settlementStatus: "pending",
    createdAt: new Date("2026-02-10T10:30:00Z"),
    updatedAt: new Date("2026-02-10T10:30:00Z")
  },
  {
    requestId: "MOR001234567891",
    customerId: "customer_003", // Alex Brown
    propertyId: "property_001",
    roomId: "room_201",
    bookingId: "booking_003",
    requestedDate: new Date("2026-03-28"),
    submissionDate: new Date("2026-02-08"),
    reason: "Lease Expired",
    customerComments: "My lease is ending and I won't be renewing",
    status: "approved",
    adminId: "admin_001",
    adminComments: "Approved - proper notice given",
    approvalDate: new Date("2026-02-09"),
    noticePeriodDays: 48,
    isWithinNotice: false,
    securityDepositAmount: 13000,
    deductions: [],
    finalRefundAmount: 13000,
    settlementStatus: "pending",
    createdAt: new Date("2026-02-08T14:15:00Z"),
    updatedAt: new Date("2026-02-09T09:20:00Z")
  },
  {
    requestId: "MOR001234567892",
    customerId: "customer_005", // Rahul Sharma
    propertyId: "property_002",
    roomId: "room_301",
    bookingId: "booking_005",
    requestedDate: new Date("2026-02-25"),
    submissionDate: new Date("2026-02-15"),
    reason: "Family Emergency",
    customerComments: "Urgent family situation requires immediate relocation",
    status: "pending",
    noticePeriodDays: 10,
    isWithinNotice: true,
    penaltyAmount: 5000,
    securityDepositAmount: 18000,
    deductions: [],
    finalRefundAmount: 13000,
    settlementStatus: "pending",
    createdAt: new Date("2026-02-15T16:45:00Z"),
    updatedAt: new Date("2026-02-15T16:45:00Z")
  }
];

// Hardcoded scheduled move-outs - using IDs from centralized tenant data
const HARDCODED_SCHEDULED_MOVEOUTS: ScheduledMoveOut[] = [
  {
    processId: "MOP001234567890",
    customerId: "customer_002", // Jane Smith
    customerName: "Jane Smith",
    mystayId: "MYS002",
    propertyName: "Mahima Panorama",
    roomNumber: "102",
    moveOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    type: "customer_initiated",
    securityDepositAmount: 12000,
    status: "scheduled"
  },
  {
    processId: "MOP001234567891",
    customerId: "customer_004", // Priya Patel
    customerName: "Priya Patel",
    mystayId: "MYS004",
    propertyName: "Mahima Panorama",
    roomNumber: "202",
    moveOutDate: new Date(), // Today
    type: "customer_initiated",
    securityDepositAmount: 10000,
    status: "scheduled"
  },
  {
    processId: "MOP001234567892",
    customerId: "customer_006", // Sneha Reddy
    customerName: "Sneha Reddy",
    mystayId: "MYS006",
    propertyName: "Green Valley PG",
    roomNumber: "302",
    moveOutDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    type: "admin_initiated",
    securityDepositAmount: 13000,
    status: "scheduled"
  }
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MoveOutService {
  static async searchTenants(params: SearchTenantsParams): Promise<ApiResponse<Tenant[]>> {
    // Simulate API call delay
    await delay(800);

    try {
      const { query } = params;
      const searchTerm = query.toLowerCase().trim();

      if (!searchTerm) {
        return {
          success: false,
          error: "Search query is required"
        };
      }

      // Filter tenants based on search query
      const filteredTenants = HARDCODED_TENANTS.filter(tenant => 
        tenant.customerName.toLowerCase().includes(searchTerm) ||
        tenant.mystayId.toLowerCase().includes(searchTerm) ||
        tenant.phone.replace(/\+91/g, '').includes(searchTerm) ||
        tenant.phone.includes(searchTerm) ||
        tenant.roomNumber.toLowerCase().includes(searchTerm) ||
        tenant.propertyName.toLowerCase().includes(searchTerm)
      );

      return {
        success: true,
        data: filteredTenants
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to search tenants"
      };
    }
  }

  /** Try move-out list API; on 404 try alternate path for deployed gateway */
  private static async fetchMoveOutList(path: string, params: Record<string, string>): Promise<any> {
    const res = await moveOutApi.get(path, { params, timeout: 15000 });
    return res;
  }

  /** Extract list of move-out items from various response shapes (including nested or unknown keys) */
  private static extractRequestsArray(data: any): any[] | null {
    const from = data?.data?.requests ?? data?.requests ?? data?.moveOutRequests ?? data?.data ?? data;
    if (Array.isArray(from)) return from;
    if (data && typeof data === "object") {
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && (v[0].requestId != null || v[0].id != null || v[0].customerId != null)) {
          return v;
        }
      }
    }
    return null;
  }

  static async getMoveOutRequests(page?: number, status?: string, propertyId?: string): Promise<ApiResponse<{ requests: MoveOutRequest[] }>> {
    try {
      const apiStatus = status === "pending" || status === "requested" ? "requested" : status === "accepted" || status === "approved" ? "accepted" : status === "moved_out" ? "moved_out" : "requested";
      const params: Record<string, string> = { status: apiStatus };
      if (propertyId) params.propertyId = propertyId;
      const pathsToTry = ["/api/move-out/requests", "/move-out/requests"];
      let res: any;
      let lastErr: any;
      for (const path of pathsToTry) {
        try {
          res = await MoveOutService.fetchMoveOutList(path, params);
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          if (propertyId && (err?.response?.status === 404 || err?.response?.status === 400)) {
            try {
              const { propertyId: _p, ...paramsWithoutProperty } = params;
              res = await MoveOutService.fetchMoveOutList(path, paramsWithoutProperty);
              lastErr = null;
              break;
            } catch {
              //
            }
          }
          if (err?.response?.status === 404 || err?.response?.status === 401) continue;
          continue;
        }
      }
      if (lastErr) return { success: true, data: { requests: [] } };
      if (!res) return { success: true, data: { requests: [] } };
      let requestsArray = MoveOutService.extractRequestsArray(res.data) ?? (Array.isArray(res.data) ? res.data : null);
      if ((!Array.isArray(requestsArray) || requestsArray.length === 0) && (apiStatus === "requested" || apiStatus === "accepted")) {
        const altStatus = apiStatus === "requested" ? "pending" : "approved";
        try {
          const altRes = await MoveOutService.fetchMoveOutList(pathsToTry[0], { ...params, status: altStatus });
          requestsArray = MoveOutService.extractRequestsArray(altRes.data) ?? (Array.isArray(altRes.data) ? altRes.data : null);
          if (Array.isArray(requestsArray) && requestsArray.length > 0) res = altRes;
        } catch {
          //
        }
      }
      if (!Array.isArray(requestsArray)) {
        const ok = res.data?.success !== false;
        return { success: ok, data: { requests: [] } };
      }
      const raw = requestsArray as any[];
      if (raw.length === 0) {
        return { success: true, data: { requests: [] } };
      }
      const uniqueIds = [
        ...new Set(
          raw
            .map((r) => r.customerUniqueId ?? r.customerId)
            .filter((id) => Boolean(id) && looksLikeMyStayUniqueId(String(id)))
        ),
      ] as string[];
      const profileMap: Record<string, { customerName: string }> = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          const profile = await fetchCustomerProfile(String(id));
          if (profile) profileMap[String(id)] = { customerName: profile.customerName };
        })
      );
      const requests: MoveOutRequest[] = raw.map((r: any) => ({
        requestId: r.requestId ?? r.id ?? r.request_id ?? "",
        customerId: r.customerId ?? r.customerUniqueId ?? r.customer_id ?? "",
        mystayId: (r.customerUniqueId ?? r.customerId ?? "") as string,
          customerName:
            profileMap[r.customerUniqueId]?.customerName ??
            profileMap[r.customerId]?.customerName ??
            r.customerName ??
            r.customerUniqueId ??
            r.customerId ??
            "Tenant",
        propertyId: r.propertyId ?? "",
        roomId: r.roomNumber ?? r.roomId ?? "",
        bookingId: r.bookingId ?? r.booking_id ?? "",
        requestedDate: r.requestedDate ?? r.requested_date ?? r.moveOutDate ?? r.move_out_date ?? r.createdAt ?? "",
        submissionDate: r.submissionDate ?? r.submission_date ?? r.createdAt ?? "",
        reason: "",
        customerComments: r.customerComments,
        status: r.status === "requested" ? "pending" : r.status === "accepted" ? "approved" : (r.status as MoveOutRequest["status"]),
        noticePeriodDays: r.noticePeriodDays ?? 0,
        isWithinNotice: r.isWithinNotice ?? false,
        penaltyAmount: r.penaltyAmount,
        securityDepositAmount: r.securityDepositAmount ?? 0,
        deductions: [],
        finalRefundAmount: r.securityDepositAmount ?? 0,
        settlementStatus: "pending",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        currentDue: r.currentDue,
        type: r.type === "admin_initiated" ? "admin_initiated" : "tenant_requested",
      } as MoveOutRequest));
      return { success: true, data: { requests } };
    } catch {
      return { success: true, data: { requests: [] } };
    }
  }

  static async getScheduledMoveOuts(propertyId?: string): Promise<ApiResponse<ScheduledMoveOut[]>> {
    try {
      const params: Record<string, string> = { status: "accepted" };
      if (propertyId) params.propertyId = propertyId;
      const pathsToTry = ["/api/move-out/requests", "/move-out/requests"];
      let res: any;
      let lastErr: any;
      for (const path of pathsToTry) {
        try {
          res = await MoveOutService.fetchMoveOutList(path, params);
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          if (propertyId && (err?.response?.status === 404 || err?.response?.status === 400)) {
            try {
              const { propertyId: _p, ...paramsWithoutProperty } = params;
              res = await MoveOutService.fetchMoveOutList(path, paramsWithoutProperty);
              lastErr = null;
              break;
            } catch {
              continue;
            }
          }
          if (err?.response?.status === 404 || err?.response?.status === 401) continue;
          return { success: true, data: [] };
        }
      }
      if (lastErr || !res) return { success: true, data: [] };
      // Prefer explicit accepted list so we don't accidentally pick "all" or "requested" from response
      const responseData = res.data;
      let requestsArray: any[] | null =
        (Array.isArray(responseData?.data?.accepted) ? responseData.data.accepted : null) ??
        (Array.isArray(responseData?.accepted) ? responseData.accepted : null) ??
        MoveOutService.extractRequestsArray(responseData) ??
        (Array.isArray(responseData) ? responseData : null);
      if ((!Array.isArray(requestsArray) || requestsArray.length === 0)) {
        try {
          const altRes = await MoveOutService.fetchMoveOutList(pathsToTry[0], { ...params, status: "approved" });
          const altData = altRes.data;
          requestsArray =
            (Array.isArray(altData?.data?.accepted) ? altData.data.accepted : null) ??
            (Array.isArray(altData?.accepted) ? altData.accepted : null) ??
            MoveOutService.extractRequestsArray(altData) ??
            (Array.isArray(altData) ? altData : null);
          if (Array.isArray(requestsArray) && requestsArray.length > 0) res = altRes;
        } catch {
          //
        }
      }
      if (!Array.isArray(requestsArray) || requestsArray.length === 0) {
        return { success: res.data?.success !== false, data: [] };
      }
      // Only accepted/approved; deduplicate by request id so we don't show duplicates after admin initiate
      const statusOk = (r: any) => {
        const s = (r.status ?? r.request_status ?? "").toString().toLowerCase();
        return s === "accepted" || s === "approved";
      };
      const seenIds = new Set<string>();
      const raw = (requestsArray as any[])
        .filter((r) => statusOk(r))
        .filter((r) => {
          const id = r.requestId ?? r.id ?? r.request_id ?? "";
          if (!id || seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });

      // Collect uniqueIds (MyStay IDs) and numeric customerIds that don't have a uniqueId
      const uniqueIds = [
        ...new Set(
          raw
            .map((r) => r.customerUniqueId)
            .filter((id) => Boolean(id) && looksLikeMyStayUniqueId(String(id)))
        ),
      ] as string[];
      const customerIds = [
        ...new Set(
          raw
            .map((r) =>
              (!r.customerUniqueId || !looksLikeMyStayUniqueId(String(r.customerUniqueId))) && r.customerId
                ? String(r.customerId)
                : null
            )
            .filter(Boolean)
        ),
      ] as string[];

      const profileByUniqueId: Record<string, { customerName: string }> = {};
      const profileByCustomerId: Record<string, { customerName: string; uniqueId?: string }> = {};

      // Enrich with profiles by mystayId (uniqueId)
      await Promise.all(
        uniqueIds.map(async (id) => {
          const profile = await fetchCustomerProfile(id);
          if (profile) profileByUniqueId[id] = { customerName: profile.customerName };
        })
      );

      // Enrich with profiles by numeric customerId when customerUniqueId is missing
      await Promise.all(
        customerIds.map(async (id) => {
          try {
            const ures = await userApi.get(`/api/users/${encodeURIComponent(id)}`, { timeout: 8000 });
            const customer = ures.data?.customer;
            if (customer) {
              const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
              profileByCustomerId[id] = {
                customerName: name || String(id),
                uniqueId: customer.uniqueId,
              };
            }
          } catch {
            // ignore errors, fall back to raw IDs
          }
        })
      );

      const data: ScheduledMoveOut[] = raw.map((r: any) => {
        const cid = r.customerId != null ? String(r.customerId) : (r.customerUniqueId != null ? String(r.customerUniqueId) : "");
        const fromUnique =
          r.customerUniqueId && looksLikeMyStayUniqueId(String(r.customerUniqueId))
            ? profileByUniqueId[r.customerUniqueId]
            : undefined;
        const fromCustomer =
          cid && (!r.customerUniqueId || !looksLikeMyStayUniqueId(String(r.customerUniqueId)))
            ? profileByCustomerId[cid]
            : undefined;

        const customerName =
          (r.customerName as string | undefined) ||
          fromUnique?.customerName ||
          fromCustomer?.customerName ||
          r.customerUniqueId ||
          cid ||
          "Tenant";

        const mystayId =
          (fromCustomer && fromCustomer.uniqueId) ||
          (looksLikeMyStayUniqueId(String(r.customerUniqueId || "")) ? (r.customerUniqueId as string | undefined) : undefined) ||
          "";

        const requestId = r.requestId ?? r.id ?? r.request_id ?? "";
        const requestedDate = r.requestedDate ?? r.requested_date ?? r.moveOutDate ?? r.move_out_date ?? r.createdAt;

        return {
          processId: requestId,
          customerId: cid || (r.customerUniqueId != null ? String(r.customerUniqueId) : ""),
          customerName,
          mystayId,
          propertyName: r.propertyName ?? r.property_name ?? "",
          roomNumber: r.roomNumber ?? r.room_number ?? "",
          moveOutDate: requestedDate,
          type: r.type === "admin_initiated" ? "admin_initiated" : "customer_initiated",
          securityDepositAmount: r.securityDepositAmount ?? r.security_deposit_amount ?? 0,
          currentDue: r.currentDue ?? r.current_due ?? 0,
          status: "scheduled",
        };
      });
      return { success: true, data };
    } catch (_error: any) {
      return { success: true, data: [] };
    }
  }

  /** Try alternate path for deployed gateway (without /api prefix) */
  private static async putMoveOut(path: string, body?: object): Promise<any> {
    const paths = [path, path.replace("/api/move-out/", "/move-out/")];
    let lastErr: any;
    for (const p of paths) {
      try {
        return await moveOutApi.put(p, body ?? {}, { timeout: 15000 });
      } catch (err: any) {
        lastErr = err;
        if ((err?.response?.status === 404 || err?.response?.status === 401) && p !== paths[paths.length - 1]) continue;
        throw err;
      }
    }
    throw lastErr;
  }

  private static async getMoveOut(path: string): Promise<any> {
    const paths = [path, path.replace("/api/move-out/", "/move-out/")];
    let lastErr: any;
    for (const p of paths) {
      try {
        return await moveOutApi.get(p, { timeout: 15000 });
      } catch (err: any) {
        lastErr = err;
        if ((err?.response?.status === 404 || err?.response?.status === 401) && p !== paths[paths.length - 1]) continue;
        throw err;
      }
    }
    throw lastErr;
  }

  static async acceptRequest(requestId: string, adminComments?: string): Promise<ApiResponse<any>> {
    try {
      const res = await MoveOutService.putMoveOut(`/api/move-out/requests/${requestId}/accept`, { adminComments: adminComments ?? "" });
      if (res?.data?.success === false) {
        return { success: false, error: res?.data?.message || "Failed to accept" };
      }
      return { success: true, data: res?.data?.data ?? res?.data };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || "Failed to accept request",
      };
    }
  }

  static async cancelRequest(requestId: string): Promise<ApiResponse<any>> {
    try {
      const res = await MoveOutService.putMoveOut(`/api/move-out/requests/${requestId}/cancel`);
      if (res?.data?.success === false) {
        return { success: false, error: res?.data?.message || "Failed to cancel" };
      }
      return { success: true, data: res?.data?.data ?? res?.data };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || "Failed to cancel request",
      };
    }
  }

  static async getRequestById(requestId: string): Promise<ApiResponse<any>> {
    try {
      const res = await MoveOutService.getMoveOut(`/api/move-out/requests/${requestId}`);
      const data = res?.data?.data ?? res?.data?.request ?? res?.data;
      if (res?.data?.success === false) {
        return { success: false, error: res?.data?.message || "Request not found" };
      }
      if (data == null) {
        return { success: false, error: "Request not found" };
      }
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || "Failed to load request",
      };
    }
  }

  /** PUT move-out/requests/:id/approve - Mark as moved_out */
  static async approveRequest(
    requestId: string,
    payload: { currentDue?: number; securityDepositReturned?: number }
  ): Promise<ApiResponse<any>> {
    try {
      const res = await MoveOutService.putMoveOut(`/api/move-out/requests/${requestId}/approve`, {
        currentDue: payload.currentDue ?? 0,
        securityDepositReturned: payload.securityDepositReturned ?? undefined,
      });
      if (res?.data?.success === false) {
        return { success: false, error: res?.data?.message || "Failed to approve" };
      }
      return { success: true, data: res?.data?.data ?? res?.data };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || "Failed to complete move-out",
      };
    }
  }

  static async initiateMoveOut(params: InitiateMoveOutParams): Promise<ApiResponse<any>> {
    // Simulate API call delay
    await delay(1200);

    try {
      const { customerId, moveOutDate, reason } = params;

      // Find the tenant
      const tenant = HARDCODED_TENANTS.find(t => t.customerId === customerId);
      
      if (!tenant) {
        return {
          success: false,
          error: "Tenant not found"
        };
      }

      // Validate move-out date
      const moveOut = new Date(moveOutDate);
      const today = new Date();
      
      if (moveOut < today) {
        return {
          success: false,
          error: "Move-out date cannot be in the past"
        };
      }

      // Simulate successful move-out initiation
      const moveOutRequest = {
        moveOutId: `moveout_${Date.now()}`,
        customerId,
        customerName: tenant.customerName,
        mystayId: tenant.mystayId,
        propertyName: tenant.propertyName,
        roomNumber: tenant.roomNumber,
        moveOutDate,
        reason,
        status: "INITIATED",
        securityDepositAmount: tenant.securityDeposit,
        finalSettlementPending: true,
        createdAt: new Date().toISOString(),
        estimatedSettlementDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };

      console.log("Move-out request created:", moveOutRequest);

      return {
        success: true,
        data: moveOutRequest
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to initiate move-out process"
      };
    }
  }

  static async updateMoveOutStatus(moveOutId: string, status: string, adminComments?: string): Promise<ApiResponse<any>> {
    // Simulate API call delay
    await delay(500);

    try {
      console.log(`Updating move-out ${moveOutId} to status: ${status}`);
      
      return {
        success: true,
        data: {
          moveOutId,
          status,
          updatedAt: new Date().toISOString(),
          adminComments
        }
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to update move-out status"
      };
    }
  }
}