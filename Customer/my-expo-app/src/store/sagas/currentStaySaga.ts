import { call, put, select } from 'redux-saga/effects';
import { userApi, bookingApi, moveOutApi } from '../../../utils/api';
import { setCurrentStay, setCurrentStayLoading, setCurrentStayError } from '../redux/slices/currentStaySlice';
import type { RootState } from '../redux';
import type { CurrentStayProperty } from '../redux/slices/currentStaySlice';
import { pickAdminPhoneFromStay } from '../../../utils/currentStayAdminPhone';

const toBool = (v: unknown) => v === true || v === 'true' || v === 1;
type MoveOutStatusValue = 'requested' | 'accepted' | 'moved_out' | 'cancelled';

function normalizeMoveOutStatus(raw: unknown): MoveOutStatusValue | null {
  const status = String(raw ?? '').trim().toLowerCase();
  if (
    status === 'requested' ||
    status === 'accepted' ||
    status === 'moved_out' ||
    status === 'cancelled'
  ) {
    return status;
  }
  return null;
}

/**
 * Prefer effective-dues ledger when it has rows; never replace a non-empty current-stay
 * ledger with an empty array (effective-dues can omit or return [] while /customer still had rows).
 */
function mergeDailyPaymentsFromDues(booking: any, d: any): any[] | undefined {
  const fromBooking = Array.isArray(booking?.dailyPayments) ? booking.dailyPayments : [];
  const fromDues = d?.dailyPayments;
  const fromDuesArr = Array.isArray(fromDues) ? fromDues : null;
  if (fromDuesArr != null && fromDuesArr.length > 0) return fromDuesArr;
  if (fromBooking.length > 0) return fromBooking;
  if (fromDuesArr != null) return fromDuesArr;
  return fromBooking.length > 0 ? fromBooking : undefined;
}

function mergeDuesIntoBooking(booking: any, d: any): any {
  if (!booking || !d) return booking;
  const mergedDaily = mergeDailyPaymentsFromDues(booking, d);
  return {
    ...booking,
    onlinePaymentRecv: d.onlinePaymentRecv,
    cashPaymentRecv: d.cashPaymentRecv,
    isRentOnlinePaid: d.isRentOnlinePaid,
    isRentCashPaid: d.isRentCashPaid,
    isSecurityPaid: toBool(d.isSecurityPaid),
    securityDeposit: d.securityDeposit,
    currentDue: d.currentDue,
    rentPeriod: d.rentPeriod ?? booking.rentPeriod,
    rentInfoMessage: d.rentInfoMessage ?? null,
    ...(mergedDaily !== undefined ? { dailyPayments: mergedDaily } : {}),
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
  const statusStr = String(b.status || '').toLowerCase();
  const isBookingRequestedOnly = statusStr === 'enrollment_requested';
  const isPendingEnrollment =
    statusStr === 'enrollment_pending' || statusStr === 'enrollment_pay_pending';
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
  const isSecurityPaid = toBool(b.isSecurityPaid);
  const serverMoveOutStatus = normalizeMoveOutStatus(
    b.moveOutStatus ?? b.move_out_status ?? b.moveOutRequestStatus
  );
  const cardStatus = serverMoveOutStatus === 'requested'
    ? 'Move-out requested'
    : serverMoveOutStatus === 'accepted'
      ? 'Move-out accepted'
      : isBookingRequestedOnly
        ? 'Booking requested'
        : isPendingEnrollment
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
    ...(serverMoveOutStatus === 'requested' || serverMoveOutStatus === 'accepted'
      ? { moveOutStatus: serverMoveOutStatus }
      : {}),
    bgColor: 'bg-[#FFE8E8]',
    propertyType: p?.propertyType,
    roomType: r?.roomType,
    floor: r?.floor != null ? Number(r.floor) : undefined,
    latitude: (p?.latitude != null ? Number(p.latitude) : p?.coordinates?.latitude != null ? Number(p.coordinates.latitude) : undefined),
    longitude: (p?.longitude != null ? Number(p.longitude) : p?.coordinates?.longitude != null ? Number(p.coordinates.longitude) : undefined),
    currentDue: b.currentDue != null ? Number(b.currentDue) : 0,
    securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit as unknown as number) : 0,
    rules: p?.rules ?? undefined,
    ...(Array.isArray(b.bedNumbers) && b.bedNumbers.length > 0
      ? { bedNumbers: b.bedNumbers as (string | number)[] }
      : {}),
    ...(() => {
      const phone = pickAdminPhoneFromStay(p, b);
      return phone
        ? { adminPhone: phone, propertyAdminPhone: phone }
        : {};
    })(),
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
        let mergedBooking = mergeDuesIntoBooking(stay.booking, d);
        const isDay = String(mergedBooking.rentPeriod || '').toLowerCase() === 'day';
        const ledgerLen = Array.isArray(mergedBooking.dailyPayments)
          ? mergedBooking.dailyPayments.length
          : 0;
        if (isDay && ledgerLen === 0) {
          try {
            const dpRes = yield call([bookingApi, 'get'], `/api/bookings/${bidStr}/daily-payments`);
            const ledger = dpRes?.data?.dailyPayments;
            if (dpRes?.data?.success && Array.isArray(ledger) && ledger.length > 0) {
              mergedBooking = { ...mergedBooking, dailyPayments: ledger };
            }
          } catch {
            /* ignore */
          }
        }
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[CurrentStay Saga] dues merged', bidStr, {
            rentPeriod: mergedBooking.rentPeriod,
            dailyPaymentsLen: mergedBooking.dailyPayments?.length ?? 0,
            onlineDue: d.onlinePaymentRecv,
          });
        }
        out.push({
          ...stay,
          booking: mergedBooking,
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
 * Incremented in `resetClientStateBeforeNewSession` when switching accounts.
 * Any in-flight refresh from the previous JWT is ignored so Redux cannot show the last user's stay.
 */
let currentStayAccountEpoch = 0;

export function bumpCurrentStayAccountEpoch(): void {
  currentStayAccountEpoch += 1;
  currentStayFetchInFlight = false;
}

function isStaleAccountEpoch(atStart: number): boolean {
  return atStart !== currentStayAccountEpoch;
}

/**
 * Fetches current stay from user-service and merges per-booking effective dues.
 * Always loads the full stay list (no stale 5‑min skip) so new enrollments stack with existing stays.
 */
export function* refreshCurrentStaySaga(
  action: RefreshCurrentStayAction
): Generator<any, void, any> {
  const force = action.payload?.force === true;
  const accountEpochAtStart = currentStayAccountEpoch;

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
    if (isStaleAccountEpoch(accountEpochAtStart)) {
      console.log('[CurrentStay Saga] Discarding /current-stay response (account switched)');
      return;
    }
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
    if (isStaleAccountEpoch(accountEpochAtStart)) {
      console.log('[CurrentStay Saga] Discarding after dues merge (account switched)');
      return;
    }

    const rawOut = { currentStays: list };
    let mapped = list.map(mapCurrentStayToProperty).filter(Boolean) as CurrentStayProperty[];

    // Overlay latest move-out status from move-out-service on matching booking.
    // - requested => card shows Move-out requested
    // - accepted  => card shows Move-out accepted
    // - cancelled/moved_out/none => fallback to normal booking status on card
    try {
      const moveOutRes = yield call([moveOutApi, 'get'], '/api/move-out/status');
      const latest = moveOutRes?.data?.success ? moveOutRes?.data?.data : null;
      const latestStatus = normalizeMoveOutStatus(latest?.status);
      const latestBookingId = latest?.bookingId != null ? String(latest.bookingId) : '';
      if (latestStatus && latestBookingId) {
        mapped = mapped.map((stay) => {
          const stayBookingId = stay.bookingId != null ? String(stay.bookingId) : '';
          if (stayBookingId !== latestBookingId) return stay;
          if (latestStatus === 'requested') {
            return { ...stay, moveOutStatus: 'requested', status: 'Move-out requested' };
          }
          if (latestStatus === 'accepted') {
            return { ...stay, moveOutStatus: 'accepted', status: 'Move-out accepted' };
          }
          const rawBookingStatus = String(
            list.find((s: any) => String(s?.booking?.id) === stayBookingId)?.booking?.status || ''
          ).toLowerCase();
          const fallbackStatus =
            rawBookingStatus === 'enrollment_requested'
              ? 'Booking requested'
              : rawBookingStatus === 'enrollment_pay_pending' ||
                  rawBookingStatus === 'enrollment_pending'
                ? 'Pending enrollment'
                : stay.isSecurityPaid
                  ? 'Approved'
                  : 'Pending Payment';
          return { ...stay, moveOutStatus: undefined, status: fallbackStatus };
        });
      }
    } catch {
      // Keep current-stay mapping even if move-out status endpoint fails.
    }
    if (isStaleAccountEpoch(accountEpochAtStart)) {
      console.log('[CurrentStay Saga] Discarding before Redux put (account switched)');
      return;
    }
    console.log('[CurrentStay Saga] Final mapped stays:', mapped.length);
    yield put(setCurrentStay({ stays: mapped, raw: rawOut }));
  } catch (e: any) {
    if (isStaleAccountEpoch(accountEpochAtStart)) {
      return;
    }
    const status = e?.response?.status;
    const msg = e?.response?.data?.message || e?.message || 'Failed to load current stay';
    console.log('[CurrentStay Saga] Error:', msg);
    yield put(setCurrentStay({ stays: [], data: null, raw: null }));
    yield put(setCurrentStayError(status === 401 ? 'Session invalid. Try logging in again.' : msg));
  } finally {
    if (!isStaleAccountEpoch(accountEpochAtStart)) {
      currentStayFetchInFlight = false;
      yield put(setCurrentStayLoading(false));
    }
  }
}
