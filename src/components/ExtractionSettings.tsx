import React from 'react';
import { ExtractMode, ScanMode, KeywordMatchTarget, KeywordLineSeparator } from '../types';
import { HelpCircle, Sparkles, Layers, ListFilter, Hash, Tag, CornerDownRight } from 'lucide-react';

interface ExtractionSettingsProps {
  extractMode: ExtractMode;
  onExtractModeChange: (mode: ExtractMode) => void;
  targetInput: string;
  onTargetInputChange: (value: string) => void;
  targetKeywordsInput?: string;
  onTargetKeywordsInputChange?: (value: string) => void;
  keywordTarget?: KeywordMatchTarget;
  onKeywordTargetChange?: (target: KeywordMatchTarget) => void;
  keywordLineOffset?: number;
  onKeywordLineOffsetChange?: (offset: number) => void;
  keywordLineCount?: number;
  onKeywordLineCountChange?: (count: number) => void;
  keywordLineSeparator?: KeywordLineSeparator;
  onKeywordLineSeparatorChange?: (sep: KeywordLineSeparator) => void;
  scanMode: ScanMode;
  onScanModeChange: (mode: ScanMode) => void;
  disabled?: boolean;
}

export const ExtractionSettings: React.FC<ExtractionSettingsProps> = ({
  extractMode,
  onExtractModeChange,
  targetInput,
  onTargetInputChange,
  targetKeywordsInput = '',
  onTargetKeywordsInputChange,
  keywordTarget = 'smart',
  onKeywordTargetChange,
  keywordLineOffset = 1,
  onKeywordLineOffsetChange,
  keywordLineCount = 1,
  onKeywordLineCountChange,
  keywordLineSeparator = 'newline',
  onKeywordLineSeparatorChange,
  scanMode,
  onScanModeChange,
  disabled = false,
}) => {
  const handleModeToggle = (mode: ExtractMode) => {
    onExtractModeChange(mode);
  };

  const endLineOffset = keywordLineOffset + keywordLineCount - 1;

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="form-group space-y-1.5">
        <label id="extractModeLabel" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <ListFilter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Extraction Mode:
        </label>
        <select
          id="extractMode"
          value={extractMode}
          onChange={(e) => handleModeToggle(e.target.value as ExtractMode)}
          disabled={disabled}
          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
        >
          <option value="line_numbers">By Line Numbers (e.g. 1, 3, 5-8)</option>
          <option value="keywords">By Keywords / Labels (e.g. Invoice, Date)</option>
          <option value="combined">✨ Combined (Line Numbers + Keywords)</option>
          <option value="tables">📊 Table Auto-Detect (Spatial Clustering)</option>
        </select>
      </div>

      {/* Target Inputs */}
      {extractMode === 'tables' ? (
        <div className="space-y-2 p-3.5 bg-blue-50/50 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Automatic Table Extraction & Column Alignment</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Uses spatial coordinate analysis (X/Y clustering) to automatically detect tabular structures, headers, and aligned columns across PDF pages without needing keywords or line numbers.
          </p>
        </div>
      ) : extractMode === 'combined' ? (
        <div className="space-y-3 p-3.5 bg-blue-50/50 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Combined Extraction Parameters</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Target Lines in Combined */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Target Lines:
              </label>
              <input
                type="text"
                value={targetInput}
                onChange={(e) => onTargetInputChange(e.target.value)}
                disabled={disabled}
                placeholder="e.g. 1, 3, 5-8"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
              />
            </div>

            {/* Target Keywords in Combined */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Target Keywords:
              </label>
              <input
                type="text"
                value={targetKeywordsInput}
                onChange={(e) => onTargetKeywordsInputChange?.(e.target.value)}
                disabled={disabled}
                placeholder="e.g. Invoice No, Total Amount, Date"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
              />
            </div>
          </div>
          <div className="text-[11px] text-blue-700 dark:text-blue-300 font-sans">
            Searches lines and keywords simultaneously, creating a unified Excel row for each file.
          </div>
        </div>
      ) : (
        <div className="form-group space-y-1.5">
          <label id="inputLabel" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
          />
          <div id="inputHint" className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 font-sans">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            {extractMode === 'line_numbers' ? (
              <span>
                Examples: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-700 dark:text-blue-300 font-mono">1, 3, 5</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-700 dark:text-blue-300 font-mono">1-5</code>
              </span>
            ) : (
              <span>
                {keywordTarget === 'next_line'
                  ? keywordLineCount === 1
                    ? `Extracts line +${keywordLineOffset} after each keyword match.`
                    : `Extracts ${keywordLineCount} lines (+${keywordLineOffset} to +${endLineOffset}) after each keyword match.`
                  : keywordTarget === 'same_line'
                  ? 'Extracts the entire line containing each keyword.'
                  : 'Extracts value after ":" / "=" or the next line for exact headings.'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Keyword Match Target (Available in Keywords & Combined Modes) */}
      {(extractMode === 'keywords' || extractMode === 'combined') && (
        <div className="form-group space-y-2 pt-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <CornerDownRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Keyword Output Target:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'smart' as KeywordMatchTarget, label: 'Smart Auto', sub: 'After : or =' },
              {
                id: 'next_line' as KeywordMatchTarget,
                label: 'Next Line(s)',
                sub:
                  keywordLineCount === 1
                    ? `Line +${keywordLineOffset}`
                    : `${keywordLineCount} lines (+${keywordLineOffset}..+${endLineOffset})`,
              },
              { id: 'same_line' as KeywordMatchTarget, label: 'Same Line', sub: 'Full line' },
            ].map((opt) => {
              const active = keywordTarget === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onKeywordTargetChange?.(opt.id)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    active
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 dark:border-blue-500 ring-1 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`text-xs font-bold ${active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{opt.sub}</div>
                </button>
              );
            })}
          </div>

          {keywordTarget === 'next_line' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5">
              {/* Number of lines to extract */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Lines to extract:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      disabled={disabled}
                      onClick={() => onKeywordLineCountChange?.(cnt)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        keywordLineCount === cnt
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={keywordLineCount}
                    disabled={disabled}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      onKeywordLineCountChange?.(isNaN(parsed) || parsed < 1 ? 1 : Math.min(50, parsed));
                    }}
                    aria-label="Number of lines to extract after keyword"
                    className="w-12 px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Start offset after keyword */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Start at line:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={disabled}
                      onClick={() => onKeywordLineOffsetChange?.(preset)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        keywordLineOffset === preset
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={keywordLineOffset}
                    disabled={disabled}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      onKeywordLineOffsetChange?.(isNaN(parsed) || parsed < 1 ? 1 : Math.min(50, parsed));
                    }}
                    aria-label="Start line offset after keyword"
                    className="w-12 px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Separator when extracting more than 1 line */}
              {keywordLineCount > 1 && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Join lines with:
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'newline' as KeywordLineSeparator, label: 'New Line' },
                      { id: 'space' as KeywordLineSeparator, label: 'Space' },
                      { id: 'pipe' as KeywordLineSeparator, label: 'Pipe |' },
                    ].map((sepOpt) => (
                      <button
                        key={sepOpt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onKeywordLineSeparatorChange?.(sepOpt.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          keywordLineSeparator === sepOpt.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {sepOpt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                {keywordLineCount === 1
                  ? `Range: extracts line +${keywordLineOffset} after each keyword match.`
                  : `Range: extracts ${keywordLineCount} lines (+${keywordLineOffset} to +${endLineOffset}) after each keyword match.`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scan Depth */}
      <div className="form-group space-y-1.5 pt-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Scan Depth:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label
            className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
              scanMode === 'first_page'
                ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 ring-1 ring-blue-500/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
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
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">First Page Only (Fast ⚡)</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Ideal for single-page documents</div>
            </div>
          </label>

          <label
            className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
              scanMode === 'all_pages'
                ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 ring-1 ring-blue-500/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
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
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">All Pages (Full Document)</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Scans every page from top to bottom</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
