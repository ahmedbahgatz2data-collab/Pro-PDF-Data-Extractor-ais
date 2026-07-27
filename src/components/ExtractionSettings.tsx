import React from 'react';
import { ExtractMode, ScanMode } from '../types';
import { HelpCircle, Sparkles, Layers, ListFilter, Hash, Tag } from 'lucide-react';

interface ExtractionSettingsProps {
  extractMode: ExtractMode;
  onExtractModeChange: (mode: ExtractMode) => void;
  targetInput: string;
  onTargetInputChange: (value: string) => void;
  targetKeywordsInput?: string;
  onTargetKeywordsInputChange?: (value: string) => void;
  scanMode: ScanMode;
  onScanModeChange: (mode: ScanMode) => void;
  disabled?: boolean;
}

export const ExtractionSettings: React.FC<ExtractionSettingsProps> = ({
  extractMode,
  onExtractModeChange,
  targetInput,
  onTargetInputChange,
  targetKeywordsInput = 'Invoice No, Total, Date',
  onTargetKeywordsInputChange,
  scanMode,
  onScanModeChange,
  disabled = false,
}) => {
  const handleModeToggle = (mode: ExtractMode) => {
    onExtractModeChange(mode);
    if (mode === 'line_numbers' && (!targetInput || targetInput.includes('Invoice'))) {
      onTargetInputChange('1, 3, 5');
    } else if (mode === 'keywords' && (!targetInput || targetInput.includes('1, 3'))) {
      onTargetInputChange('Invoice No, Total, Date');
    } else if (mode === 'combined') {
      if (!targetInput || targetInput.includes('Invoice')) {
        onTargetInputChange('1, 3, 5');
      }
      if (onTargetKeywordsInputChange && (!targetKeywordsInput || targetKeywordsInput.includes('1, 3'))) {
        onTargetKeywordsInputChange('Invoice No, Total, Date');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="form-group space-y-1.5">
        <label id="extractModeLabel" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <ListFilter className="w-3.5 h-3.5 text-blue-600" />
          Extraction Mode / طريقة الاستخراج:
        </label>
        <select
          id="extractMode"
          value={extractMode}
          onChange={(e) => handleModeToggle(e.target.value as ExtractMode)}
          disabled={disabled}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <option value="line_numbers">By Line Numbers (e.g. 1, 3, 5-8)</option>
          <option value="keywords">By Keywords / Labels (e.g. Invoice, Date)</option>
          <option value="combined">✨ Combined (Line Numbers + Keywords)</option>
        </select>
      </div>

      {/* Target Inputs */}
      {extractMode === 'combined' ? (
        <div className="space-y-3 p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Combined Extraction Parameters (دمج البحث)</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Target Lines in Combined */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                Target Lines (أرقام السطور):
              </label>
              <input
                type="text"
                value={targetInput}
                onChange={(e) => onTargetInputChange(e.target.value)}
                disabled={disabled}
                placeholder="e.g. 1, 3, 5-8"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
              />
            </div>

            {/* Target Keywords in Combined */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Target Keywords (الكلمات المفتاحية):
              </label>
              <input
                type="text"
                value={targetKeywordsInput}
                onChange={(e) => onTargetKeywordsInputChange?.(e.target.value)}
                disabled={disabled}
                placeholder="e.g. Invoice No, Total Amount, Date"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
              />
            </div>
          </div>
          <div className="text-[11px] text-blue-700 font-sans">
            Searches lines and keywords simultaneously, creating a unified Excel row for each file.
          </div>
        </div>
      ) : (
        <div className="form-group space-y-1.5">
          <label id="inputLabel" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            {extractMode === 'line_numbers' ? 'Target Lines:' : 'Target Keywords:'}
          </label>
          <input
            type="text"
            id="targetInput"
            value={targetInput}
            onChange={(e) => onTargetInputChange(e.target.value)}
            disabled={disabled}
            placeholder={
              extractMode === 'line_numbers'
                ? 'e.g. 1, 3, 5-8'
                : 'e.g. Invoice No, Total Amount, Date'
            }
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <div id="inputHint" className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-sans">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {extractMode === 'line_numbers' ? (
              <span>
                Examples: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">1, 3, 5</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">1-5</code>
              </span>
            ) : (
              <span>Extracts text or value immediately following each keyword.</span>
            )}
          </div>
        </div>
      )}

      {/* Scan Depth */}
      <div className="form-group space-y-1.5 pt-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          Scan Depth:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label
            className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
              scanMode === 'first_page'
                ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="scanMode"
              value="first_page"
              checked={scanMode === 'first_page'}
              onChange={() => onScanModeChange('first_page')}
              disabled={disabled}
              className="text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">First Page Only (Fast ⚡)</div>
              <div className="text-[10px] text-slate-500">Ideal for single-page documents</div>
            </div>
          </label>

          <label
            className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
              scanMode === 'all_pages'
                ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="scanMode"
              value="all_pages"
              checked={scanMode === 'all_pages'}
              onChange={() => onScanModeChange('all_pages')}
              disabled={disabled}
              className="text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">All Pages (Full Document)</div>
              <div className="text-[10px] text-slate-500">Scans every page from top to bottom</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
