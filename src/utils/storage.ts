import { QueuedFileMeta } from '../types';

// IndexedDB utility for persistent storage of Files (Blobs separated from Metadata) and Extracted Data
const DB_NAME = 'pdf_extractor_db';
const DB_VERSION = 2;
const STORE_FILES = 'saved_files';
const STORE_FILE_METAS = 'saved_file_metas';
const STORE_RESULTS = 'saved_results';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FILE_METAS)) {
        db.createObjectStore(STORE_FILE_METAS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RESULTS)) {
        db.createObjectStore(STORE_RESULTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export interface StoredFileBlobRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sourceUrl?: string;
  blob: Blob;
}

export interface StoredFileMetaRecord extends QueuedFileMeta {
  order: number;
}

export function buildFileMetaId(name: string, size: number, sourceUrl?: string): string {
  const cleanUrl = (sourceUrl || '').trim();
  return cleanUrl ? `${name}::${size}::${cleanUrl}` : `${name}::${size}`;
}

/**
 * Save a single File/Blob incrementally to IndexedDB without rewriting existing files,
 * and return lightweight metadata (zero Blob kept in React RAM).
 */
export async function putSingleFileToDB(file: File, orderHint?: number): Promise<QueuedFileMeta> {
  const sourceUrl = ((file as any).sourceUrl || (file as any).url || '').trim();
  const id = buildFileMetaId(file.name, file.size, sourceUrl);
  const meta: StoredFileMetaRecord = {
    id,
    name: file.name,
    size: file.size,
    type: file.type || 'application/pdf',
    lastModified: file.lastModified || Date.now(),
    ...(sourceUrl ? { sourceUrl } : {}),
    order: orderHint ?? Date.now() + Math.random(),
  };

  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILE_METAS, STORE_FILES], 'readwrite');
    const metaStore = tx.objectStore(STORE_FILE_METAS);
    const fileStore = tx.objectStore(STORE_FILES);

    metaStore.put(meta);
    fileStore.put({
      id,
      name: meta.name,
      size: meta.size,
      type: meta.type,
      lastModified: meta.lastModified,
      ...(sourceUrl ? { sourceUrl } : {}),
      blob: file,
    } as StoredFileBlobRecord);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save file to IndexedDB:', err);
  }

  return {
    id: meta.id,
    name: meta.name,
    size: meta.size,
    type: meta.type,
    lastModified: meta.lastModified,
    ...(meta.sourceUrl ? { sourceUrl: meta.sourceUrl } : {}),
  };
}

/**
 * Load ONLY lightweight file metadata from IndexedDB (zero Blobs loaded into RAM!).
 * Automatically migrates any legacy v1 records if needed.
 */
export async function loadFileMetasFromDB(): Promise<QueuedFileMeta[]> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILE_METAS], 'readonly');
    const metaStore = tx.objectStore(STORE_FILE_METAS);

    const metas = await new Promise<StoredFileMetaRecord[]>((resolve) => {
      const req = metaStore.getAll();
      req.onsuccess = () => resolve((req.result as StoredFileMetaRecord[]) || []);
      req.onerror = () => resolve([]);
    });

    if (metas.length > 0) {
      metas.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return metas.map(({ order: _order, ...rest }) => rest);
    }

    // Check legacy v1 store via cursor (one by one) if meta store is empty
    const legacyTx = db.transaction([STORE_FILES, STORE_FILE_METAS], 'readwrite');
    const legacyFileStore = legacyTx.objectStore(STORE_FILES);
    const targetMetaStore = legacyTx.objectStore(STORE_FILE_METAS);
    const migrated: QueuedFileMeta[] = [];

    await new Promise<void>((resolve) => {
      const cursorReq = legacyFileStore.openCursor();
      let idx = 0;
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const rec = cursor.value as StoredFileBlobRecord;
          const meta: StoredFileMetaRecord = {
            id: rec.id,
            name: rec.name,
            size: rec.size,
            type: rec.type || 'application/pdf',
            lastModified: rec.lastModified || Date.now(),
            ...(rec.sourceUrl ? { sourceUrl: rec.sourceUrl } : {}),
            order: idx++,
          };
          targetMetaStore.put(meta);
          const { order: _o, ...cleanMeta } = meta;
          migrated.push(cleanMeta);
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => resolve();
    });

    return migrated;
  } catch (err) {
    console.warn('IndexedDB unavailable for loading file metadata:', err);
    return [];
  }
}

/**
 * Fetch a SINGLE File/Blob from IndexedDB on-demand right when a worker parses it.
 */
export async function loadSingleFileFromDB(meta: QueuedFileMeta): Promise<File | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);

    return await new Promise<File | null>((resolve) => {
      const req = store.get(meta.id);
      req.onsuccess = () => {
        const rec = req.result as StoredFileBlobRecord | undefined;
        if (!rec || !rec.blob) {
          resolve(null);
          return;
        }
        const file = new File([rec.blob], rec.name, {
          type: rec.type || 'application/pdf',
          lastModified: rec.lastModified || Date.now(),
        });
        if (rec.sourceUrl || meta.sourceUrl) {
          (file as any).sourceUrl = rec.sourceUrl || meta.sourceUrl;
        }
        resolve(file);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to load single file from IndexedDB:', err);
    return null;
  }
}

/**
 * Remove a single file by id from IndexedDB without touching other files
 */
export async function removeFileFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILE_METAS, STORE_FILES], 'readwrite');
    tx.objectStore(STORE_FILE_METAS).delete(id);
    tx.objectStore(STORE_FILES).delete(id);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to remove file from IndexedDB:', err);
  }
}

/**
 * Clear all files and metadata from IndexedDB
 */
export async function clearFilesFromDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILE_METAS, STORE_FILES], 'readwrite');
    tx.objectStore(STORE_FILE_METAS).clear();
    tx.objectStore(STORE_FILES).clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear files from IndexedDB:', err);
  }
}

/**
 * Save extracted data & report metadata (large data stored strictly in IndexedDB)
 */
export async function saveExtractedDataToDB(
  data: any[],
  processingTimeSec: string = ''
): Promise<void> {
  try {
    // Store only lightweight scalar stats in LocalStorage
    localStorage.setItem('pdf_saved_results_meta', JSON.stringify({
      count: data.length,
      processingTimeSec,
      timestamp: Date.now(),
    }));

    const db = await openDB();
    const tx = db.transaction(STORE_RESULTS, 'readwrite');
    const store = tx.objectStore(STORE_RESULTS);

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
