import { call, put } from 'redux-saga/effects';
import { bookingApi } from '../../../utils/api';
import {
  setDashboardStats,
  setDashboardLoading,
  setDashboardError,
} from '../redux/slices/dashboardSlice';

/**
 * SWR: Show cached dashboard stats first; background refresh updates if changed.
 * Action payload.propertyId: optional – when set, stats are scoped to that property (uniqueId or id).
 */
export function* refreshDashboardStats(action: { type: string; payload?: { propertyId?: string } }): Generator {
  const propertyId = action?.payload?.propertyId;
  // Clear stale numbers immediately when switching property or refetching (avoids showing previous property's stats).
  yield put(setDashboardLoading(true));
  yield put(
    setDashboardStats({
      emptyBeds: null,
      occupancyRate: null,
      enrollmentCount: null,
    })
  );
  try {
    const params = propertyId ? { params: { propertyId } } : {};
    const [statsRes, countRes] = yield call(() =>
      Promise.all([
        bookingApi.get('/api/bookings/dashboard-stats', params),
        bookingApi.get('/api/enrollment-requests/count', params),
      ])
    );
    const emptyBeds =
      statsRes?.data?.success && typeof statsRes.data.emptyBeds === 'number'
        ? statsRes.data.emptyBeds
        : 0;
    const occupancyRate =
      statsRes?.data?.success && typeof statsRes.data.occupancyRate === 'number'
        ? statsRes.data.occupancyRate
        : 0;
    const enrollmentCount =
      countRes?.data?.success && typeof countRes.data.count === 'number' ? countRes.data.count : 0;
    yield put(setDashboardStats({ emptyBeds, occupancyRate, enrollmentCount }));
  } catch (e: any) {
    yield put(setDashboardError(e?.message ?? 'Failed to load dashboard stats'));
    yield put(setDashboardStats({ emptyBeds: 0, occupancyRate: 0, enrollmentCount: 0 }));
  } finally {
    yield put(setDashboardLoading(false));
  }
}
