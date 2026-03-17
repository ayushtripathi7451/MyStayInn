import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/redux';
import { refreshMoveOutStatus } from '../store/actions';

/**
 * SWR: Returns cached move-out status immediately; dispatches background refresh on mount.
 * refresh is stable (useCallback) so it won't trigger effect loops.
 */
export function useMoveOut() {
  const dispatch = useDispatch();
  const data = useSelector((s: RootState) => s.moveOut.data);
  const loading = useSelector((s: RootState) => s.moveOut.loading);
  const error = useSelector((s: RootState) => s.moveOut.error);
  const refresh = useCallback(() => dispatch(refreshMoveOutStatus()), [dispatch]);

  useEffect(() => {
    dispatch(refreshMoveOutStatus());
  }, [dispatch]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
