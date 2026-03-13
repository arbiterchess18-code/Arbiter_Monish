import { useAuth } from "@clerk/react";
import { useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const useApi = () => {
  const { getToken } = useAuth();

  const apiFetchHook = useCallback(
    async (endpoint, options = {}) => {
      try {
        const token = await getToken();
        
        const mergedOptions = {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
          },
        };

        // We no longer rely on credentials: "include" for our local cookie auth, 
        // as Clerk handles cross-origin tokens explicitly in the Bearer header
        const response = await fetch(`${API_URL}${endpoint}`, mergedOptions);
        
        return response;
      } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
      }
    },
    [getToken]
  );

  return apiFetchHook;
};
