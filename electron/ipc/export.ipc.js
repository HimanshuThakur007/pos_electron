import { ipcMain, dialog } from "electron";
import fs from "fs";
import crypto from "crypto";

ipcMain.handle(
  "export-secure-backup",
  async (event, { jsonString, password, fileName }) => {
    try {
      const defaultFileName =
        fileName ||
        `Secure_Backup_${new Date().toISOString().split("T")[0]}.html`;

      // Ensure the extension is .html if not provided
      const resolvedFileName = defaultFileName.replace(/\.m99enc$/, ".html");

      const { filePath } = await dialog.showSaveDialog({
        title: "Save Secure Backup",
        defaultPath: resolvedFileName,
        filters: [{ name: "HTML Encrypted Backup", extensions: ["html"] }],
      });

      if (!filePath) return { success: false, canceled: true };

      // Ensure fy_code is on the root object if it's in the payments
      let finalJsonString = jsonString;
      try {
        let data = JSON.parse(jsonString);
        const addFyCode = (tx) => {
          if (!tx.fy_code && tx.payments?.[0]?.fy_code) {
            tx.fy_code = tx.payments[0].fy_code;
          }
        };

        if (Array.isArray(data)) {
          data.forEach(addFyCode);
        } else {
          addFyCode(data);
        }
        finalJsonString = JSON.stringify(data, null, 2);
      } catch (e) {
        console.error("Could not parse and modify backup JSON:", e);
      }

      // Generate random salt and IV
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12); // GCM standard IV size is 12 bytes

      // Derive a secure 32-byte key using PBKDF2 (SHA-256 to match Web Crypto API)
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");

      // Use AES-256-GCM for authenticated encryption
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

      // Encrypt the data, producing buffers
      const encryptedPart1 = cipher.update(finalJsonString, "utf8");
      const encryptedPart2 = cipher.final();
      const authTag = cipher.getAuthTag();

      // Combine encrypted data and auth tag for Web Crypto API compatibility
      const encryptedData = Buffer.concat([
        encryptedPart1,
        encryptedPart2,
        authTag,
      ]);

      const encryptedBase64 = encryptedData.toString("base64");
      const ivBase64 = iv.toString("base64");
      const saltBase64 = salt.toString("base64");

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Secure Backup</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --brand-color: #2563eb;
            --brand-color-hover: #1d4ed8;
            --success-color: #10b981;
            --success-color-hover: #059669;
            --danger-color: #ef4444;
            --bg-light: #f8fafc;
            --card-bg: #ffffff;
            --text-dark: #1e293b;
            --text-light: #64748b;
            --border-color: #e2e8f0;
        }
        body { 
            font-family: 'Inter', system-ui, -apple-system, sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            box-sizing: border-box;
            overflow: hidden;
            background-color: var(--bg-light);
            background-image: radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0);
            background-size: 20px 20px;
            margin: 0; 
            padding: 20px; 
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .container { 
            background: var(--card-bg); 
            padding: 2.5rem; 
            border-radius: 16px; 
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05); 
            text-align: center; 
            max-width: 420px; 
            width: 100%;
            border: 1px solid var(--border-color);
            position: relative;
            overflow: hidden;
        }
        .lock-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            background: linear-gradient(145deg, #eef2ff, #dbeafe);
            border-radius: 50%;
            margin: 0 auto 1.5rem auto;
            color: var(--brand-color);
            border: 4px solid white;
            box-shadow: 0 0 0 1px var(--border-color);
        }
        h2 { 
            margin-top: 0; 
            margin-bottom: 0.5rem;
            color: var(--text-dark); 
            font-size: 1.5rem;
            font-weight: 700;
        }
        p { 
            color: var(--text-light); 
            margin-bottom: 2rem; 
            font-size: 0.95rem;
            line-height: 1.6;
        }
        input[type="password"] { 
            padding: 0.875rem 1rem; 
            margin-bottom: 1rem; 
            width: 100%; 
            box-sizing: border-box; 
            border: 1px solid var(--border-color); 
            border-radius: 8px; 
            font-size: 1rem; 
            background-color: #f8fafc;
            transition: all 0.2s ease-in-out;
        }
        input[type="password"]:focus { 
            outline: none; 
            border-color: var(--brand-color); 
            box-shadow: 0 0 0 3px rgba(37,99,235,0.15); 
            background-color: white;
        }
        button { 
            padding: 0.875rem 1.5rem; 
            width: 100%; 
            background: var(--brand-color); 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 1rem; 
            font-weight: 500; 
            cursor: pointer; 
            transition: all 0.2s ease-in-out;
            box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);
        }
        button:hover { 
            background: var(--brand-color-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
        }
        button:active {
            transform: translateY(0);
            box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);
        }
        #error { 
            color: var(--danger-color); 
            margin-top: 1.5rem; 
            font-size: 0.875rem; 
            min-height: 1.25rem; 
            font-weight: 500;
        }
        .result-view {
            display: none;
            width: 100%;
            height: 100%;
            background: var(--card-bg);
            border-radius: 16px;
            border: 1px solid var(--border-color);
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05); 
            overflow: hidden;
            flex-direction: column;
        }
        .result-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #fcfdff;
        }
        .result-header h3 {
            margin: 0;
            font-size: 1.125rem;
            color: var(--text-dark);
            font-weight: 700;
        }
        #downloadBtn { 
            display: block;
            width: auto;
            background: var(--success-color);
        }
        #downloadBtn:hover { 
            background: var(--success-color-hover); 
        }
        #output { 
            flex-grow: 1;
            width: 100%; 
            padding: 1.5rem; 
            border: none;
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; 
            font-size: 0.875rem; 
            resize: none; 
            background-color: #f8fafc;
            color: #475569;
            box-sizing: border-box;
        }
        #output:focus {
            outline: none;
        }
    </style>
</head>
<body>
    <div class="container" id="loginBox">
        <div class="lock-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h2>Secure Backup</h2>
        <p>This file is encrypted. Please enter the password to decrypt and view the backup.</p>
        <form onsubmit="event.preventDefault(); decrypt();">
            <input type="password" id="password" placeholder="Enter password" autofocus />
            <button type="submit">Unlock</button>
        </form>
        <div id="error"></div>
    </div>
    
    <div class="result-view" id="resultView">
        <div class="result-header">
            <h3>Decrypted Backup Data</h3>
            <button id="downloadBtn" onclick="downloadJSON()">Download JSON</button>
        </div>
        <textarea id="output" readonly></textarea>
    </div>

    <script>
        const encryptedBase64 = "${encryptedBase64}";
        const ivBase64 = "${ivBase64}";
        const saltBase64 = "${saltBase64}";
        let decryptedJSON = "";

        function base64ToUint8Array(base64) {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }

        async function decrypt() {
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            errorDiv.textContent = 'Decrypting...';

            try {
                const encryptedData = base64ToUint8Array(encryptedBase64);
                const iv = base64ToUint8Array(ivBase64);
                const salt = base64ToUint8Array(saltBase64);

                const encoder = new TextEncoder();
                const keyMaterial = await crypto.subtle.importKey(
                    "raw",
                    encoder.encode(password),
                    { name: "PBKDF2" },
                    false,
                    ["deriveBits", "deriveKey"]
                );

                const key = await crypto.subtle.deriveKey(
                    {
                        name: "PBKDF2",
                        salt: salt,
                        iterations: 100000,
                        hash: "SHA-256"
                    },
                    keyMaterial,
                    { name: "AES-GCM", length: 256 },
                    true,
                    ["decrypt"]
                );

                const decrypted = await crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: iv },
                    key,
                    encryptedData
                );

                const decoder = new TextDecoder();
                decryptedJSON = decoder.decode(decrypted);

                document.getElementById('loginBox').style.display = 'none';
                
                const resultView = document.getElementById('resultView');
                resultView.style.display = 'flex';
                const output = document.getElementById('output');
                output.value = decryptedJSON;

            } catch (err) {
                errorDiv.textContent = 'Incorrect password or corrupted file.';
                console.error(err);
            }
        }
        
        function downloadJSON() {
            if (!decryptedJSON) return;
            const blob = new Blob([decryptedJSON], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Decrypted_Backup.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    </script>
</body>
</html>`;

      fs.writeFileSync(filePath, htmlContent);

      return { success: true, filePath };
    } catch (error) {
      console.error("Secure Export Error:", error);
      return { success: false, error: error.message };
    }
  },
);
// import { ipcMain, dialog } from "electron";
// import fs from "fs";
// import crypto from "crypto";

// ipcMain.handle(
//   "export-secure-backup",
//   async (event, { jsonString, password, fileName }) => {
//     try {
//       const defaultFileName =
//         fileName ||
//         `Secure_Backup_${new Date().toISOString().split("T")[0]}.m99enc`;
//       const { filePath } = await dialog.showSaveDialog({
//         title: "Save Secure Backup",
//         defaultPath: defaultFileName,
//         filters: [
//           { name: "Market99 Encrypted Backup", extensions: ["m99enc"] },
//         ],
//       });

//       if (!filePath) return { success: false, canceled: true };

//       // Derive a secure 32-byte key using PBKDF2 (Browser Compatible)
//       const key = crypto.pbkdf2Sync(password, "m99_salt", 100000, 32, "sha512");

//       // Use AES-256-GCM for authenticated encryption
//       const iv = crypto.randomBytes(12); // GCM standard IV size is 12 bytes
//       const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

//       // Encrypt the data, producing buffers
//       const encryptedPart1 = cipher.update(jsonString, "utf8");
//       const encryptedPart2 = cipher.final();
//       const encryptedData = Buffer.concat([encryptedPart1, encryptedPart2]);

//       // Get the 16-byte authentication tag
//       const authTag = cipher.getAuthTag();

//       // Create a single binary file by concatenating the parts.
//       // Format: [IV (12 bytes)][AuthTag (16 bytes)][Encrypted Data]
//       const finalBuffer = Buffer.concat([iv, authTag, encryptedData]);

//       fs.writeFileSync(filePath, finalBuffer);

//       return { success: true, filePath };
//     } catch (error) {
//       console.error("Secure Export Error:", error);
//       return { success: false, error: error.message };
//     }
//   },
// );
