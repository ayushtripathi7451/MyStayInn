import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/redux';
import type { CurrentStayProperty } from '../store/redux/slices/currentStaySlice';
import { refreshCurrentStay } from '../store/actions';

/**
 * Current stay with cache: data is stored in Redux; API is called only when
 * data is missing, older than 5 minutes, or refresh(force: true) is used.
 * Initial fetch is triggered once by HomeScreen; use refresh() on focus only where needed.
 */
export function useCurrentStay(): {
  data: CurrentStayProperty | null;
  raw: any;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  refresh: (force?: boolean) => void;
} {
  const dispatch = useDispatch();
  const data = useSelector((s: RootState) => s.currentStay.data);
  const raw = useSelector((s: RootState) => s.currentStay.raw);
  const loading = useSelector((s: RootState) => s.currentStay.loading);
  const error = useSelector((s: RootState) => s.currentStay.error);
  const lastFetchedAt = useSelector((s: RootState) => s.currentStay.lastFetchedAt);

  const refresh = useCallback(
    (force?: boolean) => dispatch(refreshCurrentStay(force)),
    [dispatch]
  );

  return {
    data,
    raw,
    loading,
    error,
    lastFetchedAt,
    refresh,
  };
}
