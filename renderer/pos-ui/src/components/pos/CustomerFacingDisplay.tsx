import { MdShoppingCart, MdStore, MdReceiptLong } from "react-icons/md";

interface CustomerFacingDisplayProps {
  cart: any[];
  totals: {
    totalQty: number;
    grandTotal: number;
    totalDiscount: number;
    taxableValue: number;
    totalTax: number;
  };
  customer?: any;
  theme: "light" | "dark";
}

export default function CustomerFacingDisplay({
  cart,
  totals,
  customer,
  theme,
}: CustomerFacingDisplayProps) {
  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-dark text-light" : "bg-light text-dark";
  //   const cardClass = isDark
  //     ? "bg-secondary bg-opacity-10 border-secondary"
  //     : "bg-white border";

  return (
    <div
      className={`d-flex h-100 w-100 ${bgClass}`}
      style={{ overflow: "hidden" }}
    >
      {/* LEFT: Cart Items */}
      <div className="col-7 d-flex flex-column border-end border-secondary p-4">
        <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom border-secondary">
          <div className="p-3 rounded-circle bg-primary text-white shadow-sm">
            <MdShoppingCart size={32} />
          </div>
          <div>
            <h2 className="fw-bold mb-0">Your Cart</h2>
            <div className="opacity-75 fs-5">{totals.totalQty} Items</div>
          </div>
        </div>

        <div className="flex-grow-1 overflow-auto pe-2">
          {cart.length === 0 ? (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center opacity-50">
              <MdStore size={80} className="mb-3" />
              <h3>Welcome to Market 99</h3>
              <p>Ready to checkout</p>
            </div>
          ) : (
            <table
              className={`table ${isDark ? "table-dark" : ""} align-middle fs-5`}
            >
              <thead className="sticky-top">
                <tr>
                  <th className="w-50">Item</th>
                  <th className="text-center">Qty</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">{item.itemName}</div>
                      {item.discount > 0 && (
                        <small className="text-success">
                          Discount: -₹{(item.discount * item.qty).toFixed(2)}
                        </small>
                      )}
                    </td>
                    <td className="text-center">{item.qty}</td>
                    <td className="text-end">₹{item.price.toFixed(2)}</td>
                    <td className="text-end fw-bold">
                      ₹{((item.price - item.discount) * item.qty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RIGHT: Totals & Ads */}
      <div className="col-5 d-flex flex-column p-4 bg-opacity-10 bg-primary">
        {/* Customer Welcome */}
        {customer && (
          <div className={`card mb-4 shadow-sm `}>
            <div className="card-body">
              <h5 className="card-title opacity-75">Welcome back!</h5>
              <h3 className="fw-bold text-primary mb-0">{customer.name}</h3>
              <small className="opacity-75">Member since 2023</small>
            </div>
          </div>
        )}

        {/* Big Total Display */}
        <div className="mt-auto">
          <div
            className={`card shadow-lg border-0 ${isDark ? "bg-dark" : "bg-white"}`}
          >
            <div className="card-body p-5">
              <div className="d-flex justify-content-between mb-3 fs-5 opacity-75">
                <span>Subtotal</span>
                <span>₹{totals.taxableValue.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-3 fs-5 opacity-75">
                <span>Tax</span>
                <span>₹{totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-4 fs-5 text-success fw-bold">
                <span>Savings</span>
                <span>-₹{totals.totalDiscount.toFixed(2)}</span>
              </div>
              <hr />
              <div className="text-center mt-4">
                <div className="text-uppercase small fw-bold opacity-75 mb-2">
                  Total to Pay
                </div>
                <div className="display-1 fw-bold text-primary">
                  ₹{totals.grandTotal.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-4 opacity-50 d-flex align-items-center justify-content-center gap-2">
            <MdReceiptLong />
            <span>Thank you for shopping with us!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
