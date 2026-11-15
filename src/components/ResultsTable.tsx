import React, { useState, useEffect, useMemo } from 'react';
import { ExtractedRow } from '../types';
import {
  Download,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface ResultsTableProps {
  data: ExtractedRow[];
  onDownload: () => void;
  onClear?: () => void;
  processingTimeSec?: string;
  defaultExpanded?: boolean;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  onDownload,
  onClear,
  processingTimeSec,
  defaultExpanded = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const headers = useMemo(() => Object.keys(data[0] || {}), [data]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [data, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, data]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (!data || data.length === 0) return null;

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = filteredData.slice(startIndex, startIndex + pageSize);
  const showingFrom = filteredData.length === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + pageSize, filteredData.length);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden mt-6">
      {/* Table Header Controls */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer focus:outline-none"
          >
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Extracted Data Preview
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 rounded-full">
                  {data.length} records
                </span>
              </h3>
              {processingTimeSec && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Show Preview
              </>
            )}
          </button>

          {/* Search Box */}
          {isExpanded && (
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter results..."
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 w-full sm:w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          {/* Clear Extracted Data Button */}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Clear extracted data preview"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Data
            </button>
          )}

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Table Container (Collapsible & Paginated) */}
      {isExpanded && (
        <>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-semibold border-b border-slate-200 dark:border-slate-700 text-[11px] tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-700 w-12 text-center bg-slate-100 dark:bg-slate-800">
                    #
                  </th>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-700 last:border-r-0 whitespace-nowrap bg-slate-100 dark:bg-slate-800"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-mono">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row, idx) => (
                    <tr
                      key={startIndex + idx}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/40 transition-colors odd:bg-white dark:odd:bg-slate-900 even:bg-slate-50/50 dark:even:bg-slate-800/40"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-sans border-r border-slate-200/60 dark:border-slate-800 font-semibold text-[11px]">
                        {startIndex + idx + 1}
                      </td>
                      {headers.map((header) => {
                        const value = String(row[header] ?? '');
                        const isNotFound = value === '[Not Found]' || value.startsWith('[File Read Error');
                        const isLink = value.startsWith('http://') || value.startsWith('https://');
                        const isMultiline = value.includes('\n');

                        return (
                          <td
                            key={header}
                            className={`py-2 px-3 border-r border-slate-200/60 dark:border-slate-800 last:border-r-0 ${
                              isMultiline ? 'max-w-sm whitespace-pre-line align-top leading-relaxed' : 'max-w-xs truncate'
                            }`}
                            title={value}
                          >
                            {isNotFound ? (
                              <span className="inline-block text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-[11px] font-sans font-medium border border-amber-200 dark:border-amber-800">
                                {value}
                              </span>
                            ) : isLink ? (
                              <a
                                href={value}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-sans text-xs"
                                title={value}
                              >
                                <span className="truncate max-w-[200px]">{value}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                              </a>
                            ) : isMultiline ? (
                              <div className="max-h-28 overflow-y-auto pr-1">{value}</div>
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

          {/* Pagination Footer */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <span>
                Showing <b>{showingFrom}</b>–<b>{showingTo}</b> of <b>{filteredData.length}</b> records
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Per page:</span>
                {[25, 50].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      pageSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="px-2 font-mono text-[11px] font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
