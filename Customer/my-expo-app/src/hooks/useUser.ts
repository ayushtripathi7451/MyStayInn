import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/redux';
import { refreshUser } from '../store/actions';

/**
 * SWR: Returns cached user immediately; dispatches background refresh on mount.
 * No loading spinner if cache exists.
 * refresh is stable (useCallback) so useFocusEffect etc. don't re-run in a loop.
 */
export function useUser() {
  const dispatch = useDispatch();
  const data = useSelector((s: RootState) => s.user.data);
  const loading = useSelector((s: RootState) => s.user.loading);
  const error = useSelector((s: RootState) => s.user.error);
  const refresh = useCallback(() => dispatch(refreshUser()), [dispatch]);

  useEffect(() => {
    dispatch(refreshUser());
  }, [dispatch]);

  return {
    data,
    loading,
    error,
    refresh,
    name: data ? `${data.firstName ?? ''} `.trim() || 'Guest' : null,
    uniqueId: data?.uniqueId ?? null,
  };
}
