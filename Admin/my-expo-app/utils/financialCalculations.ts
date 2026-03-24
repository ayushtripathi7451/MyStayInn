/**
 * Financial Calculations Utilities
 * Includes MoveOut P/L calculations and other financial metrics
 */

export interface MoveOutFinancialData {
  currentDue: number;                    // Unpaid rent at move-out
  securityDepositCollected: number;      // Original security deposit
  securityDepositReturned: number;       // Amount returned to tenant
  moveOutPL: number;                     // Calculated profit/loss
  amountToBeCollected?: number;          // If due > deposit, amount to collect from tenant
  notes?: string;                        // Explanation of calculation
}

/**
 * Calculate MoveOut Profit/Loss based on rules:
 * 
 * Rule 1: If due = 0 and returned = collected → P/L = 0
 * Rule 2: If due = 0 and returned < collected → P/L = collected - returned (profit)
 * Rule 3: If due ≠ 0 and returned < (collected + due) → P/L = collected - (returned + due) (profit)
 * Rule 4: If due > collected → P/L = 0, amount to collect = due - collected
 * 
 * @param currentDue - Unpaid rent at move-out time
 * @param securityDepositCollected - Original security deposit amount
 * @param securityDepositReturned - Amount returned to tenant (after deductions)
 * @returns MoveOutFinancialData with calculated P/L and notes
 */
export function calculateMoveOutPL(
  currentDue: number,
  securityDepositCollected: number,
  securityDepositReturned: number
): MoveOutFinancialData {
  const due = Math.max(0, currentDue || 0);
  const collected = Math.max(0, securityDepositCollected || 0);
  const returned = Math.max(0, securityDepositReturned || 0);

  let moveOutPL = 0;
  let amountToBeCollected = 0;
  let notes = '';

  if (due === 0) {
    // Rule 1 & 2: No pending dues
    if (returned === collected) {
      // Rule 1: Full security deposit returned
      moveOutPL = 0;
      notes = 'No dues. Security deposit fully returned.';
    } else if (returned < collected) {
      // Rule 2: Returned less than collected (profit due to deductions)
      moveOutPL = collected - returned;
      notes = `No dues. Profit from deductions: ₹${collected} collected - ₹${returned} returned = ₹${moveOutPL}`;
    }
  } else if (due > 0) {
    // Rule 3 & 4: There are pending dues
    if (due > collected) {
      // Rule 4: Due amount exceeds security deposit
      moveOutPL = 0;
      amountToBeCollected = due - collected;
      notes = `Dues (₹${due}) exceed deposit (₹${collected}). No P/L. Amount to collect: ₹${amountToBeCollected}`;
    } else {
      // Rule 3: Due is less than collected, can cover from deposit
      if (returned < collected + due) {
        // There's profit after covering dues
        moveOutPL = collected - (returned + due);
        notes = `Profit calculation: ₹${collected} collected - (₹${returned} returned + ₹${due} due) = ₹${moveOutPL}`;
      } else {
        // Returned amount is more than it should be (shouldn't happen, but handle)
        moveOutPL = 0;
        notes = 'Returned amount exceeds collected + due. P/L = 0';
      }
    }
  }

  // Ensure P/L is never negative (round to 0 for edge cases)
  moveOutPL = Math.max(0, Math.round(moveOutPL));

  return {
    currentDue: due,
    securityDepositCollected: collected,
    securityDepositReturned: returned,
    moveOutPL,
    amountToBeCollected: amountToBeCollected > 0 ? amountToBeCollected : undefined,
    notes,
  };
}

/**
 * Extract move-out data from a booking object
 * Looks for moveOutRequest data in the booking
 */
export function extractMoveOutDataFromBooking(booking: any): {
  isMoveOutComplete: boolean;
  currentDue: number;
  securityDepositCollected: number;
  securityDepositReturned: number;
} {
  const moveOutRequest = booking.moveOutRequest;
  
  return {
    isMoveOutComplete: moveOutRequest?.status === 'completed' || booking.moveOutStatus === 'completed',
    currentDue: moveOutRequest?.currentDue || 0,
    securityDepositCollected: moveOutRequest?.securityDepositAmount || booking.securityDeposit || 0,
    securityDepositReturned: moveOutRequest?.securityDepositReturned || 0,
  };
}

/**
 * Check if a booking has completed move-out
 */
export function isBookingMovedOut(booking: any): boolean {
  return (
    booking.moveOutRequest?.status === 'completed' ||
    booking.moveOutStatus === 'completed' ||
    booking.status === 'moved_out' ||
    booking.moveOutDate != null
  );
}

/**
 * Aggregate MoveOut P/L for multiple bookings
 */
export function aggregateMoveOutPL(bookings: any[]): {
  totalMoveOutPL: number;
  moveOutCount: number;
  details: MoveOutFinancialData[];
} {
  const details: MoveOutFinancialData[] = [];
  let totalMoveOutPL = 0;
  let moveOutCount = 0;

  bookings.forEach((booking) => {
    if (isBookingMovedOut(booking)) {
      moveOutCount++;
      const moveOutData = extractMoveOutDataFromBooking(booking);
      const plData = calculateMoveOutPL(
        moveOutData.currentDue,
        moveOutData.securityDepositCollected,
        moveOutData.securityDepositReturned
      );
      details.push(plData);
      totalMoveOutPL += plData.moveOutPL;
    }
  });

  return {
    totalMoveOutPL: Math.round(totalMoveOutPL),
    moveOutCount,
    details,
  };
}
