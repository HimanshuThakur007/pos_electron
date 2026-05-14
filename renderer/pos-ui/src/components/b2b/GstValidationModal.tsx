import { useState, useRef, useEffect } from "react";
import BaseModal from "../common/BaseModal";

// GST state codes mapping as per official GST documentation
const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

interface GstValidationModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: (gstin: string, details?: any) => void;
  theme?: "light" | "dark";
}

export default function GstValidationModal({
  show,
  onClose,
  onSuccess,
  theme = "light",
}: GstValidationModalProps) {
  const [gstin, setGstin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"input" | "address">("input");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [companyDetails, setCompanyDetails] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  const validateGSTAdvanced = (gst: string) => {
    const stateCode = gst.substring(0, 2);
    if (!GST_STATE_CODES[stateCode]) {
      return "Invalid State Code";
    }
    const pan = gst.substring(2, 12);
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan)) {
      return "Invalid PAN inside GST";
    }
    return null;
  };

  useEffect(() => {
    if (show) {
      setGstin("");
      setError("");
      setView("input");
      setAddresses([]);
      setCompanyDetails(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  const handleValidate = async () => {
    const value = gstin.trim().toUpperCase();
    if (!gstRegex.test(value)) {
      setError("Invalid GST format");
      return;
    }
    const advError = validateGSTAdvanced(value);
    if (advError) {
      setError(advError);
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Delegate to the main process to bypass CORS
      const posApi = (window as any).posApi;
      const data = await posApi.validateGst(value);

      console.log("GST Validation API response:", data);
      if (data.status === 0) {
        setError(data.message || "Subscription/API Error");
        setIsLoading(false);
        return;
      }

      if (data.valid === false) {
        setError("Invalid GSTIN (Rejected by GSTN portal)");
        setIsLoading(false);
        return;
      }

      const pradr = data.company_details?.pradr;
      const adadr = data.company_details?.adadr || [];

      const allAddresses: any[] = [];
      if (pradr && pradr.addr) allAddresses.push({ ...pradr, isPrimary: true });
      adadr.forEach((a: any) => {
        if (a.addr) allAddresses.push({ ...a, isPrimary: false });
      });

      setCompanyDetails(data.company_details);

      if (allAddresses.length > 1) {
        setAddresses(allAddresses);
        setView("address");
        setIsLoading(false);
      } else {
        setIsLoading(false);
        onSuccess(value, {
          company: data.company_details,
          selectedAddress: allAddresses[0] || null,
        });
      }
    } catch (err) {
      setIsLoading(false);
      setError("Failed to connect to GST validation server.");
    }
  };

  const handleAddressSelect = (addr: any) => {
    onSuccess(gstin, {
      company: companyDetails,
      selectedAddress: addr,
    });
  };

  const isDisabled = !!error || gstin.length !== 15 || isLoading;

  const footer = (
    <div className="flex justify-end gap-3 w-full">
      <button
        onClick={onClose}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          theme === "dark"
            ? "bg-slate-700 hover:bg-slate-600 text-white"
            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
        }`}
      >
        Cancel
      </button>
      <button
        onClick={handleValidate}
        disabled={isDisabled}
        className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-white flex items-center gap-2 ${
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isLoading && (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        )}
        {isLoading ? "Validating..." : "Validate & Proceed"}
      </button>
    </div>
  );

  if (view === "address") {
    return (
      <BaseModal
        show={show}
        onClose={onClose}
        title="Select Business Address"
        subTitle={`Multiple addresses found for ${companyDetails?.legal_name || gstin}`}
        theme={theme}
        width="600px"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setView("input")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                theme === "dark"
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              Back
            </button>
          </div>
        }
      >
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {addresses.map((addr, i) => (
            <div
              key={i}
              onClick={() => handleAddressSelect(addr)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                theme === "dark"
                  ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                  : "border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${addr.isPrimary ? "text-blue-600" : "text-slate-500"}`}
                >
                  {addr.isPrimary ? "Primary Address" : "Additional Address"}
                </span>
              </div>
              <div
                className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
              >
                {addr.addr}
              </div>
            </div>
          ))}
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      show={show}
      onClose={onClose}
      title="B2B GST Validation"
      subTitle="Enter valid GSTIN to proceed with B2B Sales"
      theme={theme}
      width="450px"
      footer={footer}
    >
      <div className="py-2">
        <label
          className={`block text-sm font-medium mb-2 ${
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}
        >
          GSTIN Number <span className="text-red-500">*</span>
        </label>
        <input
          ref={inputRef}
          type="text"
          className={`block w-full px-3 py-2 rounded-md border focus:ring-2 focus:outline-none transition-colors uppercase ${
            error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "focus:ring-blue-500 focus:border-blue-500 " +
                (theme === "dark"
                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400")
          }`}
          value={gstin}
          onChange={(e) => {
            const value = e.target.value.toUpperCase();
            setGstin(value);
            if (value.length === 15) {
              if (!gstRegex.test(value)) {
                setError("Invalid GST format");
                return;
              }
              const advError = validateGSTAdvanced(value);
              if (advError) {
                setError(advError);
                return;
              }
              setError("");
            } else {
              setError("");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isDisabled) handleValidate();
            else if (e.key === "Escape") onClose();
          }}
          placeholder="e.g. 22AAAAA0000A1Z5"
          maxLength={15}
        />
        {error && (
          <div className="text-red-500 text-sm mt-1.5 font-medium">{error}</div>
        )}
      </div>
    </BaseModal>
  );
}
