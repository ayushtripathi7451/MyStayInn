import { call, put, select } from 'redux-saga/effects';
import { userApi, api } from '../../../utils/api';
import { setUser, setUserLoading, setUserError } from '../redux/slices/userSlice';
import type { RootState } from '../redux';

/**
 * SWR: Show cached user first; background refresh updates store if data changed.
 * Uses utils/api (same axios instances as rest of app) so token and base URL are consistent.
 */
export function* refreshUser(): Generator<unknown, void, RootState> {
  const existing = (yield select((s: RootState) => s.user.data)) as RootState['user']['data'];
  if (!existing) {
    yield put(setUserLoading(true));
  }
  try {
    let user = null;
    try {
      const res = yield call([userApi, 'get'], '/api/users/me');
      user = res?.data?.user ?? null;
    } catch {
      const res = yield call([api, 'get'], '/api/auth/me');
      user = res?.data?.user ?? null;
    }
    yield put(setUser(user));
  } catch (e: any) {
    yield put(setUserError(e?.message ?? 'Failed to load user'));
  } finally {
    yield put(setUserLoading(false));
  }
}
