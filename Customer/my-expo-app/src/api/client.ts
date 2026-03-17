/**
 * API clients for each backend microservice.
 * All instances share the same auth interceptor (token from AsyncStorage).
 */
import { createApiClient, PORTS } from './axiosInstance';

export const api = createApiClient(PORTS.AUTH);
export const userApi = createApiClient(PORTS.USER);
export const ticketApi = createApiClient(PORTS.TICKET);
export const moveOutApi = createApiClient(PORTS.MOVE_OUT);
export const propertyApi = createApiClient(PORTS.PROPERTY);
export const bookingApi = createApiClient(PORTS.BOOKING);
export const transactionApi = createApiClient(PORTS.TRANSACTION);
