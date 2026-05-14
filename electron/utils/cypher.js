import crypto from "crypto";
import { getDerivedKey } from "./secureKey.js";

const IV_LENGTH = 16; // For AES, this is always 16

async function encrypt(text) {
  if (!text) return null;
  const encryptionKey = await getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

async function decrypt(text) {
  if (!text) return null;
  try {
    const encryptionKey = await getDerivedKey();
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error);
    return null; // Return null if decryption fails
  }
}

export { encrypt, decrypt };
