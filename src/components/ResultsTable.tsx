import React, { useState } from 'react';
import { ExtractedRow } from '../types';
import { Download, Search, FileSpreadsheet, CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface ResultsTableProps {
  data: ExtractedRow[];
  onDownload: () => void;
  processingTimeSec?: string;
  defaultExpanded?: boolean;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  onDownload,
  processingTimeSec,
  defaultExpanded = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0] || {});

  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-6">
      {/* Table Header Controls */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer focus:outline-none"
          >
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Extracted Data Preview (معاينة البيانات)
                <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                  {data.length} records
                </span>
              </h3>
              {processingTimeSec && (
                <p className="text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Processed in {processingTimeSec}s
                </p>
              )}
            </div>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Hide Preview (إخفاء)
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                Show Preview (إظهار)
              </>
            )}
          </button>

          {/* Search Box */}
          {isExpanded && (
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter results..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 w-full sm:w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Table Container (Collapsible) */}
      {isExpanded && (
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200 text-[11px] tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200/80 w-12 text-center bg-slate-100">
                  #
                </th>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="py-2.5 px-3 border-r border-slate-200/80 last:border-r-0 whitespace-nowrap bg-slate-100"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 font-mono">
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/40 transition-colors odd:bg-white even:bg-slate-50/50"
                  >
                    <td className="py-2 px-3 text-center text-slate-400 font-sans border-r border-slate-200/60 font-semibold text-[11px]">
                      {idx + 1}
                    </td>
                    {headers.map((header) => {
                      const value = String(row[header] ?? '');
                      const isNotFound = value === '[Not Found]' || value.startsWith('[File Read Error');
                      return (
                        <td
                          key={header}
                          className="py-2 px-3 border-r border-slate-200/60 last:border-r-0 max-w-xs truncate"
                          title={value}
                        >
                          {isNotFound ? (
                            <span className="inline-block text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] font-sans font-medium border border-amber-200">
                              {value}
                            </span>
                          ) : (
                            value
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={headers.length + 1}
                    className="py-8 text-center text-slate-400 font-sans text-xs"
                  >
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
