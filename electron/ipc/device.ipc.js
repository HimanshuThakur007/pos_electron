import { ipcMain } from "electron";
import os from "os";
import { execSync } from "child_process";


function getSystemMachineId() {
  try {
    let output = "";
    const platform = os.platform();

    if (platform === "win32") {
      output = execSync("REG QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid", { encoding: "utf8", windowsHide: true });
      const match = output.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/i);
      if (match) return match[1].toLowerCase();
    } else if (platform === "darwin") {
      output = execSync("ioreg -rd1 -c IOPlatformExpertDevice", { encoding: "utf8" });
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/i);
      if (match) return match[1].toLowerCase();
    } else if (platform === "linux") {
      output = execSync("cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null", { encoding: "utf8" });
      if (output.trim()) return output.trim().toLowerCase();
    }
  } catch (error) {
    console.error("Error retrieving exact system device ID:", error.message);
  }
  // Fallback to computer name if OS checks fail
  return os.hostname().toLowerCase();
}

let cachedDeviceId = null;

function getDeviceUid() {
  if (!cachedDeviceId) {
    cachedDeviceId = getSystemMachineId();
  }
  return cachedDeviceId;
}

ipcMain.handle("get-device-id", () => {
  const deviceId = getDeviceUid();
  console.log("🆔 Device ID:", deviceId);
  return deviceId;
});