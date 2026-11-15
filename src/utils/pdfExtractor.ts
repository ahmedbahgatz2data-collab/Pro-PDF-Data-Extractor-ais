import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import { ExtractMode, ScanMode, ExtractedRow, KeywordMatchTarget, KeywordLineSeparator } from '../types';

// Configure pdfjs worker URL via Vite bundled worker URL with CDN fallback
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    console.warn('Failed to set Vite worker URL, using CDN fallback:', e);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
  }
}

export function parseLineNumbers(input: string): number[] {
  const lines = new Set<number>();
  input.split(',').forEach(part => {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map(n => parseInt(n.trim(), 10));
      if (parts.length === 2) {
        const [s, e] = parts;
        if (!isNaN(s) && !isNaN(e) && s <= e) {
          for (let i = s; i <= e; i++) {
            if (i > 0) lines.add(i);
          }
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num > 0) lines.add(num);
    }
  });
  return Array.from(lines).sort((a, b) => a - b);
}

/**
 * Normalizes text for robust multi-lingual and Arabic search:
 * - Unicode NFKC normalization (converts Arabic presentation forms U+FE70..U+FEFC to canonical Arabic)
 * - Strip Arabic Tashkeel / diacritics
 * - Normalize Alef variants (أ, إ, آ, ٱ -> ا)
 * - Normalize Teh Marbuta (ة -> ه)
 * - Normalize Yeh (ى -> ي)
 * - Strip Tatweel (ـ)
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFKC')
    .replace(/[\u064B-\u0652\u0670]/g, '') // Remove Tashkeel
    .replace(/[أإآٱ]/g, 'ا')             // Normalize Alef
    .replace(/ة/g, 'ه')                   // Normalize Teh Marbuta
    .replace(/ى/g, 'ي')                   // Normalize Alef Maksura
    .replace(/ـ/g, '')                   // Remove Tatweel
    .replace(/\s+/g, ' ')                 // Collapse multiple spaces
    .toLowerCase()
    .trim();
}

export function reverseString(str: string): string {
  return Array.from(str).reverse().join('');
}

export function findAllKeywordMatches(
  lines: string[],
  keyword: string,
  target: KeywordMatchTarget = 'smart',
  lineOffset: number = 1,
  lineCount: number = 1,
  lineSeparator: KeywordLineSeparator = 'newline'
): string[] {
  if (!keyword || !keyword.trim()) return [];

  const rawKw = keyword.trim();
  const kwNorm = normalizeText(rawKw);
  const kwRevNorm = normalizeText(reverseString(rawKw));
  const matches: string[] = [];
  const safeOffset = Math.max(1, Math.floor(lineOffset || 1));
  const safeCount = Math.max(1, Math.floor(lineCount || 1));
  const sep = lineSeparator === 'space' ? ' ' : lineSeparator === 'pipe' ? ' | ' : '\n';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNorm = normalizeText(rawLine);
    const lineRevNorm = normalizeText(reverseString(rawLine));

    // Robust matching against normal, normalized, and reversed Arabic/PDF.js text
    const isMatched =
      (kwNorm.length > 0 && lineNorm.includes(kwNorm)) ||
      (kwRevNorm.length > 0 && lineNorm.includes(kwRevNorm)) ||
      (kwNorm.length > 0 && lineRevNorm.includes(kwNorm)) ||
      rawLine.toLowerCase().includes(rawKw.toLowerCase());

    if (isMatched) {
      if (target === 'next_line') {
        const startIdx = i + safeOffset;
        const endIdx = Math.min(lines.length, startIdx + safeCount);
        const collected: string[] = [];
        for (let idx = startIdx; idx < endIdx; idx++) {
          const val = lines[idx]?.trim();
          if (val) {
            collected.push(val);
          }
        }
        if (collected.length > 0) {
          matches.push(collected.join(sep));
        }
        continue;
      }

      if (target === 'same_line') {
        matches.push(rawLine.trim());
        continue;
      }

      // Smart / Auto mode:
      // 1. If line is a key-value structure like "Key: Value" or "Key = Value"
      const sepMatch = rawLine.match(/^[^:=─–—]+[:=─–—]\s*(.+)$/);
      if (sepMatch && sepMatch[1] && sepMatch[1].trim()) {
        matches.push(sepMatch[1].trim());
        continue;
      }

      // 2. Check if a colon exists in line and value follows
      const colonIdx = rawLine.indexOf(':');
      if (colonIdx !== -1 && colonIdx < rawLine.length - 1) {
        const valAfterColon = rawLine.substring(colonIdx + 1).trim();
        if (valAfterColon) {
          matches.push(valAfterColon);
          continue;
        }
      }

      // 3. If line is exact keyword heading, check if next line holds the value
      const strippedLineNorm = lineNorm.replace(/[:=─–—\s]+/g, '');
      if (strippedLineNorm === kwNorm && lines[i + 1] && lines[i + 1].trim()) {
        matches.push(lines[i + 1].trim());
        continue;
      }

      // 4. Default: return the complete matched line containing the keyword
      matches.push(rawLine.trim());
    }
  }

  return matches;
}

export async function extractFastLines(file: File, scanMode: ScanMode): Promise<{ lines: string[]; links: string[] }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    // Set fallback worker if needed
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/standard_fonts/`,
    } as any);

    const pdf = await loadingTask.promise;

    const allLines: string[] = [];
    const detectedLinksSet = new Set<string>();

    // Add source URL if attached to file
    const fileSourceUrl = (file as any).sourceUrl || (file as any).url || '';
    if (fileSourceUrl) {
      detectedLinksSet.add(fileSourceUrl);
    }

    const maxPages = scanMode === 'first_page' ? 1 : pdf.numPages;

    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      
      // Extract links from PDF Annotations
      try {
        const annotations = await page.getAnnotations();
        if (Array.isArray(annotations)) {
          for (const annot of annotations) {
            if (annot.url && typeof annot.url === 'string') {
              detectedLinksSet.add(annot.url.trim());
            } else if (annot.unsafeUrl && typeof annot.unsafeUrl === 'string') {
              detectedLinksSet.add(annot.unsafeUrl.trim());
            }
          }
        }
      } catch (annotErr) {
        // annotations are optional
      }

      // Group text items by Y coordinate with a 3px tolerance band for better line grouping
      const textGroups: { [yBand: number]: any[] } = {};
      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const y = item.transform[5];
        const yBand = Math.round(y / 3) * 3; // 3px tolerance clustering
        if (!textGroups[yBand]) textGroups[yBand] = [];
        textGroups[yBand].push(item);

        // Regex check for web links in text item
        const urlMatches = item.str.match(/(https?:\/\/[^\s<>"{}|\\^`]+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s<>"{}|\\^`]*)/gi);
        if (urlMatches) {
          urlMatches.forEach((u: string) => detectedLinksSet.add(u.trim()));
        }
      }

      // Sort Y descending (top of page to bottom)
      const sortedY = Object.keys(textGroups).map(Number).sort((a, b) => b - a);
      for (const yBand of sortedY) {
        // Sort items X ascending (left to right)
        const lineItems = textGroups[yBand].sort((a, b) => a.transform[4] - b.transform[4]);
        const lineText = lineItems.map(item => item.str).join(' ').trim();
        if (lineText) allLines.push(lineText);
      }
      page.cleanup();
    }

    if (typeof (pdf as any).destroy === 'function') {
      await (pdf as any).destroy();
    }
    return { lines: allLines, links: Array.from(detectedLinksSet) };
  } catch (err: any) {
    console.error('PDF extraction failed for file:', file.name, err);
    throw err;
  }
}

export interface TableColumnSlot {
  index: number;
  minX: number;
  maxX: number;
  centerX: number;
}

/**
 * Advanced Spatial Table Extraction Engine
 * - Uses 1D spatial X/Y coordinate projections and interval clustering to detect table structures
 * - Maps text items strictly into column bounding slots to prevent left-shifting on missing cells
 * - Merges multi-line wrapped text inside table cells
 * - Auto-detects table headers and supports RTL / Arabic PDF text
 */
export async function extractTablesFromPDF(file: File, scanMode: ScanMode): Promise<ExtractedRow[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/standard_fonts/`,
    } as any);

    const pdf = await loadingTask.promise;
    const extractedTableRows: ExtractedRow[] = [];
    const maxPages = scanMode === 'first_page' ? 1 : pdf.numPages;

    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();

      interface RawItem {
        str: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }

      const rawItems: RawItem[] = [];
      let isArabicPage = false;

      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const str = item.str.trim();
        const x = item.transform[4];
        const y = item.transform[5];
        const width = item.width || (str.length * 6);
        const height = Math.abs(item.transform[0] || item.transform[3] || 10);

        if (/[\u0600-\u06FF]/.test(str)) {
          isArabicPage = true;
        }

        rawItems.push({ str, x, y, width, height });
      }

      if (rawItems.length === 0) {
        page.cleanup();
        continue;
      }

      // 1. Group items into Y-rows with a 4px band
      const yBands: { [band: number]: RawItem[] } = {};
      for (const item of rawItems) {
        const band = Math.round(item.y / 4) * 4;
        if (!yBands[band]) yBands[band] = [];
        yBands[band].push(item);
      }

      // Sort rows descending (top of page to bottom)
      const sortedYBands = Object.keys(yBands).map(Number).sort((a, b) => b - a);

      // Assemble horizontal lines
      const pageLines: { y: number; items: RawItem[] }[] = [];
      for (const band of sortedYBands) {
        const lineItems = yBands[band].sort((a, b) => a.x - b.x);
        pageLines.push({ y: band, items: lineItems });
      }

      // 2. Discover Spatial Column Bounding Slots (X-Interval Clustering)
      // Filter lines that look like table rows (2+ items with spacing or distinct text blocks)
      const multiColLines = pageLines.filter(line => {
        if (line.items.length >= 2) return true;
        return false;
      });

      if (multiColLines.length === 0) {
        page.cleanup();
        continue;
      }

      // Collect all X intervals [x, x + width] from multi-column rows
      const xIntervals: { minX: number; maxX: number }[] = [];
      for (const line of multiColLines) {
        for (const item of line.items) {
          xIntervals.push({ minX: item.x, maxX: item.x + Math.max(item.width, 10) });
        }
      }

      // Sort intervals by minX
      xIntervals.sort((a, b) => a.minX - b.minX);

      // Merge overlapping or nearby intervals (gap <= 18px)
      const mergedIntervals: { minX: number; maxX: number }[] = [];
      for (const interval of xIntervals) {
        if (mergedIntervals.length === 0) {
          mergedIntervals.push({ minX: interval.minX, maxX: interval.maxX });
        } else {
          const last = mergedIntervals[mergedIntervals.length - 1];
          if (interval.minX <= last.maxX + 18) {
            last.maxX = Math.max(last.maxX, interval.maxX);
          } else {
            mergedIntervals.push({ minX: interval.minX, maxX: interval.maxX });
          }
        }
      }

      // Build Column Slots
      const columnSlots: TableColumnSlot[] = mergedIntervals.map((inv, idx) => ({
        index: idx,
        minX: inv.minX,
        maxX: inv.maxX,
        centerX: (inv.minX + inv.maxX) / 2,
      }));

      // If page is predominantly Arabic, column 1 is on the far right
      if (isArabicPage) {
        columnSlots.sort((a, b) => b.centerX - a.centerX);
        columnSlots.forEach((slot, newIdx) => {
          slot.index = newIdx;
        });
      }

      const totalCols = columnSlots.length;
      if (totalCols === 0) {
        page.cleanup();
        continue;
      }

      // Helper function to match an item to the best ColumnSlot
      const findBestColumnSlot = (item: RawItem): number => {
        const itemCenter = item.x + item.width / 2;

        // Direct containment check
        for (let c = 0; c < columnSlots.length; c++) {
          const slot = columnSlots[c];
          if (itemCenter >= slot.minX - 10 && itemCenter <= slot.maxX + 10) {
            return c;
          }
        }

        // Fallback: Pick nearest column by center distance
        let bestCol = 0;
        let minDistance = Infinity;
        for (let c = 0; c < columnSlots.length; c++) {
          const dist = Math.abs(itemCenter - columnSlots[c].centerX);
          if (dist < minDistance) {
            minDistance = dist;
            bestCol = c;
          }
        }
        return bestCol;
      };

      // 3. Map Lines into Table Rows
      const rawTableRows: { y: number; cells: string[] }[] = [];

      for (const line of pageLines) {
        const cells = new Array(totalCols).fill('');
        let itemCount = 0;

        for (const item of line.items) {
          const colIdx = findBestColumnSlot(item);
          if (cells[colIdx]) {
            cells[colIdx] += ' ' + item.str;
          } else {
            cells[colIdx] = item.str;
          }
          itemCount++;
        }

        // Check if row has text in at least 1 column
        const populatedCols = cells.filter(c => c.trim().length > 0).length;
        if (populatedCols >= 1) {
          rawTableRows.push({ y: line.y, cells });
        }
      }

      // 4. Merge Multi-line Wrapped Text within Cells (Row Continuation)
      const mergedTableRows: { cells: string[] }[] = [];

      for (let i = 0; i < rawTableRows.length; i++) {
        const currentRow = rawTableRows[i];

        if (mergedTableRows.length === 0) {
          mergedTableRows.push({ cells: [...currentRow.cells] });
        } else {
          const prevRow = rawTableRows[i - 1];
          const lastMerged = mergedTableRows[mergedTableRows.length - 1];
          const yDelta = Math.abs(prevRow.y - currentRow.y);

          // If row is very close vertically (<= 14px) and currentRow only has a few items, merge into previous row
          const currPopulated = currentRow.cells.filter(c => c.trim().length > 0).length;
          const prevPopulated = lastMerged.cells.filter(c => c.trim().length > 0).length;

          if (yDelta <= 14 && currPopulated < prevPopulated && currPopulated > 0) {
            // Append continuation text to previous row's cells
            for (let c = 0; c < totalCols; c++) {
              if (currentRow.cells[c]) {
                if (lastMerged.cells[c]) {
                  lastMerged.cells[c] += ' ' + currentRow.cells[c];
                } else {
                  lastMerged.cells[c] = currentRow.cells[c];
                }
              }
            }
          } else {
            mergedTableRows.push({ cells: [...currentRow.cells] });
          }
        }
      }

      // 5. Detect Table Headers & Build Result Objects
      // Filter out rows that have only 1 column populated if the rest of the table has multiple columns
      const structuredRows = mergedTableRows.filter(r => {
        const count = r.cells.filter(c => c.trim().length > 0).length;
        return count >= 2 || totalCols === 1;
      });

      if (structuredRows.length > 0) {
        // Detect if first row is header
        const firstRow = structuredRows[0];
        const isHeader = firstRow.cells.every(val => isNaN(Number(val.replace(/,/g, ''))));

        let headers: string[] = [];
        let startIdx = 0;

        if (isHeader && structuredRows.length > 1) {
          headers = firstRow.cells.map((val, idx) => val.trim() || `Column ${idx + 1}`);
          startIdx = 1;
        } else {
          headers = Array.from({ length: totalCols }, (_, idx) => `Column ${idx + 1}`);
          startIdx = 0;
        }

        const fileSourceUrl = (file as any).sourceUrl || (file as any).url || '-';

        for (let r = startIdx; r < structuredRows.length; r++) {
          const rowData = structuredRows[r];
          const record: ExtractedRow = {
            'File Name': file.name,
            'File URL / Link': fileSourceUrl,
            'Page': p,
            'Row #': r - startIdx + 1,
          };

          for (let c = 0; c < totalCols; c++) {
            const colName = headers[c] || `Column ${c + 1}`;
            record[colName] = rowData.cells[c] ? rowData.cells[c].trim() : '';
          }

          extractedTableRows.push(record);
        }
      }

      page.cleanup();
    }

    if (typeof (pdf as any).destroy === 'function') {
      await (pdf as any).destroy();
    }

    return extractedTableRows;
  } catch (err: any) {
    console.error('Table extraction failed for file:', file.name, err);
    throw err;
  }
}

export function exportToXLSX(data: ExtractedRow[], filenamePrefix: string = 'PDF_Report'): void {
  if (!data || !data.length) {
    alert('No extracted data to download. Please process files first.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `${filenamePrefix}_${timestamp}.xlsx`;

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PDF Report");

    // Auto-fit column widths
    const keys = Object.keys(data[0] || {});
    const cols = keys.map(key => {
      let maxLen = key.length;
      data.forEach(row => {
        const val = row[key];
        if (val !== undefined && val !== null) {
          const lineLengths = String(val).split('\n').map(line => line.length);
          maxLen = Math.max(maxLen, ...lineLengths);
        }
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
    });
    worksheet['!cols'] = cols;

    // Direct Blob generation from binary array buffer
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore cleanup error
      }
    }, 1500);
  } catch (err: any) {
    console.error('XLSX generation failed, generating CSV fallback:', err);
    try {
      // Fallback: Generate CSV file directly with UTF-8 BOM for Excel compatibility
      const keys = Object.keys(data[0] || {});
      const csvRows: string[] = [keys.map(k => `"${k.replace(/"/g, '""')}"`).join(',')];
      data.forEach(row => {
        const values = keys.map(k => {
          const val = row[k] !== undefined && row[k] !== null ? String(row[k]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });
      const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenamePrefix}_${timestamp}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore cleanup error
        }
      }, 1500);
    } catch (csvErr: any) {
      alert(`Export error: ${csvErr?.message || csvErr}`);
    }
  }
}

