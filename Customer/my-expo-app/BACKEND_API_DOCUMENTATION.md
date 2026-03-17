# MyStayInnCustomer App - Backend API Documentation

## Overview
This document provides comprehensive backend API documentation for the MyStayInnCustomer application. The customer app allows users to search properties, book rooms, manage payments, and interact with property owners.

## Base Configuration
- **Base URL**: `http://192.168.1.11:3001/api`
- **Authentication**: Firebase Auth + Custom MPIN
- **Content Type**: `application/json`
- **ID Prefix**: `MYS` (Customer/User IDs)

## Authentication System

### Firebase Authentication
```typescript
// Firebase config for customer app
const firebaseConfig = {
  projectId: "mystayuser",
  // Other Firebase config...
};
```

### MPIN Authentication
- **4-digit MPIN** for quick access
- **Biometric authentication** support
- **OTP verification** for sensitive operations

## API Endpoints

### 1. Authentication Endpoints

#### **POST /api/auth/register**
Register a new customer account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+919876543210",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1995-06-15",
  "gender": "male",
  "occupation": "Software Engineer",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+919876543211",
    "relation": "Sister"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "MYS001234567890",
    "email": "user@example.com",
    "phone": "+919876543210",
    "firstName": "John",
    "lastName": "Doe",
    "profileComplete": false,
    "verificationStatus": {
      "email": false,
      "phone": false
    }
  },
  "message": "Account created successfully. Please verify your email and phone."
}
```

#### **POST /api/auth/login**
Login with email/phone and password.

**Request Body:**
```json
{
  "identifier": "user@example.com", // email or phone
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "MYS001234567890",
    "token": "firebase_jwt_token",
    "user": {
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": "https://...",
      "mpinSet": true,
      "biometricEnabled": false
    }
  }
}
```

#### **POST /api/auth/setup-mpin**
Set up 4-digit MPIN for quick access.

**Request Body:**
```json
{
  "userId": "MYS001234567890",
  "mpin": "1234",
  "confirmMpin": "1234"
}
```

#### **POST /api/auth/login-mpin**
Login using MPIN.

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "mpin": "1234"
}
```

#### **POST /api/auth/verify-otp**
Verify OTP for email/phone verification.

**Request Body:**
```json
{
  "userId": "MYS001234567890",
  "otp": "123456",
  "type": "email" // or "phone"
}
```

#### **POST /api/auth/forgot-password**
Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### 2. User Profile Endpoints

#### **GET /api/user/profile**
Get user profile information.

**Headers:**
```
Authorization: Bearer <firebase_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "MYS001234567890",
    "email": "user@example.com",
    "phone": "+919876543210",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1995-06-15",
    "gender": "male",
    "occupation": "Software Engineer",
    "profilePicture": "https://...",
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+919876543211",
      "relation": "Sister"
    },
    "preferences": {
      "notifications": true,
      "biometric": false,
      "language": "en"
    },
    "verificationStatus": {
      "email": true,
      "phone": true,
      "identity": false
    }
  }
}
```

#### **PUT /api/user/profile**
Update user profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "occupation": "Senior Software Engineer",
  "address": {
    "street": "456 New St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400002"
  }
}
```

#### **POST /api/user/upload-avatar**
Upload profile picture.

**Request:** Multipart form data with image file.

### 3. Property Search & Discovery

#### **GET /api/properties/search**
Search for available properties.

**Query Parameters:**
```
?city=Mumbai&checkIn=2024-01-15&checkOut=2024-01-30&guests=1&minPrice=5000&maxPrice=15000&amenities=wifi,parking&propertyType=pg,hostel
```

**Response:**
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "propertyId": "MYP001234567890",
        "name": "Comfort Stay PG",
        "description": "Modern PG with all amenities",
        "address": {
          "street": "123 Property St",
          "area": "Andheri West",
          "city": "Mumbai",
          "state": "Maharashtra",
          "pincode": "400058"
        },
        "images": [
          "https://...",
          "https://..."
        ],
        "rating": 4.5,
        "reviewCount": 128,
        "propertyType": "pg",
        "amenities": ["wifi", "parking", "laundry", "meals"],
        "availableRooms": [
          {
            "roomId": "R001",
            "type": "single",
            "capacity": 1,
            "price": 12000,
            "pricingMode": "month",
            "available": true,
            "amenities": ["ac", "attached_bathroom"]
          }
        ],
        "owner": {
          "name": "Property Owner",
          "rating": 4.8,
          "responseTime": "within 1 hour"
        },
        "distance": 2.5, // km from search location
        "policies": {
          "noticePeriod": 30,
          "securityDeposit": 10000,
          "cancellationPolicy": "flexible"
        }
      }
    ],
    "totalCount": 45,
    "page": 1,
    "limit": 10,
    "filters": {
      "cities": ["Mumbai", "Pune", "Bangalore"],
      "priceRange": {
        "min": 3000,
        "max": 25000
      },
      "amenities": ["wifi", "parking", "laundry", "meals", "gym"],
      "propertyTypes": ["pg", "hostel", "apartment"]
    }
  }
}
```

#### **GET /api/properties/:propertyId**
Get detailed property information.

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyId": "MYP001234567890",
    "name": "Comfort Stay PG",
    "description": "Modern PG with excellent facilities...",
    "images": ["https://...", "https://..."],
    "address": {
      "street": "123 Property St",
      "area": "Andheri West",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400058",
      "coordinates": {
        "latitude": 19.1136,
        "longitude": 72.8697
      }
    },
    "amenities": [
      {
        "category": "basic",
        "items": ["wifi", "parking", "security"]
      },
      {
        "category": "comfort",
        "items": ["ac", "laundry", "housekeeping"]
      }
    ],
    "rooms": [
      {
        "roomId": "R001",
        "roomNumber": "101",
        "floor": 1,
        "type": "single",
        "capacity": 1,
        "size": "120 sq ft",
        "price": 12000,
        "pricingMode": "month",
        "available": true,
        "images": ["https://...", "https://..."],
        "amenities": ["ac", "attached_bathroom", "balcony"],
        "furnishing": ["bed", "wardrobe", "study_table", "chair"]
      }
    ],
    "policies": {
      "noticePeriod": 30,
      "securityDeposit": 10000,
      "cancellationPolicy": "flexible",
      "rules": [
        "No smoking",
        "No pets",
        "Visitors allowed till 10 PM"
      ]
    },
    "owner": {
      "ownerId": "MYO001234567890",
      "name": "Property Owner",
      "phone": "+919876543210",
      "email": "owner@example.com",
      "rating": 4.8,
      "responseTime": "within 1 hour",
      "joinedDate": "2023-01-15"
    },
    "reviews": [
      {
        "reviewId": "REV001",
        "userId": "MYS001234567891",
        "userName": "Alice Johnson",
        "rating": 5,
        "comment": "Excellent property with great amenities",
        "date": "2024-01-10",
        "helpful": 12
      }
    ],
    "nearbyPlaces": [
      {
        "name": "Andheri Railway Station",
        "type": "transport",
        "distance": 0.8,
        "walkTime": 10
      }
    ]
  }
}
```

### 4. Booking & Allocation Endpoints

#### **POST /api/bookings/create**
Create a new booking request.

**Request Body:**
```json
{
  "propertyId": "MYP001234567890",
  "roomId": "R001",
  "checkInDate": "2024-01-15",
  "checkOutDate": "2024-01-30",
  "guests": 1,
  "specialRequests": "Ground floor room preferred",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+919876543211"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "BK001234567890",
    "status": "pending",
    "propertyId": "MYP001234567890",
    "roomId": "R001",
    "userId": "MYS001234567890",
    "checkInDate": "2024-01-15",
    "checkOutDate": "2024-01-30",
    "totalAmount": 15000,
    "securityDeposit": 10000,
    "breakdown": {
      "roomRent": 12000,
      "taxes": 1080,
      "serviceFee": 1920
    },
    "paymentDue": "2024-01-10",
    "cancellationDeadline": "2024-01-13"
  }
}
```

#### **GET /api/bookings/my-bookings**
Get user's booking history.

**Query Parameters:**
```
?status=active&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "bookingId": "BK001234567890",
        "status": "active",
        "property": {
          "propertyId": "MYP001234567890",
          "name": "Comfort Stay PG",
          "address": "Andheri West, Mumbai"
        },
        "room": {
          "roomId": "R001",
          "roomNumber": "101",
          "type": "single"
        },
        "checkInDate": "2024-01-15",
        "checkOutDate": "2024-01-30",
        "totalAmount": 15000,
        "paidAmount": 15000,
        "dueAmount": 0,
        "nextPaymentDue": "2024-02-01"
      }
    ],
    "totalCount": 5,
    "page": 1,
    "limit": 10
  }
}
```

#### **PUT /api/bookings/:bookingId/cancel**
Cancel a booking.

**Request Body:**
```json
{
  "reason": "Change of plans",
  "refundMethod": "original_payment"
}
```

### 5. Payment Endpoints

#### **GET /api/payments/history**
Get payment history.

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "paymentId": "PAY001234567890",
        "bookingId": "BK001234567890",
        "amount": 15000,
        "type": "room_rent",
        "method": "upi",
        "status": "completed",
        "date": "2024-01-10T10:30:00Z",
        "transactionId": "TXN123456789",
        "receipt": "https://..."
      }
    ],
    "summary": {
      "totalPaid": 45000,
      "pendingAmount": 12000,
      "nextDueDate": "2024-02-01"
    }
  }
}
```

#### **POST /api/payments/create**
Create a payment.

**Request Body:**
```json
{
  "bookingId": "BK001234567890",
  "amount": 12000,
  "type": "room_rent",
  "method": "upi",
  "upiId": "user@paytm"
}
```

#### **GET /api/payments/due-amounts**
Get pending payment amounts.

**Response:**
```json
{
  "success": true,
  "data": {
    "duePayments": [
      {
        "bookingId": "BK001234567890",
        "propertyName": "Comfort Stay PG",
        "roomNumber": "101",
        "amount": 12000,
        "type": "monthly_rent",
        "dueDate": "2024-02-01",
        "overdue": false,
        "lateFee": 0
      }
    ],
    "totalDue": 12000,
    "overdueAmount": 0
  }
}
```

### 6. Notification Endpoints

#### **GET /api/notifications**
Get user notifications.

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notificationId": "NOT001234567890",
        "type": "payment_reminder",
        "title": "Payment Due Tomorrow",
        "message": "Your monthly rent of ₹12,000 is due tomorrow",
        "data": {
          "bookingId": "BK001234567890",
          "amount": 12000,
          "dueDate": "2024-02-01"
        },
        "read": false,
        "date": "2024-01-31T09:00:00Z"
      }
    ],
    "unreadCount": 3
  }
}
```

#### **PUT /api/notifications/:notificationId/read**
Mark notification as read.

### 7. Support & Tickets

#### **POST /api/tickets/create**
Create a support ticket.

**Request Body:**
```json
{
  "subject": "AC not working",
  "description": "The AC in room 101 has stopped working since yesterday",
  "category": "maintenance",
  "priority": "high",
  "propertyId": "MYP001234567890",
  "roomId": "R001",
  "attachments": ["https://..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticketId": "TKT001234567890",
    "subject": "AC not working",
    "status": "open",
    "priority": "high",
    "category": "maintenance",
    "createdDate": "2024-01-15T14:30:00Z",
    "estimatedResolution": "2024-01-16T18:00:00Z"
  }
}
```

#### **GET /api/tickets/my-tickets**
Get user's support tickets.

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "ticketId": "TKT001234567890",
        "subject": "AC not working",
        "status": "in_progress",
        "priority": "high",
        "category": "maintenance",
        "createdDate": "2024-01-15T14:30:00Z",
        "lastUpdate": "2024-01-15T16:45:00Z",
        "property": {
          "name": "Comfort Stay PG",
          "roomNumber": "101"
        }
      }
    ]
  }
}
```

## Data Models

### User Model (MYS Prefix)
```typescript
interface User {
  userId: string;           // MYS001234567890
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  occupation: string;
  profilePicture?: string;
  address?: Address;
  emergencyContact: EmergencyContact;
  preferences: UserPreferences;
  verificationStatus: VerificationStatus;
  mpinHash?: string;
  biometricEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Property Model (MYP Prefix)
```typescript
interface Property {
  propertyId: string;       // MYP001234567890
  ownerId: string;          // MYO001234567890
  name: string;
  description: string;
  propertyType: 'pg' | 'hostel' | 'apartment';
  address: Address;
  images: string[];
  amenities: Amenity[];
  policies: PropertyPolicies;
  rating: number;
  reviewCount: number;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}
```

### Booking Model
```typescript
interface Booking {
  bookingId: string;        // BK001234567890
  userId: string;           // MYS001234567890
  propertyId: string;       // MYP001234567890
  roomId: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  checkInDate: Date;
  checkOutDate: Date;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  securityDeposit: number;
  specialRequests?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Invalid input data
- `AUTHENTICATION_FAILED` - Invalid credentials
- `AUTHORIZATION_DENIED` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `BOOKING_UNAVAILABLE` - Room not available for booking
- `PAYMENT_FAILED` - Payment processing failed
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

## Security Features

### Authentication
- Firebase JWT tokens for API authentication
- MPIN for quick access (hashed and salted)
- Biometric authentication support
- OTP verification for sensitive operations

### Data Protection
- All sensitive data encrypted at rest
- HTTPS only communication
- Input validation and sanitization
- Rate limiting on all endpoints
- SQL injection prevention

### Privacy
- Personal data anonymization options
- GDPR compliance features
- Data retention policies
- User consent management

## Integration Notes

### Firebase Integration
```typescript
// Initialize Firebase in customer app
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "mystayuser",
  // Other config...
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### API Client Setup
```typescript
// Customer app API client
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://192.168.1.11:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use(async (config) => {
  const token = await getFirebaseToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Testing

### API Testing
Use tools like Postman or Insomnia to test endpoints:

1. **Authentication Flow**
   - Register → Verify Email → Setup MPIN → Login
   
2. **Property Search**
   - Search properties → View details → Check availability
   
3. **Booking Flow**
   - Create booking → Make payment → Confirm booking
   
4. **Support Flow**
   - Create ticket → Track status → Resolve ticket

### Sample Test Data
```json
{
  "testUser": {
    "email": "test.customer@mystay.com",
    "phone": "+919876543210",
    "firstName": "Test",
    "lastName": "Customer"
  },
  "testProperty": {
    "propertyId": "MYP000000000001",
    "name": "Test Property PG",
    "city": "Mumbai"
  }
}
```

This documentation provides a comprehensive overview of the backend API for the MyStayInnCustomer application. All endpoints follow RESTful conventions and include proper error handling, authentication, and data validation.