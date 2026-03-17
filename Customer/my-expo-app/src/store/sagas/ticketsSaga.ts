import { call, put, select } from 'redux-saga/effects';
import { ticketApi } from '../../../utils/api';
import { setTicketCounts, setTicketsLoading, setTicketsError } from '../redux/slices/ticketsSlice';
import type { RootState } from '../redux';

/**
 * SWR: Show cached ticket counts first; background refresh updates if changed.
 * Uses utils/api so token and base URL are consistent.
 */
export function* refreshTicketCounts(): Generator<unknown, void, RootState> {
  const existing = (yield select((s: RootState) => s.tickets.counts)) as RootState['tickets']['counts'];
  if (!existing) {
    yield put(setTicketsLoading(true));
  }
  try {
    const res = yield call([ticketApi, 'get'], '/api/tickets/counts');
    const open = typeof res?.data?.open === 'number' ? res.data.open : 0;
    const closed = typeof res?.data?.closed === 'number' ? res.data.closed : 0;
    yield put(setTicketCounts({ open, closed }));
  } catch (e: any) {
    yield put(setTicketsError(e?.message ?? 'Failed to load ticket counts'));
    yield put(setTicketCounts({ open: 0, closed: 0 }));
  } finally {
    yield put(setTicketsLoading(false));
  }
}
