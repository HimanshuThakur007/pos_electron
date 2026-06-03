import { MdStore, MdStars, MdCardGiftcard } from "react-icons/md";

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
  const bgRoot = isDark ? "bg-slate-950" : "bg-slate-100";
  const receiptBg = isDark
    ? "bg-slate-900 text-slate-100"
    : "bg-white text-slate-900";
  const receiptBorder = isDark ? "border-slate-800" : "border-slate-200";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const promoBg = isDark
    ? "bg-gradient-to-br from-blue-950 to-slate-900"
    : "bg-gradient-to-br from-blue-900 to-indigo-900";

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden font-sans ${bgRoot}`}
    >
      {/* LEFT PANE: Digital Billboard & Marketing (60%) */}
      <div
        className={`w-3/5 flex flex-col relative overflow-hidden text-white ${promoBg}`}
      >
        {/* Subtle Background Pattern/Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]" />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-16 text-center">
          {customer ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 backdrop-blur-md">
                <MdStars size={56} className="text-yellow-400" />
              </div>
              <h2 className="text-3xl font-bold text-blue-200 uppercase tracking-widest mb-4">
                Welcome Back
              </h2>
              <h1 className="text-7xl font-black mb-6 leading-tight drop-shadow-lg">
                {customer.name}
              </h1>
              <p className="text-2xl text-blue-100 font-medium">
                Thank you for being a loyal customer!
              </p>
            </div>
          ) : cart.length === 0 ? (
            <div className="animate-in fade-in zoom-in duration-1000">
              <div className="w-32 h-32 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-10 backdrop-blur-md shadow-2xl rotate-3">
                <MdStore size={80} className="text-white" />
              </div>
              <h1 className="text-6xl font-black mb-6 leading-tight drop-shadow-xl">
                Welcome to <br />
                <span className="text-blue-300">Market 99</span>
              </h1>
              <p className="text-3xl text-blue-100 font-medium max-w-lg mx-auto">
                Scan an item to begin your checkout experience.
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-2xl">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 shadow-2xl">
                <MdCardGiftcard
                  size={72}
                  className="text-pink-400 mx-auto mb-8"
                />
                <h2 className="text-5xl font-black mb-4">Exclusive Offers</h2>
                <p className="text-2xl text-blue-100 leading-relaxed">
                  Ask our cashier how you can earn rewards on today's purchase!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Promotional Footer Bar */}
        <div className="relative z-10 w-full bg-black/20 backdrop-blur-md p-6 border-t border-white/10">
          <p className="text-xl font-bold text-center tracking-widest text-white/80 uppercase">
            www.market99.com • Experience Shopping
          </p>
        </div>
      </div>

      {/* RIGHT PANE: Digital Guest Check (40%) */}
      <div
        className={`w-2/5 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.15)] z-20 ${receiptBg}`}
      >
        {/* Receipt Header */}
        <div
          className={`pt-10 pb-6 px-8 border-b-2 border-dashed ${receiptBorder} text-center`}
        >
          <h2 className="text-3xl font-black uppercase tracking-[0.2em] mb-2">
            Market 99
          </h2>
          <p
            className={`text-lg uppercase tracking-widest font-bold ${textMuted}`}
          >
            Order Summary
          </p>
        </div>

        {/* Itemized List (The Tape) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <MdStore size={80} className="mb-4" />
              <p className="text-2xl font-bold uppercase tracking-widest">
                Cart is Empty
              </p>
            </div>
          ) : (
            <ul
              className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}
            >
              {cart.map((item) => (
                <li key={item.id} className="px-8 py-5 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold leading-tight mb-1">
                        {item.itemName}
                      </h4>
                      <div className={`text-lg font-semibold ${textMuted}`}>
                        {item.qty} x ₹{item.price.toFixed(2)}
                      </div>
                      {item.discount > 0 && (
                        <div className="text-lg font-bold text-emerald-500 mt-1">
                          Saving: -₹{(item.discount * item.qty).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="text-3xl font-black text-right min-w-[120px]">
                      ₹{((item.price - item.discount) * item.qty).toFixed(2)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Totals Block */}
        <div
          className={`p-8 border-t-2 border-solid ${receiptBorder} ${isDark ? "bg-slate-950/50" : "bg-slate-50"}`}
        >
          <div className="space-y-3 mb-6">
            <div
              className={`flex justify-between text-2xl font-semibold ${textMuted}`}
            >
              <span>Subtotal ({totals.totalQty} items)</span>
              <span>₹{totals.taxableValue.toFixed(2)}</span>
            </div>
            <div
              className={`flex justify-between text-2xl font-semibold ${textMuted}`}
            >
              <span>Tax</span>
              <span>₹{totals.totalTax.toFixed(2)}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-2xl font-bold text-emerald-500">
                <span>Total Savings</span>
                <span>-₹{totals.totalDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className={`pt-6 border-t-2 border-dashed ${receiptBorder}`}>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold uppercase tracking-widest">
                Total Due
              </span>
              <span className="text-7xl font-black text-blue-600 tracking-tighter leading-none">
                ₹{totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
