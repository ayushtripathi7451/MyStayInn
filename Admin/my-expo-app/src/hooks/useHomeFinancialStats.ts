import { useEffect, useState, useCallback } from 'react';
import { bookingApi, expenseApi } from '../../utils/api';
import { isBookingMovedOut, calculateMoveOutPL } from '../../utils/financialCalculations';

/**
 * Matches the exact financial logic from Reports Hub
 * Uses the same functions as financialData in ReportsHubScreen
 */
export function useHomeFinancialStats(propertyId: string | undefined) {
  const [collected, setCollected] = useState(0);
  const [pendingDues, setPendingDues] = useState(0);
  const [expense, setExpense] = useState(0);
  const [profit, setProfit] = useState(0);
  const [online, setOnline] = useState(0);
  const [cash, setCash] = useState(0);
  const [moveOutPL, setMoveOutPL] = useState(0);
  const [loading, setLoading] = useState(false);

  // Helper functions that mirror Reports Hub exactly
  const toBool = (v: any) => v === true || v === 'true' || v === 1;

  const num = (v: any): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const toMonthKeyFromDate = (d: any): string => {
    if (d == null || d === '') return '';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

  // Mirrors ReportsHub adminMonthlyOnlineDueForMonthKey exactly
  const adminMonthlyOnlineDueForMonthKey = (booking: any, monthKey: string): number => {
    const rp = String(booking?.rentPeriod || 'month').toLowerCase();
    const legacyOn = num(booking?.onlinePaymentRecv);
    const schedOn = num(booking?.scheduledOnlineRent);
    const paidYm = String(booking?.rentOnlinePaidYearMonth ?? '').trim();
    const startYm = rentStartYm(booking);
    if (startYm && monthKey < startYm) return 0;

    if (rp === 'day') {
      if (Array.isArray(booking?.dailyPayments) && booking.dailyPayments.length > 0) {
        return booking.dailyPayments
          .filter((dp: any) => {
            const dpMonthKey = toMonthKeyFromDate(dp.paymentDate);
            return (
              dpMonthKey === monthKey &&
              !toBool(dp.paidOnline) &&
              num(dp.onlineAmount) > 0
            );
          })
          .reduce((sum: number, dp: any) => sum + num(dp.onlineAmount), 0);
      }
      if (toBool(booking?.isRentOnlinePaid)) return 0;
      const ra = num(booking?.rentAmount);
      return ra > 0 ? ra : legacyOn;
    }

    if (schedOn > 0) {
      const paidMonths = paidYm ? paidYm.split(',').map((m: string) => m.trim()) : [];
      if (paidMonths.includes(monthKey)) return 0;
      return schedOn;
    }
    if (toBool(booking?.isRentOnlinePaid)) return 0;
    return legacyOn > 0 ? legacyOn : 0;
  };

  // Mirrors ReportsHub adminMonthlyCashDueForMonthKey exactly
  const adminMonthlyCashDueForMonthKey = (booking: any, monthKey: string): number => {
    const rp = String(booking?.rentPeriod || 'month').toLowerCase();
    const legacyCash = num(booking?.cashPaymentRecv);
    const schedCash = num(booking?.scheduledCashRent);
    const paidYm = String(booking?.rentCashPaidYearMonth ?? '').trim();
    const startYm = rentStartYm(booking);
    if (startYm && monthKey < startYm) return 0;

    if (rp === 'day') {
      if (Array.isArray(booking?.dailyPayments) && booking.dailyPayments.length > 0) {
        return booking.dailyPayments
          .filter((dp: any) => {
            const dpMonthKey = toMonthKeyFromDate(dp.paymentDate);
            return (
              dpMonthKey === monthKey &&
              !toBool(dp.paidCash) &&
              num(dp.cashAmount) > 0
            );
          })
          .reduce((sum: number, dp: any) => sum + num(dp.cashAmount), 0);
      }
      if (toBool(booking?.isRentCashPaid)) return 0;
      return legacyCash;
    }

    if (schedCash > 0) {
      const paidMonths = paidYm ? paidYm.split(',').map((m: string) => m.trim()) : [];
      if (paidMonths.includes(monthKey)) return 0;
      return schedCash;
    }
    if (toBool(booking?.isRentCashPaid)) return 0;
    return legacyCash > 0 ? legacyCash : 0;
  };

  // Mirrors ReportsHub collectionsForMonthKeyFromBookings exactly, but keeps security deposit separate
  const collectionsForMonthKeyFromBookings = (bookings: any[], monthKey: string): {
    total: number;
    securityTotal: number;
    onlineTotal: number;
    cashTotal: number;
  } => {
    let total = 0;
    let securityTotal = 0;
    let onlineTotal = 0;
    let cashTotal = 0;

    bookings.forEach((b: any) => {
      const rp = String(b.rentPeriod || 'month').toLowerCase();
      const moveInMonthKey = toMonthKeyFromDate(b.moveInDate);

      // Security deposit — counted in move-in month only (not revenue)
      if (moveInMonthKey === monthKey) {
        const sec = num(b.securityDeposit);
        if (toBool(b.isSecurityPaid) && sec > 0) {
          securityTotal += sec;
        }
      }

      // Daily rent — iterate dailyPayments for paid amounts
      if (rp === 'day') {
        const dailyPayments = Array.isArray(b.dailyPayments) ? b.dailyPayments : [];
        dailyPayments.forEach((dp: any) => {
          const dpMonthKey = toMonthKeyFromDate(dp.paymentDate);
          if (dpMonthKey === monthKey) {
            if (toBool(dp.paidOnline) && num(dp.onlineAmount) > 0) {
              total += num(dp.onlineAmount);
              onlineTotal += num(dp.onlineAmount);
            }
            if (toBool(dp.paidCash) && num(dp.cashAmount) > 0) {
              total += num(dp.cashAmount);
              cashTotal += num(dp.cashAmount);
            }
          }
        });
        return; // Skip monthly logic for day-based bookings
      }

      // Monthly online rent
      const onlinePaidYm = String(b.rentOnlinePaidYearMonth || '').trim();
      const onlinePaidMonths = onlinePaidYm
        ? onlinePaidYm.split(',').map((m: string) => m.trim()).filter(Boolean)
        : [];
      const schedOnline = num(b.scheduledOnlineRent);
      const legacyOnline = num(b.onlinePaymentRecv);

      if (schedOnline > 0 && onlinePaidMonths.includes(monthKey)) {
        total += schedOnline;
        onlineTotal += schedOnline;
      } else if (legacyOnline > 0 && toBool(b.isRentOnlinePaid) && moveInMonthKey === monthKey) {
        total += legacyOnline;
        onlineTotal += legacyOnline;
      }

      // Monthly cash rent
      const cashPaidYm = String(b.rentCashPaidYearMonth || '').trim();
      const cashPaidMonths = cashPaidYm
        ? cashPaidYm.split(',').map((m: string) => m.trim()).filter(Boolean)
        : [];
      const schedCash = num(b.scheduledCashRent);
      const legacyCash = num(b.cashPaymentRecv);

      if (schedCash > 0 && cashPaidMonths.includes(monthKey)) {
        total += schedCash;
        cashTotal += schedCash;
      } else if (legacyCash > 0 && toBool(b.isRentCashPaid) && moveInMonthKey === monthKey) {
        total += legacyCash;
        cashTotal += legacyCash;
      }
    });

    return { total, securityTotal, onlineTotal, cashTotal };
  };

  const refresh = useCallback(async () => {
    if (!propertyId) {
      setCollected(0);
      setPendingDues(0);
      setExpense(0);
      setProfit(0);
      setOnline(0);
      setCash(0);
      setMoveOutPL(0);
      setMoveOutPL(0);
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      console.log(`[useHomeFinancialStats] Fetching data for month: ${currentMonthKey}`);

      const params: Record<string, string> = { includeCompleted: 'true', propertyId };
      const [bookingsRes, expensesRes, monthlyRes] = await Promise.all([
        bookingApi.get('/api/bookings/list/active-for-reports', { params, timeout: 15000 }),
        expenseApi.get(`/${propertyId}`, { timeout: 10000 }).catch(() => ({ data: {} })),
        expenseApi.get(`/monthly/${propertyId}`, { timeout: 10000 }).catch(() => ({ data: {} })),
      ]);

      const rawBookings =
        bookingsRes.data?.success && Array.isArray(bookingsRes.data?.bookings)
          ? bookingsRes.data.bookings
          : [];

      // Normalize bookings — identical to ReportsHubScreen normalization
      const bookings = rawBookings.map((b: any) => ({
        ...b,
        securityDeposit: b.securityDeposit != null ? num(b.securityDeposit) : 0,
        isSecurityPaid: toBool(b.isSecurityPaid),
        isSecurityPaidOnline: toBool(b.isSecurityPaidOnline),
        onlinePaymentRecv: b.onlinePaymentRecv != null ? num(b.onlinePaymentRecv) : 0,
        cashPaymentRecv: b.cashPaymentRecv != null ? num(b.cashPaymentRecv) : 0,
        isRentOnlinePaid: toBool(b.isRentOnlinePaid),
        isRentCashPaid: toBool(b.isRentCashPaid),
        // CRITICAL: normalize every field inside dailyPayments with toBool + num
        dailyPayments: Array.isArray(b.dailyPayments)
          ? b.dailyPayments.map((dp: any) => ({
              id: dp.id?.toString?.() ?? String(dp.id || ''),
              paymentDate: dp.paymentDate,
              amount: num(dp.amount),
              paidOnline: toBool(dp.paidOnline),   // API may send string "true"/"false"
              paidCash: toBool(dp.paidCash),        // API may send string "true"/"false"
              onlineAmount: num(dp.onlineAmount),
              cashAmount: num(dp.cashAmount),
            }))
          : [],
        moveInDate:
          b.moveInDate != null
            ? typeof b.moveInDate === 'string'
              ? b.moveInDate
              : new Date(b.moveInDate).toISOString?.() ?? String(b.moveInDate)
            : '',
      }));

      // ── Collections for current month ──────────────────────────────────────
      const {
        total: collections,
        securityTotal: securityDeposits,
        onlineTotal: onlineTotalFromCollections,
        cashTotal: cashTotalFromCollections,
      } = collectionsForMonthKeyFromBookings(bookings, currentMonthKey);

      // ── Online / Cash split for current month (will be replaced by collections split)
      let onlineTotal = onlineTotalFromCollections;
      let cashTotal = cashTotalFromCollections;

      bookings.forEach((b: any) => {
        const rp = String(b.rentPeriod || 'month').toLowerCase();
        const moveInMonthKey = toMonthKeyFromDate(b.moveInDate);

        // Security deposit (counts as online collection in move-in month)
        if (moveInMonthKey === currentMonthKey) {
          const sec = num(b.securityDeposit);
          if (toBool(b.isSecurityPaid) && sec > 0) {
            onlineTotal += sec;
          }
        }

        // Daily rent online/cash split
        if (rp === 'day') {
          const dailyPayments = Array.isArray(b.dailyPayments) ? b.dailyPayments : [];
          dailyPayments.forEach((dp: any) => {
            const dpMonthKey = toMonthKeyFromDate(dp.paymentDate);
            if (dpMonthKey === currentMonthKey) {
              if (toBool(dp.paidOnline) && num(dp.onlineAmount) > 0) {
                onlineTotal += num(dp.onlineAmount);
              }
              if (toBool(dp.paidCash) && num(dp.cashAmount) > 0) {
                cashTotal += num(dp.cashAmount);
              }
            }
          });
          return; // skip monthly logic
        }

        // Monthly online rent
        const onlinePaidYm = String(b.rentOnlinePaidYearMonth || '').trim();
        const onlinePaidMonths = onlinePaidYm
          ? onlinePaidYm.split(',').map((s: string) => s.trim())
          : [];
        const schedOnline = num(b.scheduledOnlineRent);
        const legacyOnline = num(b.onlinePaymentRecv);

        if (schedOnline > 0 && onlinePaidMonths.includes(currentMonthKey)) {
          onlineTotal += schedOnline;
        } else if (
          legacyOnline > 0 &&
          toBool(b.isRentOnlinePaid) &&
          moveInMonthKey === currentMonthKey
        ) {
          onlineTotal += legacyOnline;
        }

        // Monthly cash rent
        const cashPaidYm = String(b.rentCashPaidYearMonth || '').trim();
        const cashPaidMonths = cashPaidYm
          ? cashPaidYm.split(',').map((s: string) => s.trim())
          : [];
        const schedCash = num(b.scheduledCashRent);
        const legacyCash = num(b.cashPaymentRecv);

        if (schedCash > 0 && cashPaidMonths.includes(currentMonthKey)) {
          cashTotal += schedCash;
        } else if (
          legacyCash > 0 &&
          toBool(b.isRentCashPaid) &&
          moveInMonthKey === currentMonthKey
        ) {
          cashTotal += legacyCash;
        }
      });

      // ── Pending dues for current month ────────────────────────────────────
      // Mirrors ReportsHub pendingDuesByMonth logic for the current month key
      let pending = 0;

      bookings.forEach((b: any) => {
        const moveInMonthKey = toMonthKeyFromDate(b.moveInDate);
        const rp = String(b.rentPeriod || 'month').toLowerCase();
        const status = String(b.status || '').toLowerCase();
        const isMovedOut = status === 'completed' || status === 'moved_out';
        const sec = num(b.securityDeposit);

        // Security deposit due in move-in month only
        if (currentMonthKey === moveInMonthKey && !toBool(b.isSecurityPaid) && sec > 0 && !isMovedOut) {
          pending += sec;
        }

        // Day rent: log each unpaid daily split exactly like Reports Hub style.
        if (rp === 'day' && Array.isArray(b.dailyPayments) && b.dailyPayments.length > 0) {
          b.dailyPayments.forEach((dp: any) => {
            const dpMonthKey = toMonthKeyFromDate(dp.paymentDate);
            if (dpMonthKey !== currentMonthKey) return;

            const onlineAmount = num(dp.onlineAmount);
            const cashAmount = num(dp.cashAmount);
            const paidOnline = toBool(dp.paidOnline);
            const paidCash = toBool(dp.paidCash);

            if (!paidOnline && onlineAmount > 0) {
              pending += onlineAmount;
              console.log(
                `[Home] Added daily online due: month=${currentMonthKey}, amount=${onlineAmount}, total=${pending}`
              );
            }
            if (!paidCash && cashAmount > 0) {
              pending += cashAmount;
              console.log(
                `[Home] Added daily cash due: month=${currentMonthKey}, amount=${cashAmount}, total=${pending}`
              );
            }
          });
          return;
        }

        const onlineDue = adminMonthlyOnlineDueForMonthKey(b, currentMonthKey);
        const cashDue = adminMonthlyCashDueForMonthKey(b, currentMonthKey);

        if (onlineDue > 0) pending += onlineDue;
        if (cashDue > 0) pending += cashDue;
      });

      // ── Expenses ──────────────────────────────────────────────────────────
      const expensesData = expensesRes.data?.data ?? expensesRes.data;
      const expenses = Array.isArray(expensesData) ? expensesData : [];
      const monthlyData = monthlyRes.data?.data ?? monthlyRes.data;
      const monthlyExpenses = Array.isArray(monthlyData) ? monthlyData : [];

      const fixedExpenseTotal = expenses
        .filter((e: any) => (e.month_year || '') === currentMonthKey)
        .reduce((s: number, e: any) => s + (num(e.amount) || 0), 0);

      const monthlyRecurringTotal = monthlyExpenses
        .filter((m: any) => {
          const createdAt = m.created_at ?? m.createdAt ?? null;
          if (!createdAt) return true;
          const d = new Date(createdAt);
          if (Number.isNaN(d.getTime())) return true;
          const startKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return currentMonthKey >= startKey;
        })
        .reduce((s: number, m: any) => s + (num(m.amount) || 0), 0);

      const totalExpense = fixedExpenseTotal + monthlyRecurringTotal;
      const profitVal = Math.round(collections - totalExpense);

      // Calculate MoveOut P/L for current month
      let moveOutPLVal = 0;
      bookings.forEach((b: any) => {
        if (isBookingMovedOut(b)) {
          const moveOutData = b.moveOutRequest;
          if (moveOutData) {
            // Check if this booking moved out in the current month
            const movedOutAt = moveOutData.movedOutAt || moveOutData.completedAt;
            if (movedOutAt) {
              const movedOutDate = new Date(movedOutAt);
              const movedOutMonthKey = `${movedOutDate.getFullYear()}-${String(movedOutDate.getMonth() + 1).padStart(2, '0')}`;
              if (movedOutMonthKey === currentMonthKey) {
                // Calculate MoveOut P/L for this booking
                const plData = calculateMoveOutPL(
                  moveOutData.currentDue || 0,
                  moveOutData.securityDepositAmount || 0,
                  moveOutData.securityDepositReturned || 0
                );
                moveOutPLVal += plData.moveOutPL;
              }
            }
          }
        }
      });

      console.log(
        `[useHomeFinancialStats] Month ${currentMonthKey}: ` +
          `rentCollections=${collections}, securityDeposits=${securityDeposits}, online=${onlineTotal}, cash=${cashTotal}, ` +
          `pending=${pending}, expense=${totalExpense}, profit=${profitVal}, moveOutPL=${moveOutPLVal}`
      );

      setCollected(collections);
      setPendingDues(pending);
      setExpense(totalExpense);
      setProfit(profitVal);
      setOnline(onlineTotal);
      setCash(cashTotal);
      setMoveOutPL(moveOutPLVal);
    } catch (e) {
      console.warn('[useHomeFinancialStats] Error:', e);
      setCollected(0);
      setPendingDues(0);
      setExpense(0);
      setProfit(0);
      setOnline(0);
      setCash(0);
      setMoveOutPL(0);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { collected, pendingDues, expense, profit, online, cash, moveOutPL, loading, refresh };
}