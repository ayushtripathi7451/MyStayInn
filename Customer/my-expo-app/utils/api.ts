import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Set in .env as EXPO_PUBLIC_API_HOST (e.g. 10.0.2.2 for Android emulator, your PC IP for physical device on same WiFi, localhost for same machine).
const API_HOST =  "192.168.1.7";

// Auth service (port 3001) - handles authentication, KYC
export const api = axios.create({
  baseURL: `http://${API_HOST}:3001`,
  headers: {
    "Content-Type": "application/json",
  },
});

// User service (port 3002) - profile, push-token, announcements. Must be reachable from device for push registration.
export const userApi = axios.create({
  baseURL: `http://${API_HOST}:3002`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Ticket service (port 3007) - support tickets
export const ticketApi = axios.create({
  baseURL: `http://${API_HOST}:3007`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Move-out service (port 3009) - move-out requests and status
export const moveOutApi = axios.create({
  baseURL: `http://${API_HOST}:3010`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Property service (port 3004) - search admin's PGs/hostels by owner
export const propertyApi = axios.create({
  baseURL: `http://${API_HOST}:3004`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Booking service (port 3008) - enrollment requests, bookings
export const bookingApi = axios.create({
  baseURL: `http://${API_HOST}:3008`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Transaction service (configured via backend .env; here it's running on 3003) - payments, Cashfree payment links
export const transactionApi = axios.create({
  baseURL: `http://${API_HOST}:3003`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token for auth service
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("USER_TOKEN");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor to attach JWT token for user service
userApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("USER_TOKEN");
      console.log("📤 [userApi Interceptor] Token from AsyncStorage:", !!token);
      if (token) {
        console.log("📤 [userApi Interceptor] Adding Bearer token to request");
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.log("⚠️ [userApi Interceptor] No token found in AsyncStorage");
      }
      console.log("📤 [userApi Interceptor] Request details:");
      console.log("   - URL:", config.url);
      console.log("   - Full URL:", `${config.baseURL}${config.url}`);
      console.log("   - Authorization header:", config.headers.Authorization ? "✓ Present" : "✗ Missing");
    } catch (error) {
      console.error("Error getting token from AsyncStorage:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor to attach JWT token for ticket service
ticketApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("USER_TOKEN");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor to attach JWT token for move-out service
moveOutApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("USER_TOKEN");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor to attach JWT token for property service
propertyApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("USER_TOKEN");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor to attach JWT token for booking service
bookingApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("USER_TOKEN");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor to attach JWT token for transaction service
transactionApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("USER_TOKEN");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);