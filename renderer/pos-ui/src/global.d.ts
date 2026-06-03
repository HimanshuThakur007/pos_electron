export {};

declare global {
  interface Window {
    posApi?: {
      getItem: (code: string) => Promise<any>;
      getAllItems: () => Promise<any[]>;
      saveBill: (bill: any) => Promise<{ status: string; message?: string }>;
      getStockByLogicUserCodeSqlite: (code: string) => Promise<any[]>;
      getAllStock: () => Promise<any[]>;
      syncStock: () => Promise<any[]>;
      triggerBackgroundSync: (fy_code?: string | null) => void;
      triggerInvoiceSync: () => void;
      onSyncStatusChange: (callback: (payload: any) => void) => () => void;
      saveLicense: (key: string) => Promise<any>;
      getLicense: () => Promise<string | null>;
      removeLicense: () => Promise<any>;
      getLastBill: (params: {
        branch_code: string;
        terminal_code: string;
        cashier_id: string;
        fy_code?: string;
        isB2B?: boolean;
        doc_type?: number;
      }) => Promise<any>;
      getLastSyncedInvoice: (params: {
        branch_code: string;
        terminal_code: string;
        cashier_id: string;
        fy_code?: string;
        isB2B?: boolean;
        doc_type?: number;
      }) => Promise<any>;
      getSchemes: () => Promise<any[]>; // Keep for now for other components
      getBranches: () => Promise<any[]>; // Keep for now for other components
      getBranchesPaginated: (
        params: any,
      ) => Promise<{ data: any[]; total: number }>;
      getSchemesPaginated: (
        params: any,
      ) => Promise<{ data: any[]; total: number }>;
      getItemsPaginated: (
        params: any,
      ) => Promise<{ data: any[]; total: number }>;
      getStockPaginated: (
        params: any,
      ) => Promise<{ data: any[]; total: number }>;
      getTransactions: (params?: any) => Promise<any[]>;
      holdSale: (
        data: any,
      ) => Promise<{ status: string; id?: number; message?: string }>;
      getHoldSales: (params?: any) => Promise<{ status: string; data: any[] }>;
      deleteHeldSale: (id: number) => Promise<{ status: string }>;
      getPendingSyncCount: (fy_code: string) => Promise<number>;
      getDbSize: () => Promise<number>;
      syncSpecificTransaction: (
        bill_no: string,
        fy_code: string,
      ) => Promise<{ status: string; message?: string }>;
      printReceipt: (
        htmlContent: string,
      ) => Promise<{ status: string; message?: string }>;
      validateGst: (gstin: string) => Promise<any>;
    };
  }
}
