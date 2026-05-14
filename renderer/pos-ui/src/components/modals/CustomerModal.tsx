import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import toast from "react-hot-toast";

const TABS = [
  "Dashboard",
  "Contact Information",
  "Purchase History",
  "Accounts",
  "Awards",
  "Tasks",
  "Comments",
  "Addresses",
  "House Account",
  "Wish List",
];

export default function CustomerModal({
  mode = "add",
  selectedCustomer,
  onClose,
  //   onSave,
  scanRef,
}: any) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("Contact Information");
  const { post, put } = useApi();

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    mobile: "",
    customer_type: "retail",
    company_name: "",
    gstin: "",
    pan: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    place_of_supply: "",
    registration_type: "regular",
  });
  //   console.log("CustomerModal - selectedCustomer:", selectedCustomer);
  /* ===============================
       PREFILL ON UPDATE
    =============================== */
  useEffect(() => {
    // Safely extract customer whether it's an object or an array!
    const customerData = Array.isArray(selectedCustomer)
      ? selectedCustomer[0]
      : selectedCustomer;
    console.log("CustomerModal - customerData for prefill:", customerData);
    if (mode === "update" && customerData?.id) {
      let first = "",
        middle = "",
        last = "";
      if (customerData?.name) {
        const parts = customerData?.name?.trim().split(" ");
        first = parts[0] || "";
        if (parts.length > 2) {
          last = parts.pop() || "";
          middle = parts.slice(1).join(" ");
        } else if (parts.length === 2) {
          last = parts[1] || "";
        }
      }

      setForm({
        first_name: first || customerData.name || "",
        middle_name: middle,
        last_name: last,
        email: customerData.email || "",
        mobile: customerData.mobile || "",
        customer_type: customerData.customer_type || "retail",
        company_name: customerData.company_name || "",
        gstin: customerData.tax_profile?.gstin || customerData.gstin || "",
        pan: customerData.pan || "",
        address_line1:
          customerData.address?.address_line1 ||
          customerData.address_line1 ||
          "",
        address_line2:
          customerData.address?.address_line2 ||
          customerData.address_line2 ||
          "",
        city: customerData.address?.city || customerData.city || "",
        state: customerData.address?.state || customerData.state || "",
        pincode: customerData.address?.pincode || customerData.pincode || "",
        place_of_supply:
          customerData.tax_profile?.place_of_supply ||
          customerData.place_of_supply ||
          "",
        registration_type:
          customerData.tax_profile?.registration_type ||
          customerData.registration_type ||
          "regular",
      });
    }

    if (mode === "add") {
      setForm({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        mobile: "",
        customer_type: "retail",
        company_name: "",
        gstin: "",
        pan: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        place_of_supply: "",
        registration_type: "regular",
      });
    }
  }, [selectedCustomer, mode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!form.first_name || !form.mobile) {
        toast.error("First Name and Mobile are required.");
        return;
      }

      const fullName = [form.first_name, form.middle_name, form.last_name]
        .map((n) => n.trim())
        .filter(Boolean)
        .join(" ");

      const customerData = Array.isArray(selectedCustomer)
        ? selectedCustomer[0]
        : selectedCustomer;

      const payload = {
        customer_type: form.customer_type || "retail",
        name: fullName,
        mobile: form.mobile || null,
        email: form.email || null,
        company_name: form.company_name || null,
        gstin: form.gstin || null,
        pan: form.pan || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        place_of_supply: form.place_of_supply || null,
        registration_type: form.registration_type || "regular",
      };
      const endpoint =
        mode === "add" ? "pos/customers" : `pos/customers/${customerData?.id}`;

      const res =
        mode === "add"
          ? await post(endpoint, payload)
          : await put(endpoint, payload);
      console.log("Save customer response:", res);
      if (res.error) throw new Error(res.error);

      toast.success(
        `Customer ${mode === "add" ? "added" : "updated"} successfully!`,
      );
      //   onSave(res.data);
      onClose();
      setTimeout(() => scanRef?.current?.focus(), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const titleLeft = useMemo(() => {
    if (mode === "update" && selectedCustomer?.name)
      return selectedCustomer.name;
    return mode === "add" ? "New Customer" : "Customer";
  }, [mode, selectedCustomer?.name]);

  /* UI helpers */
  const LBL = "text-[12px] text-slate-600 font-semibold";
  const INP =
    "w-full bg-[#d9d9d9] border border-[#b8b8b8] px-3 py-2 text-[13px] text-slate-900 outline-none focus:ring-2 focus:ring-blue-400";
  const ROW = "grid grid-cols-[160px_1fr] items-center gap-3";
  const SECTION_TITLE = "text-[13px] font-bold text-slate-700";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-[1180px] max-w-[95vw] max-h-[92vh] bg-[#e9eef2] border border-slate-300 shadow-2xl flex flex-col overflow-hidden">
        {/* TOP HEADER (Blue) */}
        <div className="bg-[#1b5f93] text-white px-4 py-2 flex items-center justify-between">
          <div className="text-[14px] font-semibold">{titleLeft}</div>

          <div className="text-[12px] opacity-90">
            {mode === "update" && selectedCustomer
              ? `Customer Code: ${selectedCustomer.customer_code || selectedCustomer.code || "-"}`
              : ""}
          </div>

          <button
            onClick={() => {
              onClose();
              setTimeout(() => scanRef?.current?.focus(), 100);
            }}
            className="text-white/80 hover:text-white"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* TABS BAR */}
        <div className="bg-[#0e395a] text-white flex flex-wrap gap-0 border-b border-[#0a2a43]">
          {TABS.map((t) => {
            const active = t === activeTab;
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={[
                  "px-4 py-2 text-[13px] font-semibold border-r border-[#0a2a43]",
                  active ? "bg-[#1b5f93]" : "bg-[#0e395a] hover:bg-[#13486f]",
                ].join(" ")}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 relative">
          {/* Main grid like image */}
          <div className="grid grid-cols-[260px_1fr] gap-4">
            {/* LEFT: Avatar + Side space */}
            <div>
              <div className="bg-white border border-slate-300 p-3">
                <div className="w-full aspect-[4/3] bg-slate-200 border border-slate-300 flex items-center justify-center">
                  {/* placeholder */}
                  <div className="text-slate-500 text-[12px]">
                    Profile Photo
                  </div>
                </div>
              </div>

              <div className="mt-4 text-slate-600 font-bold text-[14px]">
                Contact Information
              </div>
            </div>

            {/* RIGHT: Form Area */}
            <div className="space-y-4">
              {/* TOP FORM (name/address like image) */}
              <div className="bg-[#e9eef2]">
                <div className="grid grid-cols-3 gap-4">
                  <div className={ROW}>
                    <div className={LBL}>First</div>
                    <input
                      className={INP}
                      value={form.first_name}
                      onChange={(e) =>
                        setForm({ ...form, first_name: e.target.value })
                      }
                      placeholder="Name"
                    />
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>Middle</div>
                    <input
                      className={INP}
                      value={form.middle_name}
                      onChange={(e) =>
                        setForm({ ...form, middle_name: e.target.value })
                      }
                      placeholder="-"
                    />
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>Last</div>
                    <input
                      className={INP}
                      value={form.last_name}
                      onChange={(e) =>
                        setForm({ ...form, last_name: e.target.value })
                      }
                      placeholder="-"
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className={ROW}>
                    <div className={LBL}>Company</div>
                    <input
                      className={INP}
                      value={form.company_name}
                      onChange={(e) =>
                        setForm({ ...form, company_name: e.target.value })
                      }
                      placeholder="Company Name"
                    />
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>Type</div>
                    <select
                      className={INP}
                      value={form.customer_type}
                      onChange={(e) =>
                        setForm({ ...form, customer_type: e.target.value })
                      }
                    >
                      <option value="walkin">Walk-in</option>
                      <option value="retail">Retail</option>
                      <option value="business">Business</option>
                    </select>
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>Address</div>
                    <input
                      className={INP}
                      value={form.address_line1}
                      onChange={(e) =>
                        setForm({ ...form, address_line1: e.target.value })
                      }
                      placeholder="Address Line 1"
                    />
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>Apartment</div>
                    <input
                      className={INP}
                      value={form.address_line2}
                      onChange={(e) =>
                        setForm({ ...form, address_line2: e.target.value })
                      }
                      placeholder="Address Line 2"
                    />
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>Postal Code</div>
                    <input
                      className={INP}
                      value={form.pincode}
                      onChange={(e) =>
                        setForm({ ...form, pincode: e.target.value })
                      }
                      placeholder="Pincode"
                    />
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>City</div>
                    <input
                      className={INP}
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                      placeholder="City"
                    />
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>State</div>
                    <input
                      className={INP}
                      value={form.state}
                      onChange={(e) =>
                        setForm({ ...form, state: e.target.value })
                      }
                      placeholder="State"
                    />
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>Place of Supply</div>
                    <input
                      className={INP}
                      value={form.place_of_supply}
                      onChange={(e) =>
                        setForm({ ...form, place_of_supply: e.target.value })
                      }
                      placeholder="Place of Supply"
                    />
                  </div>
                </div>
              </div>

              {/* LOWER 2 PANELS like image: Contact Info + Personal Info */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                {/* Contact block */}
                <div>
                  <div className={SECTION_TITLE}>Contact Information</div>
                  <div className="mt-2 space-y-2">
                    <div className={ROW}>
                      <div className={LBL}>Mobile</div>
                      <input
                        className={INP}
                        value={form.mobile}
                        onChange={(e) =>
                          setForm({ ...form, mobile: e.target.value })
                        }
                        placeholder="Mobile"
                      />
                    </div>

                    <div className={ROW}>
                      <div className={LBL}>GSTIN</div>
                      <input
                        className={INP}
                        value={form.gstin}
                        onChange={(e) =>
                          setForm({ ...form, gstin: e.target.value })
                        }
                        placeholder="GSTIN"
                      />
                    </div>

                    <div className={ROW}>
                      <div className={LBL}>PAN</div>
                      <input
                        className={INP}
                        value={form.pan}
                        onChange={(e) =>
                          setForm({ ...form, pan: e.target.value })
                        }
                        placeholder="PAN"
                      />
                    </div>

                    {/* Email optional (not in your current form) */}
                    <div className={ROW}>
                      <div className={LBL}>Email</div>
                      <input
                        className={INP}
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="(optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Personal block (UI only for now) */}
                <div>
                  <div className={SECTION_TITLE}>Personal Information</div>
                  <div className="mt-2 space-y-2">
                    <div className={ROW}>
                      <div className={LBL}>Registration</div>
                      <select
                        className={INP}
                        value={form.registration_type}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            registration_type: e.target.value,
                          })
                        }
                      >
                        <option value="regular">Regular</option>
                        <option value="composition">Composition</option>
                      </select>
                    </div>

                    <div className={ROW}>
                      <div className={LBL}>Anniversary</div>
                      <input
                        className={INP}
                        value={""}
                        readOnly
                        placeholder="(optional)"
                      />
                    </div>

                    <div className={ROW}>
                      <div className={LBL}>Birth Date</div>
                      <input
                        className={INP}
                        value={""}
                        readOnly
                        placeholder="(optional)"
                      />
                    </div>

                    <div className={ROW}>
                      <div className={LBL}>Gender</div>
                      <select className={INP} value={""} onChange={() => {}}>
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div className={ROW}>
                      <div className={LBL}>Language</div>
                      <select
                        className={INP}
                        value={"English"}
                        onChange={() => {}}
                      >
                        <option>English</option>
                        <option>Hindi</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* TAX small row (if you want keep separate) */}
              <div className="pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className={ROW}>
                    <div className={LBL}>GST Reg. Type</div>
                    <select
                      className={INP}
                      value={form.registration_type}
                      onChange={(e) =>
                        setForm({ ...form, registration_type: e.target.value })
                      }
                    >
                      <option value="regular">Regular</option>
                      <option value="composition">Composition</option>
                    </select>
                  </div>

                  <div className={ROW}>
                    <div className={LBL}>GSTIN</div>
                    <input
                      className={INP}
                      value={form.gstin}
                      onChange={(e) =>
                        setForm({ ...form, gstin: e.target.value })
                      }
                      placeholder="GSTIN"
                    />
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => scanRef?.current?.focus(), 100);
                  }}
                  className="px-4 py-2 text-[13px] bg-slate-300 hover:bg-slate-400 text-slate-900 border border-slate-400"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 text-[13px] bg-[#1b5f93] hover:bg-[#174f7a] text-white font-semibold border border-[#13466e]"
                >
                  {saving ? "   ..." : mode === "add" ? "Save" : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* optional bottom padding bar like windows apps */}
        <div className="h-1 bg-[#1b5f93]" />
      </div>
    </div>
  );
}
