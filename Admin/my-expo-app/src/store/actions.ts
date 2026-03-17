import {
  REFRESH_PROPERTIES,
  REFRESH_TICKET_COUNTS,
  REFRESH_DASHBOARD_STATS,
} from './sagas';

/** Dispatch these for SWR: show cache first, then background refresh */
export const refreshProperties = () => ({ type: REFRESH_PROPERTIES as typeof REFRESH_PROPERTIES });
export const refreshTicketCounts = () => ({ type: REFRESH_TICKET_COUNTS as typeof REFRESH_TICKET_COUNTS });
export const refreshDashboardStats = (propertyId?: string) => ({
  type: REFRESH_DASHBOARD_STATS as typeof REFRESH_DASHBOARD_STATS,
  payload: { propertyId },
});
