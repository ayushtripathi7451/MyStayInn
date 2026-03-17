import { bookingApi as client } from './client';

export const bookingApi = {
  getEnrollmentRequests: (params?: { status?: string }) =>
    client.get('/api/enrollment-requests', { params }),
  getBookingsByCustomer: (customerId: string) =>
    client.get(`/api/bookings/customer/${customerId}`),
};
