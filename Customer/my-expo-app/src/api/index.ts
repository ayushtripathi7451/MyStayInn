/**
 * Central API layer for MyStay Customer app.
 * Use these in sagas; components should dispatch actions, not call API directly.
 */
export { api, userApi, ticketApi, moveOutApi, propertyApi, bookingApi, transactionApi } from './client';
export { authApi } from './authApi';
export { userApi as userApiTyped } from './userApi';
export { ticketApi as ticketApiTyped } from './ticketApi';
export { moveOutApi as moveOutApiTyped } from './moveOutApi';
export { bookingApi as bookingApiTyped } from './bookingApi';
export type { UserMe, CurrentStayResponse } from './userApi';
export type { TicketCounts } from './ticketApi';
