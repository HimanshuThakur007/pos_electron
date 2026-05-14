import toast from "react-hot-toast";

export interface CartItem {
  hsn_code: any;
  manualDiscount?: any;
  _scheme?: any;
  scheme_group?: any;
  scheme?: any;
  id: string;
  itemCode: string;
  itemName: string;
  stock: number;
  qty: number;
  price: number;
  discount: number;
  tax: number;
  printDesc?: string;
  schm_type?: string | number;
  schm_camp_grp?: string;
  group_name?: string;
  appliedQty?: number;
  missingQualifyingAmount?: number;
}

export const isPPScheme = (
  type?: string | number,
  schemeStr?: string,
  groupName?: string,
) => {
  // console.log("Checking PP Scheme with:", { type, schemeStr, groupName });
  if (!type) return false;
  const strType = String(type);
  const targetStr = groupName || schemeStr || "";
  return (
    (strType === "3" || strType === "4") && /PP[\s:-]*(\d+)/i.test(targetStr)
  );
};

export const calculateDiscount = (
  price: number,
  qty: number,
  type?: string | number,
  schemeStr?: string,
  groupName?: string,
  // cartGrossTotal: number = 0,
  // totalPPAmount: number = 0,
) => {
  if (!type) return 0;
  const strType = String(type);
  const targetStr = groupName || schemeStr || "";

  // ================= TYPE 2 =================
  if (strType === "2") {
    const match = targetStr.match(/(\d+(\.\d+)?)%/);
    if (match) {
      const percentage = parseFloat(match[1]);
      return (price * percentage) / 100;
    }
  }

  // ================= TYPE 1 =================
  else if (strType === "1") {
    const match = targetStr.match(/(\d+(\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  // ================= TYPE 6 =================
  else if (strType === "6") {
    const match = targetStr.match(/(\d+(\.\d+)?)/);
    if (match) {
      const fixedPrice = parseFloat(match[1]);
      return Math.max(0, price - fixedPrice);
    }
  }

  // ================= TYPE 5 =================
  else if (strType === "5") {
    const match = targetStr.match(/(\d+)\s+IN\s+(\d+(\.\d+)?)/i);
    if (match) {
      const reqQty = parseInt(match[1]);
      const schemePrice = parseFloat(match[2]);

      if (qty >= reqQty && qty > 0) {
        const bundles = Math.floor(qty / reqQty);
        const remainder = qty % reqQty;

        const totalSchemePrice = bundles * schemePrice + remainder * price;

        const totalMRP = qty * price;
        const totalDiscount = totalMRP - totalSchemePrice;

        return totalDiscount / qty;
      }
    }
  }

  // ================= TYPE 4 =================
  else if (strType === "4") {
    let buyQty = 0;
    let getQty = 0;

    if (/BOGO/i.test(targetStr)) {
      buyQty = 1;
      getQty = 1;
    } else {
      const match = targetStr.match(/BUY\s+(\d+)\s+GET\s+(\d+)/i);
      if (match) {
        buyQty = parseInt(match[1]);
        getQty = parseInt(match[2]);
      }
    }

    if (buyQty > 0 && getQty > 0) {
      const cycle = buyQty + getQty;
      if (qty >= cycle) {
        const discountPercent = getQty / cycle;
        return price * discountPercent;
      }
    }
  }

  return 0;
};

export const getSchemeColor = (
  item: CartItem,
  // cartGrossTotal: number = 0,
  // totalPPAmount: number = 0,
) => {
  const strType = String(item.schm_type);
  const targetStr = item.group_name || item.schm_camp_grp || "";

  if (strType === "5" && targetStr) {
    const match = targetStr.match(/(\d+)\s+IN\s+(\d+(\.\d+)?)/i);
    if (match) {
      const reqQty = parseInt(match[1]);
      return item.qty >= reqQty
        ? "text-green-600 font-bold"
        : "text-red-600 font-bold";
    }
  }
  if (isPPScheme(item.schm_type, item.schm_camp_grp, item.group_name)) {
    if (item.appliedQty !== undefined) {
      return item.appliedQty > 0
        ? "text-green-600 font-bold"
        : "text-red-600 font-bold";
    }
    return "text-red-600 font-bold";
  }
  if (strType === "4" && targetStr) {
    if (item.group_name && item.appliedQty !== undefined) {
      return item.appliedQty > 0
        ? "text-green-600 font-bold"
        : "text-red-600 font-bold";
    }

    let buyQty = 0;
    let getQty = 0;

    if (/BOGO/i.test(targetStr)) {
      buyQty = 1;
      getQty = 1;
    } else {
      const match = targetStr.match(/BUY\s+(\d+)\s+GET\s+(\d+)/i);
      if (match) {
        buyQty = parseInt(match[1]);
        getQty = parseInt(match[2]);
      }
    }

    if (buyQty > 0 && getQty > 0) {
      const bundleSize = buyQty + getQty;
      return item.qty >= bundleSize
        ? "text-green-600 font-bold"
        : "text-red-600 font-bold";
    }
  }
  if (targetStr) return "text-green-600 font-bold";
  return "";
};

export const getDisplayScheme = (item: CartItem) => {
  const strType = String(item.schm_type);
  if ((strType === "3" || strType === "4") && item.schm_camp_grp) {
    const matches = Array.from(item.schm_camp_grp.matchAll(/PP[\s:-]*(\d+)/gi));
    if (matches.length > 0) {
      const ppValues = matches.map((m) => parseFloat(m[1]));
      const minPP = Math.min(...ppValues);
      return `PP ${minPP}`;
    }
  }
  return item.schm_camp_grp || "-";
};

export const recalculateCart = (items: CartItem[]) => {
  const grossTotal = items.reduce(
    (acc, item) => acc + (item.price - item.discount) * item.qty,
    0,
  );
  const totalPPAmount = items.reduce((acc, item) => {
    if (isPPScheme(item.schm_type, item.schm_camp_grp, item.group_name)) {
      return acc + (item.price - item.discount) * item.qty;
    }
    return acc;
  }, 0);

  let remainingQualifyingAmount =
    totalPPAmount > 0 ? grossTotal - totalPPAmount : 0;

  // Identify and sort PP items by minPP value ascending
  const ppItemsIndices = items
    .map((item, index) => ({ index, item }))
    .filter(({ item }) =>
      isPPScheme(item.schm_type, item.schm_camp_grp, item.group_name),
    );

  ppItemsIndices.sort((a, b) => {
    const getMinPP = (item: CartItem) => {
      const targetStr = item.group_name || item.schm_camp_grp || "";
      const matches = Array.from(targetStr.matchAll(/PP[\s:-]*(\d+)/gi));
      if (matches.length === 0) return Infinity;
      return Math.min(...matches.map((m) => parseFloat(m[1])));
    };
    return getMinPP(a.item) - getMinPP(b.item);
  });

  const ppResults = new Map<
    number,
    { discount: number; appliedQty: number; missingQualifyingAmount: number }
  >();

  for (const { index, item } of ppItemsIndices) {
    const targetStr = item.group_name || item.schm_camp_grp || "";
    const ppMatches = Array.from(targetStr.matchAll(/PP[\s:-]*(\d+)/gi));
    const ppValues = ppMatches.map((m) => parseFloat(m[1]));
    const minPP = Math.min(...ppValues);

    let appliedQty = 0;
    let discount = 0;
    let missingQualifyingAmount = 0;

    if (minPP > 0) {
      const eligibleQty = Math.floor(remainingQualifyingAmount / minPP);
      appliedQty = Math.min(item.qty, eligibleQty);

      if (appliedQty > 0) {
        discount = (appliedQty * ((item.price * 33) / 100)) / item.qty;
        remainingQualifyingAmount -= appliedQty * minPP;
      }

      if (appliedQty < item.qty) {
        missingQualifyingAmount = minPP - remainingQualifyingAmount;
      }
    }
    ppResults.set(index, { discount, appliedQty, missingQualifyingAmount });
  }

  // Grouped Type 4 (BUY X GET Y) Logic
  const type4GroupResults = new Map<
    number,
    { discount: number; appliedQty: number }
  >();
  const type4Groups = new Map<string, { index: number; item: CartItem }[]>();

  items.forEach((item, index) => {
    if (isPPScheme(item.schm_type, item.schm_camp_grp, item.group_name)) return;
    if (String(item.schm_type) === "4" && item.group_name) {
      const key = item.group_name.trim().toUpperCase();
      if (!type4Groups.has(key)) {
        type4Groups.set(key, []);
      }
      type4Groups.get(key)!.push({ index, item });
    }
  });

  for (const [groupName, groupItems] of type4Groups.entries()) {
    let targetStr = groupName;
    for (const g of groupItems) {
      if (g.item.schm_camp_grp) targetStr += " " + g.item.schm_camp_grp;
    }

    let buyQty = 0;
    let getQty = 0;

    if (/BOGO/i.test(targetStr)) {
      buyQty = 1;
      getQty = 1;
    } else {
      const match = targetStr.match(/BUY\s*(\d+)\s*GET\s*(\d+)/i);
      if (match) {
        buyQty = parseInt(match[1]);
        getQty = parseInt(match[2]);
      }
    }

    if (buyQty > 0 && getQty > 0) {
      const cycle = buyQty + getQty;
      const discountPercent = getQty / cycle;

      // Pass 1: Calculate solo eligible sets for each row and find remainders
      const rowData = groupItems.map((g) => {
        const qty = g.item.qty;
        const soloEligible = Math.floor(qty / cycle) * cycle;
        const remainder = qty % cycle;
        return { ...g, soloEligible, remainder, poolEligible: 0 };
      });

      // Pass 2: Pool the remainders together
      const totalRemainder = rowData.reduce((sum, r) => sum + r.remainder, 0);
      const poolEligibleCount = Math.floor(totalRemainder / cycle) * cycle;

      let runningPoolEligible = poolEligibleCount;

      // Sort remainders descending to greedily fill rows with the most remainders first.
      // This minimizes fragmented discounts and ensures schemes are removed from
      // lower-quantity items when higher-quantity items take over the group bundle.
      const sortedRowData = [...rowData].sort((a, b) => {
        if (b.remainder !== a.remainder) {
          return b.remainder - a.remainder;
        }
        if (b.item.qty !== a.item.qty) {
          return b.item.qty - a.item.qty;
        }
        return a.index - b.index;
      });

      // Pass 3: Distribute the eligible pool units to rows that contributed remainders
      for (const r of sortedRowData) {
        if (r.remainder > 0 && runningPoolEligible > 0) {
          const allocate = Math.min(r.remainder, runningPoolEligible);
          r.poolEligible = allocate;
          runningPoolEligible -= allocate;
        }
      }

      // Pass 4: Calculate final discount based on total eligible units per row
      for (const r of rowData) {
        const totalEligibleForThisRow = r.soloEligible + r.poolEligible;

        if (totalEligibleForThisRow > 0) {
          const rowTotalDiscount =
            totalEligibleForThisRow * r.item.price * discountPercent;
          const perUnitDiscount =
            r.item.qty > 0 ? rowTotalDiscount / r.item.qty : 0;
          type4GroupResults.set(r.index, {
            discount: perUnitDiscount,
            appliedQty: totalEligibleForThisRow,
          });
        } else {
          type4GroupResults.set(r.index, { discount: 0, appliedQty: 0 });
        }
      }
    }
  }

  return items.map((item, index) => {
    if (isPPScheme(item.schm_type, item.schm_camp_grp, item.group_name)) {
      const res = ppResults.get(index) || {
        discount: 0,
        appliedQty: 0,
        missingQualifyingAmount: 0,
      };
      return { ...item, ...res };
    }

    if (type4GroupResults.has(index)) {
      const res = type4GroupResults.get(index)!;
      return {
        ...item,
        discount: res.discount,
        appliedQty: res.appliedQty,
        missingQualifyingAmount: undefined,
      };
    }

    return {
      ...item,
      discount: calculateDiscount(
        item.price,
        item.qty,
        item.schm_type,
        item.schm_camp_grp,
        item.group_name,
        // grossTotal,
        // totalPPAmount,
      ),
      appliedQty: undefined,
      missingQualifyingAmount: undefined,
    };
  });
};

export const createNewItem = (product: any): CartItem => {
  const price = Number(product.Lot_MRP) || 0;
  const stock = Number(product.Stock_Qty) || 0;

  return {
    id: crypto.randomUUID(),
    itemCode: product.itemCode,
    itemName: product.itemName || "Unknown Item",
    stock,
    qty: 1,
    price,
    discount: 0,
    tax: Number(product.taxRate) || 0,
    printDesc: product.printDesc,
    schm_type: product.schm_type,
    schm_camp_grp: product.schm_camp_grp,
    group_name: product.group_name,
    hsn_code: product.hsn_code || "",
  };
};

export const validateStock = (stock: number, qty: number) => {
  if (qty > stock) {
    toast.error(`Quantity cannot exceed stock (${stock})`, {
      id: "stock-limit-error",
    });
    return false;
  }
  return true;
};

// -=============================Working code without scheme group========================
// import toast from "react-hot-toast";

// export interface CartItem {
//   id: string;
//   itemCode: string;
//   itemName: string;
//   stock: number;
//   qty: number;
//   price: number;
//   discount: number;
//   tax: number;
//   printDesc?: string;
//   schm_type?: string | number;
//   schm_camp_grp?: string;
//   appliedQty?: number;
//   missingQualifyingAmount?: number;
// }

// export const isPPScheme = (type?: string | number, schemeStr?: string) => {
//   if (!type || !schemeStr) return false;
//   const strType = String(type);
//   return (
//     (strType === "3" || strType === "4") && /PP[\s:-]*(\d+)/i.test(schemeStr)
//   );
// };

// export const calculateDiscount = (
//   price: number,
//   qty: number,
//   type?: string | number,
//   schemeStr?: string,
//   // cartGrossTotal: number = 0,
//   // totalPPAmount: number = 0,
// ) => {
//   if (!type || !schemeStr) return 0;
//   const strType = String(type);

//   // ================= TYPE 2 =================
//   if (strType === "2") {
//     const match = schemeStr.match(/(\d+(\.\d+)?)%/);
//     if (match) {
//       const percentage = parseFloat(match[1]);
//       return (price * percentage) / 100;
//     }
//   }

//   // ================= TYPE 1 =================
//   else if (strType === "1") {
//     const match = schemeStr.match(/(\d+(\.\d+)?)/);
//     if (match) {
//       return parseFloat(match[1]);
//     }
//   }

//   // ================= TYPE 6 =================
//   else if (strType === "6") {
//     const match = schemeStr.match(/(\d+(\.\d+)?)/);
//     if (match) {
//       const fixedPrice = parseFloat(match[1]);
//       return Math.max(0, price - fixedPrice);
//     }
//   }

//   // ================= TYPE 5 =================
//   else if (strType === "5") {
//     const match = schemeStr.match(/(\d+)\s+IN\s+(\d+(\.\d+)?)/i);
//     if (match) {
//       const reqQty = parseInt(match[1]);
//       const schemePrice = parseFloat(match[2]);

//       if (qty >= reqQty && qty > 0) {
//         const bundles = Math.floor(qty / reqQty);
//         const remainder = qty % reqQty;

//         const totalSchemePrice = bundles * schemePrice + remainder * price;

//         const totalMRP = qty * price;
//         const totalDiscount = totalMRP - totalSchemePrice;

//         return totalDiscount / qty;
//       }
//     }
//   }

//   // ================= TYPE 4 =================
//   else if (strType === "4") {
//     let buyQty = 0;
//     let getQty = 0;

//     if (/BOGO/i.test(schemeStr)) {
//       buyQty = 1;
//       getQty = 1;
//     } else {
//       const match = schemeStr.match(/BUY\s+(\d+)\s+GET\s+(\d+)/i);
//       if (match) {
//         buyQty = parseInt(match[1]);
//         getQty = parseInt(match[2]);
//       }
//     }

//     if (buyQty > 0 && getQty > 0) {
//       const bundleSize = buyQty + getQty;
//       if (qty >= bundleSize) {
//         const freeQty = Math.floor(qty / bundleSize) * getQty;

//         const totalDiscount = freeQty * price;
//         return totalDiscount / qty;
//       }
//     }
//   }

//   return 0;
// };

// export const getSchemeColor = (
//   item: CartItem,
//   // cartGrossTotal: number = 0,
//   // totalPPAmount: number = 0,
// ) => {
//   const strType = String(item.schm_type);

//   if (strType === "5" && item.schm_camp_grp) {
//     const match = item.schm_camp_grp.match(/(\d+)\s+IN\s+(\d+(\.\d+)?)/i);
//     if (match) {
//       const reqQty = parseInt(match[1]);
//       return item.qty >= reqQty
//         ? "text-green-600 font-bold"
//         : "text-red-600 font-bold";
//     }
//   }
//   if (isPPScheme(item.schm_type, item.schm_camp_grp)) {
//     if (item.appliedQty !== undefined) {
//       return item.appliedQty > 0
//         ? "text-green-600 font-bold"
//         : "text-red-600 font-bold";
//     }
//     return "text-red-600 font-bold";
//   }
//   if (strType === "4" && item.schm_camp_grp) {
//     let buyQty = 0;
//     let getQty = 0;

//     if (/BOGO/i.test(item.schm_camp_grp)) {
//       buyQty = 1;
//       getQty = 1;
//     } else {
//       const match = item.schm_camp_grp.match(/BUY\s+(\d+)\s+GET\s+(\d+)/i);
//       if (match) {
//         buyQty = parseInt(match[1]);
//         getQty = parseInt(match[2]);
//       }
//     }

//     if (buyQty > 0 && getQty > 0) {
//       const bundleSize = buyQty + getQty;
//       return item.qty >= bundleSize
//         ? "text-green-600 font-bold"
//         : "text-red-600 font-bold";
//     }
//   }
//   if (item.schm_camp_grp) return "text-green-600 font-bold";
//   return "";
// };

// export const getDisplayScheme = (item: CartItem) => {
//   const strType = String(item.schm_type);
//   if ((strType === "3" || strType === "4") && item.schm_camp_grp) {
//     const matches = Array.from(item.schm_camp_grp.matchAll(/PP[\s:-]*(\d+)/gi));
//     if (matches.length > 0) {
//       const ppValues = matches.map((m) => parseFloat(m[1]));
//       const minPP = Math.min(...ppValues);
//       return `PP ${minPP}`;
//     }
//   }
//   return item.schm_camp_grp || "-";
// };

// export const recalculateCart = (items: CartItem[]) => {
//   const grossTotal = items.reduce(
//     (acc, item) => acc + (item.price - item.discount) * item.qty,
//     0,
//   );
//   const totalPPAmount = items.reduce((acc, item) => {
//     if (isPPScheme(item.schm_type, item.schm_camp_grp)) {
//       return acc + (item.price - item.discount) * item.qty;
//     }
//     return acc;
//   }, 0);

//   let remainingQualifyingAmount =
//     totalPPAmount > 0 ? grossTotal - totalPPAmount : 0;

//   // Identify and sort PP items by minPP value ascending
//   const ppItemsIndices = items
//     .map((item, index) => ({ index, item }))
//     .filter(({ item }) => isPPScheme(item.schm_type, item.schm_camp_grp));

//   ppItemsIndices.sort((a, b) => {
//     const getMinPP = (s?: string) => {
//       if (!s) return Infinity;
//       const matches = Array.from(s.matchAll(/PP[\s:-]*(\d+)/gi));
//       if (matches.length === 0) return Infinity;
//       return Math.min(...matches.map((m) => parseFloat(m[1])));
//     };
//     return getMinPP(a.item.schm_camp_grp) - getMinPP(b.item.schm_camp_grp);
//   });

//   const ppResults = new Map<
//     number,
//     { discount: number; appliedQty: number; missingQualifyingAmount: number }
//   >();

//   for (const { index, item } of ppItemsIndices) {
//     const ppMatches = Array.from(
//       item.schm_camp_grp!.matchAll(/PP[\s:-]*(\d+)/gi),
//     );
//     const ppValues = ppMatches.map((m) => parseFloat(m[1]));
//     const minPP = Math.min(...ppValues);

//     let appliedQty = 0;
//     let discount = 0;
//     let missingQualifyingAmount = 0;

//     if (minPP > 0) {
//       const eligibleQty = Math.floor(remainingQualifyingAmount / minPP);
//       appliedQty = Math.min(item.qty, eligibleQty);

//       if (appliedQty > 0) {
//         discount = (appliedQty * ((item.price * 33) / 100)) / item.qty;
//         remainingQualifyingAmount -= appliedQty * minPP;
//       }

//       if (appliedQty < item.qty) {
//         missingQualifyingAmount = minPP - remainingQualifyingAmount;
//       }
//     }
//     ppResults.set(index, { discount, appliedQty, missingQualifyingAmount });
//   }

//   return items.map((item, index) => {
//     if (isPPScheme(item.schm_type, item.schm_camp_grp)) {
//       const res = ppResults.get(index) || {
//         discount: 0,
//         appliedQty: 0,
//         missingQualifyingAmount: 0,
//       };
//       return { ...item, ...res };
//     }
//     return {
//       ...item,
//       discount: calculateDiscount(
//         item.price,
//         item.qty,
//         item.schm_type,
//         item.schm_camp_grp,
//         // grossTotal,
//         // totalPPAmount,
//       ),
//       appliedQty: undefined,
//       missingQualifyingAmount: undefined,
//     };
//   });
// };

// export const createNewItem = (product: any) => {
//   const price = Number(product.Lot_MRP) || 0;
//   const stock = Number(product.Stock_Qty) || 0;

//   return {
//     id: crypto.randomUUID(),
//     itemCode: product.itemCode,
//     itemName: product.itemName || "Unknown Item",
//     stock,
//     qty: 1,
//     price,
//     discount: 0, // Will be calculated by recalculateCart
//     tax: Number(product.taxRate) || 0,
//     printDesc: product.printDesc,
//     schm_type: product.schm_type,
//     schm_camp_grp: product.schm_camp_grp,
//   };
// };

// export const validateStock = (stock: number, qty: number) => {
//   if (qty > stock) {
//     toast.error(`Quantity cannot exceed stock (${stock})`, {
//       id: "stock-limit-error",
//     });
//     return false;
//   }
//   return true;
// };
