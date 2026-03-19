# M99 POS (Desktop Point of Sale)

**M99 POS** is an offline-first desktop application designed for **Market Ninety Nine Private Limited**. It ensures continuous retail billing operations regardless of internet connectivity by leveraging a local database for immediate actions and synchronizing with a central server in the background.

## 🚀 Key Features

- **Offline-First Architecture**: All billing operations (scanning, cart management, saving bills) happen locally using SQLite, ensuring zero downtime during network outages.
- **Smart Synchronization**:
  - **Down-Sync**: Automatically fetches Stock, Items, Schemes, and Branch data from the central MySQL server.
  - **Up-Sync**: Pushes Invoices and Transactions to the cloud when connectivity is available.
- **High-Speed Billing**:
  - Barcode scanner integration with auto-focus management.
  - Keyboard shortcuts for rapid operation (F2, F6, F10, etc.).
- **Hardware Integration**:
  - Thermal Receipt Printing.
  - Customer Facing Display (Dual Screen support).
- **Advanced Cart Logic**: Handles multiple MRPs for the same item code, real-time stock validation, and complex tax calculations.

## 🛠️ Tech Stack

- **Runtime**: [Electron](https://www.electronjs.org/) (Node.js + Chromium)
- **Frontend**: React, TypeScript, Tailwind CSS
- **Local Database**: `better-sqlite3` (High-performance synchronous SQLite)
- **Remote Database**: `mysql2` (Connection to ERP/Central DB)
- **Build Tool**: `electron-builder`

## ⚙️ Prerequisites

- **Node.js**: v18 or higher (Recommended)
- **Python**: Required for building native modules (like `better-sqlite3`) on some systems.
- **Visual Studio Build Tools** (Windows) or **Xcode Command Line Tools** (macOS): For compiling native dependencies.

## 📥 Installation

1.  **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd desktop-pos
    ```

2.  **Install Dependencies**:

    ```bash
    npm install
    ```

    _Note: This installs dependencies for both the Electron main process and the React renderer process._

3.  **Rebuild Native Modules**:
    Since `better-sqlite3` is a native module, it must be compiled specifically for the Electron version you are using.
    ```bash
    npm run rebuild
    ```

## 💻 Development

To run the application in development mode with hot-reloading:

```bash
npm run app:dev
```

This command concurrently runs:

1.  The Vite dev server for the React frontend (`renderer/pos-ui`).
2.  The Electron main process.

## 📦 Building for Production

To package the application into an executable installer:

**For Windows:**

```bash
npm run build:win
```

_Output: `dist/M99 POS Setup <version>.exe`_

**For macOS/Linux:**

```bash
npm run build
```

_Output: `dist/` containing `.dmg` or `.AppImage` files._

## 📂 Project Structure

```
desktop-pos/
├── electron/                 # Main Process (Backend)
│   ├── main.js               # Entry point, window creation, lifecycle events
│   ├── database/             # DB Connection logic (sqlite.js, mysql.js)
│   ├── ipc/                  # IPC Handlers (Communication between UI and Backend)
│   └── services/             # Background tasks (Sync, Invoice Uploads)
├── renderer/
│   └── pos-ui/               # Renderer Process (Frontend)
│       ├── src/
│       │   ├── components/   # React UI Components
│       │   ├── hooks/        # Business Logic (usePosLogic.ts)
│       │   └── utils/        # Helper functions (Tax calc, Cart logic)
│       └── dist/             # Compiled frontend assets
├── package.json              # Project configuration and scripts
└── README.md                 # Project documentation
```

## ⌨️ Keyboard Shortcuts

| Key           | Action                       |
| :------------ | :--------------------------- |
| **F2**        | Focus Quantity Input         |
| **F3**        | Clear Cart                   |
| **F4**        | Remove Last Item             |
| **F6**        | New Sale (Clear Cart)        |
| **F8**        | Focus Cart Table             |
| **F10**       | Logout                       |
| **Alt + Q**   | Focus Quantity (Alternative) |
| **Alt + P**   | Pay / Save Bill (Cash)       |
| **Alt + H**   | Hold Sale                    |
| **Alt + V**   | View Held Sales              |
| **Shift + D** | Delete Selected Row          |
| **Esc**       | Clear Search / Close Modals  |

## � User Billing Flow

1.  **Initialization**:
    - App starts and loads user credentials from local storage.
    - Connects to local SQLite database.
2.  **Item Selection**:
    - **Scan**: Barcode scanner input is auto-detected.
    - **Search**: User types item name/code. If multiple variants (e.g., different MRPs) exist, a selection popup appears.
3.  **Cart Operations**:
    - Items are added with real-time stock validation.
    - Tax and totals are calculated instantly.
4.  **Checkout**:
    - User triggers payment (`Alt + P`).
    - **Save**: Transaction is committed to local SQLite.
    - **Print**: Receipt is generated and sent to the thermal printer.
    - **Sync**: Transaction is marked for background upload to the central server.

## �🔄 Data Synchronization Flow

1.  **Startup**: App checks for MySQL connection.
2.  **Online**:
    - Triggers `syncStockData`, `syncItemsData`, etc.
    - Starts `startBackgroundSync` (Periodic polling).
    - Starts `startInvoiceSync` (Uploads local bills to server).
3.  **Offline**:
    - App operates normally using cached data in SQLite.
    - Transactions are marked as `synced: 0` in the local DB.
4.  **Reconnection**:
    - `navigator.onLine` detects network change.
    - Background services automatically resume uploading pending bills.
