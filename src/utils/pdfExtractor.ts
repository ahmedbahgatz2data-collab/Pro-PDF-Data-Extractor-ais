import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import { ExtractMode, ScanMode, ExtractedRow } from '../types';

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

export function findAllKeywordMatches(lines: string[], keyword: string): string[] {
  const kwLower = keyword.toLowerCase();
  const matches: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    if (lineLower.includes(kwLower)) {
      const idx = lineLower.indexOf(kwLower);
      const remainder = lines[i].substring(idx + keyword.length).replace(/^[:\s-]+/, '').trim();
      
      if (remainder) {
        matches.push(remainder);
      } else if (lines[i + 1]) {
        matches.push(lines[i + 1].trim());
      }
    }
  }

  return matches;
}

export async function extractFastLines(file: File, scanMode: ScanMode): Promise<string[]> {
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
    const maxPages = scanMode === 'first_page' ? 1 : pdf.numPages;

    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      
      const textGroups: { [y: number]: any[] } = {};
      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!textGroups[y]) textGroups[y] = [];
        textGroups[y].push(item);
      }

      // Sort Y descending (top of page to bottom)
      const sortedY = Object.keys(textGroups).map(Number).sort((a, b) => b - a);
      for (const y of sortedY) {
        // Sort items X ascending (left to right)
        const lineItems = textGroups[y].sort((a, b) => a.transform[4] - b.transform[4]);
        const lineText = lineItems.map(item => item.str).join(' ').trim();
        if (lineText) allLines.push(lineText);
      }
      page.cleanup();
    }

    if (typeof (pdf as any).destroy === 'function') {
      await (pdf as any).destroy();
    }
    return allLines;
  } catch (err: any) {
    console.error('PDF extraction failed for file:', file.name, err);
    throw err;
  }
}

export function exportToXLSX(data: ExtractedRow[], filenamePrefix: string = 'PDF_Report'): void {
  if (!data || !data.length) return;

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
        maxLen = Math.max(maxLen, String(val).length);
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
  });
  worksheet['!cols'] = cols;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  XLSX.writeFile(workbook, `${filenamePrefix}_${timestamp}.xlsx`);
}

