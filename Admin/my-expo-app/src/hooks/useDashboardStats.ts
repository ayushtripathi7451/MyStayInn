import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/redux';
import { refreshDashboardStats } from '../store/actions';

/**
 * SWR: Returns cached dashboard stats (emptyBeds, occupancyRate, enrollmentCount); dispatches background refresh on mount and when propertyId changes.
 * Pass propertyId to scope stats to the current property.
 */
export function useDashboardStats(propertyId?: string) {
  const dispatch = useDispatch();
  const emptyBeds = useSelector((s: RootState) => s.dashboard.emptyBeds);
  const occupancyRate = useSelector((s: RootState) => s.dashboard.occupancyRate);
  const enrollmentCount = useSelector((s: RootState) => s.dashboard.enrollmentCount);
  const loading = useSelector((s: RootState) => s.dashboard.loading);
  const error = useSelector((s: RootState) => s.dashboard.error);

  useEffect(() => {
    dispatch(refreshDashboardStats(propertyId));
  }, [dispatch, propertyId]);

  return {
    emptyBeds,
    occupancyRate,
    enrollmentCount,
    loading,
    error,
    refresh: () => dispatch(refreshDashboardStats(propertyId)),
  };
}
