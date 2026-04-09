import { isAxiosError } from "axios";
import { userApi } from "./api";

/**
 * Clears Aadhaar/DigiLocker data in the **auth-service** DB for the logged-in user.
 * Uses **user-service** as a relay (POST /api/users/profile/clear-auth-aadhaar-kyc), which
 * calls auth internal POST /api/auth/internal/clear-aadhaar-kyc — the same path as
 * updateProfileInfo when clearAadhaarKyc is true. This avoids calling
 * /auth/api/kyc/digilocker/clear, which many gateways do not route (404, no JSON body).
 */
export async function clearAadhaarKycOnAuthService(): Promise<boolean> {
  try {
    const res = await userApi.post("/api/users/profile/clear-auth-aadhaar-kyc");
    return res.data?.success === true;
  } catch (e) {
    if (isAxiosError(e)) {
      console.warn(
        "[authKycSync] profile/clear-auth-aadhaar-kyc failed:",
        e.response?.status,
        e.response?.data ?? e.message,
      );
    } else {
      console.warn("[authKycSync] profile/clear-auth-aadhaar-kyc failed:", e);
    }
    return false;
  }
}
