import { api } from "./api";

export const registerCustomer = (payload: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  gender: string;
}) => {
  return api.post("/auth/register/customer", payload);
};

export const verifyLoginOtp = (payload: {
  phone: string;
  otp: string;
}) => {
  return api.post("/auth/login/verify-otp", payload);
};


