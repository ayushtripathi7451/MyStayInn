/**
 * Firebase Confirmation Helper
 * 
 * Stores Firebase phone auth confirmation result temporarily
 * to avoid passing non-serializable objects through React Navigation
 */

let confirmationResult: any = null;

export const setConfirmation = (confirmation: any) => {
  confirmationResult = confirmation;
};

export const getConfirmation = () => {
  return confirmationResult;
};

export const clearConfirmation = () => {
  confirmationResult = null;
};
