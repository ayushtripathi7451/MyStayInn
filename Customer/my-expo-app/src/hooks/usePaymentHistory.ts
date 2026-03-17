import { useState, useCallback, useEffect } from "react";
import { bookingApi } from "../../utils/api";

export type PaymentHistoryItem = {
  id: string;
  label: string;
  amount: number;
  dateLabel: string;
  /** ISO date for sorting */
  date: string;
};

const toBool = (v: any) => v === true || v === "true" || v === 1;

function formatDateLabel(moveInDate: any): string {
  if (!moveInDate) return "—";
  const d = new Date(moveInDate);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/**
 * Fetches all bookings for the customer and returns paid transactions
 * (security deposit, rent online, rent cash) so the customer sees the same
 * kind of payment history as the admin's "transactions" list.
 */
export function usePaymentHistory(customerId: string | undefined) {
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!customerId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.get<{
        success?: boolean;
        bookings?: any[];
      }>(`/api/bookings/customer/${customerId}`, { timeout: 15000 });
      const list = res.data?.success && Array.isArray(res.data.bookings) ? res.data.bookings : [];
      const paid: PaymentHistoryItem[] = [];
      list.forEach((b: any) => {
        const dateStr = b.moveInDate != null ? String(b.moveInDate).replace("Z", "") : "";
        const dateLabel = formatDateLabel(b.moveInDate);
        if (toBool(b.isSecurityPaid) && (Number(b.securityDeposit) || 0) > 0) {
          paid.push({
            id: `${b.id}-security`,
            label: "Security deposit",
            amount: Number(b.securityDeposit) || 0,
            dateLabel,
            date: dateStr,
          });
        }
        const online = Number(b.onlinePaymentRecv) || 0;
        if (online > 0 && toBool(b.isRentOnlinePaid)) {
          paid.push({
            id: `${b.id}-rent-online`,
            label: "Rent (online)",
            amount: online,
            dateLabel,
            date: dateStr,
          });
        }
        const cash = Number(b.cashPaymentRecv) || 0;
        if (cash > 0 && toBool(b.isRentCashPaid)) {
          paid.push({
            id: `${b.id}-rent-cash`,
            label: "Rent (cash)",
            amount: cash,
            dateLabel,
            date: dateStr,
          });
        }
      });
      // Sort by date descending (newest first)
      paid.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
      setItems(paid);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load payment history");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { paidItems: items, loading, error, refresh: fetchHistory };
}
