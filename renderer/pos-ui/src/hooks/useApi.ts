import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  (window as any).posApi?.apiBaseUrl2 || "https://market99.tech/api/";

export function useApi() {
  const { token, logout } = useAuth();
  // console.log("useApi initialized with token:", token);
  const apiFetch = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {},
      customToken?: string,
    ) => {
      const headers = new Headers(options.headers || {});
      const effectiveToken = customToken || token;

      if (effectiveToken) {
        headers.set("Authorization", `Bearer ${effectiveToken}`);
      }
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      headers.set("Accept", "application/json");

      try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
          ...options,
          headers,
        });

        if (response.status === 401 && !customToken) {
          // Unauthorized, likely expired token.
          // For an offline-first POS, we DO NOT force logout here.
          // This allows the user to stay on the page and continue offline billing.
          return {
            error: "Server session expired. Local billing remains active.",
          };
        }

        const responseData = await response.json().catch(() => ({})); // Handle empty/non-json responses

        if (!response.ok) {
          return {
            error:
              responseData.message || `HTTP error! status: ${response.status}`,
            status: response.status,
            data: responseData,
          };
        }

        return { data: responseData, status: response.status };
      } catch (error: any) {
        return {
          error: error.message || "Network request failed",
          status: 500,
        };
      }
    },
    [token, logout],
  );

  const get = useCallback(
    <T>(
      endpoint: string,
    ): Promise<{ data?: T; error?: string; status?: number }> => {
      return apiFetch(endpoint, { method: "GET" });
    },
    [apiFetch],
  );

  const post = useCallback(
    <T>(
      endpoint: string,
      body: any,
      customToken?: string,
    ): Promise<{ data?: T; error?: string; status?: number }> => {
      return apiFetch(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
        customToken,
      );
    },
    [apiFetch],
  );

  const put = useCallback(
    <T>(
      endpoint: string,
      body: any,
      customToken?: string,
    ): Promise<{ data?: T; error?: string; status?: number }> => {
      return apiFetch(
        endpoint,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
        customToken,
      );
    },
    [apiFetch],
  );

  return { get, post, put };
}
