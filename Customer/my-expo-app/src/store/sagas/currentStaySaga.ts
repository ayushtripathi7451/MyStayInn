import { call, put, select } from 'redux-saga/effects';
import { userApi, bookingApi } from '../../../utils/api';
import { setCurrentStay, setCurrentStayLoading, setCurrentStayError } from '../redux/slices/currentStaySlice';
import type { RootState } from '../redux';
import type { CurrentStayProperty } from '../redux/slices/currentStaySlice';

/** Cache TTL: skip API if data was fetched within this window (ms) */
export const CURRENT_STAY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Exported so payment success screen can update Redux from current-stay response without waiting for saga */
export function mapCurrentStayToProperty(currentStay: any): CurrentStayProperty | null {
  if (!currentStay?.booking || !currentStay?.room) return null;
  const b = currentStay.booking;
  const r = currentStay.room;
  const p = currentStay.property;
  const address = [p?.city, p?.state].filter(Boolean).join(', ') || '';
  const isSecurityPaid = Boolean(b.isSecurityPaid);
  return {
    id: b.id,
    bookingId: b.id,
    name: r.propertyName || p?.name || 'Property',
    status: isSecurityPaid ? 'Approved' : 'Pending Payment',
    isSecurityPaid,
    roomNumber: r.roomNumber,
    monthlyRent: Number(b.rentAmount) || 0,
    checkInDate: typeof b.moveInDate === 'string' ? b.moveInDate : b.moveInDate?.substring?.(0, 10) || '',
    address,
    roomId: r.id,
    propertyId: p?.uniqueId || p?.id,
    moveOutDate: b.moveOutDate,
    bgColor: 'bg-[#FFE8E8]',
    propertyType: p?.propertyType,
    roomType: r?.roomType,
    floor: r?.floor != null ? Number(r.floor) : undefined,
    latitude: (p?.latitude != null ? Number(p.latitude) : p?.coordinates?.latitude != null ? Number(p.coordinates.latitude) : undefined),
    longitude: (p?.longitude != null ? Number(p.longitude) : p?.coordinates?.longitude != null ? Number(p.coordinates.longitude) : undefined),
    currentDue: b.currentDue != null ? Number(b.currentDue) : 0,
    securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit as unknown as number) : 0,
    rules: p?.rules ?? undefined,
  };
}

type RefreshCurrentStayAction = { type: string; payload?: { force?: boolean } };

/** Prevents multiple concurrent API calls when several REFRESH_CURRENT_STAY dispatch at once */
let currentStayFetchInFlight = false;

/**
 * Fetches current stay with cache: skip API if data exists and lastFetched is within TTL,
 * unless force is true (e.g. after user action that updates stay).
 */
export function* refreshCurrentStaySaga(
  action: RefreshCurrentStayAction
): Generator<any, void, any> {
  const force = action.payload?.force === true;

  if (currentStayFetchInFlight && !force) {
    console.log('[CurrentStay Saga] Already fetching, skipping...');
    return;
  }

  const state = (yield select((s: RootState) => ({
    data: s.currentStay.data,
    raw: s.currentStay.raw,
    lastFetchedAt: s.currentStay.lastFetchedAt,
  }))) as { data: CurrentStayProperty | null; raw: any; lastFetchedAt: number | null };

  const now = Date.now();
  const isFresh = state.lastFetchedAt != null && now - state.lastFetchedAt < CURRENT_STAY_CACHE_TTL_MS;

  console.log('[CurrentStay Saga] Starting fetch...', { force, isFresh, hasData: !!state.data });

  // Always fetch fresh data when force is true
  if (!force && state.data != null && isFresh) {
    console.log('[CurrentStay Saga] Using cached data, but will refresh dues');
    try {
      const clientNow = (() => {
        const d0 = new Date();
        const yyyy = d0.getFullYear();
        const mm = String(d0.getMonth() + 1).padStart(2, '0');
        const dd = String(d0.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();

      console.log('[CurrentStay Saga] Calling effective-dues API with now:', clientNow);
      
      const duesRes = yield call(
        [bookingApi, 'get'],
        '/api/bookings/me/effective-dues',
        { params: { now: clientNow } }
      );
      
      console.log('[CurrentStay Saga] Dues API response:', duesRes?.data);
      
      const d = duesRes?.data?.dues;
      if (duesRes?.data?.success && d && state.raw?.booking) {
        console.log('[CurrentStay Saga] Updating cached data with dues:', d);
        
        // IMPORTANT: Merge ALL booking fields, not just the dues
        const currentStay = {
          ...state.raw,
          booking: {
            ...state.raw.booking,  // Keep all original booking fields
            onlinePaymentRecv: d.onlinePaymentRecv,
            cashPaymentRecv: d.cashPaymentRecv,
            isRentOnlinePaid: d.isRentOnlinePaid,
            isRentCashPaid: d.isRentCashPaid,
            isSecurityPaid: d.isSecurityPaid,
            securityDeposit: d.securityDeposit,
            currentDue: d.currentDue,
            rentPeriod: d.rentPeriod ?? state.raw.booking.rentPeriod,  // Preserve rentPeriod
            rentInfoMessage: d.rentInfoMessage ?? null,
            // Also preserve these important fields
            scheduledOnlineRent: state.raw.booking.scheduledOnlineRent,
            scheduledCashRent: state.raw.booking.scheduledCashRent,
            rentAmount: state.raw.booking.rentAmount,
            moveInDate: state.raw.booking.moveInDate,
          },
        };
        
        console.log('[CurrentStay Saga] Updated booking with onlinePaymentRecv:', d.onlinePaymentRecv);
        console.log('[CurrentStay Saga] Updated booking rentPeriod:', currentStay.booking.rentPeriod);
        
        const mapped = mapCurrentStayToProperty(currentStay);
        yield put(setCurrentStay({ data: mapped, raw: currentStay }));
      } else {
        console.log('[CurrentStay Saga] Dues API returned no data or failed');
      }
    } catch (error) {
      console.log('[CurrentStay Saga] Failed to refresh dues:', error);
    }

    return;
  }

  currentStayFetchInFlight = true;
  if (!state.data) {
    yield put(setCurrentStayLoading(true));
  }

  try {
    console.log('[CurrentStay Saga] Fetching fresh current stay data');
    const res = yield call([userApi, 'get'], '/api/users/me/current-stay');
    const body = res?.data ?? {};
    let currentStay = body.currentStay ?? body.data?.currentStay ?? null;
    
    console.log('[CurrentStay Saga] Current stay API response:', currentStay);
    
    if (currentStay?.booking) {
      try {
        const d0 = new Date();
        const yyyy = d0.getFullYear();
        const mm = String(d0.getMonth() + 1).padStart(2, '0');
        const dd = String(d0.getDate()).padStart(2, '0');
        const clientNow = `${yyyy}-${mm}-${dd}`;
        
        console.log('[CurrentStay Saga] Calling effective-dues API with now:', clientNow);
        
        const duesRes = yield call(
          [bookingApi, 'get'], 
          '/api/bookings/me/effective-dues', 
          { params: { now: clientNow } }
        );
        
        console.log('[CurrentStay Saga] Dues API response:', duesRes?.data);
        
        const d = duesRes?.data?.dues;
        if (duesRes?.data?.success && d) {
          console.log('[CurrentStay Saga] Merging dues data:', d);
          
          // IMPORTANT: Merge ALL booking fields
          currentStay = {
            ...currentStay,
            booking: {
              ...currentStay.booking,  // Keep all original booking fields
              onlinePaymentRecv: d.onlinePaymentRecv,
              cashPaymentRecv: d.cashPaymentRecv,
              isRentOnlinePaid: d.isRentOnlinePaid,
              isRentCashPaid: d.isRentCashPaid,
              isSecurityPaid: d.isSecurityPaid,
              securityDeposit: d.securityDeposit,
              currentDue: d.currentDue,
              rentPeriod: d.rentPeriod ?? currentStay.booking.rentPeriod,  // Preserve rentPeriod
              rentInfoMessage: d.rentInfoMessage ?? null,
            },
          };
          
          console.log('[CurrentStay Saga] Updated onlinePaymentRecv to:', d.onlinePaymentRecv);
          console.log('[CurrentStay Saga] Updated rentPeriod:', currentStay.booking.rentPeriod);
        }
      } catch (error) {
        console.log('[CurrentStay Saga] Failed to fetch dues:', error);
      }
    }
    
    const data = mapCurrentStayToProperty(currentStay);
    console.log('[CurrentStay Saga] Final mapped data:', data);
    yield put(setCurrentStay({ data, raw: currentStay }));
  } catch (e: any) {
    const status = e?.response?.status;
    const msg = e?.response?.data?.message || e?.message || 'Failed to load current stay';
    console.log('[CurrentStay Saga] Error:', msg);
    yield put(setCurrentStay({ data: null, raw: null }));
    yield put(setCurrentStayError(status === 401 ? 'Session invalid. Try logging in again.' : msg));
  } finally {
    currentStayFetchInFlight = false;
    yield put(setCurrentStayLoading(false));
  }
}