import { useEffect, useState, useCallback } from 'react';
import { bookingApi, expenseApi } from '../../utils/api';

/**
 * Same financial logic as Reports Hub: bookings (collections, dues, online/cash) + expenses.
 * Returns current-month collected, pending dues, expense, profit, and online/cash breakdown for Home statistics.
 */
export function useHomeFinancialStats(propertyId: string | undefined) {
  const [collected, setCollected] = useState(0);
  const [pendingDues, setPendingDues] = useState(0);
  const [expense, setExpense] = useState(0);
  const [profit, setProfit] = useState(0);
  const [online, setOnline] = useState(0);
  const [cash, setCash] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!propertyId) {
      setCollected(0);
      setPendingDues(0);
      setExpense(0);
      setProfit(0);
      setOnline(0);
      setCash(0);
      return;
    }
    setLoading(true);
    try {
      const currentMonthIdx = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const m0 = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

      const params: Record<string, string> = { includeCompleted: 'true', propertyId };
      const [bookingsRes, expensesRes, monthlyRes] = await Promise.all([
        bookingApi.get('/api/bookings/list/active-with-details', { params, timeout: 15000 }),
        expenseApi.get(`/${propertyId}`, { timeout: 10000 }).catch(() => ({ data: {} })),
        expenseApi.get(`/monthly/${propertyId}`, { timeout: 10000 }).catch(() => ({ data: {} })),
      ]);

      const rawBookings = (bookingsRes.data?.success && Array.isArray(bookingsRes.data?.bookings)) ? bookingsRes.data?.bookings : [];
      const toBool = (v: any) => v === true || v === 'true' || v === 1;
      const bookings = rawBookings.map((b: any) => ({
        ...b,
        securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit) : 0,
        isSecurityPaid: toBool(b.isSecurityPaid),
        onlinePaymentRecv: b.onlinePaymentRecv != null ? Number(b.onlinePaymentRecv) : 0,
        cashPaymentRecv: b.cashPaymentRecv != null ? Number(b.cashPaymentRecv) : 0,
        isRentOnlinePaid: toBool(b.isRentOnlinePaid),
        isRentCashPaid: toBool(b.isRentCashPaid),
        moveInDate: b.moveInDate != null ? (typeof b.moveInDate === 'string' ? b.moveInDate : new Date(b.moveInDate).toISOString?.() ?? String(b.moveInDate)) : '',
      }));

      const expensesData = expensesRes.data?.data ?? expensesRes.data;
      const expenses = Array.isArray(expensesData) ? expensesData : [];
      const monthlyData = monthlyRes.data?.data ?? monthlyRes.data;
      const monthlyExpenses = Array.isArray(monthlyData) ? monthlyData : [];

      const toMonthKey = (d: any): string | null => {
        if (d == null) return null;
        const date = new Date(d);
        if (Number.isNaN(date.getTime())) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      };

      let totalCollected = 0;
      let totalOnline = 0;
      let totalCash = 0;
      let pending = 0;

      bookings.forEach((b: any) => {
        const monthKey = toMonthKey(b.moveInDate);
        const sec = Number(b.securityDeposit ?? 0);
        const onlineAmt = Number(b.onlinePaymentRecv ?? 0);
        const cashAmt = Number(b.cashPaymentRecv ?? 0);

        if (!b.isSecurityPaid && sec > 0) pending += sec;
        if (b.isSecurityPaid && sec > 0) {
          totalCollected += sec;
          totalOnline += sec;
        }
        if (onlineAmt > 0 && !b.isRentOnlinePaid) pending += onlineAmt;
        if (onlineAmt > 0 && b.isRentOnlinePaid) {
          totalCollected += onlineAmt;
          totalOnline += onlineAmt;
        }
        if (cashAmt > 0 && !b.isRentCashPaid) pending += cashAmt;
        if (cashAmt > 0 && b.isRentCashPaid) {
          totalCollected += cashAmt;
          totalCash += cashAmt;
        }
      });

      const monthlyTotal = monthlyExpenses.reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
      const totalExpense = expenses
        .filter((e: any) => (e.month_year || '') <= m0)
        .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) + monthlyTotal;

      const profitVal = Math.round(totalCollected - totalExpense);

      setCollected(totalCollected);
      setPendingDues(pending);
      setExpense(totalExpense);
      setProfit(profitVal);
      setOnline(totalOnline);
      setCash(totalCash);
    } catch (e) {
      console.warn('useHomeFinancialStats:', e);
      setCollected(0);
      setPendingDues(0);
      setExpense(0);
      setProfit(0);
      setOnline(0);
      setCash(0);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { collected, pendingDues, expense, profit, online, cash, loading, refresh };
}
