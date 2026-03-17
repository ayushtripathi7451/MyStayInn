import { call, put, select } from 'redux-saga/effects';
import { propertyApi } from '../../../utils/api';
import { setProperties, setPropertiesLoading, setPropertiesError } from '../redux/slices/propertiesSlice';
import type { RootState } from '../redux';

/**
 * SWR: Show cached properties first; background refresh updates if changed.
 * Uses utils/api so token and base URL are consistent.
 */
export function* refreshProperties(): Generator<unknown, void, RootState> {
  const existing = (yield select((s: RootState) => s.properties.list)) as RootState['properties']['list'];
  if (!existing?.length) {
    yield put(setPropertiesLoading(true));
  }
  try {
    const res = yield call([propertyApi, 'get'], '/api/properties');
    const list = res?.data?.success && Array.isArray(res?.data?.properties) ? res.data.properties : [];
    yield put(setProperties(list));
  } catch (e: any) {
    yield put(setPropertiesError(e?.message ?? 'Failed to load properties'));
  } finally {
    yield put(setPropertiesLoading(false));
  }
}
