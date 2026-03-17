### 1. Admin Authentication

#### **POST /api/admin/register**
Register a new property owner/admin.

**Request Body:**
```json
{
  "email": "owner@example.com",
  "phone": "+919876543210",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "businessName": "Comfort Stay Properties",
  "businessType": "individual", // or "company"
  "panNumber": "ABCDE1234F",
  "gstNumber": "29ABCDE1234F1Z5",
  "address": {
    "street": "123 Business St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ownerId": "MYO001234567890",
    "email": "owner@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "businessName": "Comfort Stay Properties",
    "verificationStatus": "pending",
    "propertiesCount": 0
  }
}
```

#### **POST /api/admin/login**
Admin login with enhanced privileges.

**Request Body:**
```json
{
  "email": "owner@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ownerId": "MYO001234567890",
    "token": "firebase_jwt_token",
    "user": {
      "email": "owner@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "businessName": "Comfort Stay Properties",
      "role": "owner",
      "permissions": ["property_management", "customer_management", "financial_reports"]
    },
    "properties": [
      {
        "propertyId": "MYP001234567890",
        "name": "Comfort Stay PG",
        "status": "active"
      }
    ]
  }
}
```

### 2. Property Management

#### **POST /api/admin/properties**
Create a new property.

**Request Body:**
```json
{
  "name": "Comfort Stay PG",
  "description": "Modern PG with excellent facilities",
  "propertyType": "pg",
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
  "totalFloors": 3,
  "roomsPerFloor": 10,
  "facilities": [
    {
      "category": "basic",
      "items": ["wifi", "parking", "security", "power_backup"]
    },
    {
      "category": "comfort",
      "items": ["ac", "laundry", "housekeeping", "meals"]
    },
    {
      "category": "recreation",
      "items": ["gym", "common_area", "tv_room"]
    }
  ],
  "policies": {
    "noticePeriod": 30,
    "securityDeposit": 10000,
    "pricingMode": "month", // or "day"
    "rules": [
      "No smoking",
      "No pets",
      "Visitors allowed till 10 PM"
    ]
  },
  "images": ["https://...", "https://..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyId": "MYP001234567890",
    "name": "Comfort Stay PG",
    "status": "draft",
    "totalRooms": 30,
    "occupiedRooms": 0,
    "occupancyRate": 0,
    "monthlyRevenue": 0
  }
}
```

#### **GET /api/admin/properties**
Get all properties owned by admin.

**Response:**
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "propertyId": "MYP001234567890",
        "name": "Comfort Stay PG",
        "address": "Andheri West, Mumbai",
        "status": "active",
        "totalRooms": 30,
        "occupiedRooms": 18,
        "occupancyRate": 60,
        "monthlyRevenue": 216000,
        "rating": 4.5,
        "reviewCount": 128,
        "lastUpdated": "2024-01-15T10:30:00Z"
      }
    ],
    "summary": {
      "totalProperties": 1,
      "totalRooms": 30,
      "totalOccupied": 18,
      "totalRevenue": 216000,
      "averageOccupancy": 60
    }
  }
}
```

#### **PUT /api/admin/properties/:propertyId**
Update property information.

#### **DELETE /api/admin/properties/:propertyId**
Delete a property (only if no active bookings).

### 3. Room Management

#### **POST /api/admin/properties/:propertyId/rooms**
Add rooms to a property.

**Request Body:**
```json
{
  "rooms": [
    {
      "roomNumber": "101",
      "floor": 1,
      "type": "single",
      "capacity": 1,
      "size": "120 sq ft",
      "price": 12000,
      "pricingMode": "month",
      "amenities": ["ac", "attached_bathroom", "balcony"],
      "furnishing": ["bed", "wardrobe", "study_table", "chair"],
      "images": ["https://...", "https://..."],
      "status": "available"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomsCreated": 1,
    "rooms": [
      {
        "roomId": "R001234567890",
        "roomNumber": "101",
        "status": "available",
        "price": 12000
      }
    ]
  }
}
```

#### **GET /api/admin/properties/:propertyId/rooms**
Get all rooms in a property.

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "roomId": "R001234567890",
        "roomNumber": "101",
        "floor": 1,
        "type": "single",
        "capacity": 1,
        "price": 12000,
        "status": "occupied",
        "currentTenant": {
          "userId": "MYS001234567890",
          "name": "John Doe",
          "checkInDate": "2024-01-01",
          "nextPaymentDue": "2024-02-01"
        },
        "monthlyRevenue": 12000,
        "occupancyRate": 100
      }
    ],
    "summary": {
      "totalRooms": 30,
      "available": 12,
      "occupied": 18,
      "maintenance": 0,
      "occupancyRate": 60
    }
  }
}
```

#### **PUT /api/admin/rooms/:roomId**
Update room information.

#### **PUT /api/admin/rooms/:roomId/status**
Change room status (available/occupied/maintenance).

### 4. Customer Management

#### **GET /api/admin/customers**
Get all customers across properties.

**Query Parameters:**
```
?propertyId=MYP001234567890&status=active&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "userId": "MYS001234567890",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919876543210",
        "currentBooking": {
          "bookingId": "BK001234567890",
          "propertyName": "Comfort Stay PG",
          "roomNumber": "101",
          "checkInDate": "2024-01-01",
          "monthlyRent": 12000,
          "dueAmount": 0,
          "nextPaymentDue": "2024-02-01"
        },
        "totalPaid": 36000,
        "outstandingAmount": 0,
        "tenancyDuration": 90, // days
        "rating": 4.8,
        "status": "active"
      }
    ],
    "summary": {
      "totalCustomers": 18,
      "activeCustomers": 18,
      "totalRevenue": 216000,
      "outstandingAmount": 24000
    }
  }
}
```

#### **GET /api/admin/customers/:userId**
Get detailed customer information.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "MYS001234567890",
    "personalInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210",
      "dateOfBirth": "1995-06-15",
      "occupation": "Software Engineer",
      "emergencyContact": {
        "name": "Jane Doe",
        "phone": "+919876543211"
      }
    },
    "currentBooking": {
      "bookingId": "BK001234567890",
      "propertyId": "MYP001234567890",
      "propertyName": "Comfort Stay PG",
      "roomId": "R001234567890",
      "roomNumber": "101",
      "checkInDate": "2024-01-01",
      "checkOutDate": null,
      "monthlyRent": 12000,
      "securityDeposit": 10000,
      "status": "active"
    },
    "paymentHistory": [
      {
        "paymentId": "PAY001234567890",
        "amount": 12000,
        "type": "monthly_rent",
        "method": "upi",
        "status": "completed",
        "date": "2024-01-01T10:00:00Z"
      }
    ],
    "tickets": [
      {
        "ticketId": "TKT001234567890",
        "subject": "AC not working",
        "status": "resolved",
        "priority": "high",
        "createdDate": "2024-01-10T14:30:00Z"
      }
    ],
    "statistics": {
      "totalPaid": 36000,
      "averagePaymentDelay": 2, // days
      "ticketsRaised": 3,
      "tenancyDuration": 90,
      "rating": 4.8
    }
  }
}
```

#### **POST /api/admin/customers/:userId/allocate**
Allocate customer to a room.

**Request Body:**
```json
{
  "propertyId": "MYP001234567890",
  "roomId": "R001234567890",
  "checkInDate": "2024-01-15",
  "monthlyRent": 12000,
  "securityDeposit": 10000,
  "specialTerms": "Early check-in allowed"
}
```

#### **PUT /api/admin/customers/:userId/deallocate**
Remove customer from room.

**Request Body:**
```json
{
  "checkOutDate": "2024-01-30",
  "reason": "Tenant requested",
  "refundAmount": 5000,
  "deductions": [
    {
      "type": "cleaning",
      "amount": 500,
      "description": "Room cleaning charges"
    }
  ]
}
```

### 5. Expense Management

#### **POST /api/admin/expenses**
Add a new expense.

**Request Body:**
```json
{
  "propertyId": "MYP001234567890",
  "type": "staff_salary", // staff_salary, rent, utilities, maintenance, food_supplies, cleaning, miscellaneous
  "amount": 25000,
  "description": "Monthly salary for security guard",
  "date": "2024-01-01",
  "category": "monthly",
  "paymentMethod": "bank_transfer",
  "receipt": "https://...",
  "staffDetails": { // for staff_salary type
    "staffName": "Security Guard",
    "role": "Security",
    "employeeId": "EMP001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expenseId": "EXP001234567890",
    "type": "staff_salary",
    "amount": 25000,
    "date": "2024-01-01",
    "status": "recorded",
    "approvalRequired": false
  }
}
```

#### **GET /api/admin/expenses**
Get expense records.

**Query Parameters:**
```
?propertyId=MYP001234567890&type=staff_salary&startDate=2024-01-01&endDate=2024-01-31&category=monthly
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "expenseId": "EXP001234567890",
        "type": "staff_salary",
        "amount": 25000,
        "description": "Monthly salary for security guard",
        "date": "2024-01-01",
        "category": "monthly",
        "paymentMethod": "bank_transfer",
        "property": {
          "propertyId": "MYP001234567890",
          "name": "Comfort Stay PG"
        },
        "staffDetails": {
          "staffName": "Security Guard",
          "role": "Security"
        }
      }
    ],
    "summary": {
      "totalExpenses": 125000,
      "byType": {
        "staff_salary": 50000,
        "utilities": 15000,
        "maintenance": 10000,
        "rent": 30000,
        "food_supplies": 8000,
        "cleaning": 5000,
        "miscellaneous": 7000
      },
      "monthlyAverage": 41667
    }
  }
}
```

#### **PUT /api/admin/expenses/:expenseId**
Update expense record.

#### **DELETE /api/admin/expenses/:expenseId**
Delete expense record.

### 6. Financial Reports

#### **GET /api/admin/reports/financial**
Get comprehensive financial reports.

**Query Parameters:**
```
?propertyId=MYP001234567890&period=monthly&startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "January 2024",
    "revenue": {
      "totalRevenue": 216000,
      "roomRent": 200000,
      "securityDeposits": 16000,
      "lateFees": 0,
      "breakdown": [
        {
          "propertyId": "MYP001234567890",
          "propertyName": "Comfort Stay PG",
          "revenue": 216000,
          "occupancyRate": 60
        }
      ]
    },
    "expenses": {
      "totalExpenses": 125000,
      "breakdown": {
        "staff_salary": 50000,
        "utilities": 15000,
        "maintenance": 10000,
        "rent": 30000,
        "food_supplies": 8000,
        "cleaning": 5000,
        "miscellaneous": 7000
      }
    },
    "netProfit": 91000,
    "profitMargin": 42.13,
    "comparison": {
      "previousMonth": {
        "revenue": 200000,
        "expenses": 120000,
        "netProfit": 80000
      },
      "growth": {
        "revenue": 8.0,
        "expenses": 4.17,
        "netProfit": 13.75
      }
    },
    "occupancy": {
      "totalRooms": 30,
      "occupiedRooms": 18,
      "occupancyRate": 60,
      "averageRent": 12000
    }
  }
}
```

#### **GET /api/admin/reports/occupancy**
Get occupancy analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentOccupancy": {
      "totalRooms": 30,
      "occupiedRooms": 18,
      "availableRooms": 12,
      "occupancyRate": 60
    },
    "trends": [
      {
        "month": "2024-01",
        "occupancyRate": 60,
        "newCheckIns": 5,
        "checkOuts": 2
      }
    ],
    "roomTypes": [
      {
        "type": "single",
        "totalRooms": 20,
        "occupiedRooms": 15,
        "occupancyRate": 75,
        "averageRent": 12000
      },
      {
        "type": "double",
        "totalRooms": 10,
        "occupiedRooms": 3,
        "occupancyRate": 30,
        "averageRent": 8000
      }
    ],
    "predictions": {
      "nextMonth": {
        "expectedOccupancy": 65,
        "expectedRevenue": 234000
      }
    }
  }
}
```

#### **GET /api/admin/reports/payments**
Get payment analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentSummary": {
      "totalCollected": 216000,
      "pendingAmount": 24000,
      "overdueAmount": 12000,
      "collectionRate": 90
    },
    "paymentMethods": [
      {
        "method": "upi",
        "amount": 150000,
        "percentage": 69.4,
        "transactionCount": 15
      },
      {
        "method": "bank_transfer",
        "amount": 66000,
        "percentage": 30.6,
        "transactionCount": 3
      }
    ],
    "trends": [
      {
        "month": "2024-01",
        "collected": 216000,
        "pending": 24000,
        "collectionRate": 90
      }
    ],
    "overdueCustomers": [
      {
        "userId": "MYS001234567891",
        "name": "Jane Smith",
        "roomNumber": "102",
        "overdueAmount": 12000,
        "daysPastDue": 15
      }
    ]
  }
}
```

### 7. Staff Management

#### **POST /api/admin/staff**
Add staff member.

**Request Body:**
```json
{
  "propertyId": "MYP001234567890",
  "name": "Security Guard",
  "role": "security",
  "phone": "+919876543210",
  "email": "security@property.com",
  "salary": 25000,
  "joinDate": "2024-01-01",
  "shift": "night",
  "documents": {
    "aadhar": "https://...",
    "pan": "https://...",
    "photo": "https://..."
  }
}
```

#### **GET /api/admin/staff**
Get all staff members.

**Response:**
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "staffId": "STF001234567890",
        "name": "Security Guard",
        "role": "security",
        "phone": "+919876543210",
        "salary": 25000,
        "status": "active",
        "property": {
          "propertyId": "MYP001234567890",
          "name": "Comfort Stay PG"
        },
        "joinDate": "2024-01-01",
        "shift": "night"
      }
    ],
    "summary": {
      "totalStaff": 5,
      "totalSalary": 125000,
      "byRole": {
        "security": 2,
        "housekeeping": 2,
        "maintenance": 1
      }
    }
  }
}
```

### 8. Ticket Management

#### **GET /api/admin/tickets**
Get all support tickets.

**Query Parameters:**
```
?propertyId=MYP001234567890&status=open&priority=high&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "ticketId": "TKT001234567890",
        "subject": "AC not working",
        "description": "The AC in room 101 has stopped working",
        "status": "open",
        "priority": "high",
        "category": "maintenance",
        "customer": {
          "userId": "MYS001234567890",
          "name": "John Doe",
          "roomNumber": "101"
        },
        "property": {
          "propertyId": "MYP001234567890",
          "name": "Comfort Stay PG"
        },
        "createdDate": "2024-01-15T14:30:00Z",
        "lastUpdate": "2024-01-15T16:45:00Z",
        "assignedTo": "STF001234567890",
        "estimatedResolution": "2024-01-16T18:00:00Z"
      }
    ],
    "summary": {
      "totalTickets": 25,
      "openTickets": 8,
      "inProgressTickets": 5,
      "resolvedTickets": 12,
      "averageResolutionTime": 24 // hours
    }
  }
}
```

#### **PUT /api/admin/tickets/:ticketId**
Update ticket status.

**Request Body:**
```json
{
  "status": "in_progress",
  "assignedTo": "STF001234567890",
  "notes": "Technician assigned, will be resolved by evening",
  "estimatedResolution": "2024-01-16T18:00:00Z"
}
```

#### **POST /api/admin/tickets/:ticketId/resolve**
Mark ticket as resolved.

**Request Body:**
```json
{
  "resolution": "AC repaired and tested. Working properly now.",
  "resolutionTime": "2024-01-16T17:30:00Z",
  "customerSatisfaction": 5
}
```

### 9. Analytics & Dashboard

#### **GET /api/admin/dashboard**
Get dashboard overview data.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProperties": 1,
      "totalRooms": 30,
      "occupiedRooms": 18,
      "occupancyRate": 60,
      "monthlyRevenue": 216000,
      "netProfit": 91000,
      "activeCustomers": 18,
      "pendingTickets": 8
    },
    "recentActivity": [
      {
        "type": "new_booking",
        "message": "New booking for Room 105",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "type": "payment_received",
        "message": "Payment of ₹12,000 received from John Doe",
        "timestamp": "2024-01-15T09:15:00Z"
      }
    ],
    "alerts": [
      {
        "type": "overdue_payment",
        "message": "3 customers have overdue payments",
        "severity": "high",
        "count": 3
      },
      {
        "type": "maintenance_due",
        "message": "Monthly maintenance check due",
        "severity": "medium"
      }
    ],
    "quickStats": {
      "todayRevenue": 12000,
      "newCustomersThisMonth": 5,
      "ticketsResolvedToday": 3,
      "occupancyTrend": "increasing"
    }
  }
}
```

## Data Models

### Owner Model (MYO Prefix)
```typescript
interface Owner {
  ownerId: string;          // MYO001234567890
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: 'individual' | 'company';
  panNumber: string;
  gstNumber?: string;
  address: Address;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  permissions: string[];
  properties: string[];     // Array of property IDs
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
  totalFloors: number;
  roomsPerFloor: number;
  facilities: Facility[];
  policies: PropertyPolicies;
  images: string[];
  status: 'draft' | 'active' | 'inactive' | 'maintenance';
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Expense Model
```typescript
interface Expense {
  expenseId: string;        // EXP001234567890
  propertyId: string;       // MYP001234567890
  ownerId: string;          // MYO001234567890
  type: 'staff_salary' | 'rent' | 'utilities' | 'maintenance' | 'food_supplies' | 'cleaning' | 'miscellaneous';
  amount: number;
  description: string;
  date: Date;
  category: 'daily' | 'monthly' | 'quarterly' | 'yearly';
  paymentMethod: string;
  receipt?: string;
  staffDetails?: StaffDetails;
  status: 'recorded' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}
```

## Enhanced Features

### Dynamic Pricing Mode
- **Monthly/Daily pricing** toggle affects all room prices
- **Automatic conversion** when switching modes (÷30 or ×30)
- **Real-time updates** across all property data

### Expense Categories
1. **Staff Salary** - Employee wages and benefits
2. **Rent** - Property rent and lease payments
3. **Utilities** - Electricity, water, gas, internet
4. **Maintenance** - Repairs, plumbing, electrical work
5. **Food & Supplies** - Groceries and kitchen supplies
6. **Cleaning** - Cleaning services and supplies
7. **Miscellaneous** - Other general expenses

### Advanced Reports
- **Financial Analytics** with profit/loss statements
- **Occupancy Trends** with predictive analytics
- **Payment Analytics** with collection rates
- **Expense Breakdown** by category and time period
- **Customer Analytics** with retention rates

### Property Terms Management
- **Notice Period** configuration (default: 30 days)
- **Security Deposit** standardization
- **Pricing Mode** (monthly/daily) with conversion
- **Property Rules** and policies

## Integration with Customer App

### Shared Data Models
- **Property information** synced between admin and customer apps
- **Room availability** real-time updates
- **Booking status** synchronized across platforms
- **Payment records** consistent across both apps

### Cross-Platform Features
- **Ticket system** allows communication between customers and admins
- **Payment notifications** sent to both customer and admin
- **Occupancy updates** reflected in both applications
- **Review system** managed by admin, visible to customers

## Security & Permissions

### Admin Permissions
- **Property Management** - Full CRUD operations on properties
- **Customer Management** - View and manage customer data
- **Financial Reports** - Access to revenue and expense data
- **Staff Management** - Manage property staff
- **Ticket Resolution** - Handle customer support tickets

### Data Access Control
- **Property-based access** - Admins only see their properties
- **Role-based permissions** - Different access levels for different roles
- **Audit logging** - Track all admin actions
- **Data encryption** - Sensitive data encrypted at rest

This comprehensive documentation covers all aspects of the MyStayInnAdmin backend API, including property management, customer relations, financial tracking, and reporting capabilities.