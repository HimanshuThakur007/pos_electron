export default function MainMenuFooter() {
  return (
    <footer className="w-full py-6 z-10 flex justify-center items-center text-slate-500 text-sm gap-8 opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm text-xs font-mono font-bold text-slate-700">
            &uarr;
          </kbd>
          <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm text-xs font-mono font-bold text-slate-700">
            &darr;
          </kbd>
          <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm text-xs font-mono font-bold text-slate-700">
            &larr;
          </kbd>
          <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm text-xs font-mono font-bold text-slate-700">
            &rarr;
          </kbd>
        </div>
        <span className="font-medium">Navigate</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-sm text-xs font-mono font-bold text-slate-700">
          Enter
        </kbd>
        <span className="font-medium">Select</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-sm text-xs font-mono font-bold text-slate-700">
          F10
        </kbd>
        <span className="font-medium">Logout</span>
      </div>
    </footer>
  );
}
