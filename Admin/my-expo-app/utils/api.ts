import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Base URLs for different services
const AUTH_SERVICE_URL = "https://api.mystayinn.co.in/auth";
const PROPERTY_SERVICE_URL = "https://api.mystayinn.co.in/properties";
const USER_SERVICE_URL = "https://api.mystayinn.co.in/users";
const BOOKING_SERVICE_URL = "https://api.mystayinn.co.in/bookings";
const NOTIFICATION_SERVICE_URL = "https://api.mystayinn.co.in/notifications";
const TICKET_SERVICE_URL = "https://api.mystayinn.co.in/tickets";
const MOVE_OUT_SERVICE_URL = "https://api.mystayinn.co.in/moveouts";
const EXPENSE_SERVICE_URL = "https://api.mystayinn.co.in/expenses";
const ANALYTICS_SERVICE_URL = "https://api.mystayinn.co.in/analytics";
const TRANSACTION_SERVICE_URL = "https://api.mystayinn.co.in/transactions";

/** AsyncStorage may hold literal "null" / "undefined" strings — do not send as Bearer (401). */
function isUsableJwtStorageValue(t: string | null | undefined): t is string {
  if (t == null || typeof t !== "string") return false;
  const s = t.trim();
  if (!s) return false;
  if (s === "null" || s === "undefined") return false;
  return true;
}

/**
 * JWT for API calls: USER_TOKEN first, then authToken (legacy / CreateMPINScreen).
 */
export async function getAuthBearerToken(): Promise<string | null> {
  const primary = await AsyncStorage.getItem("USER_TOKEN");
  if (isUsableJwtStorageValue(primary)) return primary.trim();
  const fallback = await AsyncStorage.getItem("authToken");
  if (isUsableJwtStorageValue(fallback)) return fallback.trim();
  return null;
}

const attachAuthToken = async (config: any) => {
  try {
    const token = await getAuthBearerToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error getting token:", error);
  }
  return config;
};

export const api = axios.create({
  baseURL: AUTH_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const propertyApi = axios.create({
  baseURL: PROPERTY_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const userApi = axios.create({
  baseURL: USER_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const bookingApi = axios.create({
  baseURL: BOOKING_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const transactionApi = axios.create({
  baseURL: TRANSACTION_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const notifyApi = axios.create({
  baseURL: NOTIFICATION_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const ticketApi = axios.create({
  baseURL: TICKET_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const moveOutApi = axios.create({
  baseURL: MOVE_OUT_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Include /api/expenses so requests are always to the expense service routes
export const expenseApi = axios.create({
  baseURL: `${EXPENSE_SERVICE_URL}/api/expenses`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const analyticsApi = axios.create({
  baseURL: `${ANALYTICS_SERVICE_URL}/api/analytics`,
  headers: {
    "Content-Type": "application/json",
  },
});

[
  api,
  propertyApi,
  userApi,
  bookingApi,
  transactionApi,
  notifyApi,
  ticketApi,
  moveOutApi,
  expenseApi,
  analyticsApi,
].forEach((instance) => {
  instance.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
});
