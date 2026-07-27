import React, { useRef, useState } from 'react';
import { FileText, Upload, Trash2, X, ChevronDown, ChevronUp, Layers, Link as LinkIcon, Download, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

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
        onFilesAdded(pdfFiles);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = (Array.from(e.target.files) as File[]).filter(
        f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (selected.length > 0) {
        onFilesAdded(selected);
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

    setIsFetchingUrl(true);
    const fetchedFiles: File[] = [];
    const errors: string[] = [];

    for (const url of rawUrls) {
      try {
        // First try server proxy route to bypass browser CORS restrictions
        let response = await fetch(`/api/proxy-pdf?url=${encodeURIComponent(url)}`);
        
        // If server proxy fails or is not available, try direct fetch as fallback
        if (!response.ok) {
          response = await fetch(url);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Derive filename from URL
        let fileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0];
        if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) {
          fileName = `${fileName || 'document'}_${Date.now()}.pdf`;
        }
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          fileName += '.pdf';
        }
        
        const file = new File([blob], fileName, { type: 'application/pdf' });
        fetchedFiles.push(file);
      } catch (err: any) {
        console.error('Failed to fetch PDF from URL:', url, err);
        errors.push(`${url.slice(0, 30)}... (${err?.message || 'CORS or Network Error'})`);
      }
    }

    setIsFetchingUrl(false);

    if (fetchedFiles.length > 0) {
      onFilesAdded(fetchedFiles);
      setUrlInput('');
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

      if (autoExtract && onFilesAddedAndExtractDirectly) {
        onFilesAddedAndExtractDirectly(fetchedFiles);
      }
    } else {
      setUrlStatus({
        type: 'error',
        message: `Failed to fetch PDF(s). Note: The target URL must allow direct access (CORS). Details: ${errors.join(', ')}`,
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
      <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl w-fit text-xs font-bold text-slate-700">
        <button
          type="button"
          onClick={() => setUploadSource('local')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            uploadSource === 'local'
              ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Files (رفع من الجهاز)</span>
        </button>

        <button
          type="button"
          onClick={() => setUploadSource('url')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            uploadSource === 'url'
              ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>PDF URLs (روابط الملفات)</span>
        </button>
      </div>

      {/* Main Upload Box */}
      {uploadSource === 'local' ? (
        <div
          id="dropZone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`group relative border-2 border-dashed rounded-2xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200 ${
            disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-300' : ''
          } ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/80 scale-[1.005] shadow-md'
              : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100/80 hover:border-blue-400'
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
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                Drop PDF files here or click to browse
              </span>
              <p className="text-xs text-slate-500 mt-0.5">Supports batch uploads (multi-page invoices, manifests, forms)</p>
            </div>

            {files.length > 0 && (
              <div
                id="fileCountText"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs mt-2"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                {files.length} file(s) selected
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <span>Enter Direct PDF URLs (روابط ملفات PDF):</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Paste one or multiple public direct links to PDF files (separated by line or comma):
            </p>
          </div>

          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={disabled || isFetchingUrl}
            placeholder="https://example.com/document1.pdf&#10;https://example.com/invoice_2024.pdf"
            rows={3}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
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
                    Fetch & Add to Queue (إضافة للطابور)
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
                    ⚡ Fetch & Extract Directly (جلب واستخراج فوراً)
                  </>
                )}
              </button>
            </div>

            {files.length > 0 && (
              <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                Queue: {files.length} file(s)
              </span>
            )}
          </div>

          {urlStatus && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                urlStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {urlStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{urlStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Queued Files Collapsible Section */}
      {files.length > 0 && (
        <div className="bg-slate-50/90 rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          {/* Header & Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setIsQueueExpanded(!isQueueExpanded)}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors cursor-pointer text-left focus:outline-none"
            >
              {isQueueExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Queued Files ({files.length})</span>
              <span className="text-[10px] font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                {isQueueExpanded ? 'Click to hide' : 'Click to expand'}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-red-50 font-semibold"
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
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors group"
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-medium text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-slate-400 text-[11px] shrink-0">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemoved(idx);
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-100"
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

