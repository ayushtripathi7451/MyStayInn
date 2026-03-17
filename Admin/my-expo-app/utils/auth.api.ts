import { api } from "./api";

export const registerAdmin = (payload: {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  gender?: string;
  pin?: string;
}) => {
  return api.post("/auth/register/admin", payload);
};
