export interface CartItem {
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
  appliedQty?: number;
  missingQualifyingAmount?: number;
}

export const isPPScheme = (type?: string | number, schemeStr?: string) => {
  if (!type || !schemeStr) return false;
  const strType = String(type);
  return (
    (strType === "3" || strType === "4") && /PP[\s:-]*(\d+)/i.test(schemeStr)
  );
};

export const calculateDiscount = (
  price: number,
  qty: number,
  type?: string | number,
  schemeStr?: string,
  // cartGrossTotal: number = 0,
  // totalPPAmount: number = 0,
) => {
  if (!type || !schemeStr) return 0;
  const strType = String(type);

  // ================= TYPE 2 =================
  if (strType === "2") {
    const match = schemeStr.match(/(\d+(\.\d+)?)%/);
    if (match) {
      const percentage = parseFloat(match[1]);
      return (price * percentage) / 100;
    }
  }

  // ================= TYPE 1 =================
  else if (strType === "1") {
    const match = schemeStr.match(/(\d+(\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  // ================= TYPE 6 =================
  else if (strType === "6") {
    const match = schemeStr.match(/(\d+(\.\d+)?)/);
    if (match) {
      const fixedPrice = parseFloat(match[1]);
      return Math.max(0, price - fixedPrice);
    }
  }

  // ================= TYPE 5 =================
  else if (strType === "5") {
    const match = schemeStr.match(/(\d+)\s+IN\s+(\d+(\.\d+)?)/i);
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

    if (/BOGO/i.test(schemeStr)) {
      buyQty = 1;
      getQty = 1;
    } else {
      const match = schemeStr.match(/BUY\s+(\d+)\s+GET\s+(\d+)/i);
      if (match) {
        buyQty = parseInt(match[1]);
        getQty = parseInt(match[2]);
      }
    }

    if (buyQty > 0 && getQty > 0) {
      const bundleSize = buyQty + getQty;
      if (qty >= bundleSize) {
        const freeQty = Math.floor(qty / bundleSize) * getQty;

        const totalDiscount = freeQty * price;
        return totalDiscount / qty;
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

  if (strType === "5" && item.schm_camp_grp) {
    const match = item.schm_camp_grp.match(/(\d+)\s+IN\s+(\d+(\.\d+)?)/i);
    if (match) {
      const reqQty = parseInt(match[1]);
      return item.qty >= reqQty
        ? "text-success fw-bold"
        : "text-danger fw-bold";
    }
  }
  if (isPPScheme(item.schm_type, item.schm_camp_grp)) {
    if (item.appliedQty !== undefined) {
      return item.appliedQty > 0
        ? "text-success fw-bold"
        : "text-danger fw-bold";
    }
    return "text-danger fw-bold";
  }
  if (strType === "4" && item.schm_camp_grp) {
    let buyQty = 0;
    let getQty = 0;

    if (/BOGO/i.test(item.schm_camp_grp)) {
      buyQty = 1;
      getQty = 1;
    } else {
      const match = item.schm_camp_grp.match(/BUY\s+(\d+)\s+GET\s+(\d+)/i);
      if (match) {
        buyQty = parseInt(match[1]);
        getQty = parseInt(match[2]);
      }
    }

    if (buyQty > 0 && getQty > 0) {
      const bundleSize = buyQty + getQty;
      return item.qty >= bundleSize
        ? "text-success fw-bold"
        : "text-danger fw-bold";
    }
  }
  if (item.schm_camp_grp) return "text-success fw-bold";
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
    if (isPPScheme(item.schm_type, item.schm_camp_grp)) {
      return acc + (item.price - item.discount) * item.qty;
    }
    return acc;
  }, 0);

  let remainingQualifyingAmount =
    totalPPAmount > 0 ? grossTotal - totalPPAmount : 0;

  // Identify and sort PP items by minPP value ascending
  const ppItemsIndices = items
    .map((item, index) => ({ index, item }))
    .filter(({ item }) => isPPScheme(item.schm_type, item.schm_camp_grp));

  ppItemsIndices.sort((a, b) => {
    const getMinPP = (s?: string) => {
      if (!s) return Infinity;
      const matches = Array.from(s.matchAll(/PP[\s:-]*(\d+)/gi));
      if (matches.length === 0) return Infinity;
      return Math.min(...matches.map((m) => parseFloat(m[1])));
    };
    return getMinPP(a.item.schm_camp_grp) - getMinPP(b.item.schm_camp_grp);
  });

  const ppResults = new Map<
    number,
    { discount: number; appliedQty: number; missingQualifyingAmount: number }
  >();

  for (const { index, item } of ppItemsIndices) {
    const ppMatches = Array.from(
      item.schm_camp_grp!.matchAll(/PP[\s:-]*(\d+)/gi),
    );
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

  return items.map((item, index) => {
    if (isPPScheme(item.schm_type, item.schm_camp_grp)) {
      const res = ppResults.get(index) || {
        discount: 0,
        appliedQty: 0,
        missingQualifyingAmount: 0,
      };
      return { ...item, ...res };
    }
    return {
      ...item,
      discount: calculateDiscount(
        item.price,
        item.qty,
        item.schm_type,
        item.schm_camp_grp,
        // grossTotal,
        // totalPPAmount,
      ),
      appliedQty: undefined,
      missingQualifyingAmount: undefined,
    };
  });
};

export const createNewItem = (product: any) => {
  const price = Number(product.Lot_MRP) || 0;
  const stock = Number(product.Stock_Qty) || 0;

  return {
    id: crypto.randomUUID(),
    itemCode: product.itemCode,
    itemName: product.itemName || "Unknown Item",
    stock,
    qty: 1,
    price,
    discount: 0, // Will be calculated by recalculateCart
    tax: Number(product.taxRate) || 0,
    printDesc: product.printDesc,
    schm_type: product.schm_type,
    schm_camp_grp: product.schm_camp_grp,
  };
};

export const validateStock = (stock: number, qty: number) => {
  if (qty > stock) {
    alert(`Quantity cannot exceed stock (${stock})`);
    return false;
  }
  return true;
};
