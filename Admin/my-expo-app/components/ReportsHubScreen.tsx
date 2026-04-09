import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Share,
  InteractionManager,
} from "react-native";
import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomNav from "./BottomNav";
import CustomDropdown from "./CustomDropdown";
import Svg, { Circle, Path } from "react-native-svg";
import { Asset } from "expo-asset";
import { useProperty } from "../contexts/PropertyContext";
import { useProperties } from "../src/hooks";
import { analyticsApi, bookingApi, expenseApi, moveOutApi, propertyApi, userApi } from "../utils/api";
import { resolveFinalKycVerified } from "../utils/kyc";
import { aggregateMoveOutPL, isBookingMovedOut } from "../utils/financialCalculations";
import { getLocalTodayMonthKey, sumEnrollmentRentDueForMonthKey } from "../utils/enrollmentDues";

/* -------------------- CONSTANTS -------------------- */
// const { EncodingType } = FileSystem;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Chart colors
const CHART_COLORS = [
  "#FF6B6B", // red
  "#FFA726", // orange
  "#FFD93D", // yellow
  "#6BCF7F", // green
  "#4D96FF", // blue
  "#9D5DFF", // purple
  "#FF8AD0", // pink
  "#00CEC9", // teal
];

type ReportTenantRow = {
  id: string;
  uniqueId: string;
  name: string;
  phone: string;
  email: string;
  room: string;
  floor: string;
  bedNumbers: string;
  status: string;
  moveInDate: string;
  totalDue: number;
  aadhaarStatusRaw: string;
  kycStatus: string;
};

const toBool = (v: any) => v === true || v === "true" || v === 1;

const normalizeKycStatus = (status?: string) => {
  const s = String(status || "").trim().toLowerCase();
  if (["verified", "kyc_verified", "approved"].includes(s)) return "Verified";
  return "Unverified";
};

const formatDateLabel = (value: any) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const escapeHtml = (value: any) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

    let myStayLogoDataUriCache: string | null = null;

async function getMyStayLogoDataUri(): Promise<string> {
  if (myStayLogoDataUriCache) {
    return myStayLogoDataUriCache;
  }

  try {
    console.log("[Logo] Attempting to load logo...");
    const asset = Asset.fromModule(require("../assets/my-stay-logo.png"));
    await asset.downloadAsync();

    const uri = asset.localUri || asset.uri;
    if (!uri) {
      console.log("[Logo] No URI found for asset");
      return "";
    }

    // Try to read file with timeout
    const readPromise = FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Logo read timeout')), 5000)
    );
    
    const base64 = await Promise.race([readPromise, timeoutPromise]);

    if (!base64 || base64.length === 0) {
      console.log("[Logo] Empty base64 data");
      return "";
    }

    const dataUri = `data:image/png;base64,${base64}`;
    myStayLogoDataUriCache = dataUri;
    console.log("[Logo] Successfully loaded, length:", dataUri.length);
    return dataUri;
  } catch (error) {
    console.error("[Logo] Error loading logo:", error);
    return ""; // Return empty string to continue without logo
  }
}

function toMonthKeyFromDate(d: any): string {
  if (d == null || d === "") return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Align with Payments screen: security may live on `pendingAllocation` while top-level is 0. */
function effectiveBookingSecurityDeposit(b: any): number {
  const top = Number(b?.securityDeposit ?? 0);
  const pa = b?.pendingAllocation;
  const fromPa =
    pa && typeof pa === "object" && (pa as { securityDeposit?: unknown }).securityDeposit != null
      ? Number((pa as { securityDeposit: unknown }).securityDeposit)
      : 0;
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  return Math.max(n(top), n(fromPa));
}

/** Rent + collected security deposits (total cash inflow; P/L still uses rent-only collections). */
function totalInflowCollections(data: { collections?: number; securityDeposits?: number } | undefined): number {
  return (data?.collections ?? 0) + (data?.securityDeposits ?? 0);
}

/** Match DueAmount / PaymentManagement: scheduled split, else rentAmount for online per day */
function defaultDailyOnlinePerBooking(b: any): number {
  const s = Number(b?.scheduledOnlineRent ?? 0);
  if (s > 0) return s;
  return Number(b?.rentAmount ?? 0);
}
function defaultDailyCashPerBooking(b: any): number {
  return Number(b?.scheduledCashRent ?? 0);
}
function effectiveDailyOnlineAmount(dp: any, b: any): number {
  const row = Number(dp?.onlineAmount ?? 0);
  return row > 0 ? row : defaultDailyOnlinePerBooking(b);
}
function effectiveDailyCashAmount(dp: any, b: any): number {
  const row = Number(dp?.cashAmount ?? 0);
  return row > 0 ? row : defaultDailyCashPerBooking(b);
}

function getFYStartYearFromRef(ref: Date): number {
  return ref.getMonth() >= 3 ? ref.getFullYear() : ref.getFullYear() - 1;
}

function parseFiscalYearStart(fyLabel: string): number | null {
  const m = fyLabel.match(/^(\d{4})-\d{2}$/);
  return m ? parseInt(m[1], 10) : null;
}

function quarterToMonthKeys(quarter: string, fyStart: number): string[] {
  switch (quarter) {
    case "Apr-Jun":
      return [`${fyStart}-04`, `${fyStart}-05`, `${fyStart}-06`];
    case "Jul-Sep":
      return [`${fyStart}-07`, `${fyStart}-08`, `${fyStart}-09`];
    case "Oct-Dec":
      return [`${fyStart}-10`, `${fyStart}-11`, `${fyStart}-12`];
    case "Jan-Mar": {
      const y = fyStart + 1;
      return [`${y}-01`, `${y}-02`, `${y}-03`];
    }
    default:
      return [];
  }
}

function fiscalYearAllMonthKeys(fyStart: number): string[] {
  const keys: string[] = [];
  for (let mo = 4; mo <= 12; mo++) keys.push(`${fyStart}-${String(mo).padStart(2, "0")}`);
  const y2 = fyStart + 1;
  for (let mo = 1; mo <= 3; mo++) keys.push(`${y2}-${String(mo).padStart(2, "0")}`);
  return keys;
}

function monthNameToYearMonthKey(monthName: string, ref: Date): string | null {
  const mi = MONTHS.indexOf(monthName);
  if (mi < 0) return null;
  let y = ref.getFullYear();
  if (mi > ref.getMonth()) y -= 1;
  return `${y}-${String(mi + 1).padStart(2, "0")}`;
}

/** Month keys (YYYY-MM) for PDF/text “other reports” scoped to Report Filters */
function getReportFilterMonthKeys(filter1: string, filter2: string, ref: Date): string[] {
  if (filter1 === "Monthly") {
    const k = monthNameToYearMonthKey(filter2, ref);
    return k ? [k] : [];
  }
  if (filter1 === "Quarterly") {
    const fyStart = getFYStartYearFromRef(ref);
    const keys = quarterToMonthKeys(filter2, fyStart);
    return keys.length ? keys : quarterToMonthKeys("Apr-Jun", fyStart);
  }
  if (filter1 === "Yearly") {
    const start = parseFiscalYearStart(filter2);
    if (start != null) return fiscalYearAllMonthKeys(start);
    return fiscalYearAllMonthKeys(getFYStartYearFromRef(ref));
  }
  return [];
}

function monthKeyToShortLabel(key: string): string {
  const [ys, ms] = key.split("-");
  const m = parseInt(ms, 10) - 1;
  if (Number.isNaN(m) || m < 0 || m > 11) return key;
  return `${MONTHS[m]} ${ys}`;
}

function collectionsForMonthKeyFromBookings(bookings: any[], monthKey: string): number {
  let total = 0;
  let securityTotal = 0;
  let onlineTotal = 0;
  let cashTotal = 0;
  
  bookings.forEach((b: any) => {
    const rp = String(b.rentPeriod || 'month').toLowerCase();
    
    // Security deposit - counted in move-in month
    const moveInMonthKey = toMonthKeyFromDate(b.moveInDate);
    if (moveInMonthKey === monthKey) {
      const sec = effectiveBookingSecurityDeposit(b);
      if (toBool(b.isSecurityPaid) && sec > 0) {
        total += sec;
        securityTotal += sec;
      }
    }
    
    // Daily rent - iterate through dailyPayments array for paid amounts
    if (rp === 'day') {
      const dailyPayments = Array.isArray(b.dailyPayments) ? b.dailyPayments : [];

      dailyPayments.forEach((dp: any) => {
        const dpMonthKey = toMonthKeyFromDate(dp.paymentDate);
        if (dpMonthKey === monthKey) {
          const paidOnline = toBool(dp.paidOnline);
          const paidCash = toBool(dp.paidCash);
          const effOn = effectiveDailyOnlineAmount(dp, b);
          const effCash = effectiveDailyCashAmount(dp, b);

          if (paidOnline && effOn > 0) {
            total += effOn;
            onlineTotal += effOn;
          }

          if (paidCash && effCash > 0) {
            total += effCash;
            cashTotal += effCash;
          }
        }
      });

      return; // Skip monthly logic for day-based bookings
    }
    
    // Monthly rent - check if this month is in the paid months list
    const onlinePaidYm = String(b.rentOnlinePaidYearMonth || '').trim();
    const onlinePaidMonths = onlinePaidYm ? onlinePaidYm.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
    const schedOnline = Number(b.scheduledOnlineRent ?? 0);
    const legacyOnline = Number(b.onlinePaymentRecv) || 0;
    
    if (schedOnline > 0 && onlinePaidMonths.includes(monthKey)) {
      // New multi-month tracking
      total += schedOnline;
      onlineTotal += schedOnline;
    } else if (legacyOnline > 0 && toBool(b.isRentOnlinePaid) && moveInMonthKey === monthKey) {
      // Legacy single-month tracking (fallback)
      total += legacyOnline;
      onlineTotal += legacyOnline;
    }
    
    // Cash rent - check if this month is in the paid months list
    const cashPaidYm = String(b.rentCashPaidYearMonth || '').trim();
    const cashPaidMonths = cashPaidYm ? cashPaidYm.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
    const schedCash = Number(b.scheduledCashRent ?? 0);
    const legacyCash = Number(b.cashPaymentRecv) || 0;
    
    if (schedCash > 0 && cashPaidMonths.includes(monthKey)) {
      // New multi-month tracking
      total += schedCash;
      cashTotal += schedCash;
    } else if (legacyCash > 0 && toBool(b.isRentCashPaid) && moveInMonthKey === monthKey) {
      // Legacy single-month tracking (fallback)
      total += legacyCash;
      cashTotal += legacyCash;
    }
  });
  
  console.log(`[Collections] Month ${monthKey}: Security=₹${securityTotal}, Online=₹${onlineTotal}, Cash=₹${cashTotal}, Total=₹${total}`);
  return total;
}

function expenseTotalAndCategoriesForMonth(
  expenses: any[],
  monthlyStaff: {
    amount: number;
    expense_type?: string;
    name?: string;
    startMonthKey?: string;
  }[],
  monthKey: string,
  snapshotMonthKey: string
): { total: number; cats: { name: string; amount: number }[] } {
  const sums: Record<string, number> = {};
  expenses
    .filter((e: any) => (e.month_year || "") === monthKey)
    .forEach((e: any) => {
      const cat = e.category_name || "Other";
      sums[cat] = (sums[cat] || 0) + (Number(e.amount) || 0);
    });
  // Monthly Fixed Expenses tab entries are recurring templates.
  // Show them for all months from their creation month onwards.
  // (snapshotMonthKey is kept for backward-compatible signature.)
  monthlyStaff.forEach((m) => {
    const startKey = m.startMonthKey;
    if (startKey && monthKey < startKey) return;
    const cat = (m.expense_type || m.name || "Monthly").replace(/_/g, " ");
    sums[cat] = (sums[cat] || 0) + (Number(m.amount) || 0);
  });
  const total = Object.values(sums).reduce((a, b) => a + b, 0);
  const cats = Object.entries(sums).map(([name, amount]) => ({ name, amount }));
  return { total, cats };
}

const profileCache: Record<string, any> = {};
const bookingDetailCache: Record<string, any> = {};

/** Limit parallel profile calls; cache makes repeat opens instant */
async function fetchUserProfilesBatched(
  uids: string[],
  maxConcurrent: number
): Promise<Record<string, any>> {
  const map: Record<string, any> = {};
  const normalized = uids.map((u) => String(u).trim()).filter(Boolean);
  const unique = [...new Set(normalized)].filter((uid) => !profileCache[uid]);

  for (let i = 0; i < unique.length; i += maxConcurrent) {
    const slice = unique.slice(i, i + maxConcurrent);
    await Promise.all(
      slice.map(async (uid) => {
        try {
          const res = await userApi.get(`/api/users/${encodeURIComponent(uid)}/profile`, {
            timeout: 6000,
          });
          if (res.data?.user) profileCache[uid] = res.data.user;
        } catch {
          /* ignore */
        }
      })
    );
  }
  normalized.forEach((uid) => {
    if (profileCache[uid]) map[uid] = profileCache[uid];
  });
  return map;
}

/** Fetch booking records in batches; cached for repeat PDFs */
async function fetchBookingsBatched(
  bookingIds: string[],
  maxConcurrent: number
): Promise<Record<string, any>> {
  const map: Record<string, any> = {};
  const normalized = bookingIds.map((id) => String(id).trim()).filter(Boolean);
  const unique = [...new Set(normalized)].filter((id) => !bookingDetailCache[id]);

  for (let i = 0; i < unique.length; i += maxConcurrent) {
    const slice = unique.slice(i, i + maxConcurrent);
    await Promise.all(
      slice.map(async (bookingId) => {
        try {
          const res = await bookingApi.get(`/api/bookings/${encodeURIComponent(bookingId)}`, {
            timeout: 6000,
          });
          if (res.data?.booking) bookingDetailCache[bookingId] = res.data.booking;
        } catch {
          /* ignore */
        }
      })
    );
  }
  normalized.forEach((id) => {
    if (bookingDetailCache[id]) map[id] = bookingDetailCache[id];
  });
  return map;
}

type ExpenseSlicesState = {
  report: Record<string, { name: string; amount: number; color: string }[]>;
  financial: Record<string, { category_name: string; amount: number }[]>;
};

function buildExpenseSlices(
  expenses: any[],
  monthly: { amount: number; expense_type?: string; name?: string; startMonthKey?: string }[],
  m0: string,
  m1: string,
  m2: string,
  currentMonthName: string,
  prev1: string,
  prev2: string
): ExpenseSlicesState {
  const views = ["Combined", currentMonthName, prev1, prev2];
  const reportSlices: ExpenseSlicesState["report"] = {};
  const financialSlices: ExpenseSlicesState["financial"] = {};

  views.forEach((viewLabel) => {
    const viewMonths =
      viewLabel === "Combined"
        ? [m0, m1, m2]
        : viewLabel === currentMonthName
          ? [m0]
          : viewLabel === prev1
            ? [m1]
            : [m2];
    const categorySums: Record<string, number> = {};
    // Expenses tab entries are month-specific; include only those month keys.
    expenses
      .filter((e: any) => {
        const mk = String(e.month_year || "");
        return viewMonths.includes(mk);
      })
      .forEach((e: any) => {
        const amt = Number(e.amount) || 0;
        const cat = e.category_name || "Other";
        categorySums[cat] = (categorySums[cat] || 0) + amt;
      });

    // Monthly Fixed Expenses tab entries are recurring templates.
    // Repeat the template amount per month within the selected slice (starting from creation month).
    monthly.forEach((m) => {
      const startKey = m.startMonthKey;
      const cat = (m.expense_type || m.name || "Monthly").replace(/_/g, " ");
      viewMonths.forEach((monthKey) => {
        if (startKey && monthKey < startKey) return;
        categorySums[cat] = (categorySums[cat] || 0) + (Number(m.amount) || 0);
      });
    });
    financialSlices[viewLabel] = Object.entries(categorySums).map(([category_name, amount]) => ({
      category_name,
      amount,
    }));
    reportSlices[viewLabel] = Object.entries(categorySums).map(([name, amount], index) => ({
      name,
      amount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  });
  return { report: reportSlices, financial: financialSlices };
}

type ReportMetaState = {
  financialData: Record<
    string,
    {
      collections: number;
      securityDeposits: number;
      expense: number;
      pendingDues: number;
      profitLoss: number;
      moveOutPL?: number;
    }
  >;
  occupancyData: Record<string, { emptyBeds: number; occupied: number; moveOuts: number }>;
  transactionsByMonth: Record<string, { online: number; cash: number; total: number }>;
  transactionTotals: { online: number; cash: number; total: number };
  moveOutPL: number;
};

const EMPTY_REPORT_META: ReportMetaState = {
  financialData: {},
  occupancyData: {},
  transactionsByMonth: {},
  transactionTotals: { online: 0, cash: 0, total: 0 },
  moveOutPL: 0,
};

const EMPTY_EXPENSE_SLICES: ExpenseSlicesState = { report: {}, financial: {} };

const isMovedOutBooking = (b: any): boolean => {
  const status = String(b?.status || "").toLowerCase();
  return status === "completed" || status === "moved_out";
};

const getTotalDueFromBooking = (b: any): number => {
  const security = effectiveBookingSecurityDeposit(b);
  const isSecurityPaid = toBool(b.isSecurityPaid);
  
  // Helper to get year-month string
  const yearMonth = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  
  // Helper to parse move-in date
  const parseMoveInDate = (moveInDate: any): Date | null => {
    if (!moveInDate) return null;
    if (moveInDate instanceof Date) {
      return isNaN(moveInDate.getTime()) ? null : moveInDate;
    }
    try {
      const date = new Date(moveInDate);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };
  
  const num = (v: any): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  
  let due = 0;
  
  // Security deposit: do not count moved-out/completed tenants in dues
  if (security > 0 && !isSecurityPaid && !isMovedOutBooking(b)) {
    due += security;
  }
  
  const rp = String(b.rentPeriod || 'month').toLowerCase();
  const now = new Date();
  const currentYm = yearMonth(now);
  
  // Day-based rent - inspect dailyPayments array for actual unpaid status
  if (rp === 'day') {
    const dailyPayments = Array.isArray(b.dailyPayments) ? b.dailyPayments : [];

    if (dailyPayments.length === 0) {
      if (!toBool(b.isRentOnlinePaid)) {
        const s = num(b.scheduledOnlineRent);
        const onlineAmt = s > 0 ? s : num(b.rentAmount);
        if (onlineAmt > 0) due += onlineAmt;
      }
      if (!toBool(b.isRentCashPaid)) {
        const cashAmt = num(b.scheduledCashRent);
        if (cashAmt > 0) due += cashAmt;
      }
      return due;
    }

    dailyPayments.forEach((dp: any) => {
      const paidOnline = toBool(dp.paidOnline);
      const paidCash = toBool(dp.paidCash);
      const effOn = effectiveDailyOnlineAmount(dp, b);
      const effCash = effectiveDailyCashAmount(dp, b);

      if (!paidOnline && effOn > 0) {
        due += effOn;
      }

      if (!paidCash && effCash > 0) {
        due += effCash;
      }
    });

    return due;
  }
  
  // Monthly rent - calculate all unpaid months
  const moveIn = parseMoveInDate(b.moveInDate);
  if (!moveIn) {
    // Fallback to legacy logic if no move-in date
    const onlineRecv = num(b.onlinePaymentRecv);
    const cashRecv = num(b.cashPaymentRecv);
    const isRentOnlinePaid = toBool(b.isRentOnlinePaid);
    const isRentCashPaid = toBool(b.isRentCashPaid);
    
    if (onlineRecv > 0 && !isRentOnlinePaid) due += onlineRecv;
    if (cashRecv > 0 && !isRentCashPaid) due += cashRecv;
    
    return due;
  }
  
  // Calculate first due month based on move-in day
  const moveInDay = moveIn.getDate();
  const moveInYm = yearMonth(moveIn);
  const nextMonthYm = yearMonth(new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1));
  const firstDueYm = moveInDay <= 10 ? moveInYm : nextMonthYm;
  
  // If current month is before first due month, no rent due
  if (currentYm < firstDueYm) {
    return due;
  }
  
  // Generate all months from first due to current
  const monthsToPay: string[] = [];
  let current = firstDueYm;
  while (current <= currentYm) {
    monthsToPay.push(current);
    const [year, month] = current.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    current = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  }
  
  // Online rent
  const schedOnline = num(b.scheduledOnlineRent);
  const legacyOnline = num(b.onlinePaymentRecv);
  const onlineRent = schedOnline > 0 ? schedOnline : legacyOnline;
  
  if (onlineRent > 0) {
    const paidMonthsStr = String(b.rentOnlinePaidYearMonth || '').trim();
    const paidMonths = paidMonthsStr 
      ? paidMonthsStr.split(',').map((m: string) => m.trim()).filter(Boolean)
      : [];
    
    const unpaidMonths = monthsToPay.filter(month => !paidMonths.includes(month));
    due += onlineRent * unpaidMonths.length;
  }
  
  // Cash rent
  const schedCash = num(b.scheduledCashRent);
  const legacyCash = num(b.cashPaymentRecv);
  const cashRent = schedCash > 0 ? schedCash : legacyCash;
  
  if (cashRent > 0) {
    const paidMonthsStr = String(b.rentCashPaidYearMonth || '').trim();
    const paidMonths = paidMonthsStr 
      ? paidMonthsStr.split(',').map((m: string) => m.trim()).filter(Boolean)
      : [];
    
    const unpaidMonths = monthsToPay.filter(month => !paidMonths.includes(month));
    due += cashRent * unpaidMonths.length;
  }
  
  return due;
};

/** Months from current calendar month back through April (inclusive), e.g. Mar→Feb→…→Apr */
function getMonthsFromCurrentThroughApril(): { monthKey: string; label: string }[] {
  const out: { monthKey: string; label: string }[] = [];
  let y = new Date().getFullYear();
  let m = new Date().getMonth();
  let count = 0;
  const maxMonths = 12; // Prevent infinite loop
  
  // Calculate target month: We want to go until April
  // Determine which April to stop at
  let targetYear = y;
  let targetMonth = 3; // April is month index 3
  
  // If current month is before April (Jan, Feb, Mar), we need to go to previous year's April
  if (m < 3) { // Current month is Jan (0), Feb (1), or Mar (2)
    targetYear = y - 1;
  }
  
  while (count < maxMonths) {
    const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    out.push({ monthKey, label: `${MONTHS[m]} ${y}` });
    
    // Check if we've reached our target (April of the target year)
    if (y === targetYear && m === targetMonth) {
      break;
    }
    
    // Move to previous month
    if (m === 0) {
      m = 11;
      y -= 1;
    } else {
      m -= 1;
    }
    count++;
  }
  
  return out;
}


function roomTypeLabel(room: any): string {
  const cap = Number(room?.capacity);
  if (cap === 1) return "Single";
  if (cap === 2) return "Double";
  const rt = String(room?.roomType || "").trim();
  if (/single/i.test(rt)) return "Single";
  if (/double|twin|sharing/i.test(rt)) return "Double";
  if (rt) return rt;
  return cap > 0 ? `${cap}-bed` : "—";
}

function roomMatchesProperty(room: any, matchValues: string[]): boolean {
  if (!matchValues.length) return true;
  const refs = [room.propertyId, room.propertyUniqueId, room.propertyName]
    .filter(Boolean)
    .map((x: any) => String(x).trim());
  const norm = (s: string) => s.toLowerCase().trim();
  return refs.some((ref) =>
    matchValues.some((v) => {
      if (!v || !ref) return false;
      const vn = norm(v);
      const rn = norm(ref);
      return rn === vn || ref === v || rn.includes(vn) || vn.includes(rn);
    })
  );
}

function addressFromProfile(pe: any, u: any): string {
  const top = [u.addressLine1, u.addressLine2, u.city, u.state, u.pincode].filter(Boolean).join(", ");
  if (top.trim()) return top;
  const fmt = (o: any) =>
    o && typeof o === "object"
      ? [o.line1, o.line2, o.street, o.city, o.state, o.district, o.pincode, o.zip]
          .filter(Boolean)
          .map((x: any) => String(x).trim())
          .filter(Boolean)
          .join(", ")
      : "";
  const a1 = fmt(pe?.addressAsPerAadhaar);
  if (a1) return a1;
  const a2 = fmt(pe?.currentAddress);
  if (a2) return a2;
  if (typeof pe?.addressAsPerAadhaar === "string" && pe.addressAsPerAadhaar.trim())
    return pe.addressAsPerAadhaar.trim();
  if (typeof pe?.currentAddress === "string" && pe.currentAddress.trim()) return pe.currentAddress.trim();
  if (typeof pe?.address === "string" && pe.address.trim()) return pe.address.trim();
  return "—";
}

/** Last 4 digits only for Tenant Details PDF (PII-safe). */
function getAadhaarLast4Digits(user: any, fallbackCustomer?: any): string {
  const pe = (user?.profileExtras || fallbackCustomer?.profileExtras || {}) as any;
  const digits = (s: string) => String(s || "").replace(/\D/g, "");
  if (pe?.aadhaarLast4 != null && String(pe.aadhaarLast4).trim()) {
    const d = digits(pe.aadhaarLast4);
    if (d.length >= 4) return d.slice(-4);
    if (d.length > 0) return d.padStart(4, "0").slice(-4);
  }
  if (pe?.aadhaar != null && String(pe.aadhaar).trim()) {
    const d = digits(pe.aadhaar);
    if (d.length >= 4) return d.slice(-4);
    if (d.length > 0) return d; // already 4 or fewer digits stored
  }
  const full =
    pe?.identity?.aadhaarNumber ||
    pe?.aadhaarData?.aadhaarNumber ||
    pe?.aadhaarNumber;
  const fd = digits(full);
  if (fd.length >= 4) return fd.slice(-4);
  const masked = pe?.aadhaarData?.maskedAadhaar;
  const md = digits(masked);
  if (md.length >= 4) return md.slice(-4);
  return "—";
}

function extractProfileDetails(user: any, fallbackCustomer?: any) {
  const u = user || {};
  const c = fallbackCustomer || {};
  const pe = u.profileExtras || c.profileExtras || {};
  const first = String(u.firstName || c.firstName || "").trim();
  const last = String(u.lastName || c.lastName || "").trim();
  const fullName = `${first} ${last}`.trim() || "—";
  let aadhaar = "—";
  if (pe?.aadhaarData?.maskedAadhaar) aadhaar = String(pe.aadhaarData.maskedAadhaar);
  else if (pe?.aadhaarLast4 != null && String(pe.aadhaarLast4).length > 0)
    aadhaar = `XXXX-XXXX-${String(pe.aadhaarLast4)}`;
  else if (pe?.identity?.aadhaarNumber) aadhaar = String(pe.identity.aadhaarNumber);
  else if (pe?.aadhaar != null && String(pe.aadhaar).trim())
    aadhaar = `XXXX-XXXX-${String(pe.aadhaar).replace(/\D/g, "").slice(-4)}`;
  const dobRaw =
    pe?.dob ??
    pe?.dateOfBirth ??
    u?.dateOfBirth ??
    (pe?.guestEnrollment && (pe.guestEnrollment as any).dateOfBirth) ??
    (pe?.prefilledData && (pe.prefilledData as any).dateOfBirth);
  let dob = "—";
  if (dobRaw != null && dobRaw !== "") {
    const parsed = new Date(dobRaw as any);
    dob = Number.isNaN(parsed.getTime()) ? String(dobRaw).trim() || "—" : formatDateLabel(dobRaw);
  }
  const addr = addressFromProfile(pe, u);
  return {
    fullName,
    phone: String(u.phone || c.phone || "—"),
    email: String(u.email || c.email || "—"),
    dob,
    aadhaarDisplay: aadhaar,
    address: addr,
    emergencyName: String(u.emergencyName || c.emergencyName || pe?.emergencyContactName || "—"),
    emergencyPhone: String(
      u.emergencyPhone || c.emergencyPhone || pe?.emergencyContactPhone || pe?.emergencyPhone || "—"
    ),
  };
}

function kycLabelFromUser(user: any): string {
  if (!user) return "Unverified";
  return resolveFinalKycVerified(user) ? "Verified" : normalizeKycStatus(user.aadhaarStatus);
}

export type DetailedActiveRow = {
  num: number;
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  /** Full/masked display for KYC report */
  aadhaar: string;
  /** Last 4 digits for Tenant Details PDF */
  aadhaarLast4: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  room: string;
  moveIn: string;
  moveOut: string;
  securityDeposit: number;
  due: number;
  /** For Transaction Report */
  payments?: { amount: number; date: string; type: "Online" | "Cash"; label: string; monthKey?: string }[];
  /** YYYY-MM from move-in; used to scope filtered reports */
  moveInMonthKey?: string;
  kycStatus: string;
  uniqueId: string;
};

export type DetailedOldRow = Omit<DetailedActiveRow, "securityDeposit" | "due"> & {
  securityDeposit?: number;
  due?: number;
};

export type RoomOccupancyBlock = {
  roomNumber: string;
  roomType: string;
  tenants: { num: number; name: string; phone: string; moveIn: string; moveOut: string; due: number }[];
};

export type MonthwiseMoveOutBlock = {
  label: string;
  rows: { num: number; fullName: string; phone: string; room: string; moveIn: string; moveOut: string; dues: number }[];
};

type ReportDetailsState = {
  reportTenants: ReportTenantRow[];
  detailedActiveRows: DetailedActiveRow[];
  detailedOldRows: DetailedOldRow[];
  roomsOccupancyBlocks: RoomOccupancyBlock[];
  monthwiseMoveOutBlocks: MonthwiseMoveOutBlock[];
  allTransactionRows?: DetailedActiveRow[]; // For Transaction Report - includes completed bookings
};

const EMPTY_REPORT_DETAILS: ReportDetailsState = {
  reportTenants: [],
  detailedActiveRows: [],
  detailedOldRows: [],
  roomsOccupancyBlocks: [],
  monthwiseMoveOutBlocks: [],
};

/* -------------------- MAIN SCREEN -------------------- */

export default function ReportsHubScreen() {
  const { currentProperty } = useProperty();
  const { list: propertiesList } = useProperties();
  const propertyId = currentProperty?.id;
  const numericPropertyId = propertiesList?.find(
    (p: any) => p.uniqueId === propertyId || String(p.id) === propertyId
  )?.id ?? (typeof propertyId === "string" && /^\d+$/.test(propertyId) ? propertyId : null);
  const currentMonthIdx = new Date().getMonth();
  const currentMonthName = MONTHS[currentMonthIdx];
  const currentYear = new Date().getFullYear();
  const monthYear = (mIdx: number) => `${currentYear}-${String(((currentMonthIdx - mIdx + 12) % 12) + 1).padStart(2, "0")}`;

  // Filters State
  const [filter1, setFilter1] = useState<string>(currentMonthName);
  const [filter2, setFilter2] = useState<string>(currentMonthName);
  const [isSubscribed] = useState<boolean>(false);

  // Financial Card State
  const [financialView, setFinancialView] = useState<string>(currentMonthName);
  // Expense Report State
  const [expenseReportView, setExpenseReportView] = useState<string>(currentMonthName);
  // Occupancy Data State
  const [occupancyView, setOccupancyView] = useState<string>(currentMonthName);
  // Transaction Report State (default = current month)
  const [transactionView, setTransactionView] = useState<string>(currentMonthName);
  // Filtered Reports State
  const [reportFilter1, setReportFilter1] = useState<string>("Monthly");
  const [reportFilter2, setReportFilter2] = useState<string>(currentMonthName);

  // Integrated data from APIs (collections/dues from bookings = Payments page; expense from Expenses screen)
  const [loading, setLoading] = useState(true);
  const [reportMeta, setReportMeta] = useState<ReportMetaState>(EMPTY_REPORT_META);
  const [processedExpenseSlices, setProcessedExpenseSlices] =
    useState<ExpenseSlicesState>(EMPTY_EXPENSE_SLICES);
  const {
    financialData,
    occupancyData,
    transactionsByMonth,
    transactionTotals,
    moveOutPL,
  } = reportMeta;
  const [reportDetails, setReportDetails] = useState<ReportDetailsState>(EMPTY_REPORT_DETAILS);
  const [reportSource, setReportSource] = useState<{ bookings: any[]; moveOutList: any[] } | null>(null);
  const [reportsExpensesRaw, setReportsExpensesRaw] = useState<any[]>([]);
  const [reportsMonthlyStaff, setReportsMonthlyStaff] = useState<
    { amount: number; expense_type?: string; name?: string; startMonthKey?: string }[]
  >([]);
  const [reportsSnapshotMonthKey, setReportsSnapshotMonthKey] = useState<string>("");
  const [myStayLogoDataUri, setMyStayLogoDataUri] = useState<string>("");
  const [reportDetailsPropertyId, setReportDetailsPropertyId] = useState<string | null>(null);
  const [syncingTenantReports, setSyncingTenantReports] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  
  // ========== END OF LOGO CHECK ==========


  useEffect(() => {
    let mounted = true;
    getMyStayLogoDataUri()
      .then((uri) => {
        if (mounted) {
          setMyStayLogoDataUri(uri);
          console.log("Logo state updated:", uri ? "Yes" : "No");
        }
      })
      .catch((err) => console.log("Logo effect error:", err));
  
    return () => {
      mounted = false;
    };
  }, []);

  
// Add this temporary test useEffect
useEffect(() => {
  const testLogo = async () => {
    const uri = await getMyStayLogoDataUri();
    console.log("Logo on mount:", uri ? "Loaded" : "Not loaded");
  };
  testLogo();
}, []);

  const fetchReportsData = useCallback(async () => {
    if (!propertyId) {
      setReportMeta(EMPTY_REPORT_META);
      setProcessedExpenseSlices(EMPTY_EXPENSE_SLICES);
      setReportDetails(EMPTY_REPORT_DETAILS);
      setReportSource(null);
      setReportsExpensesRaw([]);
      setReportsMonthlyStaff([]);
      setReportsSnapshotMonthKey("");
      setReportDetailsPropertyId(null);
      setSyncingTenantReports(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = { includeCompleted: "true" };
      if (propertyId) params.propertyId = propertyId;
      /* Fast path: no per-tenant user-service calls; analytics P/L loads after first paint */
      const [bookingsRes, expensesRes, monthlyRes, statsRes, moveOutRes, enrollListRes] = await Promise.all([
        bookingApi.get("/api/bookings/list/active-for-reports", { params, timeout: 20000 }),
        expenseApi.get(`/${propertyId}`, { timeout: 8000 }).catch(() => ({ data: {} })),
        expenseApi.get(`/monthly/${propertyId}`, { timeout: 8000 }).catch(() => ({ data: {} })),
        bookingApi
          .get("/api/bookings/dashboard-stats", { params: { propertyId }, timeout: 8000 })
          .catch(() => ({ data: { success: false } })),
        moveOutApi
          .get("/api/move-out/requests", { params: { status: "moved_out", propertyId }, timeout: 10000 })
          .catch(() => ({ data: { success: false, data: { requests: [] } } })),
        bookingApi
          .get("/api/enrollment-requests", { params: { propertyId }, timeout: 8000 })
          .catch(() => null),
      ]);

      const rawBookings = (bookingsRes.data?.success && Array.isArray(bookingsRes.data?.bookings)) ? bookingsRes.data.bookings : [];
      // Normalize same as PaymentManagementScreen: strict booleans (API may send "false" as string; Boolean("false") === true!)
      const bookings = rawBookings.map((b: any) => ({
        ...b,
        securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit) : 0,
        isSecurityPaid: toBool(b.isSecurityPaid),
        isSecurityPaidOnline: toBool(b.isSecurityPaidOnline),
        onlinePaymentRecv: b.onlinePaymentRecv != null ? Number(b.onlinePaymentRecv) : 0,
        cashPaymentRecv: b.cashPaymentRecv != null ? Number(b.cashPaymentRecv) : 0,
        isRentOnlinePaid: toBool(b.isRentOnlinePaid),
        isRentCashPaid: toBool(b.isRentCashPaid),
        // ✅ CRITICAL: Map and normalize dailyPayments array with proper type conversions
        dailyPayments: Array.isArray(b.dailyPayments) 
          ? b.dailyPayments.map((dp: any) => ({
              id: dp.id?.toString?.() ?? String(dp.id || ''),
              paymentDate: dp.paymentDate,
              amount: Number(dp.amount ?? 0),
              paidOnline: toBool(dp.paidOnline),
              paidCash: toBool(dp.paidCash),
              onlineAmount: Number(dp.onlineAmount ?? 0),
              cashAmount: Number(dp.cashAmount ?? 0),
            }))
          : [],
        moveInDate: b.moveInDate != null ? (typeof b.moveInDate === "string" ? b.moveInDate : new Date(b.moveInDate).toISOString?.() ?? String(b.moveInDate)) : "",
        updatedAt: b.updatedAt != null ? (typeof b.updatedAt === "string" ? b.updatedAt : new Date(b.updatedAt).toISOString?.() ?? String(b.updatedAt)) : "",
      }));

      /* Financial + expenses + occupancy first so charts (pie, bars) populate immediately */
      const expensesData = expensesRes.data?.data ?? expensesRes.data;
      const expenses = Array.isArray(expensesData) ? expensesData : [];
      const monthlyData = monthlyRes.data?.data ?? monthlyRes.data;
      const monthlyExpenses = Array.isArray(monthlyData) ? monthlyData : [];
      const monthlyForSlices = monthlyExpenses.map((m: any) => {
        const createdAt = m.created_at ?? m.createdAt ?? null;
        let startMonthKey: string | undefined;
        if (createdAt) {
          const d = new Date(createdAt);
          if (!Number.isNaN(d.getTime())) {
            startMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          }
        }
        return {
          amount: Number(m.amount) || 0,
          expense_type: m.expense_type,
          name: m.name,
          startMonthKey,
        };
      });

      const toMonthKey = (d: any): string | null => {
        if (d == null) return null;
        const date = new Date(d);
        if (Number.isNaN(date.getTime())) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      };

      const prev1 = MONTHS[(currentMonthIdx - 1 + 12) % 12];
      const prev2 = MONTHS[(currentMonthIdx - 2 + 12) % 12];
      const m0 = monthYear(0);
      const m1 = monthYear(1);
      const m2 = monthYear(2);

      const collectionsByMonth: Record<string, number> = { [m0]: 0, [m1]: 0, [m2]: 0 };
      const securityDepositsByMonth: Record<string, number> = { [m0]: 0, [m1]: 0, [m2]: 0 };
      const transactionsByMonthMap: Record<string, { online: number; cash: number }> = {
        [m0]: { online: 0, cash: 0 },
        [m1]: { online: 0, cash: 0 },
        [m2]: { online: 0, cash: 0 },
      };
      const pendingDuesByMonth: Record<string, number> = { [m0]: 0, [m1]: 0, [m2]: 0 };
      const transactionItems: { amount: number; type: string }[] = [];

      const num = (v: any): number => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) ? n : 0;
      };

      const rentStartYm = (booking: any): string | null => {
        try {
          const moveIn = booking?.moveInDate ? new Date(booking.moveInDate) : null;
          if (!moveIn || Number.isNaN(moveIn.getTime())) return null;
          const start =
            moveIn.getDate() <= 10 ? moveIn : new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1);
          return toMonthKeyFromDate(start);
        } catch {
          return null;
        }
      };

      const adminMonthlyOnlineDueForMonthKey = (booking: any, monthKey: string): number => {
        const rp = String(booking?.rentPeriod || "month").toLowerCase();
        const legacyOn = num(booking?.onlinePaymentRecv);
        const schedOn = num(booking?.scheduledOnlineRent);
        const paidYm = String(booking?.rentOnlinePaidYearMonth ?? "").trim();
        const startYm = rentStartYm(booking);
        if (startYm && monthKey < startYm) return 0;

        if (rp === "day") {
          // ✅ For day rentals, sum unpaid online amounts from dailyPayments array
          if (Array.isArray(booking?.dailyPayments) && booking.dailyPayments.length > 0) {
            const dailyOnlineDue = booking.dailyPayments
              .filter((dp: any) => {
                const dpDate = new Date(dp.paymentDate);
                const dpMonthKey = toMonthKeyFromDate(dpDate);
                const eff = effectiveDailyOnlineAmount(dp, booking);
                return dpMonthKey === monthKey && !toBool(dp.paidOnline) && eff > 0;
              })
              .reduce((sum: number, dp: any) => sum + effectiveDailyOnlineAmount(dp, booking), 0);
            return dailyOnlineDue;
          }
          // Virtual "today" row (same as PaymentManagementScreen when dailyPayments is empty)
          if (toBool(booking?.isRentOnlinePaid)) return 0;
          if (monthKey !== getLocalTodayMonthKey()) return 0;
          const ra = num(booking?.rentAmount);
          return ra > 0 ? ra : legacyOn;
        }

        if (schedOn > 0) {
          // ✅ Check if monthKey is in the comma-separated list of paid months
          const paidMonths = paidYm ? paidYm.split(',').map((m: string) => m.trim()) : [];
          if (paidMonths.includes(monthKey)) return 0;
          return schedOn;
        }
        if (toBool(booking?.isRentOnlinePaid)) return 0;
        return legacyOn > 0 ? legacyOn : 0;
      };

      const adminMonthlyCashDueForMonthKey = (booking: any, monthKey: string): number => {
        const rp = String(booking?.rentPeriod || "month").toLowerCase();
        const legacyCash = num(booking?.cashPaymentRecv);
        const schedCash = num(booking?.scheduledCashRent);
        const paidYm = String(booking?.rentCashPaidYearMonth ?? "").trim();
        const startYm = rentStartYm(booking);
        if (startYm && monthKey < startYm) return 0;

        if (rp === "day") {
          // ✅ For day rentals, sum unpaid cash amounts from dailyPayments array
          if (Array.isArray(booking?.dailyPayments) && booking.dailyPayments.length > 0) {
            const dailyCashDue = booking.dailyPayments
              .filter((dp: any) => {
                const dpDate = new Date(dp.paymentDate);
                const dpMonthKey = toMonthKeyFromDate(dpDate);
                const eff = effectiveDailyCashAmount(dp, booking);
                return dpMonthKey === monthKey && !toBool(dp.paidCash) && eff > 0;
              })
              .reduce((sum: number, dp: any) => sum + effectiveDailyCashAmount(dp, booking), 0);
            return dailyCashDue;
          }
          if (toBool(booking?.isRentCashPaid)) return 0;
          if (monthKey !== getLocalTodayMonthKey()) return 0;
          return legacyCash;
        }

        if (schedCash > 0) {
          // ✅ Check if monthKey is in the comma-separated list of paid months
          const paidMonths = paidYm ? paidYm.split(',').map((m: string) => m.trim()) : [];
          if (paidMonths.includes(monthKey)) return 0;
          return schedCash;
        }
        if (toBool(booking?.isRentCashPaid)) return 0;
        return legacyCash > 0 ? legacyCash : 0;
      };

      bookings.forEach((b: any) => {
        const monthKey = toMonthKey(b.moveInDate);
        const sec = effectiveBookingSecurityDeposit(b);
        const online = Number(b.onlinePaymentRecv ?? 0);
        const cash = Number(b.cashPaymentRecv ?? 0);

        const moveInYm = monthKey || "";
        const rentPeriod = String(b?.rentPeriod || "month").toLowerCase();

        // Pending dues must be month-specific.
        [m0, m1, m2].forEach((mk) => {
          // Outstanding security deposit: attribute to current month (m0) so it always appears
          // in "this month" stats when still unpaid (move-in month alone missed cross-month cases).
          // Exclude moved-out/completed bookings from due totals.
          if (mk === m0 && !toBool(b?.isSecurityPaid) && sec > 0 && !isMovedOutBooking(b)) {
            pendingDuesByMonth[mk] = (pendingDuesByMonth[mk] ?? 0) + sec;
          }

          // Rent due for that month (monthly scheduling uses paid year/month markers).
          let onlineDue = 0;
          let cashDue = 0;

          if (rentPeriod === "day") {
            // Day-based rents are handled in dailyPayments below, to avoid duplicate due calculations.
            // Fallback to legacy behavior only when dailyPayments is empty.
            if (Array.isArray(b.dailyPayments) && b.dailyPayments.length > 0) {
              onlineDue = 0;
              cashDue = 0;
            } else {
              onlineDue = adminMonthlyOnlineDueForMonthKey(b, mk);
              cashDue = adminMonthlyCashDueForMonthKey(b, mk);
            }
          } else {
            onlineDue = adminMonthlyOnlineDueForMonthKey(b, mk);
            cashDue = adminMonthlyCashDueForMonthKey(b, mk);
          }

          if (onlineDue > 0) pendingDuesByMonth[mk] = (pendingDuesByMonth[mk] ?? 0) + onlineDue;
          if (cashDue > 0) pendingDuesByMonth[mk] = (pendingDuesByMonth[mk] ?? 0) + cashDue;
        });

        if (toBool(b.isSecurityPaid) && sec > 0) {
          transactionItems.push({ amount: sec, type: "Security deposit (online)" });
          const moveInMk = monthKey;
          const updatedMk = toMonthKey(b.updatedAt);
          const inWindow = (k: string | null) => Boolean(k && [m0, m1, m2].includes(k));
          const inWinKeys = [updatedMk, moveInMk].filter((k): k is string => inWindow(k));
          const secMonth =
            inWinKeys.length > 0 ? inWinKeys.sort().pop()! : null;
          if (secMonth) {
            if (securityDepositsByMonth[secMonth] === undefined) securityDepositsByMonth[secMonth] = 0;
            securityDepositsByMonth[secMonth] += sec;
            if (!transactionsByMonthMap[secMonth]) transactionsByMonthMap[secMonth] = { online: 0, cash: 0 };
            transactionsByMonthMap[secMonth].online += sec;
          }
          // note: do not add security to collections (rent revenue) — shown separately + in total inflow
        }
        
        if (rentPeriod !== "day") {
          // Online rent: check if paid for each month
          const onlinePaidYm = String(b.rentOnlinePaidYearMonth || '').trim();
          const onlinePaidMonths = onlinePaidYm ? onlinePaidYm.split(',').map((s: string) => s.trim()) : [];
          const schedOnline = Number(b.scheduledOnlineRent ?? 0);
          
          if (schedOnline > 0 && onlinePaidMonths.length > 0) {
            // Multi-month tracking: add each paid month separately
            onlinePaidMonths.forEach((paidYm: string) => {
              transactionItems.push({ amount: schedOnline, type: "Rent (online)" });
              // Initialize month if not exists, then add
              if (collectionsByMonth[paidYm] === undefined) collectionsByMonth[paidYm] = 0;
              collectionsByMonth[paidYm] += schedOnline;
              if (!transactionsByMonthMap[paidYm]) transactionsByMonthMap[paidYm] = { online: 0, cash: 0 };
              transactionsByMonthMap[paidYm].online += schedOnline;
            });
          } else if (online > 0 && b.isRentOnlinePaid) {
            // Legacy: single payment
            transactionItems.push({ amount: online, type: "Rent (online)" });
            if (monthKey) {
              if (collectionsByMonth[monthKey] === undefined) collectionsByMonth[monthKey] = 0;
              collectionsByMonth[monthKey] += online;
              if (!transactionsByMonthMap[monthKey]) transactionsByMonthMap[monthKey] = { online: 0, cash: 0 };
              transactionsByMonthMap[monthKey].online += online;
            }
          }
          
          // Cash rent: check if paid for each month (same logic as online)
          const cashPaidYm = String(b.rentCashPaidYearMonth || '').trim();
          const cashPaidMonths = cashPaidYm ? cashPaidYm.split(',').map((s: string) => s.trim()) : [];
          const schedCash = Number(b.scheduledCashRent ?? 0);
          
          if (schedCash > 0 && cashPaidMonths.length > 0) {
            // Multi-month tracking: add each paid month separately
            console.log(`[ReportsHub] Processing cash payments for booking ${b.id}: schedCash=${schedCash}, paidMonths=${cashPaidMonths.join(',')}`);
            cashPaidMonths.forEach((paidYm: string) => {
              transactionItems.push({ amount: schedCash, type: "Rent (cash)" });
              // Initialize month if not exists, then add
              if (collectionsByMonth[paidYm] === undefined) collectionsByMonth[paidYm] = 0;
              collectionsByMonth[paidYm] += schedCash;
              if (!transactionsByMonthMap[paidYm]) transactionsByMonthMap[paidYm] = { online: 0, cash: 0 };
              transactionsByMonthMap[paidYm].cash += schedCash;
              console.log(`[ReportsHub] Added cash payment: month=${paidYm}, amount=${schedCash}, newTotal=${collectionsByMonth[paidYm]}`);
            });
          } else if (cash > 0 && b.isRentCashPaid) {
            // Legacy: single payment
            console.log(`[ReportsHub] Processing legacy cash payment for booking ${b.id}: cash=${cash}, monthKey=${monthKey}`);
            transactionItems.push({ amount: cash, type: "Rent (cash)" });
            if (monthKey) {
              if (collectionsByMonth[monthKey] === undefined) collectionsByMonth[monthKey] = 0;
              collectionsByMonth[monthKey] += cash;
              if (!transactionsByMonthMap[monthKey]) transactionsByMonthMap[monthKey] = { online: 0, cash: 0 };
              transactionsByMonthMap[monthKey].cash += cash;
              console.log(`[ReportsHub] Added legacy cash payment: month=${monthKey}, amount=${cash}, newTotal=${collectionsByMonth[monthKey]}`);
            }
          }
        }
        
        // ✅ Daily Rent: Process individual daily payments if present
        if (Array.isArray(b.dailyPayments) && b.dailyPayments.length > 0) {
          console.log(`[ReportsHub] Processing ${b.dailyPayments.length} daily payments for booking ${b.id}`);
          
          b.dailyPayments.forEach((dp: any) => {
            const dpDate = new Date(dp.paymentDate);
            const dpMonthKey = toMonthKeyFromDate(dpDate);
            if (!dpMonthKey) return;
            
            const dpOnlineAmount = effectiveDailyOnlineAmount(dp, b);
            const dpCashAmount = effectiveDailyCashAmount(dp, b);
            const isPaidOnline = toBool(dp.paidOnline);
            const isPaidCash = toBool(dp.paidCash);

            console.log(`[ReportsHub] Daily payment: date=${dp.paymentDate}, monthKey=${dpMonthKey}, effOnline=${dpOnlineAmount}, effCash=${dpCashAmount}, paidOnline=${isPaidOnline}, paidCash=${isPaidCash}`);

            // Add paid online amounts to collections
            if (isPaidOnline && dpOnlineAmount > 0) {
              transactionItems.push({ amount: dpOnlineAmount, type: "Rent (online)" });
              if (collectionsByMonth[dpMonthKey] === undefined) collectionsByMonth[dpMonthKey] = 0;
              collectionsByMonth[dpMonthKey] += dpOnlineAmount;
              if (!transactionsByMonthMap[dpMonthKey]) transactionsByMonthMap[dpMonthKey] = { online: 0, cash: 0 };
              transactionsByMonthMap[dpMonthKey].online += dpOnlineAmount;
              console.log(`[ReportsHub] Added daily online payment: month=${dpMonthKey}, amount=${dpOnlineAmount}`);
            }

            // Add paid cash amounts to collections
            if (isPaidCash && dpCashAmount > 0) {
              transactionItems.push({ amount: dpCashAmount, type: "Rent (cash)" });
              if (collectionsByMonth[dpMonthKey] === undefined) collectionsByMonth[dpMonthKey] = 0;
              collectionsByMonth[dpMonthKey] += dpCashAmount;
              if (!transactionsByMonthMap[dpMonthKey]) transactionsByMonthMap[dpMonthKey] = { online: 0, cash: 0 };
              transactionsByMonthMap[dpMonthKey].cash += dpCashAmount;
              console.log(`[ReportsHub] Added daily cash payment: month=${dpMonthKey}, amount=${dpCashAmount}`);
            }

            // Add unpaid amounts to pending dues
            if (!isPaidOnline && dpOnlineAmount > 0) {
              pendingDuesByMonth[dpMonthKey] = (pendingDuesByMonth[dpMonthKey] ?? 0) + dpOnlineAmount;
              console.log(`[ReportsHub] Added daily online due: month=${dpMonthKey}, amount=${dpOnlineAmount}, total=${pendingDuesByMonth[dpMonthKey]}`);
            }
            if (!isPaidCash && dpCashAmount > 0) {
              pendingDuesByMonth[dpMonthKey] = (pendingDuesByMonth[dpMonthKey] ?? 0) + dpCashAmount;
              console.log(`[ReportsHub] Added daily cash due: month=${dpMonthKey}, amount=${dpCashAmount}, total=${pendingDuesByMonth[dpMonthKey]}`);
            }
          });
        }
      });

      try {
        const enrollDueRes = await bookingApi.get("/api/enrollment-requests/unpaid-deposit-sum", {
          params: { propertyId },
          timeout: 8000,
        });
        const enrollDue = Number(enrollDueRes?.data?.totalAmount ?? 0);
        if (enrollDue > 0) {
          pendingDuesByMonth[m0] = (pendingDuesByMonth[m0] ?? 0) + enrollDue;
        }

        const enrollRequestsFiltered =
          enrollListRes?.data?.success && Array.isArray(enrollListRes.data.requests)
            ? enrollListRes.data.requests.filter((r: any) => {
                const st = String(r.status || "").trim().toLowerCase();
                return st === "requested" || st === "pay_pending";
              })
            : [];
        [m0, m1, m2].forEach((mk) => {
          const er = sumEnrollmentRentDueForMonthKey(enrollRequestsFiltered, mk);
          if (er > 0) {
            pendingDuesByMonth[mk] = (pendingDuesByMonth[mk] ?? 0) + er;
          }
        });
      } catch {
        /* optional */
      }

      const txByMonth: Record<string, { online: number; cash: number; total: number }> = {};
      [m0, m1, m2].forEach((mk) => {
        const t = transactionsByMonthMap[mk] || { online: 0, cash: 0 };
        txByMonth[mk] = { online: t.online, cash: t.cash, total: t.online + t.cash };
      });

      const totalCollections = transactionItems.reduce((s, t) => s + t.amount, 0);
      const onlineCollected = transactionItems
        .filter((t) => t.type === "Rent (online)" || t.type === "Security deposit (online)")
        .reduce((s, t) => s + t.amount, 0);
      const cashCollected = transactionItems
        .filter((t) => t.type === "Rent (cash)")
        .reduce((s, t) => s + t.amount, 0);
      
      // Calculate MoveOut P/L from completed bookings
      const moveOutAggregation = aggregateMoveOutPL(bookings.filter(b => isMovedOutBooking(b)));
      const moveOutPLVal = moveOutAggregation.totalMoveOutPL;

      // 🐛 Debug summary to validate daily rent aggregation and avoid duplicates
      console.log("[ReportsHub] FINANCIAL SUMMARY:", {
        m0,
        m1,
        m2,
        collectionsByMonth,
        pendingDuesByMonth,
        transactionsByMonthMap,
        totalCollections,
        onlineCollected,
        cashCollected,
        totalTransactions: transactionItems.length,
      });

      // Expenses (fixed tab) are month-specific via expense_date -> month_year.
      // Monthly expenses (monthly tab) are recurring templates; repeat them per month starting from creation month.
      const monthlyRecurringTotalForMonth = (monthKey: string): number => {
        return monthlyForSlices.reduce((sum: number, m: any) => {
          const startKey = m.startMonthKey;
          if (startKey && monthKey < startKey) return sum;
          return sum + (Number(m.amount) || 0);
        }, 0);
      };

      const fixedExpForMonth = (monthKey: string): number => {
        return expenses
          .filter((e: any) => (e.month_year || "") === monthKey)
          .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      };

      const exp0 = fixedExpForMonth(m0) + monthlyRecurringTotalForMonth(m0);
      const exp1 = fixedExpForMonth(m1) + monthlyRecurringTotalForMonth(m1);
      const exp2 = fixedExpForMonth(m2) + monthlyRecurringTotalForMonth(m2);

      const coll0 = collectionsByMonth[m0] ?? 0;
      const coll1 = collectionsByMonth[m1] ?? 0;
      const coll2 = collectionsByMonth[m2] ?? 0;
      const sec0 = securityDepositsByMonth[m0] ?? 0;
      const sec1 = securityDepositsByMonth[m1] ?? 0;
      const sec2 = securityDepositsByMonth[m2] ?? 0;

      // Calculate MoveOut P/L per month
      const calculateMoveOutPLByMonth = (monthKey: string): number => {
        let totalPL = 0;
        bookings.forEach((b: any) => {
          if (isMovedOutBooking(b)) {
            const moveOutData = b.moveOutRequest;
            if (moveOutData) {
              // Check if this booking moved out in the specified month
              const movedOutAt = moveOutData.movedOutAt || moveOutData.completedAt;
              if (movedOutAt) {
                const movedOutDate = new Date(movedOutAt);
                const movedOutMonthKey = `${movedOutDate.getFullYear()}-${String(movedOutDate.getMonth() + 1).padStart(2, "0")}`;
                if (movedOutMonthKey === monthKey) {
                  // Calculate MoveOut P/L for this booking
                  const currentDue = moveOutData.currentDue || 0;
                  const collected = moveOutData.securityDepositAmount || 0;
                  const returned = moveOutData.securityDepositReturned || 0;
                  
                  // Apply MoveOut P/L calculation logic
                  if (currentDue === 0) {
                    if (returned === collected) {
                      totalPL += 0;
                    } else if (returned < collected) {
                      totalPL += (collected - returned);
                    }
                  } else if (currentDue > 0) {
                    if (currentDue > collected) {
                      totalPL += 0;
                    } else {
                      if (returned < (collected + currentDue)) {
                        totalPL += (collected - (returned + currentDue));
                      }
                    }
                  }
                }
              }
            }
          }
        });
        return Math.round(totalPL);
      };

      const moveOutPL0 = calculateMoveOutPLByMonth(m0);
      const moveOutPL1 = calculateMoveOutPLByMonth(m1);
      const moveOutPL2 = calculateMoveOutPLByMonth(m2);

      const financialDataNext = {
        [currentMonthName]: {
          collections: coll0,
          securityDeposits: sec0,
          expense: exp0,
          pendingDues: pendingDuesByMonth[m0] ?? 0, // This should be month-specific
          profitLoss: Math.round(coll0 - exp0),
          moveOutPL: moveOutPL0,
        },
        [prev1]: {
          collections: coll1,
          securityDeposits: sec1,
          expense: exp1,
          pendingDues: pendingDuesByMonth[m1] ?? 0, // Month-specific
          profitLoss: Math.round(coll1 - exp1),
          moveOutPL: moveOutPL1,
        },
        [prev2]: {
          collections: coll2,
          securityDeposits: sec2,
          expense: exp2,
          pendingDues: pendingDuesByMonth[m2] ?? 0, // Month-specific
          profitLoss: Math.round(coll2 - exp2),
          moveOutPL: moveOutPL2,
        },
      };

      const totalBeds = statsRes?.data?.success && typeof statsRes.data.totalBeds === "number" ? statsRes.data.totalBeds : 0;
      const occupiedBeds =
        statsRes?.data?.success && typeof statsRes.data.occupiedBeds === "number" ? statsRes.data.occupiedBeds : 0;
      const emptyBeds =
        statsRes?.data?.success && typeof statsRes.data.emptyBeds === "number"
          ? statsRes.data.emptyBeds
          : Math.max(0, totalBeds - occupiedBeds);
      const moveOutRequestsOcc = moveOutRes?.data?.data?.requests ?? moveOutRes?.data?.requests;
      const moveOutListOcc = Array.isArray(moveOutRequestsOcc) ? moveOutRequestsOcc : [];
      const moveOutsByMonth: Record<string, number> = {};
      moveOutListOcc.forEach((r: any) => {
        const d = r.movedOutAt ? new Date(r.movedOutAt) : null;
        if (d && !Number.isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          moveOutsByMonth[key] = (moveOutsByMonth[key] || 0) + 1;
        }
      });
      const occupancyDataNext = {
        [currentMonthName]: { emptyBeds, occupied: occupiedBeds, moveOuts: moveOutsByMonth[m0] ?? 0 },
        [prev1]: { emptyBeds, occupied: occupiedBeds, moveOuts: moveOutsByMonth[m1] ?? 0 },
        [prev2]: { emptyBeds, occupied: occupiedBeds, moveOuts: moveOutsByMonth[m2] ?? 0 },
      };

      setReportMeta({
        financialData: financialDataNext,
        occupancyData: occupancyDataNext,
        transactionsByMonth: txByMonth,
        transactionTotals: {
          online: onlineCollected,
          cash: cashCollected,
          total: totalCollections,
        },
        moveOutPL: moveOutPLVal,
      });
      setProcessedExpenseSlices(
        buildExpenseSlices(expenses, monthlyForSlices, m0, m1, m2, currentMonthName, prev1, prev2)
      );

      setReportDetails(EMPTY_REPORT_DETAILS);
      setReportDetailsPropertyId(null);
      setReportSource({
        bookings,
        moveOutList: moveOutListOcc,
      });
      setReportsExpensesRaw(expenses);
      setReportsMonthlyStaff(monthlyForSlices);
      setReportsSnapshotMonthKey(m0);
      setLoading(false);
      setSyncingTenantReports(false);

      if (numericPropertyId) {
        analyticsApi
          .get(`/property/${numericPropertyId}/reports`, { timeout: 15000 })
          .then((analyticsRes) => {
            const report =
              analyticsRes.data?.success && analyticsRes.data?.data ? analyticsRes.data.data : null;
            const pl = report ? Number(report.moveOutPL) || 0 : 0;
            setReportMeta((prev) => ({ ...prev, moveOutPL: pl }));
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn("ReportsHub fetch error:", e);
      setSyncingTenantReports(false);
      setReportMeta(EMPTY_REPORT_META);
      setProcessedExpenseSlices(EMPTY_EXPENSE_SLICES);
      setReportDetails(EMPTY_REPORT_DETAILS);
      setReportSource(null);
      setReportsExpensesRaw([]);
      setReportsMonthlyStaff([]);
      setReportsSnapshotMonthKey("");
      setReportDetailsPropertyId(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId, numericPropertyId, currentMonthIdx, currentMonthName, currentProperty?.name, propertiesList]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const ensureDetailedReportsLoaded = useCallback(async (): Promise<ReportDetailsState> => {
    if (!propertyId || !reportSource) return EMPTY_REPORT_DETAILS;
    if (reportDetailsPropertyId === propertyId) return reportDetails;

    setSyncingTenantReports(true);
    try {
      // Wait until the current screen interactions finish before report-only work.
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => {
          resolve();
        });
      });

      const params: Record<string, string> = { includeCompleted: "true" };
      if (propertyId) params.propertyId = propertyId;

      const [roomsRes, inactiveTenantsRes, bookingsWithDetailsRes] = await Promise.all([
        propertyApi.get("/api/properties/rooms/all", { timeout: 12000 }).catch(() => ({ data: {} })),
        bookingApi
          .get("/api/bookings/list/inactive-for-property", { params: { propertyId }, timeout: 15000 })
          .catch(() => ({ data: { success: false, tenants: [] } })),
        // For PDFs we need correct name/phone/dob/aadhaar like TenantDetailScreen.
        // The fast Reports list endpoint intentionally skips user-service calls.
        bookingApi.get("/api/bookings/list/active-with-details", { params, timeout: 25000 }).catch(() => ({ data: {} })),
      ]);

      const moveOutListFull = reportSource.moveOutList;
      const rawBookings =
        bookingsWithDetailsRes.data?.success && Array.isArray(bookingsWithDetailsRes.data?.bookings)
          ? bookingsWithDetailsRes.data.bookings
          : reportSource.bookings;
      // Normalize same as PaymentManagementScreen: strict booleans
      const bookings = rawBookings.map((b: any) => ({
        ...b,
        securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit) : 0,
        isSecurityPaid: toBool(b.isSecurityPaid),
        isSecurityPaidOnline: toBool(b.isSecurityPaidOnline),
        onlinePaymentRecv: b.onlinePaymentRecv != null ? Number(b.onlinePaymentRecv) : 0,
        cashPaymentRecv: b.cashPaymentRecv != null ? Number(b.cashPaymentRecv) : 0,
        isRentOnlinePaid: toBool(b.isRentOnlinePaid),
        isRentCashPaid: toBool(b.isRentCashPaid),
        moveInDate:
          b.moveInDate != null
            ? typeof b.moveInDate === "string"
              ? b.moveInDate
              : new Date(b.moveInDate).toISOString?.() ?? String(b.moveInDate)
            : "",
      }));

      const tenantMap = new Map<string, ReportTenantRow>();
      bookings.forEach((b: any) => {
        const c = b.customer || {};
        const rowId = String(c.id || b.customerId || "").trim();
        const uniqueId = String(c.uniqueId || "").trim();
        if (!rowId && !uniqueId) return;
        const mapKey = uniqueId || rowId;
        const firstName = String(c.firstName || "").trim();
        const lastName = String(c.lastName || "").trim();
        const fullName = `${firstName} ${lastName}`.trim() || "Unknown";
        const roomNumber = b?.room?.roomNumber != null ? String(b.room.roomNumber) : "—";
        const floorValue = b?.room?.floor;
        const floor =
          floorValue == null || Number.isNaN(Number(floorValue))
            ? "—"
            : Number(floorValue) === 0
              ? "Ground Floor"
              : `${Number(floorValue)} Floor`;
        const bedNumbers =
          Array.isArray(b?.bedNumbers) && b.bedNumbers.length > 0 ? b.bedNumbers.join(", ") : "—";
        const due = getTotalDueFromBooking(b);
        const previous = tenantMap.get(mapKey);
        tenantMap.set(mapKey, {
          id: rowId || previous?.id || "—",
          uniqueId: uniqueId || previous?.uniqueId || "—",
          name: fullName,
          phone: String(c.phone || previous?.phone || "—"),
          email: String(c.email || previous?.email || "—"),
          room: roomNumber,
          floor,
          bedNumbers,
          status: String(b.status || previous?.status || "active"),
          moveInDate: b.moveInDate || previous?.moveInDate || "",
          totalDue: (previous?.totalDue || 0) + due,
          aadhaarStatusRaw: previous?.aadhaarStatusRaw || "",
          kycStatus: previous?.kycStatus || "Unknown",
        });
      });

      let tenantRows = Array.from(tenantMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      const allRooms =
        roomsRes.data?.success && Array.isArray(roomsRes.data.rooms) ? roomsRes.data.rooms : [];
      const propMatch = propertiesList?.find(
        (p: any) =>
          p.uniqueId === propertyId || String(p.id) === propertyId || p.name === currentProperty?.name
      );
      const propertyMatchValues = [
        currentProperty?.name,
        propMatch?.uniqueId,
        propertyId,
        numericPropertyId != null ? String(numericPropertyId) : null,
      ].filter(Boolean) as string[];
      const roomsFiltered = allRooms.filter((r: any) => roomMatchesProperty(r, propertyMatchValues));
      const inactiveList =
        inactiveTenantsRes?.data?.success && Array.isArray(inactiveTenantsRes.data.tenants)
          ? inactiveTenantsRes.data.tenants
          : [];
      const activeBk = bookings.filter((b: any) => String(b.status || "").toLowerCase() === "active");
      
      // For transaction report, we need ALL bookings (active + completed)
      const allBkForTransactions = bookings; // Include completed bookings for transaction history

      const uidSet = new Set<string>();
      tenantRows.forEach((t) => {
        if (t.uniqueId && t.uniqueId !== "—") uidSet.add(String(t.uniqueId));
      });
      activeBk.forEach((b: any) => {
        if (b.customer?.uniqueId) uidSet.add(String(b.customer.uniqueId));
      });
      inactiveList.forEach((t: any) => {
        if (t.uniqueId) uidSet.add(String(t.uniqueId));
      });
      moveOutListFull.forEach((r: any) => {
        if (r.customerUniqueId) uidSet.add(String(r.customerUniqueId));
      });

      const moveOutBookingIds = moveOutListFull
        .map((r: any) => (r.bookingId != null ? String(r.bookingId).trim() : ""))
        .filter(Boolean);

      const [profileMap, bookingMap] = await Promise.all([
        fetchUserProfilesBatched([...uidSet], 6),
        fetchBookingsBatched(moveOutBookingIds, 6),
      ]);

      const kycByUniqueId = new Map<string, string>();
      Object.keys(profileMap).forEach((uid) => {
        kycByUniqueId.set(uid, resolveFinalKycVerified(profileMap[uid]) ? "Verified" : "Unverified");
      });

      tenantRows = tenantRows.map((t) => {
        const raw = kycByUniqueId.get(t.uniqueId) || t.aadhaarStatusRaw || "";
        return {
          ...t,
          aadhaarStatusRaw: raw,
          kycStatus: normalizeKycStatus(raw),
        };
      });

      const detailedActiveRows: DetailedActiveRow[] = activeBk.map((b: any, idx: number) => {
        const c = b.customer || {};
        const uid = String(c.uniqueId || "");
        const prof = profileMap[uid];
        const det = extractProfileDetails(prof, c);
        const fn = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
        const due = getTotalDueFromBooking(b);
        const payDate = formatDateLabel(b.moveInDate);
        const moveInMonthKey = toMonthKeyFromDate(b.moveInDate);
        const payments: DetailedActiveRow["payments"] = [];
        
        // Security deposit (single payment)
        const sec = Number(b.securityDeposit) || 0;
        if (sec > 0 && toBool(b.isSecurityPaid)) {
          payments.push({ 
            amount: sec, 
            date: payDate, 
            type: "Online", 
            label: "Security deposit",
            monthKey: moveInMonthKey || undefined
          });
        }
        
        // Online rent - multi-month tracking
        const onlinePaidYm = String(b.rentOnlinePaidYearMonth || '').trim();
        const onlinePaidMonths = onlinePaidYm ? onlinePaidYm.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
        const schedOnline = Number(b.scheduledOnlineRent ?? 0);
        
        if (schedOnline > 0 && onlinePaidMonths.length > 0) {
          // Add each paid month separately
          onlinePaidMonths.forEach((monthKey: string) => {
            const monthLabel = monthKeyToShortLabel(monthKey);
            payments.push({ 
              amount: schedOnline, 
              date: monthLabel, 
              type: "Online", 
              label: `Rent - ${monthLabel}`,
              monthKey: monthKey
            });
          });
        } else {
          // Legacy: single payment
          const online = Number(b.onlinePaymentRecv) || 0;
          if (online > 0 && toBool(b.isRentOnlinePaid)) {
            payments.push({ 
              amount: online, 
              date: payDate, 
              type: "Online", 
              label: "Rent",
              monthKey: moveInMonthKey || undefined
            });
          }
        }
        
        // Cash rent - multi-month tracking
        const cashPaidYm = String(b.rentCashPaidYearMonth || '').trim();
        const cashPaidMonths = cashPaidYm ? cashPaidYm.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
        const schedCash = Number(b.scheduledCashRent ?? 0);
        
        if (schedCash > 0 && cashPaidMonths.length > 0) {
          // Add each paid month separately
          cashPaidMonths.forEach((monthKey: string) => {
            const monthLabel = monthKeyToShortLabel(monthKey);
            payments.push({ 
              amount: schedCash, 
              date: monthLabel, 
              type: "Cash", 
              label: `Rent - ${monthLabel}`,
              monthKey: monthKey
            });
          });
        } else {
          // Legacy: single payment
          const cash = Number(b.cashPaymentRecv) || 0;
          if (cash > 0 && toBool(b.isRentCashPaid)) {
            payments.push({ 
              amount: cash, 
              date: payDate, 
              type: "Cash", 
              label: "Rent",
              monthKey: moveInMonthKey || undefined
            });
          }
        }

        // ✅ Daily rent payments (online and cash)
        if (Array.isArray(b.dailyPayments) && b.dailyPayments.length > 0) {
          b.dailyPayments.forEach((dp: any) => {
            const dayLabel = formatDateLabel(dp.paymentDate);
            const dayMonthKey = toMonthKeyFromDate(dp.paymentDate);
            
            // Daily rent online
            if (toBool(dp.paidOnline) && Number(dp.onlineAmount ?? 0) > 0) {
              payments.push({
                amount: Number(dp.onlineAmount),
                date: dayLabel,
                type: "Online",
                label: `Daily Rent - ${dayLabel}`,
                monthKey: dayMonthKey || undefined
              });
            }
            
            // Daily rent cash
            if (toBool(dp.paidCash) && Number(dp.cashAmount ?? 0) > 0) {
              payments.push({
                amount: Number(dp.cashAmount),
                date: dayLabel,
                type: "Cash",
                label: `Daily Rent - ${dayLabel}`,
                monthKey: dayMonthKey || undefined
              });
            }
          });
        }
        
        return {
          num: idx + 1,
          fullName: fn || det.fullName,
          phone: det.phone,
          email: det.email,
          dob: det.dob,
          aadhaar: det.aadhaarDisplay,
          aadhaarLast4: getAadhaarLast4Digits(prof, c),
          address: det.address,
          emergencyName: det.emergencyName,
          emergencyPhone: det.emergencyPhone,
          room: b.room?.roomNumber != null ? String(b.room.roomNumber) : "—",
          moveIn: formatDateLabel(b.moveInDate),
          moveOut: b.moveOutDate ? formatDateLabel(b.moveOutDate) : "—",
          securityDeposit: Number(b.securityDeposit) || 0,
          due,
          payments,
          moveInMonthKey: toMonthKeyFromDate(b.moveInDate),
          kycStatus: prof ? kycLabelFromUser(prof) : kycByUniqueId.get(uid) || "Unverified",
          uniqueId: uid,
        };
      });
      
      // Create transaction rows from ALL bookings (including completed) for Transaction Report
      console.log('[ReportsHub] Creating allTransactionRows from', allBkForTransactions.length, 'bookings');
      const allTransactionRows: DetailedActiveRow[] = allBkForTransactions.map((b: any, idx: number) => {
        const c = b.customer || {};
        const uid = String(c.uniqueId || "");
        const prof = profileMap[uid];
        const det = extractProfileDetails(prof, c);
        const fn = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
        const payDate = formatDateLabel(b.moveInDate);
        const moveInMonthKey = toMonthKeyFromDate(b.moveInDate);
        const payments: DetailedActiveRow["payments"] = [];
        
        // Security deposit (single payment)
        const sec = Number(b.securityDeposit) || 0;
        if (sec > 0 && toBool(b.isSecurityPaid)) {
          payments.push({ 
            amount: sec, 
            date: payDate, 
            type: "Online", 
            label: "Security deposit",
            monthKey: moveInMonthKey || undefined
          });
        }
        
        // Online rent - multi-month tracking
        const onlinePaidYm = String(b.rentOnlinePaidYearMonth || '').trim();
        const onlinePaidMonths = onlinePaidYm ? onlinePaidYm.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
        const schedOnline = Number(b.scheduledOnlineRent ?? 0);
        
        if (schedOnline > 0 && onlinePaidMonths.length > 0) {
          onlinePaidMonths.forEach((monthKey: string) => {
            const monthLabel = monthKeyToShortLabel(monthKey);
            payments.push({ 
              amount: schedOnline, 
              date: monthLabel, 
              type: "Online", 
              label: `Rent - ${monthLabel}`,
              monthKey: monthKey
            });
          });
        } else {
          const online = Number(b.onlinePaymentRecv) || 0;
          if (online > 0 && toBool(b.isRentOnlinePaid)) {
            payments.push({ 
              amount: online, 
              date: payDate, 
              type: "Online", 
              label: "Rent",
              monthKey: moveInMonthKey || undefined
            });
          }
        }
        
        // Cash rent - multi-month tracking
        const cashPaidYm = String(b.rentCashPaidYearMonth || '').trim();
        const cashPaidMonths = cashPaidYm ? cashPaidYm.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
        const schedCash = Number(b.scheduledCashRent ?? 0);
        
        if (schedCash > 0 && cashPaidMonths.length > 0) {
          cashPaidMonths.forEach((monthKey: string) => {
            const monthLabel = monthKeyToShortLabel(monthKey);
            payments.push({ 
              amount: schedCash, 
              date: monthLabel, 
              type: "Cash", 
              label: `Rent - ${monthLabel}`,
              monthKey: monthKey
            });
          });
        } else {
          const cash = Number(b.cashPaymentRecv) || 0;
          if (cash > 0 && toBool(b.isRentCashPaid)) {
            payments.push({ 
              amount: cash, 
              date: payDate, 
              type: "Cash", 
              label: "Rent",
              monthKey: moveInMonthKey || undefined
            });
          }
        }
        
        return {
          num: idx + 1,
          fullName: fn || det.fullName,
          phone: det.phone,
          email: det.email,
          dob: det.dob,
          aadhaar: det.aadhaarDisplay,
          aadhaarLast4: getAadhaarLast4Digits(prof, c),
          address: det.address,
          emergencyName: det.emergencyName,
          emergencyPhone: det.emergencyPhone,
          room: b.room?.roomNumber != null ? String(b.room.roomNumber) : "—",
          moveIn: formatDateLabel(b.moveInDate),
          moveOut: b.moveOutDate ? formatDateLabel(b.moveOutDate) : "—",
          securityDeposit: Number(b.securityDeposit) || 0,
          due: 0, // Completed bookings have no dues
          payments,
          moveInMonthKey: toMonthKeyFromDate(b.moveInDate),
          kycStatus: prof ? kycLabelFromUser(prof) : kycByUniqueId.get(uid) || "Unverified",
          uniqueId: uid,
        };
      });
      
      console.log('[ReportsHub] Created allTransactionRows:', allTransactionRows.length, 'rows');
      console.log('[ReportsHub] Sample transaction row:', allTransactionRows[0]);
      console.log('[ReportsHub] Total payments across all rows:', allTransactionRows.reduce((sum, r) => sum + (r.payments?.length || 0), 0));

      const detailedOldRows: DetailedOldRow[] = inactiveList.map((t: any, idx: number) => {
        const uid = String(t.uniqueId || "");
        const prof = profileMap[uid];
        const det = extractProfileDetails(prof, t);
        const name = String(t.name || "").trim() || det.fullName;
        return {
          num: idx + 1,
          fullName: name,
          phone: String(t.phone || det.phone || "—"),
          email: det.email,
          dob: det.dob,
          aadhaar: det.aadhaarDisplay,
          aadhaarLast4: getAadhaarLast4Digits(prof, t),
          address: det.address,
          emergencyName: det.emergencyName,
          emergencyPhone: det.emergencyPhone,
          room: t.roomNumber != null ? String(t.roomNumber) : "—",
          moveIn: formatDateLabel(t.moveInDate),
          moveOut: formatDateLabel(t.moveOutDate),
          uniqueId: uid,
          kycStatus: prof ? kycLabelFromUser(prof) : "Unverified",
        };
      });

      const roomTenantsMap = new Map<
        string,
        { num: number; name: string; phone: string; moveIn: string; moveOut: string; due: number }[]
      >();
      activeBk.forEach((b: any) => {
        const c = b.customer || {};
        const uid = String(c.uniqueId || "");
        const prof = profileMap[uid];
        const det = extractProfileDetails(prof, c);
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || det.fullName;
        const k =
          b.room?.id != null
            ? `id:${String(b.room.id)}`
            : b.room?.roomNumber != null && String(b.room.roomNumber).trim()
              ? `num:${String(b.room.roomNumber).trim()}`
              : null;
        if (!k) return;
        const list = roomTenantsMap.get(k) || [];
        list.push({
          num: list.length + 1,
          name,
          phone: det.phone,
          moveIn: formatDateLabel(b.moveInDate),
          moveOut: b.moveOutDate ? formatDateLabel(b.moveOutDate) : "—",
          due: getTotalDueFromBooking(b),
        });
        roomTenantsMap.set(k, list);
      });

      const roomsOccupancyBlocks: RoomOccupancyBlock[] = roomsFiltered.map((room: any) => {
        const raw =
          roomTenantsMap.get(`id:${String(room.id)}`) ||
          roomTenantsMap.get(`num:${String(room.roomNumber ?? "").trim()}`) ||
          [];
        return {
          roomNumber: String(room.roomNumber ?? "—"),
          roomType: roomTypeLabel(room),
          tenants: raw,
        };
      });

      const bands = getMonthsFromCurrentThroughApril();
      const monthwiseMoveOutBlocks: MonthwiseMoveOutBlock[] = bands.map(({ monthKey, label }) => {
        const rowsInMonth = moveOutListFull.filter((r: any) => {
          const d = r.movedOutAt ? new Date(r.movedOutAt) : null;
          if (!d || Number.isNaN(d.getTime())) return false;
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return k === monthKey;
        });
        return {
          label,
          rows: rowsInMonth.map((r: any, i: number) => {
            const uid = String(r.customerUniqueId || "");
            const prof = profileMap[uid];
            const booking = r.bookingId != null ? bookingMap[String(r.bookingId)] : null;
            const det = extractProfileDetails(prof, {});
            const name =
              det.fullName !== "—" ? det.fullName : `Tenant ${String(r.customerId || i + 1)}`;
            return {
              num: i + 1,
              fullName: name,
              phone: det.phone,
              room: r.roomNumber != null ? String(r.roomNumber) : "—",
              moveIn: booking?.moveInDate ? formatDateLabel(booking.moveInDate) : "—",
              moveOut: booking?.moveOutDate
                ? formatDateLabel(booking.moveOutDate)
                : formatDateLabel(r.movedOutAt),
              dues: Number(r.currentDue) || 0,
            };
          }),
        };
      });

      const nextDetails: ReportDetailsState = {
        reportTenants: tenantRows,
        detailedActiveRows,
        detailedOldRows,
        roomsOccupancyBlocks,
        monthwiseMoveOutBlocks,
        allTransactionRows, // Include all transactions for Transaction Report
      };
      setReportDetails(nextDetails);
      setReportDetailsPropertyId(propertyId);
      return nextDetails;
    } catch (error) {
      console.warn("ReportsHub detail fetch error:", error);
      setReportDetails(EMPTY_REPORT_DETAILS);
      setReportDetailsPropertyId(null);
      return EMPTY_REPORT_DETAILS;
    } finally {
      setSyncingTenantReports(false);
    }
  }, [
    propertyId,
    reportSource,
    reportDetailsPropertyId,
    reportDetails,
    propertiesList,
    currentProperty?.name,
    numericPropertyId,
  ]);

  // Get months for combined view (current + previous 2) - REVERSED ORDER (current month first)
  const getFinancialMonths = () => [
    { name: currentMonthName, data: financialData[currentMonthName] },
    { name: MONTHS[(currentMonthIdx - 1 + 12) % 12], data: financialData[MONTHS[(currentMonthIdx - 1 + 12) % 12]] },
    { name: MONTHS[(currentMonthIdx - 2 + 12) % 12], data: financialData[MONTHS[(currentMonthIdx - 2 + 12) % 12]] }
  ];

  const financialMonths = getFinancialMonths();

  // Combined pending dues (same as Due tab total on Payments page)
  const combinedPendingDues = (financialData[currentMonthName]?.pendingDues || 0) + 
                           (financialData[MONTHS[(currentMonthIdx - 1 + 12) % 12]]?.pendingDues || 0) + 
                           (financialData[MONTHS[(currentMonthIdx - 2 + 12) % 12]]?.pendingDues || 0);

  const expenseList =
    processedExpenseSlices.financial[financialView] ??
    processedExpenseSlices.financial[currentMonthName] ??
    [];

  const combinedMonths = financialMonths.map(month => ({
    name: month.name,
    collections: totalInflowCollections(month.data),
    expense: month.data?.expense ?? 0
  }));

  const expenseReportData =
    processedExpenseSlices.report[expenseReportView] ??
    processedExpenseSlices.report[currentMonthName] ??
    [];

  const expenseData = expenseReportData;
  const totalExpense = expenseData.reduce((sum, item) => sum + item.amount, 0);

  // Transaction report: per month when a month is selected, else all-time (Combined)
  const transactionMonthKey = transactionView === currentMonthName ? monthYear(0) : transactionView === MONTHS[(currentMonthIdx - 1 + 12) % 12] ? monthYear(1) : transactionView === MONTHS[(currentMonthIdx - 2 + 12) % 12] ? monthYear(2) : null;
  const currentTransactionData = transactionView === "Combined" || !transactionMonthKey
    ? { online: transactionTotals.online, cash: transactionTotals.cash, total: transactionTotals.total }
    : (transactionsByMonth[transactionMonthKey] ?? { online: 0, cash: 0, total: 0 });

  /* Reset month when non-monthly selected */
  useEffect(() => {
    if (filter1 !== currentMonthName) {
      setFilter2(currentMonthName);
    }
  }, [filter1, currentMonthName]);

  /* Reset second filter when first filter changes */
  useEffect(() => {
    if (reportFilter1 === "Monthly") {
      setReportFilter2(currentMonthName);
    } else if (reportFilter1 === "Quarterly") {
      setReportFilter2("Jan-Mar");
    } else if (reportFilter1 === "Yearly") {
      setReportFilter2("2024-25");
    }
  }, [reportFilter1, currentMonthName]);

  /* Build HTML for PDF report by name; uses current screen data */
  const buildReportHtml = useCallback((
    reportName: string,
    period?: string,
    details: ReportDetailsState = reportDetails,
    filterCtx?: { f1: string; f2: string },
    logoDataUriOverride?: string
  ): string => {
    const propertyName = currentProperty?.name || currentProperty?.id || "Property";
    const propertyId = currentProperty?.id || "";
    const propertyDisplay = propertyId ? `${propertyName} (ID: ${propertyId})` : propertyName;
    const fd = financialData[currentMonthName] ?? financialData[MONTHS[(currentMonthIdx - 1 + 12) % 12]];
    const pending = fd?.pendingDues ?? combinedPendingDues;
    const rentCollections = fd?.collections ?? 0;
    const collections = totalInflowCollections(fd);
    const expense = fd?.expense ?? 0;
    const profit = Math.round(rentCollections - expense);
    const {
      detailedActiveRows,
      detailedOldRows,
      roomsOccupancyBlocks,
      monthwiseMoveOutBlocks,
      allTransactionRows = detailedActiveRows, // Fallback to active rows if not provided
    } = details;
    const rows = (label: string, value: string | number) => `<tr><td style="padding:8px;border:1px solid #ddd">${label}</td><td style="padding:8px;border:1px solid #ddd">${value}</td></tr>`;
    let body = "";
    switch (reportName) {
      case "Tenant with Dues":
        {
          const dueList = detailedActiveRows
            .filter((r) => r.due > 0)
            .sort((a, b) => b.due - a.due);
          const sumDue = dueList.reduce((s, r) => s + r.due, 0);
          let n = 0;
          const dueRows = dueList
            .map((r) => {
              n += 1;
              return `<tr>
                <td>${n}</td>
                <td>${escapeHtml(r.fullName)}</td>
                <td>${escapeHtml(r.phone)}</td>
                <td>${escapeHtml(r.room)}</td>
                <td>${escapeHtml(r.moveIn)}</td>
                <td>${escapeHtml(r.moveOut)}</td>
                <td style="text-align:right">₹${r.securityDeposit.toLocaleString()}</td>
                <td style="text-align:right;color:#b91c1c;font-weight:700">₹${r.due.toLocaleString()}</td>
              </tr>`;
            })
            .join("");
          body = `<h3>Tenant with Dues</h3>
          ${
            dueList.length
              ? `<table><thead><tr><th>#</th><th>Full Name</th><th>Phone</th><th>Room</th><th>Move In</th><th>Move Out</th><th>Security Dep.</th><th>Due Amount</th></tr></thead><tbody>${dueRows}</tbody></table>
              <p style="margin-top:16px;font-size:14px"><strong>Total Due Amount:</strong> <span style="color:#b91c1c;font-weight:800">₹${sumDue.toLocaleString()}</span></p>`
              : `<p>No tenants with pending dues.</p>`
          }`;
        }
        break;
      case "Current Dues": {
        const ref = new Date();
        const scopedKeys = filterCtx ? getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref) : [];
        const keySet = filterCtx && scopedKeys.length ? new Set(scopedKeys) : null;
        let dueList = detailedActiveRows.filter((r) => r.due > 0);
        if (keySet) {
          dueList = dueList.filter(
            (r) => !!(r.moveInMonthKey && keySet.has(r.moveInMonthKey))
          );
        }
        dueList.sort((a, b) => b.due - a.due);
        const sumDue = dueList.reduce((s, r) => s + r.due, 0);
        let n = 0;
        const dueRows = dueList
          .map((r) => {
            n += 1;
            return `<tr>
                <td>${n}</td>
                <td>${escapeHtml(r.fullName)}</td>
                <td>${escapeHtml(r.phone)}</td>
                <td>${escapeHtml(r.room)}</td>
                <td>${escapeHtml(r.moveIn)}</td>
                <td>${escapeHtml(r.moveOut)}</td>
                <td style="text-align:right">₹${r.securityDeposit.toLocaleString()}</td>
                <td style="text-align:right;color:#b91c1c;font-weight:700">₹${r.due.toLocaleString()}</td>
              </tr>`;
          })
          .join("");
        const emptyMsg = keySet
          ? "No tenants with pending dues whose move-in falls in the selected period."
          : "No tenants with pending dues.";
        body = `<h3>Current Dues</h3>
          ${
            dueList.length
              ? `<table><thead><tr><th>#</th><th>Tenant Name</th><th>Phone</th><th>Room</th><th>Move In</th><th>Move Out</th><th>Security Dep.</th><th>Due Amount</th></tr></thead><tbody>${dueRows}</tbody></table>
              <p style="margin-top:16px;font-size:14px"><strong>Total Due Amount:</strong> <span style="color:#b91c1c;font-weight:800">₹${sumDue.toLocaleString()}</span></p>`
              : `<p>${emptyMsg}</p>`
          }`;
      }
        break;
      case "Tenant Details":
        {
          const tenantRowsHtml = detailedActiveRows
            .map(
              (r) => `<tr>
                <td>${r.num}</td>
                <td>${escapeHtml(r.fullName)}</td>
                <td>${escapeHtml(r.phone)}</td>
                <td>${escapeHtml(r.dob)}</td>
                <td>${escapeHtml(r.email)}</td>
                <td style="font-weight:700">${escapeHtml(r.aadhaarLast4 !== "—" ? r.aadhaarLast4 : "—")}</td>
                <td>${escapeHtml(r.address)}</td>
                <td>${escapeHtml(r.emergencyName)} / ${escapeHtml(r.emergencyPhone)}</td>
                <td>${escapeHtml(r.room)}</td>
                <td>${escapeHtml(r.moveIn)}</td>
                <td>${escapeHtml(r.moveOut)}</td>
              </tr>`
            )
            .join("");
          
          body = `<h3>Tenant Details</h3>
          <p><strong>Total:</strong> ${detailedActiveRows.length} tenants</p>
          ${
            detailedActiveRows.length
              ? `<table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full Name</th>
                    <th>Phone</th>
                    <th>DOB</th>
                    <th>Email</th>
                    <th>Aadhaar (last 4)</th>
                    <th>Address</th>
                    <th>Emergency Name / Contact</th>
                    <th>Room</th>
                    <th>Move In</th>
                    <th>Move Out</th>
                  </tr>
                </thead>
                <tbody>${tenantRowsHtml}</tbody>
              </table>`
              : `<p>No active tenants for this property.</p>`
          }
          <h3 style="margin-top:24px">Financial Summary (${currentMonthName})</h3>
          <table style="width:auto;max-width:400px">
            <tbody>
              ${rows("Collections (rent + security)", "₹" + (collections ?? 0).toLocaleString())}
              ${rows("Expense", "₹" + (expense ?? 0).toLocaleString())}
              ${rows("Pending Dues", "₹" + (pending ?? 0).toLocaleString())}
              ${rows("Profit/Loss (rent − expense)", "₹" + (profit ?? 0).toLocaleString())}
            </tbody>
          </table>`;
        }
        break;
      case "Tenant KYC Details":
      case "Tenant KYC Status":
      case "Tenant KYC":
        {
          const kycRows = detailedActiveRows
            .map(
              (r) => `<tr>
                <td>${r.num}</td>
                <td>${escapeHtml(r.fullName)}</td>
                <td>${escapeHtml(r.phone)}</td>
                <td>${escapeHtml(r.aadhaar)}</td>
                <td>${escapeHtml(r.kycStatus)}</td>
                <td>${escapeHtml(r.room)}</td>
                <td>${escapeHtml(r.moveIn)}</td>
                <td>${escapeHtml(r.moveOut)}</td>
              </tr>`
            )
            .join("");
          body = `<h3>Tenant KYC Details</h3>
          <p><strong>Property:</strong> ${escapeHtml(propertyName)}</p>
          ${
            detailedActiveRows.length
              ? `<table><thead><tr><th>#</th><th>Full Name</th><th>Phone</th><th>Aadhaar #</th><th>KYC Status</th><th>Room</th><th>Move In</th><th>Move Out</th></tr></thead><tbody>${kycRows}</tbody></table>`
              : `<p>No tenants found.</p>`
          }`;
        }
        break;
      case "Room Occupancy Report":
      case "Room Occupancy":
        {
          const blocks = roomsOccupancyBlocks
            .map((blk) => {
              const tenantLines =
                blk.tenants.length > 0
                  ? blk.tenants
                      .map(
                        (t) => `<tr>
                    <td style="padding:8px;border:1px solid #ddd">${t.num}</td>
                    <td style="padding:8px;border:1px solid #ddd">${escapeHtml(t.name)}</td>
                    <td style="padding:8px;border:1px solid #ddd">${escapeHtml(t.phone)}</td>
                    <td style="padding:8px;border:1px solid #ddd">${escapeHtml(t.moveIn)}</td>
                    <td style="padding:8px;border:1px solid #ddd">${escapeHtml(t.moveOut)}</td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#b91c1c">₹${t.due.toLocaleString()}</td>
                  </tr>`
                      )
                      .join("")
                  : `<tr><td colspan="6" style="padding:8px;border:1px solid #ddd;font-style:italic;color:#64748b">Vacant / No active tenant</td></tr>`;
              return `<div style="margin-bottom:24px;page-break-inside:avoid">
                <h4 style="margin-bottom:8px">Room ${escapeHtml(blk.roomNumber)} — ${escapeHtml(blk.roomType)}</h4>
                <table style="border-collapse:collapse;width:100%">
                  <thead>
                    <tr style="background:#f8fafc">
                      <th style="padding:8px;border:1px solid #ddd">#</th>
                      <th style="padding:8px;border:1px solid #ddd">Name</th>
                      <th style="padding:8px;border:1px solid #ddd">Phone</th>
                      <th style="padding:8px;border:1px solid #ddd">Move In</th>
                      <th style="padding:8px;border:1px solid #ddd">Move Out</th>
                      <th style="padding:8px;border:1px solid #ddd">Due</th>
                    </tr>
                  </thead>
                  <tbody>${tenantLines}</tbody>
                </table>
              </div>`;
            })
            .join("");
          body = `<h3>Room Occupancy Report</h3>
          <p><strong>Property:</strong> ${escapeHtml(propertyName)}</p>
          ${roomsOccupancyBlocks.length ? blocks : `<p>No room data for this property.</p>`}`;
        }
        break;
      case "Move Out":
      case "Month-wise Move Out":
      case "Monthwise Move Out":
        {
          const sections = monthwiseMoveOutBlocks
            .map((block) => {
              const inner =
                block.rows.length > 0
                  ? block.rows
                      .map(
                        (r) => `<tr>
                    <td>${r.num}</td>
                    <td>${escapeHtml(r.fullName)}</td>
                    <td>${escapeHtml(r.phone)}</td>
                    <td>${escapeHtml(r.room)}</td>
                    <td>${escapeHtml(r.moveIn)}</td>
                    <td>${escapeHtml(r.moveOut)}</td>
                    <td style="text-align:right">₹${r.dues.toLocaleString()}</td>
                  </tr>`
                      )
                      .join("")
                  : `<tr><td colspan="7" style="color:#94a3b8;text-align:center">No move-outs in this month</td></tr>`;
              
              return `
          <div class="month-section">
            <div class="month-title">${escapeHtml(block.label)}</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Full Name</th>
                  <th>Phone</th>
                  <th>Room</th>
                  <th>Move In</th>
                  <th>Move Out</th>
                  <th>Dues</th>
                </tr>
              </thead>
              <tbody>
                ${inner}
              </tbody>
            </table>
          </div>
        `;
            })
            .join("");
          
          body = `
      <h3>Month-wise Move Out Report</h3>
      <p style="color:#64748b">From current month back through April (calendar).</p>
      ${sections || "<p>No move-out records found.</p>"}
    `;
        }
        break;
      case "Old Tenant Report":
        {
          const oldRows = detailedOldRows
            .map(
              (r) => `<tr>
                <td>${r.num}</td>
                <td>${escapeHtml(r.fullName)}</td>
                <td>${escapeHtml(r.phone)}</td>
                <td>${escapeHtml(r.dob)}</td>
                <td>${escapeHtml(r.email)}</td>
                <td style="font-weight:700">${escapeHtml(r.aadhaarLast4 || "—")}</td>
                <td>${escapeHtml(r.address)}</td>
                <td>${escapeHtml(r.emergencyName)} / ${escapeHtml(r.emergencyPhone)}</td>
                <td>${escapeHtml(r.room)}</td>
                <td>${escapeHtml(r.moveIn)}</td>
                <td>${escapeHtml(r.moveOut)}</td>
              </tr>`
            )
            .join("");
          body = `<h1 style="font-size:22px;margin-bottom:8px">Old Tenant Report</h1>
          <p><strong>Property:</strong> ${escapeHtml(propertyName)}</p>
          <p><strong>Total old tenants listed:</strong> ${detailedOldRows.length}</p>
          ${
            detailedOldRows.length
              ? `<table><thead><tr><th>#</th><th>Full Name</th><th>Phone</th><th>DOB</th><th>Email</th><th>Aadhaar (last 4)</th><th>Address</th><th>Emergency Name / Contact</th><th>Room</th><th>Move In</th><th>Move Out</th></tr></thead><tbody>${oldRows}</tbody></table>`
              : `<p>No old tenant records (completed move-outs) for this property.</p>`
          }
          <p style="margin-top:12px;font-size:11px;color:#64748b">Move-out P/L (analytics): ₹${moveOutPL.toLocaleString()}</p>`;
        }
        break;
      case "Advanced Transaction Report":
        body = `<h3>Transaction Summary</h3><table style="border-collapse:collapse"><tbody>${rows("Online", "₹" + (transactionTotals.online ?? 0).toLocaleString())}${rows("Cash", "₹" + (transactionTotals.cash ?? 0).toLocaleString())}${rows("Total", "₹" + (transactionTotals.total ?? 0).toLocaleString())}</tbody></table>`;
        break;
      case "Transaction Report": {
        const ref = new Date();
        const scopedKeys = filterCtx ? getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref) : [];
        const keySet = filterCtx && scopedKeys.length ? new Set(scopedKeys) : null;
        
        // Debug logging
        console.log('[TransactionReport] allTransactionRows count:', allTransactionRows.length);
        console.log('[TransactionReport] Filter context:', filterCtx);
        console.log('[TransactionReport] Scoped keys:', scopedKeys);
        
        // Extract all payment items from ALL tenants (including completed bookings)
        const allPayments = allTransactionRows.flatMap((r) =>
          (r.payments || []).map((p) => ({
            tenant: r.fullName,
            phone: r.phone,
            room: r.room,
            amount: p.amount,
            date: p.date,
            type: p.type,
            label: p.label,
            monthKey: (p as any).monthKey || null, // Use the monthKey stored in the payment object
          }))
        );
        
        console.log('[TransactionReport] All payments count:', allPayments.length);
        console.log('[TransactionReport] Sample payments:', allPayments.slice(0, 3));
        
        // Filter by payment month if a specific period is selected
        const items = keySet
          ? allPayments.filter((p) => p.monthKey && keySet.has(p.monthKey))
          : allPayments;
        
        console.log('[TransactionReport] Filtered items count:', items.length);
        console.log('[TransactionReport] Sample filtered items:', items.slice(0, 3));
        
        const filteredItems = items.filter((x) => (Number(x.amount) || 0) > 0);
        
        const rowsHtml =
          filteredItems.length > 0
            ? filteredItems
                .map(
                  (t, i) => `<tr>
                    <td>${i + 1}</td>
                    <td>${escapeHtml(t.tenant)}</td>
                    <td>${escapeHtml(t.phone)}</td>
                    <td>${escapeHtml(t.room)}</td>
                    <td style="text-align:right">₹${Number(t.amount).toLocaleString()}</td>
                    <td>${escapeHtml(t.date)}</td>
                    <td>${escapeHtml(t.type)}</td>
                  </tr>`
                )
                .join("")
            : "";
        const scopeNote = keySet
          ? `<p style="font-size:11px;color:#64748b">Rows are limited to payments made in the selected period.</p>`
          : "";
        body = `<h3>Transaction Report</h3>
          <p>Details of payment received (Cashfree online + cash).</p>
          ${scopeNote}
          ${
            filteredItems.length
              ? `<table><thead><tr><th>#</th><th>Tenant Name</th><th>Phone</th><th>Room</th><th>Amount</th><th>Date</th><th>Type</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
              : `<p>No transactions in the selected period.</p>`
          }`;
      }
        break;
      case "Monthly Collection Report": {
        const ref = new Date();
        const bk = reportSource?.bookings ?? [];
        const months =
          filterCtx && getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref).length
            ? getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref).map((k) => ({
                m: monthKeyToShortLabel(k),
                v: collectionsForMonthKeyFromBookings(bk, k),
              }))
            : [
                { m: currentMonthName, v: totalInflowCollections(financialData[currentMonthName]) },
                {
                  m: MONTHS[(currentMonthIdx - 1 + 12) % 12],
                  v: totalInflowCollections(financialData[MONTHS[(currentMonthIdx - 1 + 12) % 12]]),
                },
                {
                  m: MONTHS[(currentMonthIdx - 2 + 12) % 12],
                  v: totalInflowCollections(financialData[MONTHS[(currentMonthIdx - 2 + 12) % 12]]),
                },
              ];
        const total = months.reduce((s, x) => s + (Number(x.v) || 0), 0);
        const html = months
          .map(
            (x) =>
              `<tr><td>${escapeHtml(x.m)}</td><td style="text-align:right">₹${Number(x.v).toLocaleString()}</td></tr>`
          )
          .join("");
        body = `<h3>Monthly Collection Report</h3>
          <table><thead><tr><th>Month</th><th>Amount</th></tr></thead><tbody>${html}</tbody></table>
          <p style="margin-top:10px"><strong>Total:</strong> ₹${total.toLocaleString()}</p>`;
      }
        break;
      case "Monthly Expenses Report": {
        const ref = new Date();
        const snap = reportsSnapshotMonthKey;
        let section1 = "";
        let section2 = "";
        if (filterCtx && getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref).length) {
          const mks = getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref);
          section1 = mks
            .map((k, i) => {
              const { total } = expenseTotalAndCategoriesForMonth(
                reportsExpensesRaw,
                reportsMonthlyStaff,
                k,
                snap
              );
              return `<tr><td>${i + 1}</td><td>${escapeHtml(monthKeyToShortLabel(k))}</td><td style="text-align:right">₹${Number(
                total
              ).toLocaleString()}</td></tr>`;
            })
            .join("");
          let rowNum = 0;
          section2 = mks
            .map((k) => {
              const { cats } = expenseTotalAndCategoriesForMonth(
                reportsExpensesRaw,
                reportsMonthlyStaff,
                k,
                snap
              );
              const label = monthKeyToShortLabel(k);
              if (!cats.length) {
                return `<tr><td colspan="4" style="color:#94a3b8">${escapeHtml(label)} — No expense records</td></tr>`;
              }
              return cats
                .map((c) => {
                  rowNum += 1;
                  return `<tr><td>${rowNum}</td><td>${escapeHtml(label)}</td><td>${escapeHtml(
                    c.name
                  )}</td><td style="text-align:right">₹${Number(c.amount).toLocaleString()}</td></tr>`;
                })
                .join("");
            })
            .join("");
        } else {
          const m0 = currentMonthName;
          const m1 = MONTHS[(currentMonthIdx - 1 + 12) % 12];
          const m2 = MONTHS[(currentMonthIdx - 2 + 12) % 12];
          const totals = [
            { month: m0, total: financialData[m0]?.expense ?? 0 },
            { month: m1, total: financialData[m1]?.expense ?? 0 },
            { month: m2, total: financialData[m2]?.expense ?? 0 },
          ];
          section1 = totals
            .map(
              (x, i) =>
                `<tr><td>${i + 1}</td><td>${escapeHtml(x.month)}</td><td style="text-align:right">₹${Number(
                  x.total
                ).toLocaleString()}</td></tr>`
            )
            .join("");
          const catRows = (monthLabel: string) => {
            const cats = processedExpenseSlices.report[monthLabel] ?? [];
            if (!cats.length) return `<tr><td colspan="4" style="color:#94a3b8">No category data</td></tr>`;
            return cats
              .map(
                (c, idx) =>
                  `<tr><td>${idx + 1}</td><td>${escapeHtml(monthLabel)}</td><td>${escapeHtml(
                    c.name
                  )}</td><td style="text-align:right">₹${Number(c.amount).toLocaleString()}</td></tr>`
              )
              .join("");
          };
          section2 = `${catRows(m0)}${catRows(m1)}${catRows(m2)}`;
        }
        body = `<h3>Monthly Expenses Report</h3>
          <h4>Section 1 — Total expense (month)</h4>
          <table><thead><tr><th>#</th><th>Month</th><th>Total Expense</th></tr></thead><tbody>${section1}</tbody></table>
          <h4 style="margin-top:18px">Section 2 — Category wise</h4>
          <table><thead><tr><th>#</th><th>Month</th><th>Category</th><th>Monthly Expense</th></tr></thead><tbody>${section2}</tbody></table>`;
      }
        break;
      case "Monthwise Financial Report": {
        const ref = new Date();
        const bk = reportSource?.bookings ?? [];
        const snap = reportsSnapshotMonthKey;
        let rowsList: string[];
        let totalColl = 0;
        let totalExp = 0;
        let totalPL = 0;
        
        if (filterCtx && getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref).length) {
          const mks = getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref);
          rowsList = mks.map((k, i) => {
            const coll = collectionsForMonthKeyFromBookings(bk, k);
            const { total: exp } = expenseTotalAndCategoriesForMonth(
              reportsExpensesRaw,
              reportsMonthlyStaff,
              k,
              snap
            );
            const pl = Math.round(coll - exp);
            totalColl += coll;
            totalExp += exp;
            totalPL += pl;
            const label = monthKeyToShortLabel(k);
            const plColor = pl >= 0 ? '#16a34a' : '#dc2626';
            return `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(label)}</td>
              <td style="text-align:right">₹${Number(coll).toLocaleString()}</td>
              <td style="text-align:right">₹${Number(exp).toLocaleString()}</td>
              <td style="text-align:right;color:${plColor};font-weight:600">${pl >= 0 ? "₹" : "-₹"}${Math.abs(pl).toLocaleString()}</td>
            </tr>`;
          });
        } else {
          const m0 = currentMonthName;
          const m1 = MONTHS[(currentMonthIdx - 1 + 12) % 12];
          const m2 = MONTHS[(currentMonthIdx - 2 + 12) % 12];
          rowsList = [m0, m1, m2].map((m, i) => {
            const d = financialData[m] || {
              collections: 0,
              securityDeposits: 0,
              expense: 0,
              profitLoss: 0,
            };
            const coll = totalInflowCollections(d);
            const exp = Number(d.expense || 0);
            const rentOnly = Number(d.collections || 0);
            const pl = Math.round(rentOnly - exp);
            totalColl += coll;
            totalExp += exp;
            totalPL += pl;
            const plColor = pl >= 0 ? '#16a34a' : '#dc2626';
            return `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(m)}</td>
              <td style="text-align:right">₹${coll.toLocaleString()}</td>
              <td style="text-align:right">₹${exp.toLocaleString()}</td>
              <td style="text-align:right;color:${plColor};font-weight:600">${pl >= 0 ? "₹" : "-₹"}${Math.abs(pl).toLocaleString()}</td>
            </tr>`;
          });
        }
        
        const totalPLColor = totalPL >= 0 ? '#16a34a' : '#dc2626';
        const totalRow = `<tr style="background:#f8fafc;font-weight:700;border-top:2px solid #1E33FF">
          <td colspan="2" style="text-align:right">Total</td>
          <td style="text-align:right">₹${totalColl.toLocaleString()}</td>
          <td style="text-align:right">₹${totalExp.toLocaleString()}</td>
          <td style="text-align:right;color:${totalPLColor}">${totalPL >= 0 ? "₹" : "-₹"}${Math.abs(totalPL).toLocaleString()}</td>
        </tr>`;
        
        body = `<h3>Monthwise Financial Report</h3>
          <p>Compare month on month: collected, expenses, profit/loss.</p>
          <table><thead><tr><th>#</th><th>Month</th><th>Collected</th><th>Expense</th><th>Profit/Loss</th></tr></thead><tbody>${rowsList.join("")}${totalRow}</tbody></table>
          <p style="margin-top:12px;font-size:11px;color:#64748b">Collected includes rent and security deposits. Profit/Loss = Rent collected − Expense (refundable deposits excluded from P/L).</p>`;
      }
        break;
      default:
        body = `<h3>${reportName}</h3><p>Period: ${period || currentMonthName}</p><p>Collections: ₹${collections.toLocaleString()} | Expense: ₹${expense.toLocaleString()} | Pending Dues: ₹${pending.toLocaleString()} | P/L: ₹${profit.toLocaleString()}</p>`;
    }
    const periodLine = period ? `<p><strong>Period:</strong> ${period}</p>` : "";
    const logoUri = logoDataUriOverride || myStayLogoDataUri;
    const headerHtml = `
  <div class="header-row">
    <div class="brand">
      ${logoUri ? 
        `<img class="logo" src="${logoUri}" alt="MyStayInn" />` : 
        `<div style="width:40px;height:40px;background-color:#1E33FF;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:bold;">MS</div>
      `}
      <div class="brand-name">MyStayInn</div>
    </div>
    <div class="meta">
      <div class="report-name">${escapeHtml(reportName)}</div>
      ${period ? `<div class="meta-line">Period: ${escapeHtml(period)}</div>` : ""}
      <div class="meta-line">${escapeHtml(propertyDisplay)}</div>
      <div class="meta-line">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
    </div>
  </div>
`;
    // Clean HTML structure for automatic pagination
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(
      reportName
    )}</title><style>
      @page{margin:16px;size:A4;}
      body{font-family:Arial,sans-serif;color:#333;line-height:1.4;margin:0;padding:0}
      .pdf-header{border-bottom:2px solid #1E33FF;padding-bottom:10px;margin-bottom:16px;page-break-after:avoid}
      .header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
      .brand{display:flex;align-items:center;gap:10px}
      .logo{width:40px;height:40px;object-fit:contain}
      .brand-name{font-size:18px;font-weight:800;color:#1E33FF}
      .meta{text-align:right}
      .report-name{font-size:14px;font-weight:800;margin-bottom:4px}
      .meta-line{font-size:10px;color:#64748b;margin-top:2px}
      .pdf-footer{border-top:1px solid #e2e8f0;margin-top:20px;padding-top:8px;text-align:center;font-size:10px;color:#64748b}
      h3,h4{margin:16px 0 12px 0;page-break-after:avoid}
      p{margin:8px 0}
      table{width:100%;border-collapse:collapse;font-size:11px;margin:12px 0;page-break-inside:auto}
      thead{display:table-header-group}
      tbody{display:table-row-group}
      tr{page-break-inside:avoid;page-break-after:auto}
      th{background:#f8fafc;font-weight:700;padding:8px;border:1px solid #ddd;text-align:left}
      td{padding:8px;border:1px solid #ddd;text-align:left;vertical-align:top}
      tr:nth-child(even){background-color:#f9fafb}
      .month-section{margin-bottom:24px}
      .month-title{font-size:16px;font-weight:700;margin:20px 0 12px 0;padding-bottom:6px;border-bottom:2px solid #1E33FF;color:#1E33FF;page-break-after:avoid}
      @media print{body{margin:0;padding:0}table{page-break-inside:auto}tr{page-break-inside:avoid;page-break-after:auto}thead{display:table-header-group}}
    </style></head><body>
      <div class="pdf-header">
        ${headerHtml}
      </div>
      ${periodLine}
      ${body}
      <div class="pdf-footer">Generated by MyStayInn</div>
    </body></html>`;
  }, [
    currentProperty,
    financialData,
    combinedPendingDues,
    moveOutPL,
    transactionTotals,
    currentMonthName,
    currentMonthIdx,
    reportDetails,
    reportSource,
    reportsExpensesRaw,
    reportsMonthlyStaff,
    reportsSnapshotMonthKey,
    processedExpenseSlices,
    myStayLogoDataUri,
  ]);

  /* Plain text version of report for fallback when PDF native module is not available */
  const getReportText = useCallback((
    reportName: string,
    period?: string,
    details: ReportDetailsState = reportDetails,
    filterCtx?: { f1: string; f2: string }
  ): string => {
    const propertyName = currentProperty?.name || currentProperty?.id || "Property";
    const fd = financialData[currentMonthName] ?? financialData[MONTHS[(currentMonthIdx - 1 + 12) % 12]];
    const pending = fd?.pendingDues ?? combinedPendingDues;
    const rentCollections = fd?.collections ?? 0;
    const collections = totalInflowCollections(fd);
    const expense = fd?.expense ?? 0;
    const profit = Math.round(rentCollections - expense);
    const {
      detailedActiveRows,
      detailedOldRows,
      roomsOccupancyBlocks,
      monthwiseMoveOutBlocks,
    } = details;
    const periodLine = period ? `Period: ${period}\n` : "";
    let body = "";
    switch (reportName) {
      case "Tenant with Dues":
        {
          const dueL = detailedActiveRows.filter((r) => r.due > 0).sort((a, b) => b.due - a.due);
          const tot = dueL.reduce((s, r) => s + r.due, 0);
          body = [
            "# | Name | Phone | Room | MoveIn | MoveOut | SecDep | Due",
            ...dueL.map(
              (r, i) =>
                `${i + 1} | ${r.fullName} | ${r.phone} | ${r.room} | ${r.moveIn} | ${r.moveOut} | ₹${r.securityDeposit} | ₹${r.due}`
            ),
            "",
            `TOTAL DUE: ₹${tot.toLocaleString()}`,
          ].join("\n");
        }
        break;
      case "Tenant Details":
        body = [
          `Total: ${detailedActiveRows.length}`,
          "# | Name | Phone | DOB | Email | Aadhaar last4 | Address | Emergency | Room | In | Out",
          ...detailedActiveRows.map(
            (r) =>
              `${r.num} | ${r.fullName} | ${r.phone} | ${r.dob} | ${r.email} | ${r.aadhaarLast4} | ${r.address} | ${r.emergencyName}/${r.emergencyPhone} | ${r.room} | ${r.moveIn} | ${r.moveOut}`
          ),
          "",
          `Collections ₹${collections} | Expense ₹${expense} | Dues ₹${pending} | P/L ₹${profit}`,
        ].join("\n");
        break;
      case "Tenant KYC Details":
      case "Tenant KYC Status":
      case "Tenant KYC":
        body = [
          "# | Name | Phone | Aadhaar | KYC | Room | In | Out",
          ...detailedActiveRows.map(
            (r) =>
              `${r.num} | ${r.fullName} | ${r.phone} | ${r.aadhaar} | ${r.kycStatus} | ${r.room} | ${r.moveIn} | ${r.moveOut}`
          ),
        ].join("\n");
        break;
      case "Room Occupancy Report":
      case "Room Occupancy":
        body = roomsOccupancyBlocks
          .map(
            (b) =>
              `Room ${b.roomNumber} (${b.roomType})\n` +
              (b.tenants.length
                ? b.tenants
                    .map(
                      (t) =>
                        `  ${t.num} | ${t.name} | ${t.phone} | ${t.moveIn} | ${t.moveOut} | Due ₹${t.due}`
                    )
                    .join("\n")
                : "  (Vacant)")
          )
          .join("\n\n");
        break;
      case "Month-wise Move Out":
      case "Monthwise Move Out":
        body = monthwiseMoveOutBlocks
          .map(
            (blk) =>
              `=== ${blk.label} ===\n` +
              (blk.rows.length
                ? blk.rows
                    .map(
                      (r) =>
                        `${r.num} | ${r.fullName} | ${r.phone} | R${r.room} | In:${r.moveIn} | Out:${r.moveOut} | Dues ₹${r.dues}`
                    )
                    .join("\n")
                : "(none)")
          )
          .join("\n\n");
        break;
      case "Old Tenant Report":
        body = [
          "OLD TENANT REPORT",
          `Count: ${detailedOldRows.length}`,
          ...detailedOldRows.map(
            (r) =>
              `${r.num} | ${r.fullName} | ${r.phone} | ${r.dob} | ${r.email} | ${r.aadhaarLast4 || "—"} | ${r.address} | ${r.emergencyName}/${r.emergencyPhone} | ${r.room} | ${r.moveIn} | ${r.moveOut}`
          ),
          `P/L: ₹${moveOutPL.toLocaleString()}`,
        ].join("\n");
        break;
      case "Current Dues": {
        const ref = new Date();
        const scopedKeys = filterCtx ? getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref) : [];
        const keySet = filterCtx && scopedKeys.length ? new Set(scopedKeys) : null;
        let dueL = detailedActiveRows.filter((r) => r.due > 0);
        if (keySet) {
          dueL = dueL.filter((r) => !!(r.moveInMonthKey && keySet.has(r.moveInMonthKey)));
        }
        dueL.sort((a, b) => b.due - a.due);
        const tot = dueL.reduce((s, r) => s + r.due, 0);
        body = [
          "# | Name | Phone | Room | MoveIn | MoveOut | SecDep | Due",
          ...dueL.map(
            (r, i) =>
              `${i + 1} | ${r.fullName} | ${r.phone} | ${r.room} | ${r.moveIn} | ${r.moveOut} | ₹${r.securityDeposit} | ₹${r.due}`
          ),
          "",
          dueL.length ? `TOTAL DUE: ₹${tot.toLocaleString()}` : keySet ? "(none in selected period)" : "(none)",
        ].join("\n");
      }
        break;
      case "Transaction Report": {
        const ref = new Date();
        const scopedKeys = filterCtx ? getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref) : [];
        const keySet = filterCtx && scopedKeys.length ? new Set(scopedKeys) : null;
        const rowSource = keySet
          ? detailedActiveRows.filter((r) => r.moveInMonthKey && keySet.has(r.moveInMonthKey))
          : detailedActiveRows;
        const items = rowSource
          .flatMap((r) =>
            (r.payments || []).map((p) => ({
              tenant: r.fullName,
              phone: r.phone,
              room: r.room,
              amount: p.amount,
              date: p.date,
              type: p.type,
            }))
          )
          .filter((x) => (Number(x.amount) || 0) > 0);
        body = [
          "# | Tenant Name | Phone | Room | Amount | Date | Type",
          ...items.map(
            (t, i) =>
              `${i + 1} | ${t.tenant} | ${t.phone} | ${t.room} | ₹${Number(t.amount).toLocaleString()} | ${t.date} | ${t.type}`
          ),
        ].join("\n");
      }
        break;
      case "Monthly Collection Report": {
        const ref = new Date();
        const bk = reportSource?.bookings ?? [];
        const months =
          filterCtx && getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref).length
            ? getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref).map((k) => ({
                month: monthKeyToShortLabel(k),
                amount: collectionsForMonthKeyFromBookings(bk, k),
              }))
            : (() => {
                const m0 = currentMonthName;
                const m1 = MONTHS[(currentMonthIdx - 1 + 12) % 12];
                const m2 = MONTHS[(currentMonthIdx - 2 + 12) % 12];
                return [
                  { month: m0, amount: totalInflowCollections(financialData[m0]) },
                  { month: m1, amount: totalInflowCollections(financialData[m1]) },
                  { month: m2, amount: totalInflowCollections(financialData[m2]) },
                ];
              })();
        body = ["Month | Amount", ...months.map((x) => `${x.month} | ₹${Number(x.amount).toLocaleString()}`)].join("\n");
      }
        break;
      case "Monthly Expenses Report": {
        const ref = new Date();
        const snap = reportsSnapshotMonthKey;
        if (filterCtx && getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref).length) {
          const mks = getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref);
          const sec1 = mks.map((k, i) => {
            const { total } = expenseTotalAndCategoriesForMonth(
              reportsExpensesRaw,
              reportsMonthlyStaff,
              k,
              snap
            );
            return `${i + 1} | ${monthKeyToShortLabel(k)} | ₹${Number(total).toLocaleString()}`;
          });
          let n = 0;
          const sec2: string[] = [];
          mks.forEach((k) => {
            const { cats } = expenseTotalAndCategoriesForMonth(
              reportsExpensesRaw,
              reportsMonthlyStaff,
              k,
              snap
            );
            const label = monthKeyToShortLabel(k);
            cats.forEach((c) => {
              n += 1;
              sec2.push(`${n} | ${label} | ${c.name} | ₹${Number(c.amount).toLocaleString()}`);
            });
          });
          body = [
            "SECTION 1: # | Month | Total Expense",
            ...sec1,
            "",
            "SECTION 2: # | Month | Category | Monthly Expense",
            ...sec2,
          ].join("\n");
        } else {
          const m0 = currentMonthName;
          const m1 = MONTHS[(currentMonthIdx - 1 + 12) % 12];
          const m2 = MONTHS[(currentMonthIdx - 2 + 12) % 12];
          const totals = [
            { month: m0, total: financialData[m0]?.expense ?? 0 },
            { month: m1, total: financialData[m1]?.expense ?? 0 },
            { month: m2, total: financialData[m2]?.expense ?? 0 },
          ];
          const cats = (m: string) =>
            (processedExpenseSlices.report[m] ?? []).map((c) => `${m} | ${c.name} | ₹${Number(c.amount).toLocaleString()}`);
          body = [
            "SECTION 1: # | Month | Total Expense",
            ...totals.map((x, i) => `${i + 1} | ${x.month} | ₹${Number(x.total).toLocaleString()}`),
            "",
            "SECTION 2: # | Month | Category | Monthly Expense",
            ...[...cats(m0), ...cats(m1), ...cats(m2)].map((line, i) => `${i + 1} | ${line}`),
          ].join("\n");
        }
      }
        break;
      case "Monthwise Financial Report": {
        const ref = new Date();
        const bk = reportSource?.bookings ?? [];
        const snap = reportsSnapshotMonthKey;
        let months: { month: string; collected: number; expense: number; profit: number }[];
        if (filterCtx && getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref).length) {
          const mks = getReportFilterMonthKeys(filterCtx.f1, filterCtx.f2, ref);
          months = mks.map((k) => {
            const coll = collectionsForMonthKeyFromBookings(bk, k);
            const { total: exp } = expenseTotalAndCategoriesForMonth(
              reportsExpensesRaw,
              reportsMonthlyStaff,
              k,
              snap
            );
            return { month: monthKeyToShortLabel(k), collected: coll, expense: exp, profit: Math.round(coll - exp) };
          });
        } else {
          const m0 = currentMonthName;
          const m1 = MONTHS[(currentMonthIdx - 1 + 12) % 12];
          const m2 = MONTHS[(currentMonthIdx - 2 + 12) % 12];
          months = [m0, m1, m2].map((m) => {
            const d = financialData[m] || {
              collections: 0,
              securityDeposits: 0,
              expense: 0,
              profitLoss: 0,
            };
            return {
              month: m,
              collected: totalInflowCollections(d),
              expense: d.expense || 0,
              profit: Math.round(Number(d.collections || 0) - Number(d.expense || 0)),
            };
          });
        }
        const totalColl = months.reduce((sum, x) => sum + x.collected, 0);
        const totalExp = months.reduce((sum, x) => sum + x.expense, 0);
        const totalPL = months.reduce((sum, x) => sum + x.profit, 0);
        
        body = [
          "# | Month | Collected | Expense | Profit/Loss",
          "--|-------|-----------|---------|------------",
          ...months.map(
            (x, i) =>
              `${i + 1} | ${x.month} | ₹${Number(x.collected).toLocaleString()} | ₹${Number(x.expense).toLocaleString()} | ${x.profit >= 0 ? '₹' : '-₹'}${Math.abs(x.profit).toLocaleString()}`
          ),
          "--|-------|-----------|---------|------------",
          `Total | | ₹${totalColl.toLocaleString()} | ₹${totalExp.toLocaleString()} | ${totalPL >= 0 ? '₹' : '-₹'}${Math.abs(totalPL).toLocaleString()}`,
        ].join("\n");
      }
        break;
      default:
        body = `Collections: ₹${collections.toLocaleString()} | Expense: ₹${expense.toLocaleString()} | Pending: ₹${pending.toLocaleString()} | P/L: ₹${profit.toLocaleString()}`;
    }
    return `${reportName}${period ? ` (${period})` : ""}\nProperty: ${propertyName}\nGenerated: ${new Date().toLocaleString()}\n\n${periodLine}${body}`;
  }, [
    currentProperty,
    financialData,
    combinedPendingDues,
    moveOutPL,
    transactionTotals,
    currentMonthName,
    currentMonthIdx,
    reportDetails,
    reportSource,
    reportsExpensesRaw,
    reportsMonthlyStaff,
    reportsSnapshotMonthKey,
    processedExpenseSlices,
  ]);

  /* Build a safe PDF filename from report name and period */
  const getPdfFilename = useCallback((reportName: string, period?: string): string => {
    const base = `${reportName}${period ? ` (${period})` : ""}`.replace(/[/\\?*:|"]/g, "_").replace(/\s+/g, "_").trim() || "Report";
    return `${base}.pdf`;
  }, []);

  const offerShareAsTextFallback = useCallback(
    async (reportName: string, period?: string, filterCtx?: { f1: string; f2: string }) => {
      const details = await ensureDetailedReportsLoaded();
      const text = getReportText(reportName, period, details, filterCtx);
      const title = period ? `${reportName} (${period})` : reportName;
      Share.share({ message: text, title }).catch(() => {});
    },
    [ensureDetailedReportsLoaded, getReportText]
  );

/* Generate PDF, save with proper filename, then offer share (Save to device / Files) */
/* Generate PDF, save with proper filename, then offer share (Save to device / Files) */
/* Generate PDF with better error handling and fallbacks */
/* Generate PDF with better error handling and fallbacks */
const generateAndSharePdf = useCallback(async (reportName: string, period?: string, filterCtx?: { f1: string; f2: string }) => {
  if (pdfGenerating) {
    Alert.alert("Please wait", "PDF generation is already in progress");
    return;
  }
  
  setPdfGenerating(true);
  
  // Show loading indicator
  const loadingAlert = setTimeout(() => {
    Alert.alert("Generating PDF", "Please wait while we create your PDF...", [{ text: "OK" }], { cancelable: false });
  }, 500);
  
  try {
    console.log(`[PDF] Starting generation for: ${reportName}`);
    
    // Load details with timeout
    const details = await Promise.race([
      ensureDetailedReportsLoaded(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Loading tenant data timed out')), 30000))
    ]);
    
    console.log('[PDF] Details loaded successfully');
    
    // Try to load logo, but continue without it if fails
    let logoUri = '';
    try {
      logoUri = await getMyStayLogoDataUri();
      if (logoUri) {
        console.log('[PDF] Logo loaded successfully');
      } else {
        console.log('[PDF] Logo not available, using text fallback');
      }
    } catch (logoError) {
      console.warn('[PDF] Logo loading failed, continuing without logo:', logoError);
    }
    
    // Check if print is available
    if (typeof Print?.printToFileAsync !== "function") {
      clearTimeout(loadingAlert);
      Alert.alert(
        "PDF not available",
        "PDF export is not available. Share as text instead?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Share as text", onPress: () => { void offerShareAsTextFallback(reportName, period, filterCtx); } },
        ]
      );
      return;
    }
    
    // Generate HTML with timeout
    console.log('[PDF] Generating HTML...');
    const html = buildReportHtml(reportName, period, details, filterCtx, logoUri);
    
    if (!html || html.length < 100) {
      throw new Error(`Generated HTML is too short (${html?.length || 0} chars)`);
    }
    
    console.log('[PDF] HTML generated, length:', html.length);
    
    // Create PDF
    console.log('[PDF] Creating PDF file...');
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false,
    });
    
    if (!uri) {
      throw new Error('No PDF URI returned');
    }
    
    console.log('[PDF] PDF created at:', uri);
    
    const filename = getPdfFilename(reportName, period);
    const destinationUri = `${FileSystemLegacy.documentDirectory}${filename}`;
    
    console.log('[PDF] Moving file to:', destinationUri);
    
    // Check if source exists using FileSystem
    const sourceInfo = await FileSystemLegacy.getInfoAsync(uri);
    if (!sourceInfo.exists) {
      throw new Error('Source PDF file does not exist');
    }
    
    // Delete existing file if needed
    const destInfo = await FileSystemLegacy.getInfoAsync(destinationUri);
    if (destInfo.exists) {
      console.log('[PDF] Deleting existing file');
      await FileSystemLegacy.deleteAsync(destinationUri);
    }
    
    // Copy file
    await FileSystemLegacy.copyAsync({
      from: uri,
      to: destinationUri
    });
    console.log('[PDF] File copied to:', destinationUri);
    
    // Verify copy
    const verifyInfo = await FileSystemLegacy.getInfoAsync(destinationUri);
    if (!verifyInfo.exists) {
      throw new Error('Failed to copy PDF file');
    }
    
    clearTimeout(loadingAlert);
    
    // Share or save
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      console.log('[PDF] Sharing PDF...');
      await Sharing.shareAsync(destinationUri, { 
        mimeType: "application/pdf",
        dialogTitle: reportName,
      });
      console.log('[PDF] Share completed');
    } else {
      Alert.alert("Success", `PDF saved as ${filename}`);
    }
    
  } catch (error: any) {
    clearTimeout(loadingAlert);
    console.error("[PDF] Error details:", error?.message || error);
    
    let errorMessage = "Failed to generate PDF";
    let showRetry = true;
    
    if (error?.message?.includes('timeout')) {
      errorMessage = "PDF generation timed out. The report may contain too much data. Try generating a filtered report with a smaller date range.";
      showRetry = false;
    } else if (error?.message?.includes('permission')) {
      errorMessage = "Storage permission required to save PDF. Please check app permissions.";
      showRetry = false;
    } else if (error?.message?.includes('memory')) {
      errorMessage = "Not enough memory to generate this report. Try reducing the date range.";
      showRetry = false;
    } else if (error?.message?.includes('html')) {
      errorMessage = "Failed to generate report content. Try generating a smaller report.";
    } else {
      errorMessage = error?.message || "Unknown error occurred";
    }
    
    Alert.alert(
      "PDF Generation Failed",
      errorMessage,
      [
        { text: "OK" },
        { text: "Share as Text", onPress: () => offerShareAsTextFallback(reportName, period, filterCtx) },
        ...(showRetry ? [{ text: "Retry", onPress: () => generateAndSharePdf(reportName, period, filterCtx) }] : [])
      ]
    );
  } finally {
    setPdfGenerating(false);
    console.log('[PDF] Generation completed');
  }
}, [buildReportHtml, ensureDetailedReportsLoaded, getPdfFilename, offerShareAsTextFallback, pdfGenerating]);/* Subscription Guard & Downloader */
const handleDownload = (reportName: string) => {
  generateAndSharePdf(reportName);
};
/* ===== END OF MISSING FUNCTION ===== */


  /* Filtered Reports Downloader */
  const handleFilteredDownload = (reportName: string) => {
    const period = reportFilter2;
    generateAndSharePdf(reportName, period, { f1: reportFilter1, f2: reportFilter2 });
  };

  /* -------------------- UI COMPONENTS -------------------- */

  const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <View className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
      <View 
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </View>
  );

  const OccupancyItem = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => (
    <View className="mb-4">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</Text>
        <Text className="text-xs font-bold text-slate-700">
          {value} <Text className="text-slate-400">/ {total}</Text>
        </Text>
      </View>
      <ProgressBar value={value} max={total} color={color} />
    </View>
  );

  // Pie chart: uses row totals from `data` (not outer totalExpense) so slices always match and NaN is avoided
  // Pie chart with proper SVG rendering
// Simple and reliable Pie Chart component
// Alternative: Simple donut chart (more reliable)
const SimpleDonutChart = ({ data, size = 200 }) => {
  const chartData = (data || [])
    .map((item, index) => ({
      value: Number(item.amount) || 0,
      color: item.color || CHART_COLORS[index % CHART_COLORS.length],
      name: item.name
    }))
    .filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (!chartData.length || total === 0) {
    return (
      <View style={{ 
        width: size, 
        height: size, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: size / 2
      }}>
        <Text style={{ color: '#64748b' }}>No data</Text>
      </View>
    );
  }

  // Use circle segments instead of complex paths
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const segments = [];

  chartData.forEach((item, index) => {
    const percent = item.value / total;
    const strokeDasharray = `${circumference * percent} ${circumference}`;
    const rotation = cumulativePercent * 360;
    
    segments.push(
      <Circle
        key={index}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={item.color}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={0}
        rotation={rotation}
        origin={`${center}, ${center}`}
      />
    );
    
    cumulativePercent += percent;
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Data circles */}
        {segments}
      </Svg>
      <View style={{ 
        position: 'absolute', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>
          ₹{total.toLocaleString()}
        </Text>
        <Text style={{ fontSize: 10, color: '#64748b' }}>Total</Text>
      </View>
    </View>
  );
};

  return (
    <SafeAreaView className="flex-1 bg-[#F6F8FF]">
      {pdfGenerating && (
        <View className="absolute inset-0 z-50 bg-black/50 justify-center items-center">
          <View className="bg-white rounded-2xl p-6 items-center">
            <ActivityIndicator size="large" color="#1E33FF" />
            <Text className="mt-3 font-semibold text-slate-800">Generating PDF...</Text>
          </View>
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* ---------------- HEADER ---------------- */}
        <View className="bg-white px-5 py-4 flex-row justify-between items-center shadow-sm">
          <Text className="text-[20px] font-black text-[#0A1A3F]">Reports Hub</Text>
          {syncingTenantReports ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#1E33FF" />
              <Text className="text-xs text-slate-500 max-w-[140px]" numberOfLines={2}>
                Tenant PDF data…
              </Text>
            </View>
          ) : null}
        </View>

        {/* ---------------- FINANCIAL REPORT CARD ---------------- */}
        <View className="m-5 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-black text-slate-900 flex-1 mr-3">Financial Report</Text>
            
            <CustomDropdown
              options={[
                "Combined",
                currentMonthName,
                MONTHS[(currentMonthIdx - 1 + 12) % 12],
                MONTHS[(currentMonthIdx - 2 + 12) % 12]
              ]}
              selectedValue={financialView}
              onSelect={setFinancialView}
              containerStyle="min-w-[120px]"
              minWidth={80}
            />
          </View>

          {financialView === "Combined" ? (
            /* COMBINED VIEW - 3 MONTHS BAR GRAPHS */
            <View>
              <Text className="text-slate-500 text-[10px] font-bold mb-6 uppercase tracking-widest">
                Last 3 Months Financial Report
              </Text>
              
              {/* Collections Bar Graph */}
              <View className="mb-6">
                <Text className="text-slate-700 font-bold mb-3">Collections</Text>
                <Text className="text-slate-500 text-[10px] mb-2">Rent + security deposits collected in each month</Text>
                <View className="bg-slate-50 rounded-2xl p-4">
                  {financialMonths.map((month, idx) => {
                    const totalIn = totalInflowCollections(month.data);
                    return (
                    <View key={idx} className="mb-3">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-600 text-sm font-medium">{month.name}</Text>
                        <Text className="text-slate-900 font-bold">₹{totalIn.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={totalIn} max={90000} color="bg-emerald-500" />
                    </View>
                    );
                  })}
                </View>
              </View>

              {/* Expense Bar Graph */}
              <View className="mb-6">
                <Text className="text-slate-700 font-bold mb-3">Expense</Text>
                <View className="bg-slate-50 rounded-2xl p-4">
                  {financialMonths.map((month, idx) => (
                    <View key={idx} className="mb-3">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-600 text-sm font-medium">{month.name}</Text>
                        <Text className="text-slate-900 font-bold">₹{(month.data?.expense ?? 0).toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={month.data?.expense ?? 0} max={50000} color="bg-rose-500" />
                    </View>
                  ))}
                </View>
              </View>

              {/* Combined Pending Dues - Single Bar */}
              <View className="mb-6">
                <Text className="text-slate-700 font-bold mb-3">Pending Dues (Combined)</Text>
                <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-amber-700 font-medium">Total Dues (3 Months)</Text>
                    <Text className="text-amber-900 text-xl font-black">₹{combinedPendingDues.toLocaleString()}</Text>
                  </View>
                  <ProgressBar value={combinedPendingDues} max={100000} color="bg-amber-500" />
                  {/* <Text className="text-amber-600 text-xs mt-1">
                    Combined dues from {MONTHS[(currentMonthIdx - 2 + 12) % 12]}, {MONTHS[(currentMonthIdx - 1 + 12) % 12]}, {currentMonthName}
                  </Text> */}
                </View>
              </View>

              {/* Profit/Loss Bar Graph */}
              <View className="mb-4">
                <Text className="text-slate-700 font-bold mb-3">Profit / Loss</Text>
                <Text className="text-slate-500 text-[10px] mb-2">Rent collected − expense (security deposits excluded)</Text>
                <View className="bg-slate-50 rounded-2xl p-4">
                  {financialMonths.map((month, idx) => {
                    const pl = Math.round((month.data?.collections ?? 0) - (month.data?.expense ?? 0));
                    return (
                    <View key={idx} className="mb-3">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-600 text-sm font-medium">{month.name}</Text>
                        <Text className="text-slate-900 font-bold">₹{pl.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={pl} max={45000} color="bg-blue-500" />
                    </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            /* SINGLE MONTH VIEW */
            <View>
              <Text className="text-slate-500 text-[10px] font-bold mb-4 uppercase tracking-widest">
                {financialView} Financial Report
              </Text>
              
              {(() => {
                const currentData = financialData[financialView] || financialData[currentMonthName] || {
                  collections: 0,
                  securityDeposits: 0,
                  expense: 0,
                  pendingDues: 0,
                  profitLoss: 0,
                };
                const rentCol = currentData.collections ?? 0;
                const secCol = currentData.securityDeposits ?? 0;
                const totalIn = totalInflowCollections(currentData);
                const currentProfit = Math.round(rentCol - (currentData.expense ?? 0));
                return (
                  <View className="space-y-4">
                    {/* Collections */}
                    <View className="rounded-2xl p-4 ">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-emerald-700 font-bold">Collections</Text>
                        <Text className="text-emerald-900 text-xl font-black">₹{totalIn.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={totalIn} max={90000} color="bg-emerald-500" />
                      
                    </View>

                    {/* Expense */}
                    <View className=" rounded-2xl p-4 ">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-rose-700 font-bold">Expense</Text>
                        <Text className="text-rose-900 text-xl font-black">₹{currentData.expense.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={currentData.expense} max={50000} color="bg-rose-500" />
                      
                    </View>

                    {/* Pending Dues */}
                    <View className=" rounded-2xl p-4 ">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-amber-700 font-bold">Pending Dues</Text>
                        <Text className="text-amber-900 text-xl font-black">₹{currentData.pendingDues.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={currentData.pendingDues} max={35000} color="bg-amber-500" />
                      
                    </View>

                    {/* Profit/Loss */}
                    <View className=" rounded-2xl p-4">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-blue-700 font-bold">Profit / Loss</Text>
                        <Text className="text-blue-900 text-xl font-black">₹{currentProfit.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={currentProfit} max={45000} color="bg-blue-500" />
                      
                    </View>

                    {/* MoveOut P/L */}
                    {(currentData.moveOutPL ?? 0) > 0 && (
                      <View className=" rounded-2xl p-4" style={{ backgroundColor: '#f0fdf4' }}>
                        <View className="flex-row justify-between items-center mb-2">
                          <Text className="text-green-700 font-bold">MoveOut P/L</Text>
                          <Text className="text-green-900 text-xl font-black">₹{(currentData.moveOutPL || 0).toLocaleString()}</Text>
                        </View>
                        <ProgressBar value={currentData.moveOutPL || 0} max={25000} color="bg-green-500" />
                        <Text className="text-green-600 text-xs mt-1">
                          Financial consideration from completed move-outs
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          
        </View>

        {/* ---------------- EXPENSE REPORT CARD WITH PIE CHART ---------------- */}
        <View className="mx-5 mb-5 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-black text-slate-900 flex-1 mr-3">Month-wise Expense Report</Text>
            
            <CustomDropdown
              options={[
                "Combined",
                currentMonthName,
                MONTHS[(currentMonthIdx - 1 + 12) % 12],
                MONTHS[(currentMonthIdx - 2 + 12) % 12]
              ]}
              selectedValue={expenseReportView}
              onSelect={setExpenseReportView}
              containerStyle="min-w-[100px]"
            />
          </View>

          {/* Summary Stats */}
          <View className="bg-slate-50 rounded-2xl p-4 mb-6">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-slate-600 font-medium">
                Total {expenseReportView === "Combined" ? "Combined (3 Months)" : expenseReportView} Expense
              </Text>
              <Text className="text-2xl font-black text-slate-900">₹{totalExpense.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-500 text-xs">Average per category</Text>
              <Text className="text-slate-700 font-bold">₹{Math.round(totalExpense / (expenseData.length || 1)).toLocaleString()}</Text>
            </View>
          </View>

          {/* Pie Chart Section */}
          <View className="items-center mb-6">
  <SimpleDonutChart data={expenseData} size={200} />
  <Text className="text-slate-400 text-xs mt-2 uppercase tracking-widest">
    {expenseReportView === "Combined" ? "Combined 3 Months" : expenseReportView} Breakdown
  </Text>
</View>


          {/* Enhanced Legend with Trends */}
          <View>
            <Text className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest">Expense Categories</Text>
            <View className="space-y-3">
              {expenseData.map((item, index) => {
                const percentage = (totalExpense ? (item.amount / totalExpense) * 100 : 0).toFixed(1);
                const isHighest = expenseData.length > 0 && item.amount === Math.max(...expenseData.map(d => d.amount));
                return (
                  <View key={index} className="bg-slate-50 rounded-xl p-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1">
                        <View className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color }} />
                        <Text className="text-slate-900 font-bold flex-1">{item.name}</Text>
                        {isHighest && (
                          <View className="bg-red-100 px-2 py-1 rounded-full mr-2">
                            <Text className="text-red-600 text-xs font-bold">Highest</Text>
                          </View>
                        )}
                      </View>
                      <View className="items-end">
                        <Text className="text-slate-900 font-black">₹{item.amount.toLocaleString()}</Text>
                        <Text className="text-slate-500 text-xs">{percentage}%</Text>
                      </View>
                    </View>
                    
                    {/* Progress Bar */}
                    <View className="bg-slate-200 h-2 rounded-full overflow-hidden">
                      <View 
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: item.color,
                          width: `${percentage}%` as any
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

         
        </View>

        {/* ---------------- OCCUPANCY DATA CARD ---------------- */}
        <View className="mx-5 mb-5 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-black text-slate-900 flex-1 mr-3">Occupancy Data</Text>
            
            <CustomDropdown
              options={[
                "Combined",
                currentMonthName,
                MONTHS[(currentMonthIdx - 1 + 12) % 12],
                MONTHS[(currentMonthIdx - 2 + 12) % 12]
              ]}
              selectedValue={occupancyView}
              onSelect={setOccupancyView}
              containerStyle="min-w-[120px]"
              minWidth={150}
            />
          </View>

          {occupancyView === "Combined" ? (
            /* COMBINED VIEW - 3 months side by side */
            <View>
              <Text className="text-slate-500 text-[10px] font-bold mb-4 uppercase tracking-widest">Last 3 Months Comparison</Text>
              
              {/* Month Headers */}
              <View className="flex-row justify-between mb-2">
                {[
                  currentMonthName,
                  MONTHS[(currentMonthIdx - 1 + 12) % 12],
                  MONTHS[(currentMonthIdx - 2 + 12) % 12]
                ].map((month, idx) => (
                  <Text key={idx} className="text-xs font-bold text-slate-900 flex-1 text-center">
                    {month.substring(0, 3)}
                  </Text>
                ))}
              </View>

              {/* Empty Beds Row */}
              <View className="mb-4">
                <Text className="text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-widest">Empty Beds</Text>
                <View className="flex-row gap-2">
                  {[
                    currentMonthName,
                    MONTHS[(currentMonthIdx - 1 + 12) % 12],
                    MONTHS[(currentMonthIdx - 2 + 12) % 12]
                  ].map((month, idx) => {
                    const data = occupancyData[month] ?? { emptyBeds: 0, occupied: 0, moveOuts: 0 };
                    const maxBeds = data.emptyBeds + data.occupied || 1;
                    return (
                      <View key={idx} className="flex-1">
                        <ProgressBar value={data.emptyBeds} max={maxBeds} color="bg-amber-400" />
                        <Text className="text-xs text-center mt-1 font-medium text-slate-700">{data.emptyBeds}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Occupied Row */}
              <View className="mb-4">
                <Text className="text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-widest">Occupied</Text>
                <View className="flex-row gap-2">
                  {[
                    currentMonthName,
                    MONTHS[(currentMonthIdx - 1 + 12) % 12],
                    MONTHS[(currentMonthIdx - 2 + 12) % 12]
                  ].map((month, idx) => {
                    const data = occupancyData[month] ?? { emptyBeds: 0, occupied: 0, moveOuts: 0 };
                    const maxBeds = data.emptyBeds + data.occupied || 1;
                    return (
                      <View key={idx} className="flex-1">
                        <ProgressBar value={data.occupied} max={maxBeds} color="bg-emerald-400" />
                        <Text className="text-xs text-center mt-1 font-medium text-slate-700">{data.occupied}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Move-outs Row */}
              <View className="mb-4">
                <Text className="text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-widest">Move-outs</Text>
                <View className="flex-row gap-2">
                  {[
                    currentMonthName,
                    MONTHS[(currentMonthIdx - 1 + 12) % 12],
                    MONTHS[(currentMonthIdx - 2 + 12) % 12]
                  ].map((month, idx) => {
                    const data = occupancyData[month] ?? { emptyBeds: 0, occupied: 0, moveOuts: 0 };
                    const maxMoveOuts = Math.max(10, data.moveOuts);
                    return (
                      <View key={idx} className="flex-1">
                        <ProgressBar value={data.moveOuts} max={maxMoveOuts} color="bg-rose-400" />
                        <Text className="text-xs text-center mt-1 font-medium text-slate-700">{data.moveOuts}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            /* SINGLE MONTH VIEW */
            <View>
              <Text className="text-slate-500 text-[10px] font-bold mb-4 uppercase tracking-widest">
                {occupancyView} Occupancy
              </Text>
              
              {(() => {
                const currentData = occupancyData[occupancyView] ?? occupancyData[currentMonthName] ?? { emptyBeds: 0, occupied: 0, moveOuts: 0 };
                const totalBeds = currentData.emptyBeds + currentData.occupied || 1;
                return (
                  <>
                    <OccupancyItem 
                      label="Empty Beds" 
                      value={currentData.emptyBeds} 
                      total={totalBeds} 
                      color="bg-amber-500" 
                    />
                    
                    <OccupancyItem 
                      label="Occupied" 
                      value={currentData.occupied} 
                      total={totalBeds} 
                      color="bg-emerald-500" 
                    />
                    
                    <OccupancyItem 
                      label="Move-outs" 
                      value={currentData.moveOuts} 
                      total={Math.max(10, currentData.moveOuts)} 
                      color="bg-rose-500" 
                    />
                  </>
                );
              })()}
            </View>
          )}
        </View>

        {/* ---------------- TRANSACTION REPORT CARD ---------------- */}
        <View className="mx-5 mb-5 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-black text-slate-900 flex-1 mr-3">Transaction Report</Text>
            
            <CustomDropdown
              options={[
                "Combined",
                currentMonthName,
                MONTHS[(currentMonthIdx - 1 + 12) % 12],
                MONTHS[(currentMonthIdx - 2 + 12) % 12]
              ]}
              selectedValue={transactionView}
              onSelect={setTransactionView}
              containerStyle="min-w-[100px]"
            />
          </View>

          <Text className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest">Payment Methods</Text>
          
          {/* Online Payment */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-slate-700 font-medium">Online (Cashfree)</Text>
              </View>
              <Text className="font-bold text-slate-900">₹{currentTransactionData.online.toLocaleString()}</Text>
            </View>
            <ProgressBar 
              value={currentTransactionData.online} 
              max={Math.max(currentTransactionData.total, 1)} 
              color="bg-emerald-500" 
            />
          </View>

          {/* Cash Payment */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                <Text className="text-slate-700 font-medium">Cash</Text>
              </View>
              <Text className="font-bold text-slate-900">₹{currentTransactionData.cash.toLocaleString()}</Text>
            </View>
            <ProgressBar 
              value={currentTransactionData.cash} 
              max={Math.max(currentTransactionData.total, 1)} 
              color="bg-amber-500" 
            />
          </View>

          {/* Total Transaction */}
          <View className="mt-6 pt-4 border-t border-slate-100 flex-row justify-between items-center">
            <Text className="text-slate-900 font-bold">Total Transactions</Text>
            <Text className="text-lg font-black text-emerald-600">
              ₹{currentTransactionData.total.toLocaleString()}
            </Text>
          </View>

         
        </View>


        {/* ---------------- DOWNLOADABLE PDF REPORTS ---------------- */}
        <View className="mx-5 mt-4 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 mb-4">
          <Text className="text-slate-800 font-bold mb-3 ml-1">Downloadable PDF Reports</Text>
          <PDFLink title="Tenant with Dues" desc="Pending dues with red highlighted amounts" onPress={() => handleDownload("Tenant with Dues")} />
          <PDFLink title="Tenant Details" desc="Complete tenant master data" onPress={() => handleDownload("Tenant Details")} />
          <PDFLink title="Tenant KYC Details" desc="#, name, phone, Aadhaar, KYC status, room, dates" onPress={() => handleDownload("Tenant KYC Details")} />
          <PDFLink title="Room Occupancy Report" desc="Room type + tenants (#, name, phone, dates, due)" onPress={() => handleDownload("Room Occupancy Report")} />
          <PDFLink title="Month-wise Move Out" desc="Move-outs from current month backward" onPress={() => handleDownload("Month-wise Move Out")} />
          <PDFLink title="Old Tenant Report" desc="Historical tenant data and records" onPress={() => handleDownload("Old Tenant Report")} />
        </View>

        {/* ---------------- FILTERED PDF REPORTS BLOCK ---------------- */}
        <View className="mx-5 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 mb-16">
          <Text className="text-slate-800 font-bold mb-3 ml-1">Other Reports</Text>
          
          {/* Dropdown Filters */}
          <View className="bg-slate-50 p-4 rounded-2xl mb-4">
            <Text className="text-slate-400 font-bold uppercase text-[10px] mb-3 ml-1">Report Filters</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <CustomDropdown
                  options={["Monthly", "Quarterly", "Yearly"]}
                  selectedValue={reportFilter1}
                  onSelect={setReportFilter1}
                  containerStyle="w-full"
                  minWidth={120}
                />
              </View>

              <View className="flex-1">
                <CustomDropdown
                  options={
                    reportFilter1 === "Monthly" 
                      ? MONTHS
                      : reportFilter1 === "Quarterly"
                      ? ["Apr-Jun", "Jul-Sep", "Oct-Dec", "Jan-Mar"]
                      : ["2024-25", "2023-24", "2022-23"]
                  }
                  selectedValue={reportFilter2}
                  onSelect={setReportFilter2}
                  containerStyle="w-full"
                  minWidth={120}
                />
              </View>
            </View>
          </View>

          {/* Filtered PDF Reports */}
          <FilteredPDFLink 
            title="Transaction Report" 
            desc={`${reportFilter2} transaction analysis`}
            onPress={() => handleFilteredDownload("Transaction Report")} 
          />
          <FilteredPDFLink 
            title="Monthly Collection Report" 
            desc={`${reportFilter2} collection summary`}
            onPress={() => handleFilteredDownload("Monthly Collection Report")} 
          />
          <FilteredPDFLink 
            title="Monthly Expenses Report" 
            desc={`${reportFilter2} expense breakdown`}
            onPress={() => handleFilteredDownload("Monthly Expenses Report")} 
          />
          <FilteredPDFLink 
            title="Monthwise Financial Report" 
            desc={`${reportFilter2} financial overview`}
            onPress={() => handleFilteredDownload("Monthwise Financial Report")} 
          />
          <FilteredPDFLink 
            title="Current Dues" 
            desc={`${reportFilter2} outstanding dues`}
            onPress={() => handleFilteredDownload("Current Dues")} 
          />
        </View>

        {/* ---------------- DARK TRANSACTION REPORT (ORIGINAL) ---------------- */}
        {/* <View className="m-5 mb-16 p-6 bg-slate-900 rounded-[2.5rem]">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white font-bold text-lg">Advanced Transaction Report</Text>
              <Text className="text-slate-400 text-xs">Detailed analytics & insights</Text>
            </View>
            <MaterialCommunityIcons name="file-document-outline" size={30} color="#fbbf24" />
          </View>

          <TouchableOpacity
            onPress={() => handleDownload("Advanced Transaction Report")}
            className="bg-white/10 p-4 rounded-2xl flex-row items-center justify-center border border-white/20"
          >
            <Text className="text-white font-bold mr-2">Generate Full Analysis</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View> */}

      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

/* -------------------- SUB COMPONENTS -------------------- */

const ReportCard = ({ title, icon, color, iconColor, sub }: any) => (
  <TouchableOpacity activeOpacity={0.8} className={`${color} p-5 rounded-3xl mb-4 w-[48%] border border-white/50 shadow-sm`}>
    <Ionicons name={icon} size={24} color={iconColor} />
    <Text className="mt-3 font-black text-lg text-slate-900">{title}</Text>
    <Text className="text-slate-500 text-[10px] leading-tight mt-1 font-medium">{sub}</Text>
  </TouchableOpacity>
);

const PDFLink = ({ title, desc, onPress }: any) => (
  <TouchableOpacity onPress={onPress} className="bg-white p-4 rounded-3xl mb-3 flex-row items-center border border-slate-100 shadow-sm">
    <View className="bg-rose-50 p-3 rounded-2xl mr-4">
      <MaterialCommunityIcons name="file-pdf-box" size={24} color="#e11d48" />
    </View>
    <View className="flex-1">
      <Text className="font-bold text-slate-800">{title}</Text>
      <Text className="text-slate-500 text-[10px] mt-0.5">{desc}</Text>
    </View>
    <Ionicons name="download-outline" size={20} color="#94a3b8" />
  </TouchableOpacity>
);

const FilteredPDFLink = ({ title, desc, onPress }: any) => (
  <TouchableOpacity onPress={onPress} className="bg-white p-4 rounded-3xl mb-3 flex-row items-center border border-slate-100 shadow-sm">
    <View className="bg-blue-50 p-3 rounded-2xl mr-4">
      <MaterialCommunityIcons name="file-document-outline" size={24} color="#2563eb" />
    </View>
    <View className="flex-1">
      <Text className="font-bold text-slate-800">{title}</Text>
      <Text className="text-slate-500 text-[10px] mt-0.5">{desc}</Text>
    </View>
    <Ionicons name="download-outline" size={20} color="#94a3b8" />
  </TouchableOpacity>
);