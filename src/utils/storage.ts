// IndexedDB utility for persistent storage of Files and Extracted Data
const DB_NAME = 'pdf_extractor_db';
const DB_VERSION = 1;
const STORE_FILES = 'saved_files';
const STORE_RESULTS = 'saved_results';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RESULTS)) {
        db.createObjectStore(STORE_RESULTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredFileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sourceUrl?: string;
  blob: Blob;
}

/**
 * Save array of File objects to IndexedDB
 */
export async function saveFilesToDB(files: File[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);

    // Clear old files and insert current ones
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const sourceUrl = (f as any).sourceUrl || (f as any).url || '';
      const record: StoredFileRecord = {
        id: `${f.name}_${f.size}_${i}`,
        name: f.name,
        size: f.size,
        type: f.type || 'application/pdf',
        lastModified: f.lastModified || Date.now(),
        sourceUrl,
        blob: f,
      };
      store.put(record);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save files to IndexedDB:', err);
  }
}

/**
 * Load array of File objects from IndexedDB
 */
export async function loadFilesFromDB(): Promise<File[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const records: StoredFileRecord[] = req.result || [];
        const files: File[] = records.map((rec) => {
          const file = new File([rec.blob], rec.name, {
            type: rec.type,
            lastModified: rec.lastModified,
          });
          if (rec.sourceUrl) {
            (file as any).sourceUrl = rec.sourceUrl;
          }
          return file;
        });
        resolve(files);
      };
      req.onerror = () => {
        console.warn('Failed to read files from IndexedDB:', req.error);
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for loading files:', err);
    return [];
  }
}

/**
 * Clear all files from IndexedDB
 */
export async function clearFilesFromDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    store.clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear files from IndexedDB:', err);
  }
}

/**
 * Save extracted data & report metadata
 */
export async function saveExtractedDataToDB(
  data: any[],
  processingTimeSec: string = ''
): Promise<void> {
  try {
    // Save to LocalStorage as well for instant lightweight access
    localStorage.setItem('pdf_saved_results_meta', JSON.stringify({
      count: data.length,
      processingTimeSec,
      timestamp: Date.now(),
    }));

    const db = await openDB();
    const tx = db.transaction(STORE_RESULTS, 'readwrite');
    const store = tx.objectStore(STORE_RESULTS);

    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    store.put({
      id: 'current_report',
      data,
      processingTimeSec,
      savedAt: Date.now(),
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save extracted data:', err);
  }
}

/**
 * Load extracted data from IndexedDB
 */
export async function loadExtractedDataFromDB(): Promise<{
  data: any[];
  processingTimeSec: string;
} | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_RESULTS, 'readonly');
    const store = tx.objectStore(STORE_RESULTS);

    return new Promise((resolve) => {
      const req = store.get('current_report');
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.data) && req.result.data.length > 0) {
          resolve({
            data: req.result.data,
            processingTimeSec: req.result.processingTimeSec || '',
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for loading results:', err);
    return null;
  }
}

/**
 * Clear extracted data from DB and localStorage
 */
export async function clearExtractedDataFromDB(): Promise<void> {
  try {
    localStorage.removeItem('pdf_saved_results_meta');
    const db = await openDB();
    const tx = db.transaction(STORE_RESULTS, 'readwrite');
    const store = tx.objectStore(STORE_RESULTS);
    store.clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear extracted data from DB:', err);
  }
}
