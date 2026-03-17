// Move-Out Management API Service (Customer App)

import axios from 'axios';
import {
  MoveOutRequest,
  MoveOutRequestResponse,
  MoveOutStatusResponse,
  MoveOutRequestForm,
  MoveOutNotification
} from '../types/moveout';

const BASE_URL = 'http://10.207.94.167:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Add Firebase auth token here
  // const token = await getAuthToken();
  // config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export class CustomerMoveOutService {
  // Submit move-out request (enhanced)
  static async submitMoveOutRequest(requestData: {
    bookingId: string;
    requestedDate: string;
    reason: string;
    customerComments?: string;
  }): Promise<{ success: boolean; data?: { requestId: string }; error?: string }> {
    try {
      const response = await api.post('/move-out/request', requestData);
      return response.data;
    } catch (error) {
      console.error('Error submitting move-out request:', error);
      return { success: false, error: 'Failed to submit move-out request' };
    }
  }

  // Get booking details for move-out
  static async getBookingDetails(): Promise<{
    success: boolean;
    data?: {
      bookingId: string;
      propertyName: string;
      roomNumber: string;
      checkInDate: Date;
      monthlyRent: number;
      securityDeposit: number;
      noticePeriodDays: number;
    };
    error?: string;
  }> {
    try {
      const response = await api.get('/move-out/booking-details');
      return response.data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return { success: false, error: 'Failed to fetch booking details' };
    }
  }

  // Validate move-out date (enhanced)
  static async validateMoveOutDate(params: {
    moveOutDate: string;
    bookingId: string;
  }): Promise<{
    success: boolean;
    data?: {
      isValid: boolean;
      noticePeriodDays: number;
      isWithinNotice: boolean;
      penaltyAmount?: number;
      warningMessage?: string;
    };
    error?: string;
  }> {
    try {
      const response = await api.post('/move-out/validate-date', params);
      return response.data;
    } catch (error) {
      console.error('Error validating move-out date:', error);
      return { success: false, error: 'Failed to validate move-out date' };
    }
  }

  // Get current move-out request status
  static async getMoveOutStatus(): Promise<MoveOutStatusResponse> {
    try {
      const response = await api.get('/move-out/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching move-out status:', error);
      return { success: false, error: 'Failed to fetch move-out status' };
    }
  }

  // Get specific move-out request details
  static async getMoveOutRequest(requestId: string): Promise<MoveOutRequestResponse> {
    try {
      const response = await api.get(`/move-out/request/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching move-out request:', error);
      return { success: false, error: 'Failed to fetch move-out request' };
    }
  }

  // Update move-out request (if allowed)
  static async updateMoveOutRequest(
    requestId: string,
    updateData: Partial<MoveOutRequestForm>
  ): Promise<MoveOutRequestResponse> {
    try {
      const response = await api.put(`/move-out/request/${requestId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating move-out request:', error);
      return { success: false, error: 'Failed to update move-out request' };
    }
  }

  // Cancel move-out request (if allowed)
  static async cancelMoveOutRequest(requestId: string): Promise<MoveOutRequestResponse> {
    try {
      const response = await api.delete(`/move-out/request/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling move-out request:', error);
      return { success: false, error: 'Failed to cancel move-out request' };
    }
  }

  // Get move-out notifications
  static async getMoveOutNotifications(): Promise<{
    success: boolean;
    data?: MoveOutNotification[];
    error?: string;
  }> {
    try {
      const response = await api.get('/move-out/notifications');
      return response.data;
    } catch (error) {
      console.error('Error fetching move-out notifications:', error);
      return { success: false, error: 'Failed to fetch notifications' };
    }
  }

  // Mark notification as read
  static async markNotificationRead(notificationId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await api.put(`/move-out/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  // Validate move-out date against notice period
  static async validateMoveOutDate(
    requestedDate: string
  ): Promise<{
    success: boolean;
    data?: {
      isValid: boolean;
      noticePeriodDays: number;
      isWithinNotice: boolean;
      penaltyAmount?: number;
      warningMessage?: string;
    };
    error?: string;
  }> {
    try {
      const response = await api.post('/move-out/validate-date', { requestedDate });
      return response.data;
    } catch (error) {
      console.error('Error validating move-out date:', error);
      return { success: false, error: 'Failed to validate move-out date' };
    }
  }

  // Get current booking details for move-out
  static async getCurrentBookingDetails(): Promise<{
    success: boolean;
    data?: {
      bookingId: string;
      propertyName: string;
      roomNumber: string;
      checkInDate: string;
      monthlyRent: number;
      securityDeposit: number;
      noticePeriod: number;
    };
    error?: string;
  }> {
    try {
      const response = await api.get('/move-out/booking-details');
      return response.data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return { success: false, error: 'Failed to fetch booking details' };
    }
  }
}