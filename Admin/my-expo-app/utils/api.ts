import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Base URLs for different services
const AUTH_SERVICE_URL = "http://192.168.1.7:3001";
const PROPERTY_SERVICE_URL = "http://192.168.1.7:3004";
export const USER_SERVICE_URL = "http://192.168.1.7:3002";
const BOOKING_SERVICE_URL = "http://192.168.1.7:3008";
const NOTIFICATION_SERVICE_URL = "http://192.168.1.7:3005";
const TICKET_SERVICE_URL = "http://192.168.1.7:3007";
const MOVE_OUT_SERVICE_URL = "http://192.168.1.7:3010";
const EXPENSE_SERVICE_URL = "http://192.168.1.7:3011";
const ANALYTICS_SERVICE_URL = "http://192.168.1.7:3012";

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

// Request interceptor to attach JWT token for property service
propertyApi.interceptors.request.use(
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

// Request interceptor to attach JWT token for booking service
bookingApi.interceptors.request.use(
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

// Request interceptor to attach JWT token for notification service
notifyApi.interceptors.request.use(
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

// Request interceptor to attach JWT token for ticket service
ticketApi.interceptors.request.use(
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

// Request interceptor to attach JWT token for move-out service
moveOutApi.interceptors.request.use(
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

// Request interceptor to attach JWT token for expense service
expenseApi.interceptors.request.use(
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

// Request interceptor to attach JWT token for analytics service
analyticsApi.interceptors.request.use(
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