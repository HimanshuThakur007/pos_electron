import { useState, useCallback } from "react";

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async <T>(
      endpoint: string,
      method: "GET" | "POST" = "GET",
      body?: any,
      customToken?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const token = customToken || localStorage.getItem("auth_token");
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const config: RequestInit = {
          method,
          headers,
        };

        if (body) {
          config.body = JSON.stringify(body);
        }

        // Remove leading slash to ensure correct path concatenation
        const cleanEndpoint = endpoint.startsWith("/")
          ? endpoint.slice(1)
          : endpoint;

        // Get URL from Electron config (via preload)
        const baseUrl = (window as any).posApi?.apiBaseUrl2;

        if (!baseUrl) {
          throw new Error(
            "API URL is missing. Ensure you are running in Electron and preload is working.",
          );
        }

        const res = await fetch(`${baseUrl}/${cleanEndpoint}`, config);
        const data = await res.json();

        if (!res.ok) {
          const error: any = new Error(
            data.message || `Request failed with status ${res.status}`,
          );
          error.data = data;
          error.status = res.status;
          throw error;
        }

        return { data: data as T, error: null, status: res.status };
      } catch (err: any) {
        const msg = err.message || "Something went wrong";
        setError(msg);
        return { data: err.data || null, error: msg, status: err.status || 0 };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const get = useCallback(
    async <T>(endpoint: string, customToken?: string) =>
      request<T>(endpoint, "GET", undefined, customToken),
    [request],
  );

  const post = useCallback(
    async <T>(endpoint: string, body: any, customToken?: string) =>
      request<T>(endpoint, "POST", body, customToken),
    [request],
  );

  return { loading, error, get, post };
};
