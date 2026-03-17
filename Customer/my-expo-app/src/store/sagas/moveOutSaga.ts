import { call, put, select } from 'redux-saga/effects';
import { moveOutApi } from '../../../utils/api';
import { setMoveOut, setMoveOutLoading, setMoveOutError } from '../redux/slices/moveOutSlice';
import type { RootState } from '../redux';

/**
 * SWR: Show cached move-out status first; background refresh updates if changed.
 * Uses utils/api so token and base URL are consistent.
 */
export function* refreshMoveOutStatus(): Generator<unknown, void, RootState> {
  const existing = (yield select((s: RootState) => s.moveOut.data)) as RootState['moveOut']['data'];
  if (!existing) {
    yield put(setMoveOutLoading(true));
  }
  try {
    const res = yield call([moveOutApi, 'get'], '/api/move-out/status');
    yield put(setMoveOut(res?.data ?? null));
  } catch (e: any) {
    yield put(setMoveOutError(e?.message ?? 'Failed to load move-out status'));
  } finally {
    yield put(setMoveOutLoading(false));
  }
}
