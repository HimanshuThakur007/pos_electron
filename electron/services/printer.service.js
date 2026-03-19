import { BrowserWindow } from "electron";

let printWindow = null;
const printQueue = [];
let isPrinting = false;

function getPrintWindow() {
  if (printWindow && !printWindow.isDestroyed()) {
    return printWindow;
  }

  printWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  printWindow.on("closed", () => {
    printWindow = null;
  });

  return printWindow;
}

async function processQueue() {
  if (isPrinting || printQueue.length === 0) return;

  isPrinting = true;
  const { htmlContent, resolve, reject } = printQueue.shift();

  try {
    const win = getPrintWindow();

    await win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    );

    const printers = await win.webContents.getPrintersAsync();
    if (!printers.length) throw new Error("No printers found");

    const printer = printers[0];

    await new Promise((res, rej) => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printer.name,
          margins: { marginType: "none" },
          pageSize: { width: 72000, height: 200000 },
          scaleFactor: 100
        },
        (success, errorType) => {
          if (success) res();
          else rej(new Error(errorType));
        }
      );
    });

    resolve({ status: "success", message: "Printed successfully" });
  } catch (error) {
    console.error("Print error:", error);
    reject(error);
  } finally {
    isPrinting = false;
    if (printQueue.length > 0) {
      processQueue();
    }
  }
}

export function printReceiptHtml(htmlContent) {
  return new Promise((resolve, reject) => {
    printQueue.push({ htmlContent, resolve, reject });
    processQueue();
  });
}


// import { BrowserWindow, app } from "electron";
// import path from "path";
// import fs from "fs";

// export async function printReceiptHtml(htmlContent) {
//   const workerWindow = new BrowserWindow({
//     show: false,
//     webPreferences: {
//       nodeIntegration: false,
//       contextIsolation: true,
//     },
//   });

//   try {
//     await workerWindow.loadURL(
//       `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
//     );

//     // ✅ faster & accurate render wait
//     await new Promise(resolve => {
//       workerWindow.webContents.once("did-finish-load", resolve);
//     });

//     const printers = await workerWindow.webContents.getPrintersAsync();
//     console.log("Available printers:", printers);

//     if (!printers.length) throw new Error("No printers found");

//     // ✔ use exact printer
//     const printer =
//       printers.find(p =>
//         p.name.toLowerCase().includes("epson")
//       ) || printers[0];

//     console.log("Printing to:", printer.name);

//     await new Promise((resolve, reject) => {
//       workerWindow.webContents.print(
//         {
//           silent: true,
//           deviceName: printer.name,
//           printBackground: true,
//           margins: { marginType: "none" },

//           // ✅ Epson-friendly size (fast & reliable)
//           pageSize: {
//             width: 72000,
//             height: 200000,
//           },

//           scaleFactor: 100,
//         },
//         (success, errorType) => {
//           if (!success) {
//             console.error("Print failed:", errorType);
//             reject(errorType);
//           } else {
//             resolve();
//           }
//         }
//       );
//     });

//     return { status: "success", message: "Printed successfully" };

//   } catch (error) {
//     console.error("Printing failed, saving as PDF:", error);

//     try {
//       const pdfData = await workerWindow.webContents.printToPDF({
//         printBackground: true,
//       });

//       const fileName = `Receipt-${Date.now()}.pdf`;
//       const pdfPath = path.join(app.getPath("documents"), fileName);

//       fs.writeFileSync(pdfPath, pdfData);

//       return { status: "success", message: `Saved as PDF: ${pdfPath}` };
//     } catch (pdfError) {
//       console.error("PDF save failed:", pdfError);
//       throw pdfError;
//     }
//   } finally {
//     if (!workerWindow.isDestroyed()) workerWindow.close();
//   }
// }