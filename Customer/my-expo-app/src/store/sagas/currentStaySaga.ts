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
    securityDeposit:
      b.securityDeposit != null ? Number(b.securityDeposit as unknown as number) : 0,
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

  if (currentStayFetchInFlight && !force) return;

  const state = (yield select((s: RootState) => ({
    data: s.currentStay.data,
    lastFetchedAt: s.currentStay.lastFetchedAt,
  }))) as { data: CurrentStayProperty | null; lastFetchedAt: number | null };

  const now = Date.now();
  const isFresh =
    state.lastFetchedAt != null && now - state.lastFetchedAt < CURRENT_STAY_CACHE_TTL_MS;

  if (!force && state.data != null && isFresh) {
    return; // skip API; use cached data
  }

  currentStayFetchInFlight = true;
  if (!state.data) {
    yield put(setCurrentStayLoading(true));
  }

  try {
    const res = yield call([userApi, 'get'], '/api/users/me/current-stay');
    const body = res?.data ?? {};
    let currentStay = body.currentStay ?? body.data?.currentStay ?? null;
    if (currentStay?.booking) {
      try {
        const clientNow = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (device date)
        const duesRes = yield call([bookingApi, 'get'], '/api/bookings/me/effective-dues', { params: { now: clientNow } });
        const d = duesRes?.data?.dues;
        if (duesRes?.data?.success && d) {
          currentStay = {
            ...currentStay,
            booking: {
              ...currentStay.booking,
              onlinePaymentRecv: d.onlinePaymentRecv,
              cashPaymentRecv: d.cashPaymentRecv,
              isRentOnlinePaid: d.isRentOnlinePaid,
              isRentCashPaid: d.isRentCashPaid,
              isSecurityPaid: d.isSecurityPaid,
              securityDeposit: d.securityDeposit,
              currentDue: d.currentDue,
              rentPeriod: d.rentPeriod ?? currentStay.booking.rentPeriod,
              rentInfoMessage: d.rentInfoMessage ?? null,
            },
          };
        }
      } catch {
        /* booking-service optional */
      }
    }
    const data = mapCurrentStayToProperty(currentStay);
    yield put(setCurrentStay({ data, raw: currentStay }));
  } catch (e: any) {
    const status = e?.response?.status;
    const msg = e?.response?.data?.message || e?.message || 'Failed to load current stay';
    yield put(setCurrentStay({ data: null, raw: null })); // clear stale data on error
    yield put(setCurrentStayError(status === 401 ? 'Session invalid. Try logging in again.' : msg));
  } finally {
    currentStayFetchInFlight = false;
    yield put(setCurrentStayLoading(false));
  }
}
