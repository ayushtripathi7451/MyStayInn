import { useState, useEffect, useCallback } from "react";
import { userApi } from "../../utils/api";

/**
 * Resolves user-service numeric id for the logged-in user (same id used by bookings / payments).
 */
export function useMeUserId() {
  const [userId, setUserId] = useState<string | undefined>();

  const refresh = useCallback(() => {
    userApi
      .get("/api/users/me", { timeout: 12000 })
      .then((r) => {
        const u = r.data?.user ?? r.data;
        const raw = u?.id ?? u?.userId;
        if (raw != null) setUserId(String(raw));
        else setUserId(undefined);
      })
      .catch(() => setUserId(undefined));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { userId, refresh };
}
