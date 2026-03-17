// Move-Out Management System Types (Customer App)

export interface MoveOutRequest {
  requestId: string;           // MOR001234567890
  customerId: string;          // MYS001234567890
  propertyId: string;          // MYP001234567890
  roomId: string;              // R001234567890
  bookingId: string;           // BK001234567890
  
  // Request Details
  requestedDate: Date;
  submissionDate: Date;
  reason: string;
  customerComments?: string;
  
  // Status & Approval
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminId?: string;            // MYO001234567890
  adminComments?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  
  // Notice Period Validation
  noticePeriodDays: number;
  isWithinNotice: boolean;
  penaltyAmount?: number;
  
  // Settlement Details
  securityDepositAmount: number;
  deductions: Deduction[];
  finalRefundAmount: number;
  settlementStatus: 'pending' | 'processed' | 'completed';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Deduction {
  deductionId: string;
  type: 'cleaning' | 'damage' | 'utilities' | 'penalty' | 'miscellaneous';
  amount: number;
  description: string;
  evidence?: string[];         // Photo URLs
  addedBy: string;             // Admin ID
  addedAt: Date;
}

export interface SecurityDepositSettlement {
  settlementId: string;        // SDS001234567890
  bookingId: string;           // BK001234567890
  originalAmount: number;
  
  // Deductions
  totalDeductions: number;
  deductionBreakdown: Deduction[];
  
  // Refund Details
  finalRefundAmount: number;
  refundMethod: 'bank_transfer' | 'upi' | 'cash' | 'cheque';
  refundStatus: 'pending' | 'processed' | 'completed' | 'failed';
  refundDate?: Date;
  transactionId?: string;
  
  // Documentation
  settlementSummary: string;
  customerAcknowledgment: boolean;
  
  // Timestamps
  createdAt: Date;
  processedAt?: Date;
}

// API Response Types
export interface MoveOutRequestResponse {
  success: boolean;
  data?: MoveOutRequest;
  error?: string;
}

export interface MoveOutStatusResponse {
  success: boolean;
  data?: {
    request: MoveOutRequest;
    settlement?: SecurityDepositSettlement;
  };
  error?: string;
}

// Form Types
export interface MoveOutRequestForm {
  requestedDate: string;
  reason: string;
  customerComments?: string;
}

// Notification Types
export interface MoveOutNotification {
  notificationId: string;
  type: 'request_submitted' | 'status_changed' | 'settlement_completed' | 'reminder';
  title: string;
  message: string;
  data?: {
    requestId?: string;
    status?: string;
    adminComments?: string;
    settlementAmount?: number;
  };
  createdAt: Date;
  readAt?: Date;
}