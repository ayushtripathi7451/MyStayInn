# MyStayInnPlatform - Database Schema Documentation

## Overview
This document provides comprehensive database schema documentation for the MyStayInnplatform, including all tables, relationships, indexes, and the ID prefix system used across Customer, Admin, and Backend applications.

## ID Prefix System

### Prefix Convention
The MyStayInnplatform uses a standardized ID prefix system to identify different entity types:

| Prefix | Entity Type | Description | Example |
|--------|-------------|-------------|---------|
| **MYS** | Customer/User | Customer accounts and user profiles | MYS001234567890 |
| **MYP** | Property | Properties managed by owners | MYP001234567890 |
| **MYO** | Owner/Admin | Property owners and admin accounts | MYO001234567890 |
| **BK** | Booking | Room bookings and reservations | BK001234567890 |
| **PAY** | Payment | Payment transactions | PAY001234567890 |
| **TKT** | Ticket | Support tickets | TKT001234567890 |
| **EXP** | Expense | Expense records | EXP001234567890 |
| **STF** | Staff | Staff members | STF001234567890 |
| **R** | Room | Individual rooms | R001234567890 |
| **REV** | Review | Customer reviews | REV001234567890 |
| **NOT** | Notification | System notifications | NOT001234567890 |

### ID Generation Logic
```typescript
// ID generation function
function generateId(prefix: string): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

// Examples:
// generateId('MYS') → 'MYS1705123456789ABC'
// generateId('MYP') → 'MYP1705123456789DEF'
```

## Database Tables

### 1. Users Table (Customer Accounts)
**Table Name:** `users`
**ID Prefix:** MYS

```sql
CREATE TABLE users (
  user_id VARCHAR(20) PRIMARY KEY,           -- MYS001234567890
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  mpin_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other'),
  occupation VARCHAR(100),
  profile_picture TEXT,
  
  -- Address Information
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_pincode VARCHAR(10),
  
  -- Emergency Contact
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  
  -- Preferences
  notifications_enabled BOOLEAN DEFAULT TRUE,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  language VARCHAR(10) DEFAULT 'en',
  
  -- Verification Status
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,
  
  -- Firebase Integration
  firebase_uid VARCHAR(255) UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_firebase_uid (firebase_uid),
  INDEX idx_created_at (created_at)
);
```

### 2. Owners Table (Admin Accounts)
**Table Name:** `owners`
**ID Prefix:** MYO

```sql
CREATE TABLE owners (
  owner_id VARCHAR(20) PRIMARY KEY,          -- MYO001234567890
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  
  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  business_type ENUM('individual', 'company') DEFAULT 'individual',
  pan_number VARCHAR(20) UNIQUE,
  gst_number VARCHAR(20),
  
  -- Address Information
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_pincode VARCHAR(10),
  
  -- Verification & Permissions
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  permissions JSON, -- ['property_management', 'customer_management', 'financial_reports']
  
  -- Firebase Integration
  firebase_uid VARCHAR(255) UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_pan_number (pan_number),
  INDEX idx_verification_status (verification_status)
);
```

### 3. Properties Table
**Table Name:** `properties`
**ID Prefix:** MYP

```sql
CREATE TABLE properties (
  property_id VARCHAR(20) PRIMARY KEY,       -- MYP001234567890
  owner_id VARCHAR(20) NOT NULL,             -- MYO001234567890
  name VARCHAR(255) NOT NULL,
  description TEXT,
  property_type ENUM('pg', 'hostel', 'apartment') NOT NULL,
  
  -- Address Information
  address_street VARCHAR(255) NOT NULL,
  address_area VARCHAR(100),
  address_city VARCHAR(100) NOT NULL,
  address_state VARCHAR(100) NOT NULL,
  address_pincode VARCHAR(10) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Property Details
  total_floors INT NOT NULL,
  rooms_per_floor INT NOT NULL,
  total_rooms INT GENERATED ALWAYS AS (total_floors * rooms_per_floor) STORED,
  
  -- Facilities (JSON array)
  facilities JSON, -- [{"category": "basic", "items": ["wifi", "parking"]}]
  
  -- Policies
  notice_period INT DEFAULT 30,              -- days
  security_deposit DECIMAL(10, 2) DEFAULT 10000.00,
  pricing_mode ENUM('month', 'day') DEFAULT 'month',
  rules JSON, -- ["No smoking", "No pets"]
  
  -- Media
  images JSON, -- ["https://...", "https://..."]
  
  -- Status & Ratings
  status ENUM('draft', 'active', 'inactive', 'maintenance') DEFAULT 'draft',
  rating DECIMAL(3, 2) DEFAULT 0.00,
  review_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_owner_id (owner_id),
  INDEX idx_city (address_city),
  INDEX idx_property_type (property_type),
  INDEX idx_status (status),
  INDEX idx_location (latitude, longitude)
);
```

### 4. Rooms Table
**Table Name:** `rooms`
**ID Prefix:** R

```sql
CREATE TABLE rooms (
  room_id VARCHAR(20) PRIMARY KEY,           -- R001234567890
  property_id VARCHAR(20) NOT NULL,          -- MYP001234567890
  room_number VARCHAR(20) NOT NULL,
  floor INT NOT NULL,
  
  -- Room Details
  type ENUM('single', 'double', 'triple', 'dormitory') NOT NULL,
  capacity INT NOT NULL,
  size VARCHAR(50), -- "120 sq ft"
  price DECIMAL(10, 2) NOT NULL,
  pricing_mode ENUM('month', 'day') DEFAULT 'month',
  
  -- Amenities & Furnishing
  amenities JSON, -- ["ac", "attached_bathroom", "balcony"]
  furnishing JSON, -- ["bed", "wardrobe", "study_table"]
  
  -- Media
  images JSON, -- ["https://...", "https://..."]
  
  -- Status
  status ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_property_id (property_id),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_price (price),
  
  -- Unique constraint
  UNIQUE KEY unique_room_per_property (property_id, room_number)
);
```

### 5. Bookings Table
**Table Name:** `bookings`
**ID Prefix:** BK

```sql
CREATE TABLE bookings (
  booking_id VARCHAR(20) PRIMARY KEY,        -- BK001234567890
  user_id VARCHAR(20) NOT NULL,              -- MYS001234567890
  property_id VARCHAR(20) NOT NULL,          -- MYP001234567890
  room_id VARCHAR(20) NOT NULL,              -- R001234567890
  
  -- Booking Details
  check_in_date DATE NOT NULL,
  check_out_date DATE,
  guests INT DEFAULT 1,
  special_requests TEXT,
  
  -- Financial Details
  total_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0.00,
  due_amount DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  security_deposit DECIMAL(10, 2) NOT NULL,
  
  -- Status
  status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled') DEFAULT 'pending',
  
  -- Cancellation
  cancellation_reason TEXT,
  cancellation_date TIMESTAMP NULL,
  refund_amount DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_property_id (property_id),
  INDEX idx_room_id (room_id),
  INDEX idx_status (status),
  INDEX idx_check_in_date (check_in_date),
  INDEX idx_check_out_date (check_out_date)
);
```

### 6. Payments Table
**Table Name:** `payments`
**ID Prefix:** PAY

```sql
CREATE TABLE payments (
  payment_id VARCHAR(20) PRIMARY KEY,        -- PAY001234567890
  booking_id VARCHAR(20) NOT NULL,           -- BK001234567890
  user_id VARCHAR(20) NOT NULL,              -- MYS001234567890
  
  -- Payment Details
  amount DECIMAL(10, 2) NOT NULL,
  type ENUM('room_rent', 'security_deposit', 'late_fee', 'refund') NOT NULL,
  method ENUM('upi', 'bank_transfer', 'cash', 'card') NOT NULL,
  
  -- Payment Gateway Details
  transaction_id VARCHAR(100),
  gateway_response JSON,
  upi_id VARCHAR(100),
  
  -- Status
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  
  -- Receipt
  receipt_url TEXT,
  
  -- Timestamps
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_booking_id (booking_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_payment_date (payment_date),
  INDEX idx_transaction_id (transaction_id)
);
```

### 7. Expenses Table
**Table Name:** `expenses`
**ID Prefix:** EXP

```sql
CREATE TABLE expenses (
  expense_id VARCHAR(20) PRIMARY KEY,        -- EXP001234567890
  property_id VARCHAR(20) NOT NULL,          -- MYP001234567890
  owner_id VARCHAR(20) NOT NULL,             -- MYO001234567890
  
  -- Expense Details
  type ENUM('staff_salary', 'rent', 'utilities', 'maintenance', 'food_supplies', 'cleaning', 'miscellaneous') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  
  -- Categorization
  category ENUM('daily', 'monthly', 'quarterly', 'yearly') DEFAULT 'monthly',
  payment_method ENUM('cash', 'bank_transfer', 'upi', 'card') NOT NULL,
  
  -- Staff Details (for staff_salary type)
  staff_name VARCHAR(100),
  staff_role VARCHAR(100),
  staff_employee_id VARCHAR(50),
  
  -- Receipt
  receipt_url TEXT,
  
  -- Approval
  status ENUM('recorded', 'approved', 'rejected') DEFAULT 'recorded',
  approved_by VARCHAR(20), -- owner_id
  approval_date TIMESTAMP NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_property_id (property_id),
  INDEX idx_owner_id (owner_id),
  INDEX idx_type (type),
  INDEX idx_expense_date (expense_date),
  INDEX idx_category (category),
  INDEX idx_status (status)
);
```

### 8. Staff Table
**Table Name:** `staff`
**ID Prefix:** STF

```sql
CREATE TABLE staff (
  staff_id VARCHAR(20) PRIMARY KEY,          -- STF001234567890
  property_id VARCHAR(20) NOT NULL,          -- MYP001234567890
  owner_id VARCHAR(20) NOT NULL,             -- MYO001234567890
  
  -- Personal Information
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  
  -- Employment Details
  role ENUM('security', 'housekeeping', 'maintenance', 'cook', 'manager', 'other') NOT NULL,
  salary DECIMAL(10, 2) NOT NULL,
  join_date DATE NOT NULL,
  shift ENUM('morning', 'evening', 'night', 'full_time') DEFAULT 'full_time',
  
  -- Documents
  documents JSON, -- {"aadhar": "url", "pan": "url", "photo": "url"}
  
  -- Status
  status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
  termination_date DATE NULL,
  termination_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_property_id (property_id),
  INDEX idx_owner_id (owner_id),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_phone (phone)
);
```

### 9. Tickets Table (Support System)
**Table Name:** `tickets`
**ID Prefix:** TKT

```sql
CREATE TABLE tickets (
  ticket_id VARCHAR(20) PRIMARY KEY,         -- TKT001234567890
  user_id VARCHAR(20) NOT NULL,              -- MYS001234567890
  property_id VARCHAR(20) NOT NULL,          -- MYP001234567890
  room_id VARCHAR(20),                       -- R001234567890 (optional)
  
  -- Ticket Details
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('maintenance', 'billing', 'general', 'complaint', 'request') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  
  -- Status & Assignment
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  assigned_to VARCHAR(20), -- staff_id
  
  -- Resolution
  resolution TEXT,
  resolution_date TIMESTAMP NULL,
  customer_satisfaction INT, -- 1-5 rating
  
  -- Attachments
  attachments JSON, -- ["https://...", "https://..."]
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  estimated_resolution TIMESTAMP NULL,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES staff(staff_id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_property_id (property_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at)
);
```

### 10. Reviews Table
**Table Name:** `reviews`
**ID Prefix:** REV

```sql
CREATE TABLE reviews (
  review_id VARCHAR(20) PRIMARY KEY,         -- REV001234567890
  user_id VARCHAR(20) NOT NULL,              -- MYS001234567890
  property_id VARCHAR(20) NOT NULL,          -- MYP001234567890
  booking_id VARCHAR(20) NOT NULL,           -- BK001234567890
  
  -- Review Details
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  
  -- Review Categories
  cleanliness_rating INT CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  staff_rating INT CHECK (staff_rating >= 1 AND staff_rating <= 5),
  facilities_rating INT CHECK (facilities_rating >= 1 AND facilities_rating <= 5),
  value_rating INT CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Status
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  moderation_notes TEXT,
  
  -- Helpfulness
  helpful_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_property_id (property_id),
  INDEX idx_rating (rating),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  -- Unique constraint (one review per booking)
  UNIQUE KEY unique_review_per_booking (booking_id)
);
```

### 11. Notifications Table
**Table Name:** `notifications`
**ID Prefix:** NOT

```sql
CREATE TABLE notifications (
  notification_id VARCHAR(20) PRIMARY KEY,   -- NOT001234567890
  user_id VARCHAR(20) NOT NULL,              -- MYS001234567890
  
  -- Notification Details
  type ENUM('payment_reminder', 'booking_confirmation', 'ticket_update', 'general', 'promotional') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Additional Data
  data JSON, -- {"bookingId": "BK123", "amount": 12000}
  
  -- Status
  read_status BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  
  -- Delivery
  delivery_method ENUM('push', 'email', 'sms', 'in_app') DEFAULT 'in_app',
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMP NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_read_status (read_status),
  INDEX idx_created_at (created_at),
  INDEX idx_scheduled_at (scheduled_at)
);
```

## Relationships & Constraints

### Primary Relationships
```sql
-- One-to-Many Relationships
owners (1) → properties (N)
properties (1) → rooms (N)
users (1) → bookings (N)
properties (1) → bookings (N)
rooms (1) → bookings (N)
bookings (1) → payments (N)
properties (1) → expenses (N)
properties (1) → staff (N)
users (1) → tickets (N)
properties (1) → tickets (N)
users (1) → reviews (N)
properties (1) → reviews (N)
users (1) → notifications (N)

-- One-to-One Relationships
bookings (1) → reviews (1) -- One review per booking
```

### Cascade Rules
- **ON DELETE CASCADE**: When parent is deleted, children are deleted
- **ON DELETE SET NULL**: When parent is deleted, foreign key is set to NULL
- **ON UPDATE CASCADE**: When parent ID changes, children are updated

## Indexes & Performance

### Primary Indexes
- All primary keys have clustered indexes
- Foreign keys have non-clustered indexes
- Frequently queried columns have composite indexes

### Composite Indexes
```sql
-- Property search optimization
CREATE INDEX idx_property_search ON properties (address_city, property_type, status);

-- Booking queries optimization
CREATE INDEX idx_booking_dates ON bookings (check_in_date, check_out_date, status);

-- Payment history optimization
CREATE INDEX idx_payment_history ON payments (user_id, payment_date, status);

-- Expense reporting optimization
CREATE INDEX idx_expense_reports ON expenses (property_id, expense_date, type);
```

### Query Optimization Examples

#### Property Search Query
```sql
SELECT p.*, COUNT(r.room_id) as available_rooms
FROM properties p
LEFT JOIN rooms r ON p.property_id = r.property_id AND r.status = 'available'
WHERE p.address_city = 'Mumbai'
  AND p.property_type = 'pg'
  AND p.status = 'active'
GROUP BY p.property_id
HAVING available_rooms > 0;
```

#### Financial Report Query
```sql
SELECT 
  DATE_FORMAT(expense_date, '%Y-%m') as month,
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM expenses
WHERE property_id = 'MYP001234567890'
  AND expense_date >= '2024-01-01'
  AND expense_date <= '2024-12-31'
GROUP BY month, type
ORDER BY month DESC, total_amount DESC;
```

## Data Validation Rules

### Business Rules
1. **Booking Validation**
   - Check-in date must be in the future
   - Check-out date must be after check-in date
   - Room must be available for the requested dates
   - User cannot have overlapping bookings

2. **Payment Validation**
   - Payment amount must be positive
   - Total payments cannot exceed booking amount
   - Refunds cannot exceed paid amount

3. **Property Validation**
   - Total rooms = floors × rooms_per_floor
   - Security deposit must be positive
   - Notice period must be between 1-90 days

4. **User Validation**
   - Email and phone must be unique
   - Age must be 18+ for bookings
   - Emergency contact required for bookings

### Data Integrity Triggers
```sql
-- Update property rating when new review is added
DELIMITER //
CREATE TRIGGER update_property_rating
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  UPDATE properties 
  SET rating = (
    SELECT AVG(rating) 
    FROM reviews 
    WHERE property_id = NEW.property_id AND status = 'approved'
  ),
  review_count = (
    SELECT COUNT(*) 
    FROM reviews 
    WHERE property_id = NEW.property_id AND status = 'approved'
  )
  WHERE property_id = NEW.property_id;
END//
DELIMITER ;

-- Update room status when booking is confirmed
DELIMITER //
CREATE TRIGGER update_room_status
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE rooms 
    SET status = 'occupied' 
    WHERE room_id = NEW.room_id;
  ELSEIF NEW.status = 'completed' OR NEW.status = 'cancelled' THEN
    UPDATE rooms 
    SET status = 'available' 
    WHERE room_id = NEW.room_id;
  END IF;
END//
DELIMITER ;
```

## Backup & Recovery Strategy

### Backup Schedule
- **Full Backup**: Daily at 2:00 AM
- **Incremental Backup**: Every 6 hours
- **Transaction Log Backup**: Every 15 minutes

### Recovery Points
- **Point-in-time recovery**: Up to 15 minutes
- **Backup retention**: 30 days for full backups
- **Archive storage**: 1 year for compliance

### Critical Tables Priority
1. **High Priority**: users, owners, bookings, payments
2. **Medium Priority**: properties, rooms, tickets
3. **Low Priority**: notifications, reviews, logs

## Security Considerations

### Data Encryption
- **At Rest**: All sensitive columns encrypted (passwords, PAN, etc.)
- **In Transit**: TLS 1.3 for all connections
- **Application Level**: Additional encryption for PII data

### Access Control
- **Role-based access**: Different permissions for different user types
- **Row-level security**: Users can only access their own data
- **Audit logging**: All data modifications logged

### Compliance
- **GDPR**: Right to be forgotten, data portability
- **PCI DSS**: Payment data security standards
- **Local Laws**: Indian data protection regulations

This comprehensive database schema provides a solid foundation for the MyStayInnplatform, ensuring data integrity, performance, and scalability while maintaining security and compliance standards.