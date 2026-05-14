import { useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";

const playSound = (type: "success" | "error") => {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        // Distinct two-tone error sound (eh-er)
        osc.type = "square";
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime); // Lower volume for square wave
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    }
  } catch (err) {
    console.error("Audio playback failed", err);
  }
};

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
      console.log("Search result for", searchTerm, ":", result);
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
          group_name: item.group_name,
          hsn_code:
            item.hsn_code || item.t2_hsn_code
              ? String(item.hsn_code || item.t2_hsn_code).split(".")[0]
              : "",
        }));

        if (mappedData.length === 1) {
          playSound("success");
          addToCart(mappedData[0]);
          setSearchTerm("");
          setSearchResults([]);
          setTimeout(() => scanInputRef.current?.focus(), 100);
        } else {
          playSound("success");
          setSearchResults(mappedData);
        }
      } else {
        playSound("error");
        toast.error("Product not found!");
        setSearchTerm("");
        setTimeout(() => scanInputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error("Search failed:", error);
      playSound("error");
      toast.error("Search failed!");
      setTimeout(() => scanInputRef.current?.focus(), 100);
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
