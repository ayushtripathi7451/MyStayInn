import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Debug utility to check token storage and retrieval
 */
export const debugToken = async () => {
  try {
    const userToken = await AsyncStorage.getItem("USER_TOKEN");
    const authToken = await AsyncStorage.getItem("authToken");
    
    console.log("=== TOKEN DEBUG ===");
    console.log("USER_TOKEN:", userToken ? `${userToken.substring(0, 20)}...` : "NOT FOUND");
    console.log("authToken:", authToken ? `${authToken.substring(0, 20)}...` : "NOT FOUND");
    console.log("==================");
    
    return {
      userToken,
      authToken,
      hasToken: !!(userToken || authToken)
    };
  } catch (error) {
    console.error("Error reading tokens:", error);
    return {
      userToken: null,
      authToken: null,
      hasToken: false
    };
  }
};

/**
 * Clear all tokens (for logout)
 */
export const clearTokens = async () => {
  try {
    await AsyncStorage.removeItem("USER_TOKEN");
    await AsyncStorage.removeItem("authToken");
    console.log("Tokens cleared");
  } catch (error) {
    console.error("Error clearing tokens:", error);
  }
};

/**
 * Sync tokens - ensure both keys have the same value
 */
export const syncTokens = async () => {
  try {
    const userToken = await AsyncStorage.getItem("USER_TOKEN");
    const authToken = await AsyncStorage.getItem("authToken");
    
    if (userToken && !authToken) {
      await AsyncStorage.setItem("authToken", userToken);
      console.log("Synced authToken from USER_TOKEN");
    } else if (authToken && !userToken) {
      await AsyncStorage.setItem("USER_TOKEN", authToken);
      console.log("Synced USER_TOKEN from authToken");
    }
  } catch (error) {
    console.error("Error syncing tokens:", error);
  }
};
