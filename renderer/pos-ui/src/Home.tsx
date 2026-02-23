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
      const result = await window.posApi.getStockByLogicUserCodeSqlite(searchTerm);
      console.log(result);
      // Map SQLite DB columns to UI interface
      const mappedData = result.map((item: any) => ({
        itemName: item.Item_Name,
        itemCode: item.LogicUserCode,
        Lot_MRP: item.Lot_MRP,
        Stock_Qty: String(item.Stock_Qty), // Ensure string format for UI
      }));

      setStockData(mappedData as any);
    } catch (err) {
      console.error("Search failed:", err);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Desktop POS Dashboard</h1>
        <button onClick={onLogout} className="btn btn-outline-danger">
          Logout
        </button>
      </div>

      <div className="card shadow">
        <div className="card-body">
          {dbStatus ? (
            <div
              className={`alert ${
                dbStatus.mysql ? "alert-success" : "alert-warning"
              }`}
            >
              <strong>System Status:</strong>{" "}
              {dbStatus.mysql ? "Online (MySQL) 🟢" : "Offline (Local DB) 🟠"}
              {dbStatus.lastSync && (
                <div className="mt-1 small border-top pt-1 border-secondary-subtle">
                  <strong>Last Sync:</strong>{" "}
                  {new Date(dbStatus.lastSync.created_at).toLocaleString()}
                </div>
              )}
              {dbStatus.itemCount !== undefined && (
                <div className="mt-1 small">
                  <strong>Total Items:</strong>{" "}
                  {dbStatus.itemCount.toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="alert alert-info">{statusMessage}</div>
          )}

          <form onSubmit={handleSearch} className="mb-4">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Enter Logic Code / Barcode"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {stockData.length > 0 && (
            <div className="table-responsive mb-3">
              <table className="table table-bordered table-striped">
                <thead className="table-dark">
                  <tr>
                    <th>Item Name</th>
                    <th>Code</th>
                    <th>MRP</th>
                    <th>Stock Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.itemName}</td>
                      <td>{item.itemCode}</td>
                      <td>{item.Lot_MRP}</td>
                      <td>{item.Stock_Qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button className="btn btn-success btn-lg" onClick={onOpenPos}>
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
