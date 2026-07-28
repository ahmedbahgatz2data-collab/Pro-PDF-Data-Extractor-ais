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
    .toLowerCase()
    .trim();
}

export function reverseString(str: string): string {
  return Array.from(str).reverse().join('');
}

export function findAllKeywordMatches(lines: string[], keyword: string): string[] {
  if (!keyword || !keyword.trim()) return [];

  const rawKw = keyword.trim();
  const kwNorm = normalizeText(rawKw);
  const kwRevNorm = normalizeText(reverseString(rawKw));
  const matches: string[] = [];

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
      
      // Group text items by Y coordinate with a 3px tolerance band for better line grouping
      const textGroups: { [yBand: number]: any[] } = {};
      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const y = item.transform[5];
        const yBand = Math.round(y / 3) * 3; // 3px tolerance clustering
        if (!textGroups[yBand]) textGroups[yBand] = [];
        textGroups[yBand].push(item);
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
    return allLines;
  } catch (err: any) {
    console.error('PDF extraction failed for file:', file.name, err);
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
          maxLen = Math.max(maxLen, String(val).length);
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

