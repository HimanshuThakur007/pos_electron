import { ipcMain, app, safeStorage } from "electron";
import fs from "fs";
import path from "path";
import { updateLicenseStatus } from "../services/sync.js";
import { API_BASE_URL2 } from "../config.js";
import { getLoginSession } from "../repositories/session.sqlite.repo.js";

const getLicensePath = () => {
  return path.join(app.getPath("userData"), "pos_license.key");
};

ipcMain.handle("save-license", async (_, key) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Encryption is not available on this system.");
    }
    const licenseFile = getLicensePath();
    const encryptedKey = safeStorage.encryptString(key);
    fs.writeFileSync(licenseFile, encryptedKey);
    updateLicenseStatus(true);
    console.log("✅ License key saved securely.");
    return true;
  } catch (error) {
    console.error("❌ Failed to save license file:", error);
    return false;
  }
});

ipcMain.handle("get-license", async () => {
  try {
    const licenseFile = getLicensePath();
    if (!fs.existsSync(licenseFile)) {
      return null;
    }
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn("⚠️ Encryption not available, cannot read license.");
      return null;
    }
    const encryptedKey = fs.readFileSync(licenseFile);
    const decryptedKey = safeStorage.decryptString(encryptedKey);
    console.log("✅ License key retrieved successfully.");
    return decryptedKey;
  } catch (error) {
    console.error("❌ Failed to get license key:", error);
    return null;
  }
});

ipcMain.handle("remove-license", async () => {
  try {
    const licenseFile = getLicensePath();
    if (fs.existsSync(licenseFile)) {
      fs.unlinkSync(licenseFile);
    }
    updateLicenseStatus(false);
    console.log("✅ License key removed.");
    return true;
  } catch (error) {
    console.error("❌ Failed to remove license file:", error);
    return false;
  }
});

ipcMain.handle("validate-gst", async (_, gstin) => {
  try {
    const session = getLoginSession() || {};
    const token = session.token || session.auth_token || "";

    const response = await fetch(`${API_BASE_URL2}/pos/gst-lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gstin }),
    });
    console.log("GST validation response status:", response.status);
    return await response.json();
  } catch (error) {
    console.error("❌ Failed to validate GST:", error);
    return { status: 0, message: "Network error during validation" };
  }
});
// ipcMain.handle("validate-gst", async (_, gstin) => {
//   try {
//     const response = await fetch("https://my.gstzen.in/api/gstin-validator/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Token: "44e73a36-133c-49cc-93a3-09360cdd1c48",
//       },
//       body: JSON.stringify({ gstin }),
//     });
//     return await response.json();
//   } catch (error) {
//     console.error("❌ Failed to validate GST:", error);
//     return { status: 0, message: "Network error during validation" };
//   }
// });
