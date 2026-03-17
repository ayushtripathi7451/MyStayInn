import { takeEvery, all } from 'redux-saga/effects';
import { refreshUser } from './userSaga';
import { refreshCurrentStaySaga } from './currentStaySaga';
import { refreshTicketCounts } from './ticketsSaga';
import { refreshMoveOutStatus } from './moveOutSaga';

export const REFRESH_USER = 'REFRESH_USER';
export const REFRESH_CURRENT_STAY = 'REFRESH_CURRENT_STAY';
export const REFRESH_TICKET_COUNTS = 'REFRESH_TICKET_COUNTS';
export const REFRESH_MOVE_OUT_STATUS = 'REFRESH_MOVE_OUT_STATUS';

export function* rootSaga() {
  yield all([
    takeEvery(REFRESH_USER, refreshUser),
    takeEvery(REFRESH_CURRENT_STAY, refreshCurrentStaySaga),
    takeEvery(REFRESH_TICKET_COUNTS, refreshTicketCounts),
    takeEvery(REFRESH_MOVE_OUT_STATUS, refreshMoveOutStatus),
  ]);
}
