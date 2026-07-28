import React, { useState, useEffect, useRef } from 'react';
import { ExtractMode, ScanMode, ExtractedRow } from './types';
import { DropZone } from './components/DropZone';
import { ExtractionSettings } from './components/ExtractionSettings';
import { ResultsTable } from './components/ResultsTable';
import {
  extractFastLines,
  parseLineNumbers,
  findAllKeywordMatches,
  exportToXLSX,
} from './utils/pdfExtractor';
import {
  FileSpreadsheet,
  XCircle,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileText,
  Zap,
  Activity,
  Award,
  Layers,
  Trash2,
  Download,
  Sun,
  Moon,
} from 'lucide-react';

export default function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractMode, setExtractMode] = useState<ExtractMode>('line_numbers');
  const [targetInput, setTargetInput] = useState<string>('');
  const [targetKeywordsInput, setTargetKeywordsInput] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanMode>('all_pages');

  // Theme State (light | dark) - Default to 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('pdf_theme');
      if (saved === 'light') return 'light';
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [processingTimeSec, setProcessingTimeSec] = useState<string>('');

  const [extractedData, setExtractedData] = useState<ExtractedRow[]>([]);
  const [hasReport, setHasReport] = useState<boolean>(false);

  const isAbortedRef = useRef<boolean>(false);

  // Sync Theme with DOM & LocalStorage
  useEffect(() => {
    try {
      const root = document.documentElement;
      const body = document.body;
      if (theme === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
      }
      localStorage.setItem('pdf_theme', theme);
    } catch (e) {
      console.warn('Failed to update theme in DOM/localStorage:', e);
    }
  }, [theme]);

  // Load preferences on mount
  useEffect(() => {
    try {
      const mode = localStorage.getItem('pdf_extract_mode') as ExtractMode | null;
      const input = localStorage.getItem('pdf_target_input');
      const kwInput = localStorage.getItem('pdf_target_keywords');
      const scan = localStorage.getItem('pdf_scan_mode') as ScanMode | null;

      if (mode) setExtractMode(mode);
      if (input !== null) setTargetInput(input);
      if (kwInput !== null) setTargetKeywordsInput(kwInput);
      if (scan) setScanMode(scan);
    } catch (e) {
      console.warn('LocalStorage unavailable:', e);
    }
  }, []);

  // Save preferences
  const savePreferences = (mode: ExtractMode, input: string, scan: ScanMode, kwInput?: string) => {
    try {
      localStorage.setItem('pdf_extract_mode', mode);
      localStorage.setItem('pdf_target_input', input);
      if (kwInput !== undefined) {
        localStorage.setItem('pdf_target_keywords', kwInput);
      }
      localStorage.setItem('pdf_scan_mode', scan);
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  };

  const handleFilesAdded = (files: File[]) => {
    setSelectedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const newFiles = files.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
      return [...prev, ...newFiles];
    });
  };

  const handleFileRemoved = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
  };

  const abortProcessing = () => {
    isAbortedRef.current = true;
    setStatusMessage('Operation cancelled by user.');
    setIsProcessing(false);
  };

  const processPDFs = async (overrideFiles?: File[]) => {
    const filesToUse = Array.isArray(overrideFiles) && overrideFiles.length > 0 ? overrideFiles : selectedFiles;
    if (!filesToUse || filesToUse.length === 0) {
      alert('Please select at least one PDF file.');
      return;
    }

    const rawInput = targetInput.trim();
    if (!rawInput && extractMode !== 'combined') {
      alert('Please specify lines or keywords to extract.');
      return;
    }

    savePreferences(extractMode, rawInput, scanMode, targetKeywordsInput);
    isAbortedRef.current = false;
    setIsProcessing(true);
    setProgressPercent(0);
    setStatusMessage('Starting extraction engine...');
    setProcessingTimeSec('');
    setExtractedData([]);

    const targetLines = (extractMode === 'line_numbers' || extractMode === 'combined') ? parseLineNumbers(rawInput) : [];
    const keywords =
      extractMode === 'keywords'
        ? rawInput.split(',').map((k) => k.trim()).filter(Boolean)
        : extractMode === 'combined'
        ? targetKeywordsInput.split(',').map((k) => k.trim()).filter(Boolean)
        : [];

    const results: ExtractedRow[] = [];
    const totalFiles = filesToUse.length;
    let completedCount = 0;
    const startTime = performance.now();

    const CONCURRENCY_LIMIT = Math.max(4, (navigator.hardwareConcurrency || 4) * 2);

    async function worker(file: File) {
      if (isAbortedRef.current) return;
      try {
        const lines = await extractFastLines(file, scanMode);

        if (extractMode === 'line_numbers') {
          const rowResult: ExtractedRow = { 'File Name': file.name };
          targetLines.forEach((lineNum) => {
            rowResult[`Line ${lineNum}`] =
              lines[lineNum - 1] !== undefined ? lines[lineNum - 1] : '[Not Found]';
          });
          rowResult['Total Lines'] = lines.length;
          results.push(rowResult);
        } else if (extractMode === 'keywords') {
          keywords.forEach((kw) => {
            const matches = findAllKeywordMatches(lines, kw);
            if (matches.length > 0) {
              matches.forEach((matchValue, occurrenceIdx) => {
                results.push({
                  'File Name': file.name,
                  'Keyword': kw,
                  'Occurrence': occurrenceIdx + 1,
                  'Extracted Value': matchValue,
                  'Total Lines': lines.length,
                });
              });
            } else {
              results.push({
                'File Name': file.name,
                'Keyword': kw,
                'Occurrence': 0,
                'Extracted Value': '[Not Found]',
                'Total Lines': lines.length,
              });
            }
          });
        } else if (extractMode === 'combined') {
          // Combined Mode: Unified Row per File containing Line Numbers + Keywords!
          const rowResult: ExtractedRow = { 'File Name': file.name };

          // 1. Line numbers extraction
          targetLines.forEach((lineNum) => {
            rowResult[`Line ${lineNum}`] =
              lines[lineNum - 1] !== undefined ? lines[lineNum - 1] : '[Not Found]';
          });

          // 2. Keywords extraction
          keywords.forEach((kw) => {
            const matches = findAllKeywordMatches(lines, kw);
            rowResult[`KW: ${kw}`] = matches.length > 0 ? matches.join(' | ') : '[Not Found]';
          });

          rowResult['Total Lines'] = lines.length;
          results.push(rowResult);
        }
      } catch (err: any) {
        const errDetail = err?.message || String(err);
        console.error('File Read Error:', file.name, err);
        results.push({
          'File Name': file.name,
          'Error': `[File Read Error: ${errDetail}]`,
        });
      } finally {
        completedCount++;
        const percent = Math.round((completedCount / totalFiles) * 100);
        setProgressPercent(percent);
        setStatusMessage(`Processing: ${completedCount}/${totalFiles} files (${percent}%)`);
      }
    }

    for (let i = 0; i < totalFiles; i += CONCURRENCY_LIMIT) {
      if (isAbortedRef.current) break;
      const chunk = filesToUse.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(chunk.map((file) => worker(file)));
    }

    if (!isAbortedRef.current) {
      const timeInSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
      setProcessingTimeSec(timeInSeconds);
      setStatusMessage(`Completed in ${timeInSeconds}s! Downloading Excel report...`);
      setExtractedData(results);
      setHasReport(true);
      exportToXLSX(results, 'PDF_Report');
    }

    setIsProcessing(false);
  };

  const handleRedownload = () => {
    if (extractedData.length > 0) {
      exportToXLSX(extractedData, 'PDF_Report');
    } else {
      alert('No extracted data available to download.');
    }
  };

  const workerThreads = Math.max(4, (navigator.hardwareConcurrency || 4) * 2);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-200 dark:selection:bg-blue-800 transition-colors duration-200">
      {/* Application Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Pro PDF Data Extractor <span className="text-blue-600 dark:text-blue-400 text-xs font-extrabold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/80 rounded-md border border-blue-200 dark:border-blue-800">v2.4</span>
              </h1>
              <p className="developer-credit text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
                Developed by ENG Ahmed Bahgat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">System Status</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Engine: Ready
              </p>
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-800"></div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Pro Edition
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span className="hidden md:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Light</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar Controls (4 cols on lg) */}
          <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Extraction Configuration
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Customize parsing parameters & scan depth</p>
            </div>

            <ExtractionSettings
              extractMode={extractMode}
              onExtractModeChange={(m) => {
                setExtractMode(m);
                savePreferences(m, targetInput, scanMode, targetKeywordsInput);
              }}
              targetInput={targetInput}
              onTargetInputChange={(val) => {
                setTargetInput(val);
                savePreferences(extractMode, val, scanMode, targetKeywordsInput);
              }}
              targetKeywordsInput={targetKeywordsInput}
              onTargetKeywordsInputChange={(val) => {
                setTargetKeywordsInput(val);
                savePreferences(extractMode, targetInput, scanMode, val);
              }}
              scanMode={scanMode}
              onScanModeChange={(s) => {
                setScanMode(s);
                savePreferences(extractMode, targetInput, s, targetKeywordsInput);
              }}
              disabled={isProcessing}
            />

            <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-100/80 dark:border-blue-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Pro License Active
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Unlimited concurrent multi-page processing enabled for <b>ENG Ahmed Bahgat</b>.
              </p>
            </div>
          </aside>

          {/* Main Workspace (8 cols on lg) */}
          <section className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              {/* Drop Zone */}
              <DropZone
                files={selectedFiles}
                onFilesAdded={handleFilesAdded}
                onFilesAddedAndExtractDirectly={(newFiles) => {
                  setSelectedFiles((prev) => {
                    const updated = [...prev];
                    newFiles.forEach((file) => {
                      if (!updated.some((f) => f.name === file.name && f.size === file.size)) {
                        updated.push(file);
                      }
                    });
                    setTimeout(() => processPDFs(updated), 50);
                    return updated;
                  });
                }}
                onFileRemoved={handleFileRemoved}
                onClearAll={handleClearAll}
                disabled={isProcessing}
              />

              {/* Action Bar */}
              <div className="btn-group flex flex-wrap gap-3 pt-2">
                <button
                  id="btnSubmit"
                  onClick={() => processPDFs()}
                  disabled={isProcessing || selectedFiles.length === 0}
                  className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                    isProcessing || selectedFiles.length === 0
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-500/25'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Extracting Data...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      Extract & Download Excel (.xlsx)
                    </>
                  )}
                </button>

                {isProcessing && (
                  <button
                    id="btnCancel"
                    onClick={abortProcessing}
                    className="btn-cancel px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                )}

                {selectedFiles.length > 0 && !isProcessing && (
                  <button
                    onClick={handleClearAll}
                    className="px-4 py-3.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Queue
                  </button>
                )}

                {!isProcessing && hasReport && extractedData.length > 0 && (
                  <button
                    id="btnRedownload"
                    onClick={handleRedownload}
                    className="btn-redownload px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Re-download Last Report
                  </button>
                )}
              </div>

              {/* Progress Bar & Status */}
              {(isProcessing || progressPercent > 0 || statusMessage) && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div
                    id="progressContainer"
                    className="progress-container w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700"
                  >
                    <div
                      id="progressBar"
                      className="progress-bar h-full bg-blue-600 transition-all duration-200 ease-out rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {statusMessage && (
                    <div
                      id="statusMessage"
                      className="status text-center text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 pt-1"
                    >
                      {statusMessage.includes('Completed') || statusMessage.includes('Done') ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline" />
                      ) : statusMessage.includes('cancelled') ? (
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 inline" />
                      ) : (
                        <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                      )}
                      <span>{statusMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Results Preview Table */}
            <ResultsTable
              data={extractedData}
              onDownload={handleRedownload}
              onClear={() => {
                setExtractedData([]);
                setHasReport(false);
              }}
              processingTimeSec={processingTimeSec}
              defaultExpanded={false}
            />
          </section>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3.5 px-4 sm:px-8 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-[11px]">
            <span>Worker Threads: <b className="text-slate-200">{workerThreads} Active</b></span>
            <span>Elapsed: <b className="text-slate-200">{processingTimeSec ? `${processingTimeSec}s` : '0.00s'}</b></span>
            <span>Status: <b className="text-emerald-400">Ready</b></span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-300 font-medium">
              Pro PDF Data Extractor &copy; Developed by ENG Ahmed Bahgat
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

