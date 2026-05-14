import { app, safeStorage } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const KEY_FILE_NAME = "pos_secret.key";
const getSecretPath = () => {
  return path.join(app.getPath("userData"), KEY_FILE_NAME);
};

let derivedKey = null;

async function getDerivedKey() {
  if (derivedKey) {
    return derivedKey;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    console.error(
      "❌ Secure storage is not available. Cannot manage encryption key.",
    );
    // Fallback to a less secure, but stable key for this session.
    // This is NOT ideal for production but prevents a crash.
    const fallbackPhrase = "insecure-fallback-for-unsupported-os";
    derivedKey = crypto.createHash("sha256").update(fallbackPhrase).digest();
    return derivedKey;
  }

  const secretPath = getSecretPath();
  let secretPhrase;

  try {
    if (fs.existsSync(secretPath)) {
      const encryptedPhrase = fs.readFileSync(secretPath);
      secretPhrase = safeStorage.decryptString(encryptedPhrase);
    } else {
      console.log("⚠️ No secret phrase found. Generating a new one.");
      secretPhrase = crypto.randomBytes(32).toString("hex");
      const encryptedPhrase = safeStorage.encryptString(secretPhrase);
      fs.writeFileSync(secretPath, encryptedPhrase);
      console.log("✅ New secret phrase generated and stored securely.");
    }
  } catch (error) {
    console.error("❌ Critical error managing secret phrase:", error);
    throw new Error("Failed to load or create the encryption secret.");
  }

  derivedKey = crypto
    .createHash("sha256")
    .update(String(secretPhrase))
    .digest();
  return derivedKey;
}

export { getDerivedKey };
