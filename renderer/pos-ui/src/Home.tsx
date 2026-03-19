import { useState, useEffect } from "react";

interface HomeProps {
  onLogout: () => void;
  onOpenPos?: () => void;
}

interface StockItem {
  itemName: string;
  itemCode: string;
  itemDesc: string;
  Lot_MRP: number;
  Stock_Qty: string;
}

interface SyncLog {
  status: string;
  message: string;
  created_at: string;
}

interface DbStatus {
  mysql: boolean;
  sqlite: boolean;
  lastSync: SyncLog | null;
  itemCount?: number;
}

export default function Home({ onLogout, onOpenPos }: HomeProps) {
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Checking...");
  const [searchTerm, setSearchTerm] = useState("");
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ DB check
  useEffect(() => {
    const checkDb = async () => {
      if (!window.posApi) {
        setStatusMessage("Preload not available ❌");
        return;
      }

      try {
        const status = await window.posApi.checkDbConnection();
        setDbStatus(status as any);
        setStatusMessage("");
      } catch {
        setStatusMessage("DB Error ❌");
      }
    };

    checkDb();
  }, []);

  // ✅ Stock search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTerm.trim() || !window.posApi) return;

    setLoading(true);

    try {
      const result =
        await window.posApi.getStockByLogicUserCodeSqlite(searchTerm);
      console.log(result);
      // Map SQLite DB columns to UI interface
      const mappedData = result.map(
        (item: {
          Item_Name: string;
          LogicUserCode: string;
          Lot_MRP: number;
          Stock_Qty: number | string;
        }) => ({
          itemName: item.Item_Name,
          itemCode: item.LogicUserCode,
          Lot_MRP: item.Lot_MRP,
          Stock_Qty: String(item.Stock_Qty), // Ensure string format for UI
        }),
      );

      setStockData(mappedData as any);
    } catch (err) {
      console.error("Search failed:", err);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Desktop POS Dashboard</h1>
        <button
          onClick={onLogout}
          className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50 transition"
        >
          Logout
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          {dbStatus ? (
            <div
              className={`p-4 rounded mb-4 ${
                dbStatus.mysql
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-yellow-100 text-yellow-800 border border-yellow-200"
              }`}
            >
              <strong>System Status:</strong>{" "}
              {dbStatus.mysql ? "Online (MySQL) 🟢" : "Offline (Local DB) 🟠"}
              {dbStatus.lastSync && (
                <div className="mt-2 text-sm border-t border-gray-300 pt-1">
                  <strong>Last Sync:</strong>{" "}
                  {new Date(dbStatus.lastSync.created_at).toLocaleString()}
                </div>
              )}
              {dbStatus.itemCount !== undefined && (
                <div className="mt-1 text-sm">
                  <strong>Total Items:</strong>{" "}
                  {dbStatus.itemCount.toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded mb-4 bg-blue-100 text-blue-800 border border-blue-200">
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Logic Code / Barcode"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-r transition disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {stockData.length > 0 && (
            <div className="overflow-x-auto mb-6 border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-2 text-left">Item Name</th>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">MRP</th>
                    <th className="px-4 py-2 text-left">Stock Qty</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockData.map((item, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="px-4 py-2">{item.itemName}</td>
                      <td className="px-4 py-2">{item.itemCode}</td>
                      <td className="px-4 py-2">{item.Lot_MRP}</td>
                      <td className="px-4 py-2">{item.Stock_Qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded text-lg transition"
            onClick={onOpenPos}
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
