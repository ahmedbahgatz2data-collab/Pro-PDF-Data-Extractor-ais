export type ExtractMode = 'line_numbers' | 'keywords' | 'combined' | 'tables';
export type ScanMode = 'first_page' | 'all_pages';
export type KeywordMatchTarget = 'smart' | 'next_line' | 'same_line';
export type KeywordLineSeparator = 'newline' | 'space' | 'pipe';

export interface ExtractedRow {
  'File Name': string;
  'File URL / Link'?: string;
  [key: string]: string | number | undefined;
}

export interface ExtractedKeywordRow extends ExtractedRow {
  'File Name': string;
  'File URL / Link'?: string;
  'Keyword': string;
  'Occurrence': number;
  'Extracted Value': string;
  'Total Lines': number;
}

export interface ExtractedLineRow extends ExtractedRow {
  'File Name': string;
  'File URL / Link'?: string;
  'Total Lines': number;
}

export interface ProcessingStats {
  totalFiles: number;
  completedCount: number;
  timeTakenSec: string;
}

