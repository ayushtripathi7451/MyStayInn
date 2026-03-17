import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/redux';
import { refreshTicketCounts } from '../store/actions';

/**
 * SWR: Returns cached ticket counts immediately; dispatches background refresh on mount.
 * refresh is stable (useCallback) so it won't trigger effect loops.
 */
export function useTickets() {
  const dispatch = useDispatch();
  const counts = useSelector((s: RootState) => s.tickets.counts);
  const loading = useSelector((s: RootState) => s.tickets.loading);
  const error = useSelector((s: RootState) => s.tickets.error);
  const refresh = useCallback(() => dispatch(refreshTicketCounts()), [dispatch]);

  useEffect(() => {
    dispatch(refreshTicketCounts());
  }, [dispatch]);

  return {
    openCount: counts?.open ?? 0,
    closedCount: counts?.closed ?? 0,
    counts,
    loading,
    error,
    refresh,
  };
}
