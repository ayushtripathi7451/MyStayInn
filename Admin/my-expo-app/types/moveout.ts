// Move-Out Management System Types

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

  /** 'admin_initiated' = created by admin; 'tenant_requested' = requested by tenant from customer app */
  type?: 'admin_initiated' | 'tenant_requested';
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

export interface MoveOutProcess {
  processId: string;           // MOP001234567890
  type: 'customer_initiated' | 'admin_initiated' | 'scheduled';
  
  // Tenant Information
  customerId: string;          // MYS001234567890
  customerName: string;
  propertyId: string;          // MYP001234567890
  roomId: string;              // R001234567890
  bookingId: string;           // BK001234567890
  
  // Process Details
  moveOutDate: Date;
  actualMoveOutDate?: Date;
  initiatedBy: string;         // Admin ID
  reason: string;
  
  // Status Tracking
  processStatus: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  tenantStatusUpdated: boolean;
  roomStatusUpdated: boolean;
  settlementCompleted: boolean;
  
  // Financial Settlement
  securityDepositSettlement: SecurityDepositSettlement;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
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

export interface MoveOutAnalytics {
  totalMoveOuts: number;
  monthlyTrends: MonthlyTrend[];
  averageNoticePerio: number;
  roomTurnoverRate: number;
  averageVacancyPeriod: number;
  settlementSummary: {
    totalRefunds: number;
    averageDeduction: number;
    commonDeductionTypes: DeductionTypeSummary[];
  };
}

export interface MonthlyTrend {
  month: string;
  moveOutCount: number;
  averageNotice: number;
  totalRefunds: number;
}

export interface DeductionTypeSummary {
  type: Deduction['type'];
  count: number;
  totalAmount: number;
  averageAmount: number;
}

// API Response Types
export interface MoveOutRequestResponse {
  success: boolean;
  data?: MoveOutRequest;
  error?: string;
}

export interface MoveOutListResponse {
  success: boolean;
  data?: {
    requests: MoveOutRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export interface MoveOutAnalyticsResponse {
  success: boolean;
  data?: MoveOutAnalytics;
  error?: string;
}

// Form Types
export interface MoveOutRequestForm {
  requestedDate: string;
  reason: string;
  customerComments?: string;
}

export interface MoveOutApprovalForm {
  status: 'approved' | 'rejected';
  adminComments?: string;
  rejectionReason?: string;
  deductions?: Omit<Deduction, 'deductionId' | 'addedBy' | 'addedAt'>[];
}

export interface AdminInitiatedMoveOutForm {
  customerId: string;
  moveOutDate: string;
  reason: string;
  adminComments?: string;
}