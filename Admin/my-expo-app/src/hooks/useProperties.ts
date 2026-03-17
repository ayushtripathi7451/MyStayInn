import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/redux';
import { refreshProperties } from '../store/actions';

/**
 * SWR: Returns cached properties list immediately; dispatches background refresh on mount.
 */
export function useProperties() {
  const dispatch = useDispatch();
  const list = useSelector((s: RootState) => s.properties.list);
  const loading = useSelector((s: RootState) => s.properties.loading);
  const error = useSelector((s: RootState) => s.properties.error);

  useEffect(() => {
    dispatch(refreshProperties());
  }, [dispatch]);

  return {
    list,
    loading,
    error,
    refresh: () => dispatch(refreshProperties()),
    firstProperty: list?.length ? list[0] : null,
  };
}
