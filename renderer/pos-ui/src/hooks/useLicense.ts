import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useApi } from "./useApi";

export const validateLicenseApi = async (
  licenseKey: string,
  deviceId: string,
  apiPost: any,
): Promise<{ valid: boolean; message: string; isNetworkError?: boolean }> => {
  console.log("Validating license with API...", {
    licenseKey,
    deviceId,
  });

  const { data, error } = await apiPost("licenses/validate", {
    device_id: deviceId,
    license_key: licenseKey,
  });
  console.log("License validation response:", { data, error });

  // If data is missing and there's an error, it's likely a network/fetch failure
  if (!data && error) {
    return { valid: false, message: error, isNetworkError: true };
  }

  if (error || data?.status === "error" || data?.is_valid === false) {
    return {
      valid: false,
      message:
        error ||
        data?.message ||
        "Invalid license or already in use on another device.",
    };
  }

  return {
    valid: true,
    message: data?.message || "License activated successfully!",
  };
};

export function useLicense() {
  const [isLicensed, setIsLicensed] = useState<boolean | null>(null); // null = checking
  const [isLoading, setIsLoading] = useState(false);
  const { post } = useApi(); // Ready to be passed to validation API

  useEffect(() => {
    let isMounted = true;

    const checkLocalLicense = async () => {
      let storedKey = null;
      if ((window as any).posApi && (window as any).posApi.getLicense) {
        storedKey = await (window as any).posApi.getLicense();
        console.log("Stored license key found:", storedKey);
      }

      if (!storedKey) {
        if (isMounted) setIsLicensed(false);
        return;
      }

      // Trust the local license key to prevent unnecessary API calls,
      // especially when the Login component mounts during logout.
      if (isMounted) setIsLicensed(true);
    };

    checkLocalLicense();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activateLicense = async (key: string) => {
    setIsLoading(true);
    try {
      let deviceId = "UNKNOWN_DEVICE";
      if ((window as any).posApi && (window as any).posApi.getDeviceId) {
        deviceId = await (window as any).posApi.getDeviceId();
      }

      const result = await validateLicenseApi(key, deviceId, post);
      console.log("License validation result:", result);
      if (result.valid) {
        // Notify the Electron backend to store the license and unblock background syncs
        if ((window as any).posApi && (window as any).posApi.saveLicense) {
          await (window as any).posApi.saveLicense(key);
        }

        setIsLicensed(true);
        toast.success(result.message);
        return true;
      } else {
        toast.error(result.message);
        return false;
      }
    } catch (error) {
      toast.error("Network error during license activation.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLicensed, isLoading, activateLicense };
}
