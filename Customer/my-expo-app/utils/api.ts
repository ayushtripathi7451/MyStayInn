import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_HOST = "api.mystayinn.co.in";

/**
 * Helper function to attach JWT token
 */
const attachToken = async (config: any) => {
  try {
    const token = await AsyncStorage.getItem("USER_TOKEN");

    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error getting token:", error);
  }

  return config;
};

/**
 * Auth Service
 */
export const api = axios.create({
  baseURL: `https://${API_HOST}/auth`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * User Service
 */
export const userApi = axios.create({
  baseURL: `https://${API_HOST}/users`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Ticket Service
 */
export const ticketApi = axios.create({
  baseURL: `https://${API_HOST}/tickets`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Move-out Service
 */
export const moveOutApi = axios.create({
  baseURL: `https://${API_HOST}/moveouts`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Property Service
 */
export const propertyApi = axios.create({
  baseURL: `https://${API_HOST}/properties`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Booking Service
 */
export const bookingApi = axios.create({
  baseURL: `https://${API_HOST}/bookings`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Transaction Service
 */
export const transactionApi = axios.create({
  baseURL: `https://${API_HOST}/transactions`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Attach interceptor to all APIs
 */
[
  api,
  userApi,
  ticketApi,
  moveOutApi,
  propertyApi,
  bookingApi,
  transactionApi,
].forEach((instance) => {
  instance.interceptors.request.use(attachToken, (error) =>
    Promise.reject(error)
  );
});