import React, { useRef, useState } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Link as LinkIcon,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  XCircle,
} from 'lucide-react';

interface DropZoneProps {
  files: File[];
  onFilesAdded: (files: File[]) => void;
  onFilesAddedAndExtractDirectly?: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  files,
  onFilesAdded,
  onFilesAddedAndExtractDirectly,
  onFileRemoved,
  onClearAll,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSource, setUploadSource] = useState<'local' | 'url'>('local');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isQueueExpanded, setIsQueueExpanded] = useState(true);

  // URL fetch state
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlStatus, setUrlStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pause / Resume / Cancel states & refs
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  // Loading & Download Progress state
  const [loadProgress, setLoadProgress] = useState<{
    active: boolean;
    title: string;
    current: number;
    total: number;
    percent: number;
  }>({
    active: false,
    title: '',
    current: 0,
    total: 0,
    percent: 0,
  });

  const checkPauseOrCancel = async (): Promise<boolean> => {
    while (isPausedRef.current && !isCancelledRef.current) {
      await new Promise((r) => setTimeout(r, 150));
    }
    return isCancelledRef.current;
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setIsPaused(true);
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setIsPaused(false);
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
    setIsFetchingUrl(false);
    setLoadProgress((prev) => ({ ...prev, active: false }));
  };

  const processLocalFiles = async (pdfFiles: File[]) => {
    if (pdfFiles.length === 0) return;

    isPausedRef.current = false;
    isCancelledRef.current = false;
    setIsPaused(false);

    setLoadProgress({
      active: true,
      title: `Reading local PDF file(s)...`,
      current: 0,
      total: pdfFiles.length,
      percent: 0,
    });

    for (let i = 0; i < pdfFiles.length; i++) {
      if (await checkPauseOrCancel()) break;

      const file = pdfFiles[i];
      const pct = Math.round(((i + 1) / pdfFiles.length) * 100);
      setLoadProgress({
        active: true,
        title: `Loaded ${i + 1} of ${pdfFiles.length}: ${file.name}`,
        current: i + 1,
        total: pdfFiles.length,
        percent: pct,
      });

      // IMMEDIATELY add each file to queue as soon as it's processed!
      onFilesAdded([file]);

      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    setTimeout(() => {
      setLoadProgress((prev) => ({ ...prev, active: false }));
    }, 500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const pdfFiles = (Array.from(e.dataTransfer.files) as File[]).filter(
        f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfFiles.length > 0) {
        processLocalFiles(pdfFiles);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = (Array.from(e.target.files) as File[]).filter(
        f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (selected.length > 0) {
        processLocalFiles(selected);
      }
      e.target.value = '';
    }
  };

  const handleFetchUrls = async (autoExtract = false) => {
    setUrlStatus(null);
    const rawUrls = urlInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

    if (rawUrls.length === 0) {
      setUrlStatus({
        type: 'error',
        message: 'Please enter at least one valid URL starting with http:// or https://',
      });
      return;
    }

    isPausedRef.current = false;
    isCancelledRef.current = false;
    setIsPaused(false);
    setIsFetchingUrl(true);

    setLoadProgress({
      active: true,
      title: `Downloading 1 of ${rawUrls.length} PDF(s) from URL...`,
      current: 0,
      total: rawUrls.length,
      percent: 0,
    });

    const fetchedFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawUrls.length; i++) {
      if (await checkPauseOrCancel()) break;

      const url = rawUrls[i];
      const startPct = Math.round((i / rawUrls.length) * 100);
      setLoadProgress({
        active: true,
        title: `Fetching (${i + 1}/${rawUrls.length}): ${url.slice(0, 35)}...`,
        current: i + 1,
        total: rawUrls.length,
        percent: startPct,
      });

      try {
        let response = await fetch(`/api/proxy-pdf?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
          response = await fetch(url);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        let fileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0];
        if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) {
          fileName = `${fileName || 'document'}_${Date.now()}.pdf`;
        }
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          fileName += '.pdf';
        }
        
        const file = new File([blob], fileName, { type: 'application/pdf' });
        fetchedFiles.push(file);

        // Instantly enter file into queue as soon as fetched!
        onFilesAdded([file]);
      } catch (err: any) {
        console.error('Failed to fetch PDF from URL:', url, err);
        errors.push(`${url.slice(0, 30)}... (${err?.message || 'CORS or Network Error'})`);
      }

      if (await checkPauseOrCancel()) break;

      const endPct = Math.round(((i + 1) / rawUrls.length) * 100);
      setLoadProgress({
        active: true,
        title: `Downloaded ${i + 1} of ${rawUrls.length} PDF(s)`,
        current: i + 1,
        total: rawUrls.length,
        percent: endPct,
      });
    }

    setIsFetchingUrl(false);
    setTimeout(() => {
      setLoadProgress((prev) => ({ ...prev, active: false }));
    }, 500);

    if (fetchedFiles.length > 0) {
      setUrlInput('');
      if (autoExtract && onFilesAddedAndExtractDirectly) {
        onFilesAddedAndExtractDirectly(fetchedFiles);
      }
      if (errors.length === 0) {
        setUrlStatus({
          type: 'success',
          message: autoExtract
            ? `Loaded ${fetchedFiles.length} PDF(s) and started extraction!`
            : `Successfully loaded ${fetchedFiles.length} PDF(s) to queue!`,
        });
      } else {
        setUrlStatus({
          type: 'error',
          message: `Loaded ${fetchedFiles.length} PDF(s). Failed: ${errors.join(', ')}`,
        });
      }
    } else if (!isCancelledRef.current) {
      setUrlStatus({
        type: 'error',
        message: `Failed to fetch PDF(s). Note: The target URL must allow direct access (CORS). Details: ${errors.join(', ')}`,
      });
    } else {
      setUrlStatus({
        type: 'error',
        message: 'Download operation was cancelled by user.',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full space-y-3">
      {/* Upload Source Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl w-fit text-xs font-bold text-slate-700 dark:text-slate-300">
        <button
          type="button"
          onClick={() => setUploadSource('local')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            uploadSource === 'local'
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Files</span>
        </button>

        <button
          type="button"
          onClick={() => setUploadSource('url')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            uploadSource === 'url'
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>PDF URLs</span>
        </button>
      </div>

      {/* Loading & Download Progress Bar with Pause / Resume / Cancel */}
      {loadProgress.active && (
        <div className="p-3.5 bg-blue-50/95 border border-blue-200 rounded-2xl space-y-2.5 shadow-2xs animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-blue-900">
            <div className="flex items-center gap-2">
              {isPaused ? (
                <Pause className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              )}
              <span>{isPaused ? `[Paused] ${loadProgress.title}` : loadProgress.title}</span>
            </div>
            <span className="font-mono text-blue-700">{loadProgress.percent}%</span>
          </div>

          <div className="w-full bg-blue-200/70 h-2.5 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isPaused ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${loadProgress.percent}%` }}
            />
          </div>

          {/* Action buttons: Pause, Resume, Cancel */}
          <div className="flex items-center justify-end gap-2 pt-0.5">
            {isPaused ? (
              <button
                type="button"
                onClick={handleResume}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <Play className="w-3 h-3" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <Pause className="w-3 h-3" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCancel}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <XCircle className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Upload Box */}
      {uploadSource === 'local' ? (
        <div
          id="dropZone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`group relative border-2 border-dashed rounded-2xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200 ${
            disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800' : ''
          } ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 scale-[1.005] shadow-md'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="pdfFiles"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Drop PDF files here or click to browse
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Supports batch uploads (multi-page invoices, manifests, forms)</p>
            </div>

            {files.length > 0 && (
              <div
                id="fileCountText"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs mt-2"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {files.length} file(s) selected
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Enter Direct PDF URLs:</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Paste one or multiple public direct links to PDF files (separated by line or comma):
            </p>
          </div>

          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={disabled || isFetchingUrl}
            placeholder="https://example.com/document1.pdf&#10;https://example.com/invoice_2024.pdf"
            rows={3}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Button 1: Add to Queue */}
              <button
                type="button"
                onClick={() => handleFetchUrls(false)}
                disabled={disabled || isFetchingUrl || !urlInput.trim()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingUrl ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-slate-300" />
                    Fetch & Add to Queue
                  </>
                )}
              </button>

              {/* Button 2: Fetch & Extract Directly */}
              <button
                type="button"
                onClick={() => handleFetchUrls(true)}
                disabled={disabled || isFetchingUrl || !urlInput.trim()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingUrl ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    ⚡ Fetch & Extract Directly
                  </>
                )}
              </button>
            </div>

            {files.length > 0 && (
              <span className="text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                Queue: {files.length} file(s)
              </span>
            )}
          </div>

          {urlStatus && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                urlStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800'
              }`}
            >
              {urlStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span>{urlStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Queued Files Collapsible Section */}
      {files.length > 0 && (
        <div className="bg-slate-50/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          {/* Header & Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
            <button
              type="button"
              onClick={() => setIsQueueExpanded(!isQueueExpanded)}
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left focus:outline-none"
            >
              {isQueueExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              )}
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Queued Files ({files.length})</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {isQueueExpanded ? 'Click to hide' : 'Click to expand'}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 font-semibold cursor-pointer"
              disabled={disabled}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>

          {/* Collapsible List */}
          {isQueueExpanded && (
            <div className="max-h-48 overflow-y-auto p-2 space-y-1.5 text-xs">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group"
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-slate-100 truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-slate-400 dark:text-slate-400 text-[11px] shrink-0">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemoved(idx);
                    }}
                    className="text-slate-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    title="Remove file"
                    disabled={disabled}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

