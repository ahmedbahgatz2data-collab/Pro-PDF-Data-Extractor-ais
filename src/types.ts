export type ExtractMode = 'line_numbers' | 'keywords' | 'combined';
export type ScanMode = 'first_page' | 'all_pages';

export interface ExtractedRow {
  [key: string]: string | number;
}

export interface ExtractedKeywordRow {
  'File Name': string;
  'Keyword': string;
  'Occurrence': number;
  'Extracted Value': string;
  'Total Lines': number;
  [key: string]: string | number;
}

export interface ExtractedLineRow {
  'File Name': string;
  'Total Lines': number;
  [key: `Line ${number}`]: string;
  [key: string]: string | number;
}

export interface ProcessingStats {
  totalFiles: number;
  completedCount: number;
  timeTakenSec: string;
}
