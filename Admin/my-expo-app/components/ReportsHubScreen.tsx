import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Dimensions, ActivityIndicator, Share } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomNav from "./BottomNav";
import CustomDropdown from "./CustomDropdown";
import Svg, { Circle, Path, G } from "react-native-svg";
import { useProperty } from "../contexts/PropertyContext";
import { useProperties } from "../src/hooks";
import { analyticsApi, bookingApi, expenseApi, moveOutApi, userApi } from "../utils/api";

/* -------------------- CONSTANTS -------------------- */

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
  if (["verified", "approved", "success", "completed"].includes(s)) return "Verified";
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
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

const getTotalDueFromBooking = (b: any): number => {
  const security = Number(b.securityDeposit) || 0;
  const isSecurityPaid = toBool(b.isSecurityPaid);
  const onlineRecv = Number(b.onlinePaymentRecv) || 0;
  const cashRecv = Number(b.cashPaymentRecv) || 0;
  const isRentOnlinePaid = toBool(b.isRentOnlinePaid);
  const isRentCashPaid = toBool(b.isRentCashPaid);
  let due = 0;
  if (security > 0 && !isSecurityPaid) due += security;
  if (onlineRecv > 0 && !isRentOnlinePaid) due += onlineRecv;
  if (cashRecv > 0 && !isRentCashPaid) due += cashRecv;
  return due;
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
  // Transaction Report State (default "Combined" = all-time, matches Payments > Transactions tab)
  const [transactionView, setTransactionView] = useState<string>("Combined");
  // Filtered Reports State
  const [reportFilter1, setReportFilter1] = useState<string>("Monthly");
  const [reportFilter2, setReportFilter2] = useState<string>(currentMonthName);

  // Integrated data from APIs (collections/dues from bookings = Payments page; expense from Expenses screen)
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState<Record<string, { collections: number; expense: number; pendingDues: number; profitLoss: number }>>({});
  const [moveOutPL, setMoveOutPL] = useState<number>(0);
  const [expensesRaw, setExpensesRaw] = useState<{ category_name?: string; amount: number; month_year?: string }[]>([]);
  const [monthlyExpensesRaw, setMonthlyExpensesRaw] = useState<{ amount: number; expense_type?: string; name?: string }[]>([]);
  const [transactionTotals, setTransactionTotals] = useState<{ online: number; cash: number; total: number }>({ online: 0, cash: 0, total: 0 });
  const [transactionsByMonth, setTransactionsByMonth] = useState<Record<string, { online: number; cash: number; total: number }>>({});
  const [occupancyData, setOccupancyData] = useState<Record<string, { emptyBeds: number; occupied: number; moveOuts: number }>>({});
  const [reportTenants, setReportTenants] = useState<ReportTenantRow[]>([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const fetchReportsData = useCallback(async () => {
    if (!propertyId) {
      setReportTenants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = { includeCompleted: "true" };
      if (propertyId) params.propertyId = propertyId;
      const [bookingsRes, expensesRes, monthlyRes, analyticsRes, statsRes, moveOutRes] = await Promise.all([
        bookingApi.get("/api/bookings/list/active-with-details", { params, timeout: 15000 }),
        expenseApi.get(`/${propertyId}`, { timeout: 10000 }).catch(() => ({ data: {} })),
        expenseApi.get(`/monthly/${propertyId}`, { timeout: 10000 }).catch(() => ({ data: {} })),
        numericPropertyId
          ? analyticsApi.get(`/property/${numericPropertyId}/reports`, { timeout: 12000 }).catch(() => ({ data: { success: false, data: null } }))
          : Promise.resolve({ data: { success: false, data: null } }),
        bookingApi.get("/api/bookings/dashboard-stats", { params: { propertyId }, timeout: 8000 }).catch(() => ({ data: { success: false } })),
        moveOutApi.get("/api/move-out/requests", { params: { status: "moved_out", propertyId }, timeout: 8000 }).catch(() => ({ data: { success: false, data: { requests: [] } } })),
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
        moveInDate: b.moveInDate != null ? (typeof b.moveInDate === "string" ? b.moveInDate : new Date(b.moveInDate).toISOString?.() ?? String(b.moveInDate)) : "",
      }));

      // Prepare tenant rows for PDF reports (aligned with pending dues logic).
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
        const bedNumbers = Array.isArray(b?.bedNumbers) && b.bedNumbers.length > 0 ? b.bedNumbers.join(", ") : "—";
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
      const tenantUniqueIds = tenantRows.map((t) => t.uniqueId).filter((uid) => uid && uid !== "—");
      const kycByUniqueId = new Map<string, string>();
      await Promise.all(
        tenantUniqueIds.map(async (uid) => {
          try {
            const profileRes = await userApi.get(`/api/users/${encodeURIComponent(uid)}/profile`, { timeout: 7000 });
            const status = profileRes?.data?.user?.aadhaarStatus;
            if (status != null) kycByUniqueId.set(uid, String(status));
          } catch {
            // best effort, keep Unknown
          }
        })
      );
      tenantRows = tenantRows.map((t) => {
        const raw = kycByUniqueId.get(t.uniqueId) || t.aadhaarStatusRaw || "";
        return {
          ...t,
          aadhaarStatusRaw: raw,
          kycStatus: normalizeKycStatus(raw),
        };
      });
      setReportTenants(tenantRows);
      const expensesData = expensesRes.data?.data ?? expensesRes.data;
      const expenses = Array.isArray(expensesData) ? expensesData : [];
      const monthlyData = monthlyRes.data?.data ?? monthlyRes.data;
      const monthlyExpenses = Array.isArray(monthlyData) ? monthlyData : [];
      const report = analyticsRes.data?.success && analyticsRes.data?.data ? analyticsRes.data.data : null;

      setExpensesRaw(expenses);
      setMonthlyExpensesRaw(monthlyExpenses.map((m: any) => ({ amount: Number(m.amount) || 0, expense_type: m.expense_type, name: m.name })));

      // Helper: get YYYY-MM from moveInDate (ISO string or Date) for per-month attribution
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

      // Per-month collections and transaction breakdown (online/cash by moveInDate month)
      const collectionsByMonth: Record<string, number> = { [m0]: 0, [m1]: 0, [m2]: 0 };
      const transactionsByMonthMap: Record<string, { online: number; cash: number }> = { [m0]: { online: 0, cash: 0 }, [m1]: { online: 0, cash: 0 }, [m2]: { online: 0, cash: 0 } };
      const dueItems: { amount: number }[] = [];
      const transactionItems: { amount: number; type: string }[] = [];
      bookings.forEach((b: any) => {
        const monthKey = toMonthKey(b.moveInDate);
        const sec = Number(b.securityDeposit ?? 0);
        const online = Number(b.onlinePaymentRecv ?? 0);
        const cash = Number(b.cashPaymentRecv ?? 0);
        if (!b.isSecurityPaid && sec > 0) dueItems.push({ amount: sec });
        if (b.isSecurityPaid && sec > 0) {
          // Security deposit is always paid online (Cashfree) by user
          transactionItems.push({ amount: sec, type: "Security deposit (online)" });
          if (monthKey && collectionsByMonth[monthKey] !== undefined) collectionsByMonth[monthKey] += sec;
          if (monthKey && transactionsByMonthMap[monthKey]) transactionsByMonthMap[monthKey].online += sec;
        }
        if (online > 0 && !b.isRentOnlinePaid) dueItems.push({ amount: online });
        if (online > 0 && b.isRentOnlinePaid) {
          transactionItems.push({ amount: online, type: "Rent (online)" });
          if (monthKey && collectionsByMonth[monthKey] !== undefined) collectionsByMonth[monthKey] += online;
          if (monthKey && transactionsByMonthMap[monthKey]) transactionsByMonthMap[monthKey].online += online;
        }
        if (cash > 0 && !b.isRentCashPaid) dueItems.push({ amount: cash });
        if (cash > 0 && b.isRentCashPaid) {
          transactionItems.push({ amount: cash, type: "Rent (cash)" });
          if (monthKey && collectionsByMonth[monthKey] !== undefined) collectionsByMonth[monthKey] += cash;
          if (monthKey && transactionsByMonthMap[monthKey]) transactionsByMonthMap[monthKey].cash += cash;
        }
      });
      const txByMonth: Record<string, { online: number; cash: number; total: number }> = {};
      [m0, m1, m2].forEach((mk) => {
        const t = transactionsByMonthMap[mk] || { online: 0, cash: 0 };
        txByMonth[mk] = { online: t.online, cash: t.cash, total: t.online + t.cash };
      });
      setTransactionsByMonth(txByMonth);

      const pendingDues = dueItems.reduce((s, d) => s + d.amount, 0);
      const totalCollections = transactionItems.reduce((s, t) => s + t.amount, 0);
      // Online (Cashfree) = rent paid online + security deposit (always paid online by user). Cash = rent (cash) only.
      const onlineCollected = transactionItems.filter((t) => t.type === "Rent (online)" || t.type === "Security deposit (online)").reduce((s, t) => s + t.amount, 0);
      const cashCollected = transactionItems.filter((t) => t.type === "Rent (cash)").reduce((s, t) => s + t.amount, 0);
      setTransactionTotals({ online: onlineCollected, cash: cashCollected, total: totalCollections });

      setMoveOutPL(report ? Number(report.moveOutPL) || 0 : 0);

      // Per-month expense: regular (cumulative month_year <= report month); monthly (Staff tab) only in current and future months, not in previous
      const monthlyTotal = monthlyExpenses.reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
      const exp0 = expenses.filter((e: any) => (e.month_year || "") <= m0).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) + monthlyTotal;
      const exp1 = expenses.filter((e: any) => (e.month_year || "") <= m1).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      const exp2 = expenses.filter((e: any) => (e.month_year || "") <= m2).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

      const coll0 = collectionsByMonth[m0] ?? 0;
      const coll1 = collectionsByMonth[m1] ?? 0;
      const coll2 = collectionsByMonth[m2] ?? 0;

      setFinancialData({
        [currentMonthName]: { collections: coll0, expense: exp0, pendingDues, profitLoss: Math.round(coll0 - exp0) },
        [prev1]: { collections: coll1, expense: exp1, pendingDues, profitLoss: Math.round(coll1 - exp1) },
        [prev2]: { collections: coll2, expense: exp2, pendingDues, profitLoss: Math.round(coll2 - exp2) },
      });

      // Occupancy: dashboard-stats (current snapshot) + all move-outs that happened in each month
      const totalBeds = statsRes?.data?.success && typeof statsRes.data.totalBeds === "number" ? statsRes.data.totalBeds : 0;
      const occupiedBeds = statsRes?.data?.success && typeof statsRes.data.occupiedBeds === "number" ? statsRes.data.occupiedBeds : 0;
      const emptyBeds = statsRes?.data?.success && typeof statsRes.data.emptyBeds === "number" ? statsRes.data.emptyBeds : Math.max(0, totalBeds - occupiedBeds);
      const moveOutRequests = moveOutRes?.data?.data?.requests ?? moveOutRes?.data?.requests;
      const moveOutList = Array.isArray(moveOutRequests) ? moveOutRequests : [];
      const moveOutsByMonth: Record<string, number> = {};
      moveOutList.forEach((r: any) => {
        const d = r.movedOutAt ? new Date(r.movedOutAt) : null;
        if (d && !Number.isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          moveOutsByMonth[key] = (moveOutsByMonth[key] || 0) + 1;
        }
      });
      setOccupancyData({
        [currentMonthName]: { emptyBeds, occupied: occupiedBeds, moveOuts: moveOutsByMonth[m0] ?? 0 },
        [prev1]: { emptyBeds, occupied: occupiedBeds, moveOuts: moveOutsByMonth[m1] ?? 0 },
        [prev2]: { emptyBeds, occupied: occupiedBeds, moveOuts: moveOutsByMonth[m2] ?? 0 },
      });
    } catch (e) {
      console.warn("ReportsHub fetch error:", e);
      setFinancialData({});
      setMoveOutPL(0);
      setExpensesRaw([]);
      setMonthlyExpensesRaw([]);
      setTransactionTotals({ online: 0, cash: 0, total: 0 });
      setTransactionsByMonth({});
      setOccupancyData({});
      setReportTenants([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId, numericPropertyId, currentMonthIdx, currentMonthName]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Get months for combined view (current + previous 2) - REVERSED ORDER (current month first)
  const getFinancialMonths = () => [
    { name: currentMonthName, data: financialData[currentMonthName] },
    { name: MONTHS[(currentMonthIdx - 1 + 12) % 12], data: financialData[MONTHS[(currentMonthIdx - 1 + 12) % 12]] },
    { name: MONTHS[(currentMonthIdx - 2 + 12) % 12], data: financialData[MONTHS[(currentMonthIdx - 2 + 12) % 12]] }
  ];

  const financialMonths = getFinancialMonths();

  // Combined pending dues (same as Due tab total on Payments page)
  const combinedPendingDues = financialMonths[0]?.data?.pendingDues ?? 0;

  // Expense list for pie chart: regular (cumulative); monthly (Staff tab) only when current month or Combined
  const expenseList = useMemo(() => {
    const prev1 = MONTHS[(currentMonthIdx - 1 + 12) % 12];
    const prev2 = MONTHS[(currentMonthIdx - 2 + 12) % 12];
    const upToMonth = financialView === "Combined"
      ? monthYear(0)
      : financialView === currentMonthName
        ? monthYear(0)
        : financialView === prev1
          ? monthYear(1)
          : financialView === prev2
            ? monthYear(2)
            : monthYear(0);
    const isCurrentOrCombined = upToMonth === monthYear(0);
    const categorySums: Record<string, number> = {};
    expensesRaw.filter((e: any) => (e.month_year || "") <= upToMonth).forEach((e: any) => {
      const amt = Number(e.amount) || 0;
      const cat = e.category_name || "Other";
      categorySums[cat] = (categorySums[cat] || 0) + amt;
    });
    if (isCurrentOrCombined) {
      monthlyExpensesRaw.forEach((m: any) => {
        const cat = (m.expense_type || m.name || "Monthly").replace(/_/g, " ");
        categorySums[cat] = (categorySums[cat] || 0) + (Number(m.amount) || 0);
      });
    }
    return Object.entries(categorySums).map(([category_name, amount]) => ({ category_name, amount }));
  }, [expensesRaw, monthlyExpensesRaw, financialView, currentMonthName, currentMonthIdx]);

  const combinedMonths = financialMonths.map(month => ({
    name: month.name,
    collections: month.data?.collections ?? 0,
    expense: month.data?.expense ?? 0
  }));

  // Month-wise expense report: regular (cumulative); monthly (Staff tab) only for current month or Combined
  const expenseReportData = useMemo(() => {
    const prev1 = MONTHS[(currentMonthIdx - 1 + 12) % 12];
    const prev2 = MONTHS[(currentMonthIdx - 2 + 12) % 12];
    const upToMonth = expenseReportView === "Combined"
      ? monthYear(0)
      : expenseReportView === currentMonthName
        ? monthYear(0)
        : expenseReportView === prev1
          ? monthYear(1)
          : expenseReportView === prev2
            ? monthYear(2)
            : monthYear(0);
    const isCurrentOrCombined = upToMonth === monthYear(0);
    const categorySums: Record<string, number> = {};
    expensesRaw.filter((e: any) => (e.month_year || "") <= upToMonth).forEach((e: any) => {
      const amt = Number(e.amount) || 0;
      const cat = e.category_name || "Other";
      categorySums[cat] = (categorySums[cat] || 0) + amt;
    });
    if (isCurrentOrCombined) {
      monthlyExpensesRaw.forEach((m: any) => {
        const cat = (m.expense_type || m.name || "Monthly").replace(/_/g, " ");
        categorySums[cat] = (categorySums[cat] || 0) + (Number(m.amount) || 0);
      });
    }
    return Object.entries(categorySums).map(([name, amount], index) => ({
      name,
      amount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [expensesRaw, monthlyExpensesRaw, expenseReportView, currentMonthName, currentMonthIdx]);

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
      setReportFilter2("Q4 (Jan-Mar)"); // Current quarter
    } else if (reportFilter1 === "Yearly") {
      setReportFilter2("2024-25");
    }
  }, [reportFilter1, currentMonthName]);

  /* Build HTML for PDF report by name; uses current screen data */
  const buildReportHtml = useCallback((reportName: string, period?: string): string => {
    const propertyName = currentProperty?.name || currentProperty?.id || "Property";
    const fd = financialData[currentMonthName] ?? financialData[MONTHS[(currentMonthIdx - 1 + 12) % 12]];
    const pending = fd?.pendingDues ?? combinedPendingDues;
    const collections = fd?.collections ?? 0;
    const expense = fd?.expense ?? 0;
    const profit = fd?.profitLoss ?? 0;
    const occ = occupancyData[currentMonthName] ?? occupancyData[MONTHS[(currentMonthIdx - 1 + 12) % 12]];
    const rows = (label: string, value: string | number) => `<tr><td style="padding:8px;border:1px solid #ddd">${label}</td><td style="padding:8px;border:1px solid #ddd">${value}</td></tr>`;
    let body = "";
    switch (reportName) {
      case "Tenant with Dues":
        {
          const dueTenants = reportTenants
            .filter((t) => Number(t.totalDue) > 0)
            .sort((a, b) => b.totalDue - a.totalDue);
          const dueRows = dueTenants
            .map(
              (t) => `<tr>
                <td>${escapeHtml(t.name)}</td>
                <td>${escapeHtml(t.uniqueId)}</td>
                <td>${escapeHtml(t.phone)}</td>
                <td>${escapeHtml(t.room)}${t.bedNumbers !== "—" ? ` (Bed ${escapeHtml(t.bedNumbers)})` : ""}</td>
                <td>${escapeHtml(t.floor)}</td>
                <td style="text-align:right;color:#b91c1c;font-weight:700">₹${Number(t.totalDue).toLocaleString()}</td>
              </tr>`
            )
            .join("");
          body = `<h3>Current Tenants With Pending Dues</h3>
          <p><strong>Total Pending Dues:</strong> ₹${(pending ?? 0).toLocaleString()}</p>
          ${
            dueTenants.length
              ? `<table><thead><tr><th>Name</th><th>MyStay ID</th><th>Phone</th><th>Room/Bed</th><th>Floor</th><th>Pending Dues</th></tr></thead><tbody>${dueRows}</tbody></table>`
              : `<p>No pending dues found for current tenants.</p>`
          }`;
        }
        break;
      case "Tenant Details":
        {
          const tenantRows = reportTenants
            .map(
              (t) => `<tr>
                <td>${escapeHtml(t.name)}</td>
                <td>${escapeHtml(t.uniqueId)}</td>
                <td>${escapeHtml(t.phone)}</td>
                <td>${escapeHtml(t.email)}</td>
                <td>${escapeHtml(t.room)}${t.bedNumbers !== "—" ? ` (Bed ${escapeHtml(t.bedNumbers)})` : ""}</td>
                <td>${escapeHtml(t.floor)}</td>
                <td>${escapeHtml(formatDateLabel(t.moveInDate))}</td>
                <td>${escapeHtml(t.status)}</td>
                <td style="text-align:right">₹${Number(t.totalDue).toLocaleString()}</td>
              </tr>`
            )
            .join("");
          body = `<h3>Tenant Master Details</h3>
          <p><strong>Total Current Tenants:</strong> ${reportTenants.length}</p>
          ${
            reportTenants.length
              ? `<table><thead><tr><th>Name</th><th>MyStay ID</th><th>Phone</th><th>Email</th><th>Room/Bed</th><th>Floor</th><th>Move-in</th><th>Status</th><th>Total Due</th></tr></thead><tbody>${tenantRows}</tbody></table>`
              : `<p>No tenants found for selected property.</p>`
          }
          <h3>Financial Summary (${currentMonthName})</h3>
          <table style="border-collapse:collapse"><tbody>${rows("Collections", "₹" + (collections ?? 0).toLocaleString())}${rows("Expense", "₹" + (expense ?? 0).toLocaleString())}${rows("Pending Dues", "₹" + (pending ?? 0).toLocaleString())}${rows("Profit/Loss", "₹" + (profit ?? 0).toLocaleString())}</tbody></table>`;
        }
        break;
      case "Tenant KYC Status":
      case "Tenant KYC":
        {
          const kycRows = reportTenants
            .map(
              (t) => `<tr>
                <td>${escapeHtml(t.name)}</td>
                <td>${escapeHtml(t.uniqueId)}</td>
                <td>${escapeHtml(t.phone)}</td>
                <td>${escapeHtml(t.room)}${t.bedNumbers !== "—" ? ` (Bed ${escapeHtml(t.bedNumbers)})` : ""}</td>
                <td>${escapeHtml(t.floor)}</td>
                <td>${escapeHtml(t.kycStatus)}</td>
                <td>${escapeHtml(t.aadhaarStatusRaw || "Unknown")}</td>
              </tr>`
            )
            .join("");
          body = `<h3>Tenant KYC Status</h3>
          <p><strong>Property:</strong> ${escapeHtml(propertyName)}</p>
          ${
            reportTenants.length
              ? `<table><thead><tr><th>Name</th><th>MyStay ID</th><th>Phone</th><th>Room/Bed</th><th>Floor</th><th>KYC Status</th><th>Aadhaar Status (Raw)</th></tr></thead><tbody>${kycRows}</tbody></table>`
              : `<p>No tenants found for selected property.</p>`
          }`;
        }
        break;
      case "Room Occupancy Report":
        body = `<h3>Occupancy (${currentMonthName})</h3><table style="border-collapse:collapse"><tbody>${rows("Occupied", occ?.occupied ?? 0)}${rows("Empty Beds", occ?.emptyBeds ?? 0)}${rows("Move-outs this month", occ?.moveOuts ?? 0)}</tbody></table><p><strong>Property:</strong> ${propertyName}</p>`;
        break;
      case "Move Out":
      case "Month-wise Move Out":
        body = `<h3>Month-wise Move Out</h3><p>Move-outs from current month backward.</p><table style="border-collapse:collapse"><tbody>${[currentMonthName, MONTHS[(currentMonthIdx - 1 + 12) % 12], MONTHS[(currentMonthIdx - 2 + 12) % 12]].map(m => rows(m, (occupancyData[m]?.moveOuts ?? 0) + " move-outs")).join("")}</tbody></table>`;
        break;
      case "Old Tenant Report":
        body = `<h3>Historical Tenant Data</h3><p>Historical tenant data and records. Property: ${propertyName}. Move-out P/L: ₹${moveOutPL.toLocaleString()}</p>`;
        break;
      case "Advanced Transaction Report":
        body = `<h3>Transaction Summary</h3><table style="border-collapse:collapse"><tbody>${rows("Online", "₹" + (transactionTotals.online ?? 0).toLocaleString())}${rows("Cash", "₹" + (transactionTotals.cash ?? 0).toLocaleString())}${rows("Total", "₹" + (transactionTotals.total ?? 0).toLocaleString())}</tbody></table>`;
        break;
      case "Transaction Report":
        body = `<h3>Transaction Report (${period || currentMonthName})</h3><table style="border-collapse:collapse"><tbody>${rows("Online (Cashfree)", "₹" + (transactionTotals.online ?? 0).toLocaleString())}${rows("Cash", "₹" + (transactionTotals.cash ?? 0).toLocaleString())}${rows("Total", "₹" + (transactionTotals.total ?? 0).toLocaleString())}</tbody></table>`;
        break;
      case "Monthly Collection Report":
        body = `<h3>Collections (${period || currentMonthName})</h3><p><strong>Total Collections:</strong> ₹${collections.toLocaleString()}</p>`;
        break;
      case "Monthly Expenses Report":
        body = `<h3>Expenses (${period || currentMonthName})</h3><p><strong>Total Expense:</strong> ₹${expense.toLocaleString()}</p><p>See Reports Hub expense breakdown for category-wise details.</p>`;
        break;
      case "Monthwise Financial Report":
        body = `<h3>Financial Overview (${period || currentMonthName})</h3><table style="border-collapse:collapse"><tbody>${rows("Collections", "₹" + collections.toLocaleString())}${rows("Expense", "₹" + expense.toLocaleString())}${rows("Pending Dues", "₹" + pending.toLocaleString())}${rows("Profit/Loss", "₹" + profit.toLocaleString())}</tbody></table>`;
        break;
      case "Current Dues":
        body = `<h3>Outstanding Dues (${period || currentMonthName})</h3><p><strong>Total Pending Dues:</strong> ₹${pending.toLocaleString()}</p><p>See Payments > Dues for tenant-wise list.</p>`;
        break;
      default:
        body = `<h3>${reportName}</h3><p>Period: ${period || currentMonthName}</p><p>Collections: ₹${collections.toLocaleString()} | Expense: ₹${expense.toLocaleString()} | Pending Dues: ₹${pending.toLocaleString()} | P/L: ₹${profit.toLocaleString()}</p>`;
    }
    const periodLine = period ? `<p><strong>Period:</strong> ${period}</p>` : "";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${reportName}</title><style>body{font-family:system-ui,sans-serif;padding:20px;color:#333}h1,h2,h3{margin-top:16px}table{margin:12px 0;border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}th{background:#f8fafc;font-weight:700}</style></head><body><h1>${reportName}</h1>${periodLine}<p><strong>Property:</strong> ${escapeHtml(propertyName)}</p><p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>${body}</body></html>`;
  }, [currentProperty, financialData, combinedPendingDues, occupancyData, moveOutPL, transactionTotals, currentMonthName, currentMonthIdx, reportTenants]);

  /* Plain text version of report for fallback when PDF native module is not available */
  const getReportText = useCallback((reportName: string, period?: string): string => {
    const propertyName = currentProperty?.name || currentProperty?.id || "Property";
    const fd = financialData[currentMonthName] ?? financialData[MONTHS[(currentMonthIdx - 1 + 12) % 12]];
    const pending = fd?.pendingDues ?? combinedPendingDues;
    const collections = fd?.collections ?? 0;
    const expense = fd?.expense ?? 0;
    const profit = fd?.profitLoss ?? 0;
    const occ = occupancyData[currentMonthName];
    const periodLine = period ? `Period: ${period}\n` : "";
    let body = "";
    switch (reportName) {
      case "Tenant with Dues":
        body = [
          `Total Pending Dues: ₹${(pending ?? 0).toLocaleString()}`,
          "",
          "Current tenants with due:",
          ...reportTenants
            .filter((t) => t.totalDue > 0)
            .sort((a, b) => b.totalDue - a.totalDue)
            .map((t) => `${t.name} (${t.uniqueId}) | Room ${t.room} | Due ₹${t.totalDue.toLocaleString()}`),
        ].join("\n");
        break;
      case "Tenant Details":
        body = [
          `Total Tenants: ${reportTenants.length}`,
          ...reportTenants.map((t) => `${t.name} (${t.uniqueId}) | ${t.phone} | Room ${t.room} | Due ₹${t.totalDue.toLocaleString()} | ${t.kycStatus}`),
          "",
          `Collections: ₹${collections.toLocaleString()}`,
          `Expense: ₹${expense.toLocaleString()}`,
          `Pending Dues: ₹${pending.toLocaleString()}`,
          `Profit/Loss: ₹${profit.toLocaleString()}`,
        ].join("\n");
        break;
      case "Tenant KYC Status":
        body = [
          `Total Tenants: ${reportTenants.length}`,
          ...reportTenants.map((t) => `${t.name} (${t.uniqueId}) | ${t.kycStatus} | raw: ${t.aadhaarStatusRaw || "unknown"}`),
        ].join("\n");
        break;
      case "Room Occupancy Report":
        body = `Occupied: ${occ?.occupied ?? 0}\nEmpty Beds: ${occ?.emptyBeds ?? 0}\nMove-outs: ${occ?.moveOuts ?? 0}`;
        break;
      case "Month-wise Move Out":
        body = [currentMonthName, MONTHS[(currentMonthIdx - 1 + 12) % 12], MONTHS[(currentMonthIdx - 2 + 12) % 12]]
          .map(m => `${m}: ${occupancyData[m]?.moveOuts ?? 0} move-outs`).join("\n");
        break;
      case "Old Tenant Report":
        body = `Move-out P/L: ₹${moveOutPL.toLocaleString()}`;
        break;
      case "Transaction Report":
        body = `Online: ₹${(transactionTotals.online ?? 0).toLocaleString()}\nCash: ₹${(transactionTotals.cash ?? 0).toLocaleString()}\nTotal: ₹${(transactionTotals.total ?? 0).toLocaleString()}`;
        break;
      default:
        body = `Collections: ₹${collections.toLocaleString()} | Expense: ₹${expense.toLocaleString()} | Pending: ₹${pending.toLocaleString()} | P/L: ₹${profit.toLocaleString()}`;
    }
    return `${reportName}${period ? ` (${period})` : ""}\nProperty: ${propertyName}\nGenerated: ${new Date().toLocaleString()}\n\n${periodLine}${body}`;
  }, [currentProperty, financialData, combinedPendingDues, occupancyData, moveOutPL, transactionTotals, currentMonthName, currentMonthIdx, reportTenants]);

  /* Build a safe PDF filename from report name and period */
  const getPdfFilename = useCallback((reportName: string, period?: string): string => {
    const base = `${reportName}${period ? ` (${period})` : ""}`.replace(/[/\\?*:|"]/g, "_").replace(/\s+/g, "_").trim() || "Report";
    return `${base}.pdf`;
  }, []);

  const offerShareAsTextFallback = useCallback((reportName: string, period?: string) => {
    const text = getReportText(reportName, period);
    const title = period ? `${reportName} (${period})` : reportName;
    Share.share({ message: text, title }).catch(() => {});
  }, [getReportText]);

  /* Generate PDF, save with proper filename, then offer share (Save to device / Files) */
  const generateAndSharePdf = useCallback(async (reportName: string, period?: string) => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    try {
      if (typeof Print?.printToFileAsync !== "function") {
        Alert.alert(
          "PDF not available in this build",
          "PDF export needs a fresh native build (e.g. run: npx expo run:android). Share the report as text instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Share as text", onPress: () => offerShareAsTextFallback(reportName, period) },
          ]
        );
        return;
      }
      const html = buildReportHtml(reportName, period);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const filename = getPdfFilename(reportName, period);
      const sourceFile = new File(uri);
      const destFile = new File(Paths.document, filename);
      if (destFile.exists) destFile.delete();
      sourceFile.copy(destFile);
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          const dialogTitle = period ? `${reportName} (${period})` : reportName;
          await Sharing.shareAsync(destFile.uri, { mimeType: "application/pdf", dialogTitle });
        } else {
          Alert.alert("Download complete", `PDF saved as ${filename}. Use "Save to Files" or "Save to Downloads" in the share menu to save it where you can find it.`);
        }
      } catch (_sharingError: any) {
        Alert.alert("Download complete", `PDF saved as ${filename}. If the share menu did not open, update the app to save PDFs to your phone.`);
      }
    } catch (e: any) {
      const msg = e?.message || String(e) || "";
      const isNativeModuleMissing = /ExpoPrint|native module|cannot find/i.test(msg);
      if (isNativeModuleMissing) {
        Alert.alert(
          "PDF not available in this build",
          "PDF export needs a fresh native build (e.g. run: npx expo run:android). Share the report as text instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Share as text", onPress: () => offerShareAsTextFallback(reportName, period) },
          ]
        );
      } else {
        Alert.alert("Could not generate PDF", msg);
      }
    } finally {
      setPdfGenerating(false);
    }
  }, [buildReportHtml, getPdfFilename, offerShareAsTextFallback]);

  /* Subscription Guard & Downloader */
  const handleDownload = (reportName: string) => {
    if (!isSubscribed && (filter1 !== currentMonthName || filter2 !== currentMonthName)) {
      Alert.alert(
        "Subscription Required",
        "Accessing previous months, yearly or quarterly reports requires a premium subscription."
      );
      return;
    }
    generateAndSharePdf(reportName);
  };

  /* Filtered Reports Downloader */
  const handleFilteredDownload = (reportName: string) => {
    const period = reportFilter2;
    const isCurrentPeriod =
      (reportFilter1 === "Monthly" && reportFilter2 === currentMonthName) ||
      (reportFilter1 === "Quarterly" && reportFilter2 === "Q4 (Jan-Mar)") ||
      (reportFilter1 === "Yearly" && reportFilter2 === "2024-25");
    if (!isSubscribed && !isCurrentPeriod) {
      Alert.alert(
        "Subscription Required",
        "Accessing previous periods requires a premium subscription."
      );
      return;
    }
    generateAndSharePdf(reportName, period);
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

  // Simple Pie Chart Component
  const SimplePieChart = ({ data, size = 180 }: { data: any[], size?: number }) => {
    const radius = size / 2;
    const center = radius;
    let cumulativeAngle = 0;
    
    const segments = data.map((item, index) => {
      const percentage = item.amount / totalExpense;
      const angle = percentage * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      const endAngle = cumulativeAngle;
      
      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calculate coordinates for arc
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      
      // Create arc path
      const largeArcFlag = angle > 180 ? 1 : 0;
      const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      return (
        <Path
          key={index}
          d={path}
          fill={item.color}
          stroke="#FFF"
          strokeWidth="2"
        />
      );
    });

    return (
      <View className="items-center">
        <Svg width={size} height={size}>
          {segments}
          <Circle cx={center} cy={center} r={radius * 0.3} fill="#FFF" />
        </Svg>
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
                <View className="bg-slate-50 rounded-2xl p-4">
                  {financialMonths.map((month, idx) => (
                    <View key={idx} className="mb-3">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-600 text-sm font-medium">{month.name}</Text>
                        <Text className="text-slate-900 font-bold">₹{(month.data?.collections ?? 0).toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={month.data?.collections ?? 0} max={90000} color="bg-emerald-500" />
                    </View>
                  ))}
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
                <View className="bg-slate-50 rounded-2xl p-4">
                  {financialMonths.map((month, idx) => (
                    <View key={idx} className="mb-3">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-600 text-sm font-medium">{month.name}</Text>
                        <Text className="text-slate-900 font-bold">₹{(month.data?.profitLoss ?? 0).toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={month.data?.profitLoss ?? 0} max={45000} color="bg-blue-500" />
                    </View>
                  ))}
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
                const currentData = financialData[financialView] || financialData[currentMonthName] || { collections: 0, expense: 0, pendingDues: 0, profitLoss: 0 };
                return (
                  <View className="space-y-4">
                    {/* Collections */}
                    <View className="rounded-2xl p-4 ">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-emerald-700 font-bold">Collections</Text>
                        <Text className="text-emerald-900 text-xl font-black">₹{currentData.collections.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={currentData.collections} max={90000} color="bg-emerald-500" />
                      <Text className="text-emerald-600 text-xs mt-1">
                        {((currentData.collections / 90000) * 100).toFixed(0)}% of target
                      </Text>
                    </View>

                    {/* Expense */}
                    <View className=" rounded-2xl p-4 ">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-rose-700 font-bold">Expense</Text>
                        <Text className="text-rose-900 text-xl font-black">₹{currentData.expense.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={currentData.expense} max={50000} color="bg-rose-500" />
                      <Text className="text-rose-600 text-xs mt-1">
                        {((currentData.expense / 50000) * 100).toFixed(0)}% of budget
                      </Text>
                    </View>

                    {/* Pending Dues */}
                    <View className=" rounded-2xl p-4 ">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-amber-700 font-bold">Pending Dues</Text>
                        <Text className="text-amber-900 text-xl font-black">₹{currentData.pendingDues.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={currentData.pendingDues} max={35000} color="bg-amber-500" />
                      <Text className="text-amber-600 text-xs mt-1">
                        {((currentData.pendingDues / 35000) * 100).toFixed(0)}% of limit
                      </Text>
                    </View>

                    {/* Profit/Loss */}
                    <View className=" rounded-2xl p-4">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-blue-700 font-bold">Profit / Loss</Text>
                        <Text className="text-blue-900 text-xl font-black">₹{currentData.profitLoss.toLocaleString()}</Text>
                      </View>
                      <ProgressBar value={currentData.profitLoss} max={45000} color="bg-blue-500" />
                      <Text className="text-blue-600 text-xs mt-1">
                        {((currentData.profitLoss / 45000) * 100).toFixed(0)}% of target
                      </Text>
                    </View>
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
            <SimplePieChart data={expenseData} size={200} />
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
                        <View 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: item.color }}
                        />
                        <View className="flex-1">
                          <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                            {item.name}
                          </Text>
                          {isHighest && (
                            <Text className="text-red-600 text-xs font-bold">Highest Expense</Text>
                          )}
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-slate-900 font-black text-base">
                          ₹{item.amount.toLocaleString()}
                        </Text>
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
          <PDFLink title="Tenant KYC Status" desc="Aadhar & KYC verification status" onPress={() => handleDownload("Tenant KYC Status")} />
          <PDFLink title="Room Occupancy Report" desc="Room-wise tenant allocation" onPress={() => handleDownload("Room Occupancy")} />
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