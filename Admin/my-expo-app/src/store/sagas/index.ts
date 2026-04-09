import { takeEvery, all } from 'redux-saga/effects';
import { refreshProperties } from './propertiesSaga';
import { refreshTicketCounts } from './ticketsSaga';
import { refreshDashboardStats } from './dashboardSaga';
import { refreshCurrentStaySaga } from './currentStaySaga';

export const REFRESH_PROPERTIES = 'REFRESH_PROPERTIES';
export const REFRESH_TICKET_COUNTS = 'REFRESH_TICKET_COUNTS';
export const REFRESH_DASHBOARD_STATS = 'REFRESH_DASHBOARD_STATS';
export const REFRESH_CURRENT_STAY = 'REFRESH_CURRENT_STAY';

export function* rootSaga() {
  yield all([
    takeEvery(REFRESH_PROPERTIES, refreshProperties),
    takeEvery(REFRESH_TICKET_COUNTS, refreshTicketCounts),
    takeEvery(REFRESH_DASHBOARD_STATS, refreshDashboardStats),
    takeEvery(REFRESH_CURRENT_STAY, refreshCurrentStaySaga),
  ]);
}
