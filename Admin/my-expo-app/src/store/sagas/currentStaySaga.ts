import { call, put, select } from 'redux-saga/effects';
import { userApi, bookingApi } from '../../../utils/api';
import { setCurrentStay, setCurrentStayLoading, setCurrentStayError } from '../redux/slices/currentStaySlice';
import type { RootState } from '../redux';
import type { CurrentStayProperty } from '../redux/slices/currentStaySlice';

function mergeDuesIntoBooking(booking: any, d: any): any {
  if (!booking || !d) return booking;
  return {
    ...booking,
    onlinePaymentRecv: d.onlinePaymentRecv,
    cashPaymentRecv: d.cashPaymentRecv,
    isRentOnlinePaid: d.isRentOnlinePaid,
    isRentCashPaid: d.isRentCashPaid,
    isSecurityPaid: d.isSecurityPaid,
    securityDeposit: d.securityDeposit,
    currentDue: d.currentDue,
    rentPeriod: d.rentPeriod ?? booking.rentPeriod,
    rentInfoMessage: d.rentInfoMessage ?? null,
    dailyPayments: Array.isArray(d.dailyPayments) ? d.dailyPayments : booking.dailyPayments || [],
    scheduledOnlineRent:
      d.scheduledOnlineRent != null ? d.scheduledOnlineRent : booking.scheduledOnlineRent,
    scheduledCashRent:
      d.scheduledCashRent != null ? d.scheduledCashRent : booking.scheduledCashRent,
    rentAmount: booking.rentAmount,
    moveInDate: booking.moveInDate,
    rentOnlinePaidYearMonth: d.rentOnlinePaidYearMonth ?? booking.rentOnlinePaidYearMonth,
  };
}

/** Normalize raw (legacy single stay or `{ currentStays }`) to a list of stay objects. */
export function normalizeRawToStays(raw: any): any[] {
  if (!raw) return [];
  // Prefer multi-stay shape whenever present (even empty) — do not fall back to legacy single
  // stay, or a new enrollment + old booking would collapse to one card until cache expires.
  if (Array.isArray(raw.currentStays)) return raw.currentStays;
  if (raw.booking && raw.room) return [raw];
  return [];
}

/** Exported so payment success screen can update Redux from current-stay response without waiting for saga */
export function mapCurrentStayToProperty(currentStay: any): CurrentStayProperty | null {
  if (!currentStay?.booking) return null;
  const b = currentStay.booking;
  const statusStr = String(b.status || '');
  const isEnrollmentPending =
    statusStr === 'enrollment_pending' ||
    statusStr === 'enrollment_pay_pending' ||
    statusStr === 'enrollment_requested';
  const p = currentStay.property;
  const r = currentStay.room || {
    id: b.roomId,
    roomNumber: '—',
    propertyName: p?.name || 'Property',
    roomType: undefined,
    floor: undefined,
    pricePerMonth: undefined,
  };
  const address = [p?.city, p?.state].filter(Boolean).join(', ') || '';
  const isSecurityPaid = Boolean(b.isSecurityPaid);
  const cardStatus = isEnrollmentPending
    ? 'Pending enrollment'
    : isSecurityPaid
      ? 'Approved'
      : 'Pending Payment';
  return {
    id: b.id,
    bookingId: b.id,
    name: r.propertyName || p?.name || 'Property',
    status: cardStatus,
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

function* mergeEffectiveDuesIntoStaysList(
  stays: any[],
  clientNow: string
): Generator<any, any[], any> {
  const out: any[] = [];
  for (const stay of stays) {
    const bid = stay?.booking?.id;
    if (!bid) {
      out.push(stay);
      continue;
    }
    const bidStr = String(bid);
    if (bidStr.startsWith('enrollment:') || stay?.booking?.status === 'enrollment_pending' || stay?.booking?.status === 'enrollment_pay_pending') {
      out.push(stay);
      continue;
    }
    if (!/^\d+$/.test(bidStr)) {
      out.push(stay);
      continue;
    }
    try {
      const duesRes = yield call([bookingApi, 'get'], '/api/bookings/me/effective-dues', {
        params: { now: clientNow, bookingId: bidStr },
      });
      const d = duesRes?.data?.dues;
      if (duesRes?.data?.success && d && stay.booking) {
        out.push({
          ...stay,
          booking: mergeDuesIntoBooking(stay.booking, d),
        });
      } else {
        out.push(stay);
      }
    } catch {
      out.push(stay);
    }
  }
  return out;
}

type RefreshCurrentStayAction = { type: string; payload?: { force?: boolean } };

/** Prevents multiple concurrent API calls when several REFRESH_CURRENT_STAY dispatch at once */
let currentStayFetchInFlight = false;

/**
 * Fetches current stay from user-service and merges per-booking effective dues.
 * Always loads the full stay list (no stale 5‑min skip) so new enrollments stack with existing stays.
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

  console.log('[CurrentStay Saga] Starting fetch...', { force, hasData: !!state.data });

  const clientNow = (() => {
    const d0 = new Date();
    const yyyy = d0.getFullYear();
    const mm = String(d0.getMonth() + 1).padStart(2, '0');
    const dd = String(d0.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  // Always refetch /current-stay when this saga runs (except duplicate in-flight handled below).
  // A 5‑min "fresh cache" skip caused stale single-stay state after new enrollments; previous
  // property cards and dues disappeared until pull-to-refresh.

  currentStayFetchInFlight = true;
  if (!state.data) {
    yield put(setCurrentStayLoading(true));
  }

  try {
    console.log('[CurrentStay Saga] Fetching fresh current stay data');
    const res = yield call([userApi, 'get'], '/api/users/me/current-stay', {
      params: { now: clientNow },
    });
    const body = res?.data ?? {};
    let list: any[] = [];
    if (Array.isArray(body.currentStays) && body.currentStays.length > 0) {
      list = body.currentStays;
    } else if (Array.isArray(body.data?.currentStays) && body.data.currentStays.length > 0) {
      list = body.data.currentStays;
    } else if (body.currentStay) {
      list = [body.currentStay];
    } else if (body.data?.currentStay) {
      list = [body.data.currentStay];
    }

    console.log('[CurrentStay Saga] Current stay API list length:', list.length);

    if (list.some((s) => s?.booking)) {
      list = yield* mergeEffectiveDuesIntoStaysList(list, clientNow);
    }

    const rawOut = { currentStays: list };
    const mapped = list.map(mapCurrentStayToProperty).filter(Boolean) as CurrentStayProperty[];
    console.log('[CurrentStay Saga] Final mapped stays:', mapped.length);
    yield put(setCurrentStay({ stays: mapped, raw: rawOut }));
  } catch (e: any) {
    const status = e?.response?.status;
    const msg = e?.response?.data?.message || e?.message || 'Failed to load current stay';
    console.log('[CurrentStay Saga] Error:', msg);
    yield put(setCurrentStay({ stays: [], data: null, raw: null }));
    yield put(setCurrentStayError(status === 401 ? 'Session invalid. Try logging in again.' : msg));
  } finally {
    currentStayFetchInFlight = false;
    yield put(setCurrentStayLoading(false));
  }
}
