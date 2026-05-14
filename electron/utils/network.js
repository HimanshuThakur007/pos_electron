import config from "../config.cjs";
import dns from "dns";

const { API_BASE_URL2 } = config;

function checkInternet(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    dns.lookup("google.com", (err) => {
      clearTimeout(timer);
      resolve(!err);
    });
  });
}

/**
 * Checks if both the internet and the central backend server are reachable.
 * @param {number} timeoutMs - Timeout in milliseconds (default: 3000)
 * @returns {Promise<boolean>}
 */
export async function isServerOnline(timeoutMs = 3000) {
  try {
    // 1. Check general internet connectivity first
    const hasInternet = await checkInternet(timeoutMs);
    if (!hasInternet) return false;

    // 2. Check actual server availability
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${API_BASE_URL2}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    const resData = await response.json().catch(() => null);
    // console.log("Health API response (Backend):", response.status, resData);
    clearTimeout(timer);
    // Consider the server online if the app status is "ok"
    return resData?.app === "ok";
  } catch (err) {
    return false;
  }
}
