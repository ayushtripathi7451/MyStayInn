import { useEffect, useState, useCallback } from 'react';
import { bookingApi, expenseApi } from '../../utils/api';
import { isBookingMovedOut, calculateMoveOutPL } from '../../utils/financialCalculations';

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
  const [moveOutPL, setMoveOutPL] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!propertyId) {
      setCollected(0);
      setPendingDues(0);
      setExpense(0);
      setProfit(0);
      setOnline(0);
      setCash(0);
      setMoveOutPL(0);
      return;
    }
    setLoading(true);
    try {
      const currentMonthIdx = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const m0 = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

      console.log(`[useHomeFinancialStats] Fetching data for month: ${m0}, propertyId: ${propertyId}`);

      const params: Record<string, string> = { includeCompleted: 'true', propertyId };
      const [bookingsRes, expensesRes, monthlyRes] = await Promise.all([
        bookingApi.get('/api/bookings/list/active-for-reports', { params, timeout: 15000 }),
        expenseApi.get(`/${propertyId}`, { timeout: 10000 }).catch(() => ({ data: {} })),
        expenseApi.get(`/monthly/${propertyId}`, { timeout: 10000 }).catch(() => ({ data: {} })),
      ]);

      const rawBookings = (bookingsRes.data?.success && Array.isArray(bookingsRes.data?.bookings)) 
        ? bookingsRes.data?.bookings 
        : [];
      
      console.log(`[useHomeFinancialStats] Raw bookings count: ${rawBookings.length}`);
      
      // Debug: Log raw bookings with daily payments
      console.log('[useHomeFinancialStats] First 3 raw bookings sample:', 
        rawBookings.slice(0, 3).map(b => ({
          id: b.id,
          rentPeriod: b.rentPeriod,
          dailyPayments: b.dailyPayments,
          dailyPaymentsCount: b.dailyPayments?.length || 0,
          sampleDailyPayment: b.dailyPayments?.[0]
        }))
      );
      
      const toBool = (v: any) => v === true || v === 'true' || v === 1;
      const num = (v: any): number => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) ? n : 0;
      };
      
      // Helper function to convert date to month key
      const toMonthKey = (d: any): string | null => {
        if (d == null) return null;
        const date = new Date(d);
        if (Number.isNaN(date.getTime())) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      };
      
      const bookings = rawBookings.map((b: any) => {
        // Debug: Log daily payments for this booking
        if (String(b.rentPeriod || 'month').toLowerCase() === 'day') {
          console.log(`[useHomeFinancialStats] Daily booking ${b.id}: dailyPayments count = ${b.dailyPayments?.length || 0}`);
          if (b.dailyPayments?.length > 0) {
            console.log(`[useHomeFinancialStats]   Sample daily payment:`, JSON.stringify(b.dailyPayments[0]));
          }
        }
        
        return {
          ...b,
          securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit) : 0,
          isSecurityPaid: toBool(b.isSecurityPaid),
          onlinePaymentRecv: b.onlinePaymentRecv != null ? Number(b.onlinePaymentRecv) : 0,
          cashPaymentRecv: b.cashPaymentRecv != null ? Number(b.cashPaymentRecv) : 0,
          isRentOnlinePaid: toBool(b.isRentOnlinePaid),
          isRentCashPaid: toBool(b.isRentCashPaid),
          moveInDate: b.moveInDate != null 
            ? (typeof b.moveInDate === 'string' 
                ? b.moveInDate 
                : new Date(b.moveInDate).toISOString?.() ?? String(b.moveInDate)) 
            : '',
          // ✅ CRITICAL: Normalize dailyPayments array with proper type conversions
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
        };
      });

      // Debug: Count total daily payments across all bookings
      const totalDailyPayments = bookings.reduce((sum, b) => sum + (b.dailyPayments?.length || 0), 0);
      console.log(`[useHomeFinancialStats] Total daily payments across all bookings: ${totalDailyPayments}`);

      const expensesData = expensesRes.data?.data ?? expensesRes.data;
      const expenses = Array.isArray(expensesData) ? expensesData : [];
      const monthlyData = monthlyRes.data?.data ?? monthlyRes.data;
      const monthlyExpenses = Array.isArray(monthlyData) ? monthlyData : [];

      let totalCollected = 0;
      let totalOnline = 0;
      let totalCash = 0;
      let pending = 0;
      let dailyPaidCount = 0;
      let dailyUnpaidCount = 0;

      console.log(`[useHomeFinancialStats] Processing ${bookings.length} bookings for month ${m0}`);

      // Calculate dues and collections for current month
      bookings.forEach((b: any) => {
        const monthKey = toMonthKey(b.moveInDate);
        const sec = Number(b.securityDeposit ?? 0);
        const moveInYm = monthKey || '';
        const rentPeriod = String(b?.rentPeriod || 'month').toLowerCase();

        // Security deposit due shown in move-in month only
        if (m0 === moveInYm && !toBool(b?.isSecurityPaid) && sec > 0) {
          pending += sec;
          console.log(`[useHomeFinancialStats] Security deposit due: ₹${sec} for booking ${b.id}`);
        }

        // Security deposit paid (collection)
        if (b.isSecurityPaid && sec > 0 && monthKey === m0) {
          totalCollected += sec;
          totalOnline += sec;
          console.log(`[useHomeFinancialStats] Security deposit collected: ₹${sec} for booking ${b.id}`);
        }

        // ✅ DAILY RENT - Process directly from dailyPayments array
        if (rentPeriod === 'day') {
          console.log(`[useHomeFinancialStats] Processing daily booking ${b.id}`);
          
          const dailyPayments = b.dailyPayments || [];
          
          // Process each daily payment for this booking
          dailyPayments.forEach((dp: any) => {
            const dpDate = new Date(dp.paymentDate);
            const dpMonthKey = toMonthKey(dpDate);
            
            // Only process payments from current month
            if (dpMonthKey !== m0) return;
            
            const dpOnlineAmount = Number(dp.onlineAmount ?? 0);
            const dpCashAmount = Number(dp.cashAmount ?? 0);
            const isPaidOnline = toBool(dp.paidOnline);
            const isPaidCash = toBool(dp.paidCash);
            
            console.log(`[useHomeFinancialStats] Daily payment on ${dp.paymentDate}: online=${dpOnlineAmount} (${isPaidOnline ? 'paid' : 'unpaid'}), cash=${dpCashAmount} (${isPaidCash ? 'paid' : 'unpaid'})`);
            
            // COLLECTIONS: Add paid amounts
            if (isPaidOnline && dpOnlineAmount > 0) {
              totalCollected += dpOnlineAmount;
              totalOnline += dpOnlineAmount;
              console.log(`[useHomeFinancialStats] + Daily online collection: ₹${dpOnlineAmount}`);
            }
            
            if (isPaidCash && dpCashAmount > 0) {
              totalCollected += dpCashAmount;
              totalCash += dpCashAmount;
              console.log(`[useHomeFinancialStats] + Daily cash collection: ₹${dpCashAmount}`);
            }
            
            // DUES: Add unpaid amounts
            if (!isPaidOnline && dpOnlineAmount > 0) {
              pending += dpOnlineAmount;
              console.log(`[useHomeFinancialStats] + Daily online due: ₹${dpOnlineAmount}`);
            }
            
            if (!isPaidCash && dpCashAmount > 0) {
              pending += dpCashAmount;
              console.log(`[useHomeFinancialStats] + Daily cash due: ₹${dpCashAmount}`);
            }
          });
          
          // Track daily booking status
          const hasUnpaid = dailyPayments.some((dp: any) => 
            (!toBool(dp.paidOnline) && Number(dp.onlineAmount ?? 0) > 0) ||
            (!toBool(dp.paidCash) && Number(dp.cashAmount ?? 0) > 0)
          );
          
          if (hasUnpaid) {
            dailyUnpaidCount++;
          } else if (dailyPayments.length > 0) {
            dailyPaidCount++;
          }
          
          // ✅ SKIP monthly rent logic for day-based bookings
          return;
        }
        
        // ✅ MONTHLY RENT - Process monthly bookings
        // Online rent due
        const onlinePaidYm = String(b.rentOnlinePaidYearMonth || '').trim();
        const onlinePaidMonths = onlinePaidYm ? onlinePaidYm.split(',').map((s: string) => s.trim()) : [];
        const schedOnline = Number(b.scheduledOnlineRent ?? 0);
        const legacyOnline = Number(b.onlinePaymentRecv) || 0;
        const onlineRent = schedOnline > 0 ? schedOnline : legacyOnline;
        
        // Check if online rent is due for current month
        let isOnlineDue = false;
        if (schedOnline > 0) {
          isOnlineDue = !onlinePaidMonths.includes(m0);
        } else {
          // Legacy logic
          isOnlineDue = !toBool(b.isRentOnlinePaid);
        }
        
        if (isOnlineDue && onlineRent > 0) {
          pending += onlineRent;
          console.log(`[useHomeFinancialStats] Monthly online due: ₹${onlineRent} for booking ${b.id}`);
        }
        
        // Check if online rent is collected for current month
        let isOnlineCollected = false;
        if (schedOnline > 0) {
          isOnlineCollected = onlinePaidMonths.includes(m0);
        } else {
          isOnlineCollected = toBool(b.isRentOnlinePaid);
        }
        
        if (isOnlineCollected && onlineRent > 0 && monthKey === m0) {
          totalCollected += onlineRent;
          totalOnline += onlineRent;
          console.log(`[useHomeFinancialStats] Monthly online collection: ₹${onlineRent} for booking ${b.id}`);
        }
        
        // Cash rent due
        const cashPaidYm = String(b.rentCashPaidYearMonth || '').trim();
        const cashPaidMonths = cashPaidYm ? cashPaidYm.split(',').map((s: string) => s.trim()) : [];
        const schedCash = Number(b.scheduledCashRent ?? 0);
        const legacyCash = Number(b.cashPaymentRecv) || 0;
        const cashRent = schedCash > 0 ? schedCash : legacyCash;
        
        // Check if cash rent is due for current month
        let isCashDue = false;
        if (schedCash > 0) {
          isCashDue = !cashPaidMonths.includes(m0);
        } else {
          isCashDue = !toBool(b.isRentCashPaid);
        }
        
        if (isCashDue && cashRent > 0) {
          pending += cashRent;
          console.log(`[useHomeFinancialStats] Monthly cash due: ₹${cashRent} for booking ${b.id}`);
        }
        
        // Check if cash rent is collected for current month
        let isCashCollected = false;
        if (schedCash > 0) {
          isCashCollected = cashPaidMonths.includes(m0);
        } else {
          isCashCollected = toBool(b.isRentCashPaid);
        }
        
        if (isCashCollected && cashRent > 0 && monthKey === m0) {
          totalCollected += cashRent;
          totalCash += cashRent;
          console.log(`[useHomeFinancialStats] Monthly cash collection: ₹${cashRent} for booking ${b.id}`);
        }
      });

      console.log(`[useHomeFinancialStats] Daily rent summary: ${dailyPaidCount} paid, ${dailyUnpaidCount} unpaid`);
      console.log(`[useHomeFinancialStats] Totals before expenses: collected=${totalCollected}, pending=${pending}, online=${totalOnline}, cash=${totalCash}`);

      // Filter expenses by current month only
      const currentMonthExpenses = expenses.filter((e: any) => (e.month_year || '') === m0);
      const currentMonthExpenseTotal = currentMonthExpenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      
      // Monthly fixed expenses (recurring) - include all that started on or before current month
      const monthlyTotal = monthlyExpenses
        .filter((m: any) => {
          const createdAt = m.created_at ?? m.createdAt ?? null;
          if (!createdAt) return true; // Include if no creation date
          const d = new Date(createdAt);
          if (Number.isNaN(d.getTime())) return true;
          const startKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return m0 >= startKey;
        })
        .reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
      
      const totalExpense = currentMonthExpenseTotal + monthlyTotal;
      const profitVal = Math.round(totalCollected - totalExpense);

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
              if (movedOutMonthKey === m0) {
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

      console.log(`[useHomeFinancialStats] Month ${m0} FINAL: collected=${totalCollected}, pending=${pending}, online=${totalOnline}, cash=${totalCash}, expense=${totalExpense}, profit=${profitVal}, moveOutPL=${moveOutPLVal}`);

      setCollected(totalCollected);
      setPendingDues(pending);
      setExpense(totalExpense);
      setProfit(profitVal);
      setOnline(totalOnline);
      setCash(totalCash);
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
