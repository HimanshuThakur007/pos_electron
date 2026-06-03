import React from "react";
import { BarChart2, Database, Cloud, Tag, Box } from "lucide-react";

interface ComparisonDataViewerProps {
  data: any[];
  isLoading: boolean;
  isSearching: boolean;
}

export default function ComparisonDataViewer({
  data,
  isLoading,
  isSearching,
}: ComparisonDataViewerProps) {
  if (isLoading || isSearching) {
    return (
      <div className="flex items-center justify-center h-full py-12 text-slate-500 font-medium">
        {isSearching
          ? "Searching..."
          : "Loading comparison data, please wait..."}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-12 text-slate-500">
        No comparison data available.
      </div>
    );
  }

  const totalSchemes =
    data.find((d) => d.Metric === "Total Schemes")?.Count || 0;
  const totalApplied =
    data.find((d) => d.Metric === "Total Applied Items")?.Count || 0;
  const totalApiItems =
    data.find((d) => d.Metric === "Total Items (API)")?.Count || 0;
  const totalLocalItems =
    data.find((d) => d.Metric === "Total Items (Local DB)")?.Count || 0;
  const totalApiSchemes =
    data.find((d) => d.Metric === "Total Schemes (API)")?.Count || 0;
  const totalLocalSchemes =
    data.find((d) => d.Metric === "Total Schemes (Local DB)")?.Count || 0;

  // Unified data map to consolidate all categories into one table
  const combinedMap = new Map<
    string,
    {
      category: string;
      name: string;
      masterCount: number;
      appliedCount: number;
    }
  >();

  data.forEach((d) => {
    let category = "";
    let name = "";
    let isMaster = false;

    if (d.Metric.startsWith("Total Scheme Type: ")) {
      name = d.Metric.replace("Total Scheme Type: ", "");
      category = "Scheme Type";
      isMaster = true;
    } else if (d.Metric.startsWith("Applied Scheme Type: ")) {
      name = d.Metric.replace("Applied Scheme Type: ", "");
      category = "Scheme Type";
      isMaster = false;
    } else if (d.Metric.startsWith("Total Group Name: ")) {
      name = d.Metric.replace("Total Group Name: ", "");
      category = "Group Name";
      isMaster = true;
    } else if (d.Metric.startsWith("Applied Group Name: ")) {
      name = d.Metric.replace("Applied Group Name: ", "");
      category = "Group Name";
      isMaster = false;
    } else {
      return; // Ignore top-level stats
    }

    const key = `${category}_${name}`;
    if (!combinedMap.has(key)) {
      combinedMap.set(key, { category, name, masterCount: 0, appliedCount: 0 });
    }

    const entry = combinedMap.get(key)!;
    if (isMaster) entry.masterCount = d.Count || 0;
    else entry.appliedCount = d.Count || 0;
  });

  // Sort combined array: First by category, then by master count descending
  const combinedRows = Array.from(combinedMap.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return b.masterCount - a.masterCount;
  });

  const maxMasterCount = Math.max(...combinedRows.map((r) => r.masterCount), 1);
  const maxAppliedCount = Math.max(
    ...combinedRows.map((r) => r.appliedCount),
    1,
  );

  const groupedRows = combinedRows.reduce(
    (acc, row) => {
      if (!acc[row.category]) {
        acc[row.category] = [];
      }
      acc[row.category].push(row);
      return acc;
    },
    {} as Record<string, typeof combinedRows>,
  );

  return (
    <div className="p-2 md:p-2 h-full overflow-hidden bg-slate-50 flex flex-col">
      <div className="w-full h-full flex flex-col space-y-4 md:space-y-6">
        {/* Top Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          {/* Schemes Sync Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
            <div className="flex items-center gap-2.5 shrink-0 w-[140px] md:w-[160px]">
              <div className="p-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 shrink-0">
                <Tag size={18} />
              </div>
              <h5 className="font-bold text-xs md:text-[13px] text-slate-800 leading-tight">
                Master Schemes
              </h5>
            </div>

            <div className="flex-1 flex items-center justify-evenly border-l border-r border-slate-100 px-2">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded flex items-center gap-1 mb-1 uppercase tracking-wider">
                  <Cloud size={10} className="text-violet-500" /> API
                </span>
                <span className="font-extrabold text-sm md:text-base text-slate-700 leading-none">
                  {totalApiSchemes.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded flex items-center gap-1 mb-1 uppercase tracking-wider">
                  <Database size={10} className="text-pink-500" /> DB
                </span>
                <span
                  className={`font-extrabold text-sm md:text-base leading-none ${totalApiSchemes !== totalLocalSchemes ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {totalLocalSchemes.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex justify-end min-w-[60px]">
              {totalApiSchemes === totalLocalSchemes ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Synced
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
                  Mismatch
                </span>
              )}
            </div>
          </div>

          {/* Items Sync Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
            <div className="flex items-center gap-2.5 shrink-0 w-[140px] md:w-[160px]">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
                <Box size={18} />
              </div>
              <h5 className="font-bold text-xs md:text-[13px] text-slate-800 leading-tight">
                Item Master
              </h5>
            </div>

            <div className="flex-1 flex items-center justify-evenly border-l border-r border-slate-100 px-2">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 mb-1 uppercase tracking-wider">
                  <Cloud size={10} className="text-indigo-500" /> API
                </span>
                <span className="font-extrabold text-sm md:text-base text-slate-700 leading-none">
                  {totalApiItems.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 mb-1 uppercase tracking-wider">
                  <Database size={10} className="text-amber-500" /> DB
                </span>
                <span
                  className={`font-extrabold text-sm md:text-base leading-none ${totalApiItems !== totalLocalItems ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {totalLocalItems.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex justify-end min-w-[60px]">
              {totalApiItems === totalLocalItems ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Synced
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
                  Mismatch
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Consolidated Unified Breakdowns */}
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col flex-1 min-h-0">
          <div className="px-6 py-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-t-2xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <BarChart2 size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  Detailed Breakdown Analysis
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Master schema count vs Applied instances
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Schemes
                </span>
                <span className="text-sm font-black text-blue-600 leading-none mt-1">
                  {totalSchemes.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Applied Items
                </span>
                <span className="text-sm font-black text-emerald-600 leading-none mt-1">
                  {totalApplied.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-b-2xl bg-slate-50">
            {combinedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-400">
                <Box size={32} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  No breakdown data available
                </p>
              </div>
            ) : (
              <div className="overflow-auto w-full h-full relative custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px] bg-white">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 w-[50%]">
                        Category / Name
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 text-right w-[25%]">
                        Master Count
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 text-right w-[25%]">
                        Applied Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(groupedRows).map(([category, rows]) => (
                      <React.Fragment key={category}>
                        {/* Group Header */}
                        <tr className="bg-slate-50">
                          <td
                            colSpan={3}
                            className="px-6 py-2.5 border-y border-slate-100"
                          >
                            <span
                              className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                                category === "Scheme Type"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-violet-50 text-violet-700 border-violet-200"
                              }`}
                            >
                              {category} Breakdown
                            </span>
                          </td>
                        </tr>
                        {/* Group Items */}
                        {rows.map((row, i) => (
                          <tr
                            key={`${category}-${i}`}
                            className="bg-white group"
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    row.category === "Scheme Type"
                                      ? "bg-blue-400"
                                      : "bg-violet-400"
                                  }`}
                                />
                                <span
                                  className="text-sm font-semibold text-slate-700 truncate"
                                  title={row.name}
                                >
                                  {row.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center justify-end gap-4">
                                <div className="w-24 lg:w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className={`h-full rounded-full ${
                                      row.category === "Scheme Type"
                                        ? "bg-blue-400"
                                        : "bg-violet-400"
                                    }`}
                                    style={{
                                      width: `${(row.masterCount / maxMasterCount) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="font-bold text-slate-700 text-sm min-w-[3.5rem] text-right font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                  {row.masterCount.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center justify-end gap-4">
                                <div className="w-24 lg:w-32 h-1.5 bg-emerald-50 rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-emerald-400 rounded-full"
                                    style={{
                                      width: `${(row.appliedCount / maxAppliedCount) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="font-bold text-emerald-700 text-sm min-w-[3.5rem] text-right font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  {row.appliedCount.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
