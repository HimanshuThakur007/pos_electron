import { useState, useCallback } from "react";
import { useApi } from "./useApi";

export function useCustomerSearch() {
  const { get } = useApi();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const searchCustomers = useCallback(
    async (keyword: string) => {
      if (!keyword?.trim()) {
        setResults([]);
        return [];
      }

      setLoading(true);
      setSearched(true);

      try {
        const { data, error } = await get(`customers/search?q=${keyword}`);

        if (error) {
          console.error("Customer search error:", error);
          setResults([]);
          return [];
        } else {
          // Safely extract array regardless of whether API wraps it in { data: [...] }
          const resArray = Array.isArray(data)
            ? data
            : (data as any)?.data || [];

          // Normalize the data so it always has the keys expected by usePosBilling
          const formattedResults = resArray.map((c: any) => ({
            ...c,
            id: c.id || c.customer_id || 1,
            name: c.name || c.customer_name || c.first_name || "Walk-in",
            mobile: c.mobile || c.phone || c.contact || "",
          }));

          setResults(formattedResults);
          return formattedResults;
        }
      } catch (error) {
        console.error("Customer search failed:", error);
        setResults([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [get],
  );

  const clearSearch = useCallback(() => {
    setResults([]);
    setSearched(false);
  }, []);

  return { searchCustomers, loading, results, searched, clearSearch };
}
