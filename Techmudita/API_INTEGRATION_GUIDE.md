# MyStayInnPlatform - API Integration Guide

## Overview
This guide provides comprehensive information on how the Customer and Admin mobile applications integrate with the MyStayInnbackend API, including authentication flows, data synchronization, and real-time updates.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Customer App  │    │   Backend API   │    │   Admin App     │
│   (React Native)│    │   (Express.js)  │    │   (React Native)│
│                 │    │                 │    │                 │
│ Base URL:       │◄──►│ Port: 3001      │◄──►│ Base URL:       │
│ 192.168.1.11    │    │ Database: MySQL │    │ 10.207.94.167   │
│                 │    │ Auth: Firebase  │    │                 │
│ ID Prefix: MYS  │    │ ID System: MYX  │    │ ID Prefix: MYO  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Configuration

### Customer App Configuration
**File**: `Customer/my-expo-app/utils/api.ts`
```typescript
import axios from "axios";

export const api = axios.create({
  baseURL: "http://192.168.1.11:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for authentication
api.interceptors.request.use(async (config) => {
  try {
    const token = await getFirebaseToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to get Firebase token:', error);
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      handleAuthError();
    }
    return Promise.reject(error);
  }
);
```

### Admin App Configuration
**File**: `Admin/my-expo-app/utils/api.ts`
```typescript
import axios from "axios";

export const api = axios.create({
  baseURL: "http://10.207.94.167:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Admin-specific interceptors
api.interceptors.request.use(async (config) => {
  try {
    const token = await getFirebaseToken();
    const ownerId = await getOwnerId(); // MYO prefix
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (ownerId) {
      config.headers['X-Owner-ID'] = ownerId;
    }
  } catch (error) {
    console.error('Failed to get auth credentials:', error);
  }
  return config;
});
```

## Authentication Integration

### Firebase Authentication Setup

#### Customer App Firebase Config
```typescript
// Customer/my-expo-app/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "mystayuser",
  apiKey: "...",
  authDomain: "mystayuser.firebaseapp.com",
  // Other config...
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

#### Admin App Firebase Config
```typescript
// Admin/my-expo-app/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "mystayinn-17f1d",
  apiKey: "...",
  authDomain: "mystayinn-17f1d.firebaseapp.com",
  // Other config...
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### Authentication Flow

#### Customer Registration Flow
```typescript
// Customer app registration
const registerCustomer = async (userData) => {
  try {
    // 1. Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    // 2. Register with backend API
    const response = await api.post('/auth/register', {
      ...userData,
      firebaseUid: userCredential.user.uid
    });
    
    // 3. Store user data locally
    await AsyncStorage.setItem('userId', response.data.userId); // MYS prefix
    
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};
```

#### Admin Login Flow
```typescript
// Admin app login
const loginAdmin = async (credentials) => {
  try {
    // 1. Firebase authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    // 2. Backend verification
    const response = await api.post('/admin/login', {
      email: credentials.email,
      firebaseUid: userCredential.user.uid
    });
    
    // 3. Store admin data
    await AsyncStorage.setItem('ownerId', response.data.ownerId); // MYO prefix
    await AsyncStorage.setItem('properties', JSON.stringify(response.data.properties));
    
    return response.data;
  } catch (error) {
    console.error('Admin login failed:', error);
    throw error;
  }
};
```

## Data Synchronization

### Customer App Data Flow

#### Property Search Integration
```typescript
// Customer app property search
const searchProperties = async (searchParams) => {
  try {
    const response = await api.get('/properties/search', {
      params: {
        city: searchParams.city,
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        guests: searchParams.guests,
        minPrice: searchParams.minPrice,
        maxPrice: searchParams.maxPrice,
        amenities: searchParams.amenities?.join(','),
        propertyType: searchParams.propertyType?.join(',')
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Property search failed:', error);
    throw error;
  }
};
```

#### Booking Creation
```typescript
// Customer app booking creation
const createBooking = async (bookingData) => {
  try {
    const response = await api.post('/bookings/create', {
      propertyId: bookingData.propertyId, // MYP prefix
      roomId: bookingData.roomId,         // R prefix
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      guests: bookingData.guests,
      specialRequests: bookingData.specialRequests
    });
    
    // Update local booking state
    const bookingId = response.data.bookingId; // BK prefix
    await AsyncStorage.setItem(`booking_${bookingId}`, JSON.stringify(response.data));
    
    return response.data;
  } catch (error) {
    console.error('Booking creation failed:', error);
    throw error;
  }
};
```

### Admin App Data Flow

#### Property Management
```typescript
// Admin app property creation
const createProperty = async (propertyData) => {
  try {
    const response = await api.post('/admin/properties', {
      name: propertyData.name,
      description: propertyData.description,
      propertyType: propertyData.propertyType,
      address: propertyData.address,
      totalFloors: propertyData.totalFloors,
      roomsPerFloor: propertyData.roomsPerFloor,
      facilities: propertyData.facilities,
      policies: {
        noticePeriod: propertyData.noticePeriod,
        securityDeposit: propertyData.securityDeposit,
        pricingMode: propertyData.pricingMode, // 'month' or 'day'
        rules: propertyData.rules
      },
      images: propertyData.images
    });
    
    const propertyId = response.data.propertyId; // MYP prefix
    
    // Update local properties list
    const existingProperties = await AsyncStorage.getItem('properties');
    const properties = existingProperties ? JSON.parse(existingProperties) : [];
    properties.push(response.data);
    await AsyncStorage.setItem('properties', JSON.stringify(properties));
    
    return response.data;
  } catch (error) {
    console.error('Property creation failed:', error);
    throw error;
  }
};
```

#### Customer Management
```typescript
// Admin app customer allocation
const allocateCustomer = async (allocationData) => {
  try {
    const response = await api.post(`/admin/customers/${allocationData.userId}/allocate`, {
      propertyId: allocationData.propertyId, // MYP prefix
      roomId: allocationData.roomId,         // R prefix
      checkInDate: allocationData.checkInDate,
      monthlyRent: allocationData.monthlyRent,
      securityDeposit: allocationData.securityDeposit,
      specialTerms: allocationData.specialTerms
    });
    
    // Update room status locally
    await updateRoomStatus(allocationData.roomId, 'occupied');
    
    return response.data;
  } catch (error) {
    console.error('Customer allocation failed:', error);
    throw error;
  }
};
```

#### Expense Management
```typescript
// Admin app expense tracking
const addExpense = async (expenseData) => {
  try {
    const response = await api.post('/admin/expenses', {
      propertyId: expenseData.propertyId, // MYP prefix
      type: expenseData.type, // staff_salary, rent, utilities, etc.
      amount: expenseData.amount,
      description: expenseData.description,
      date: expenseData.date,
      category: expenseData.category, // daily, monthly, quarterly, yearly
      paymentMethod: expenseData.paymentMethod,
      staffDetails: expenseData.staffDetails, // for staff_salary type
      receipt: expenseData.receipt
    });
    
    const expenseId = response.data.expenseId; // EXP prefix
    
    // Update local expense records
    await updateLocalExpenses(response.data);
    
    return response.data;
  } catch (error) {
    console.error('Expense addition failed:', error);
    throw error;
  }
};
```

## Real-time Updates

### WebSocket Integration
```typescript
// Real-time updates for both apps
import io from 'socket.io-client';

class RealTimeService {
  private socket: any;
  
  connect(userId: string, userType: 'customer' | 'admin') {
    this.socket = io('http://backend-url:3001', {
      auth: {
        userId,
        userType
      }
    });
    
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // Payment updates
    this.socket.on('payment_received', (data) => {
      this.handlePaymentUpdate(data);
    });
    
    // Booking updates
    this.socket.on('booking_status_changed', (data) => {
      this.handleBookingUpdate(data);
    });
    
    // Ticket updates
    this.socket.on('ticket_updated', (data) => {
      this.handleTicketUpdate(data);
    });
    
    // Room availability updates
    this.socket.on('room_availability_changed', (data) => {
      this.handleRoomUpdate(data);
    });
  }
  
  private handlePaymentUpdate(data) {
    // Update payment status in local storage
    // Trigger UI refresh
    // Send push notification if needed
  }
}
```

### Push Notifications
```typescript
// Push notification service
class NotificationService {
  async sendPaymentReminder(userId: string, amount: number, dueDate: string) {
    try {
      await api.post('/notifications/send', {
        userId,
        type: 'payment_reminder',
        title: 'Payment Due Tomorrow',
        message: `Your monthly rent of ₹${amount} is due tomorrow`,
        data: {
          amount,
          dueDate,
          type: 'payment_due'
        }
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
  
  async sendBookingConfirmation(userId: string, bookingId: string) {
    try {
      await api.post('/notifications/send', {
        userId,
        type: 'booking_confirmation',
        title: 'Booking Confirmed',
        message: 'Your room booking has been confirmed',
        data: {
          bookingId,
          type: 'booking_confirmed'
        }
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}
```

## Error Handling

### API Error Handling
```typescript
// Centralized error handling
class APIErrorHandler {
  static handle(error: any) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return this.handleValidationError(data);
        case 401:
          return this.handleAuthError();
        case 403:
          return this.handlePermissionError();
        case 404:
          return this.handleNotFoundError();
        case 409:
          return this.handleConflictError(data);
        case 429:
          return this.handleRateLimitError();
        case 500:
          return this.handleServerError();
        default:
          return this.handleGenericError(error);
      }
    } else if (error.request) {
      // Network error
      return this.handleNetworkError();
    } else {
      // Other error
      return this.handleGenericError(error);
    }
  }
  
  private static handleValidationError(data: any) {
    const message = data.error?.message || 'Invalid input data';
    Alert.alert('Validation Error', message);
    return { type: 'validation', message };
  }
  
  private static handleAuthError() {
    // Redirect to login
    NavigationService.navigate('Login');
    return { type: 'auth', message: 'Please login again' };
  }
  
  private static handleNetworkError() {
    Alert.alert('Network Error', 'Please check your internet connection');
    return { type: 'network', message: 'Network connection failed' };
  }
}
```

### Offline Support
```typescript
// Offline data management
class OfflineManager {
  private static OFFLINE_QUEUE_KEY = 'offline_queue';
  
  static async queueRequest(request: any) {
    try {
      const queue = await this.getOfflineQueue();
      queue.push({
        ...request,
        timestamp: Date.now(),
        id: this.generateRequestId()
      });
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to queue offline request:', error);
    }
  }
  
  static async processOfflineQueue() {
    try {
      const queue = await this.getOfflineQueue();
      const processedRequests = [];
      
      for (const request of queue) {
        try {
          await this.executeRequest(request);
          processedRequests.push(request.id);
        } catch (error) {
          console.error('Failed to process offline request:', error);
        }
      }
      
      // Remove processed requests from queue
      const remainingQueue = queue.filter(
        req => !processedRequests.includes(req.id)
      );
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
      
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }
  
  private static async getOfflineQueue() {
    const queue = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  }
}
```

## Performance Optimization

### Caching Strategy
```typescript
// API response caching
class CacheManager {
  private static CACHE_PREFIX = 'api_cache_';
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  static async get(key: string) {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > this.CACHE_DURATION;
        
        if (!isExpired) {
          return data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  static async set(key: string, data: any) {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  static async clear() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}
```

### Request Optimization
```typescript
// Batch API requests
class BatchRequestManager {
  private static batchQueue: any[] = [];
  private static batchTimeout: any = null;
  private static BATCH_SIZE = 10;
  private static BATCH_DELAY = 100; // ms
  
  static addToBatch(request: any) {
    this.batchQueue.push(request);
    
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.processBatch();
    } else {
      this.scheduleBatchProcessing();
    }
  }
  
  private static scheduleBatchProcessing() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }
  
  private static async processBatch() {
    if (this.batchQueue.length === 0) return;
    
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    
    try {
      const response = await api.post('/batch', { requests: batch });
      this.handleBatchResponse(response.data, batch);
    } catch (error) {
      console.error('Batch request failed:', error);
      // Handle individual requests as fallback
      this.handleBatchFailure(batch);
    }
  }
}
```

## Testing Integration

### API Testing Setup
```typescript
// Mock API for testing
class MockAPIService {
  private static mockData = {
    properties: [
      {
        propertyId: 'MYP000000000001',
        name: 'Test Property PG',
        city: 'Mumbai',
        status: 'active'
      }
    ],
    users: [
      {
        userId: 'MYS000000000001',
        email: 'test.customer@mystay.com',
        firstName: 'Test',
        lastName: 'Customer'
      }
    ]
  };
  
  static async searchProperties(params: any) {
    // Return mock property data
    return {
      success: true,
      data: {
        properties: this.mockData.properties,
        totalCount: 1
      }
    };
  }
  
  static async createBooking(bookingData: any) {
    return {
      success: true,
      data: {
        bookingId: 'BK000000000001',
        status: 'pending',
        ...bookingData
      }
    };
  }
}
```

### Integration Test Examples
```typescript
// Integration tests
describe('API Integration Tests', () => {
  beforeEach(() => {
    // Setup test environment
    jest.clearAllMocks();
  });
  
  test('Customer registration flow', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    const result = await registerCustomer(userData);
    
    expect(result.userId).toMatch(/^MYS/);
    expect(result.email).toBe(userData.email);
  });
  
  test('Property search integration', async () => {
    const searchParams = {
      city: 'Mumbai',
      checkIn: '2024-02-01',
      checkOut: '2024-02-15'
    };
    
    const result = await searchProperties(searchParams);
    
    expect(result.properties).toBeDefined();
    expect(result.properties[0].propertyId).toMatch(/^MYP/);
  });
  
  test('Admin expense creation', async () => {
    const expenseData = {
      propertyId: 'MYP001234567890',
      type: 'staff_salary',
      amount: 25000,
      description: 'Monthly salary'
    };
    
    const result = await addExpense(expenseData);
    
    expect(result.expenseId).toMatch(/^EXP/);
    expect(result.amount).toBe(expenseData.amount);
  });
});
```

This comprehensive API integration guide provides all the necessary information for connecting the Customer and Admin mobile applications with the MyStayInnbackend API, ensuring proper data flow, error handling, and performance optimization.