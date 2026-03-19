import { useState, useCallback, useRef } from "react";

export function usePosSearch(
  addToCart: (item: any) => void,
  scanInputRef: React.RefObject<HTMLInputElement | null>,
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const searchProduct = useCallback(async () => {
    if (loadingRef.current || !searchTerm.trim() || !window.posApi) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const result =
        await window.posApi.getStockByLogicUserCodeSqlite(searchTerm);

      if (result && result.length > 0) {
        const mappedData = result.map((item: any) => ({
          itemName: item.Item_Name,
          itemCode: item.itemCode,
          Lot_MRP: item.Lot_MRP,
          Stock_Qty: String(item.Stock_Qty),
          taxRate: item.taxRate,
          printDesc: item.printDesc || item.t2_printDesc,
          schm_type: item.schm_type,
          schm_camp_grp: item.schm_camp_grp,
        }));

        if (mappedData.length === 1) {
          addToCart(mappedData[0]);
          setSearchTerm("");
          setSearchResults([]);
          setTimeout(() => scanInputRef.current?.focus(), 100);
        } else {
          setSearchResults(mappedData);
        }
      } else {
        alert("Product not found!");
        setSearchTerm("");
        scanInputRef.current?.focus();
      }
    } catch (error) {
      console.error("Search failed:", error);
      alert("Search failed");
      scanInputRef.current?.focus();
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [searchTerm, addToCart, scanInputRef]);

  const handleScan = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement> | any) => {
      if (e.key === "Enter") {
        if (typeof e.preventDefault === "function") {
          e.preventDefault();
        }

        // Play beep sound
        try {
          const AudioContext =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(1000, ctx.currentTime);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
          }
        } catch (err) {
          console.error("Beep failed", err);
        }

        searchProduct();
      }
    },
    [searchProduct],
  );

  const handleProductSelect = useCallback(
    (item: any) => {
      addToCart(item);
      setSearchResults([]);
      setSearchTerm("");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    },
    [addToCart, scanInputRef],
  );

  const handleCloseSearchResults = useCallback(() => {
    setSearchResults([]);
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }, [scanInputRef]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    setSearchResults,
    loading,
    searchProduct,
    handleScan,
    handleProductSelect,
    handleCloseSearchResults,
  };
}
