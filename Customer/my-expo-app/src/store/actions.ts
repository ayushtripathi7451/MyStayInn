import {
  REFRESH_USER,
  REFRESH_CURRENT_STAY,
  REFRESH_TICKET_COUNTS,
  REFRESH_MOVE_OUT_STATUS,
} from './sagas';

/** Dispatch these for SWR: show cache first, then background refresh */
export const refreshUser = () => ({ type: REFRESH_USER as typeof REFRESH_USER });
/**
 * Refresh current stay data.
 * @param options.force - if true, bypass cache and refetch (e.g. after payment, move-out, device date change)
 */
export const refreshCurrentStay = (options?: { force?: boolean }) => ({
  type: REFRESH_CURRENT_STAY as typeof REFRESH_CURRENT_STAY,
  payload: options?.force ? { force: true } : undefined,
});
export const refreshTicketCounts = () => ({ type: REFRESH_TICKET_COUNTS as typeof REFRESH_TICKET_COUNTS });
export const refreshMoveOutStatus = () => ({ type: REFRESH_MOVE_OUT_STATUS as typeof REFRESH_MOVE_OUT_STATUS });
