/**
 * Firebase Confirmation Helper
 * 
 * Stores Firebase phone auth confirmation result temporarily
 * to avoid passing non-serializable objects through React Navigation
 */

let confirmationResult:any = null;

export const setConfirmation = (confirmation: any) => {
  console.log('Setting confirmation:', confirmation ? 'Yes' : 'No');
  confirmationResult = confirmation;
};

export const getConfirmation = () => {
  console.log('Getting confirmation:', confirmationResult ? 'Exists' : 'Not exists');
  if (!confirmationResult) {
    console.warn('No confirmation result found. Please request OTP again.');
    return null;
  }
  return confirmationResult;
};

export const clearConfirmation = () => {
  console.log('Clearing confirmation');
  confirmationResult = null;
};

export const hasConfirmation = () => {
  return confirmationResult !== null;
};