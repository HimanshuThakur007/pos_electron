export {};

declare global {
  interface Window {
    posApi?: {
      checkDbConnection: () => Promise<any>;
      getItem: (code: string) => Promise<any>;
      saveBill: (bill: any) => Promise<{ status: string; message?: string }>;
      getStockByLogicUserCodeSqlite: (code: string) => Promise<any[]>;
      getAllStock: () => Promise<any[]>;
      syncStock: () => Promise<any[]>;
      triggerBackgroundSync: (fy_code?: string | null) => void;
      triggerInvoiceSync: () => void;
      onSyncStatusChange: (callback: (status: string) => void) => () => void;
      getLastBill: (params: {
        branch_code: string;
        terminal_code: string;
        cashier_id: string;
        fy_code?: string;
      }) => Promise<any>;
      getLastSyncedInvoice: (params: {
        branch_code: string;
        terminal_code: string;
        cashier_id: string;
        fy_code?: string;
      }) => Promise<any>;
      getBranches: () => Promise<any[]>;
      getTransactions: (params?: any) => Promise<any[]>;
      holdSale: (
        data: any,
      ) => Promise<{ status: string; id?: number; message?: string }>;
      getHoldSales: (params?: any) => Promise<{ status: string; data: any[] }>;
      deleteHeldSale: (id: number) => Promise<{ status: string }>;
      getPendingSyncCount: (fy_code: string) => Promise<number>;
      syncSpecificTransaction: (
        bill_no: string,
        fy_code: string,
      ) => Promise<{ status: string; message?: string }>;
      printReceipt: (
        htmlContent: string,
      ) => Promise<{ status: string; message?: string }>;
    };
  }
}
