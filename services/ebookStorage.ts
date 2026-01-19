/**
 * eBook Storage Service
 * 
 * Stores eBook files (EPUB/PDF) in IndexedDB for large file support.
 * localStorage has a 5MB limit, but IndexedDB can store hundreds of MB.
 * 
 * Files are stored separately from book data due to their large size.
 */

interface StoredEbook {
  bookId: string;
  fileName: string;
  fileType: 'epub' | 'pdf';
  data: string; // Base64 encoded file data
  size: number; // Size in bytes
  storedAt: number;
}

const DB_NAME = 'libris-ebooks';
const DB_VERSION = 1;
const STORE_NAME = 'ebooks';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize and get the IndexedDB database
 */
const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[EbookStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[EbookStorage] Database opened successfully');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'bookId' });
        store.createIndex('storedAt', 'storedAt', { unique: false });
        console.log('[EbookStorage] Created object store');
      }
    };
  });

  return dbPromise;
};

/**
 * Save an eBook file for a specific book
 */
export const saveEbook = async (
  bookId: string, 
  fileName: string, 
  fileType: 'epub' | 'pdf', 
  data: string
): Promise<boolean> => {
  try {
    const db = await getDB();
    
    // Calculate approximate size (base64 is ~33% larger than original)
    const size = Math.round((data.length * 3) / 4);
    
    if (size > MAX_FILE_SIZE) {
      console.error(`[EbookStorage] File too large: ${formatBytes(size)} (max: ${formatBytes(MAX_FILE_SIZE)})`);
      return false;
    }

    const storedEbook: StoredEbook = {
      bookId,
      fileName,
      fileType,
      data,
      size,
      storedAt: Date.now()
    };

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(storedEbook);

      request.onsuccess = () => {
        console.log(`[EbookStorage] Saved ${fileType.toUpperCase()} (${formatBytes(size)}) for book ${bookId}`);
        resolve(true);
      };

      request.onerror = () => {
        console.error('[EbookStorage] Failed to save eBook:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[EbookStorage] Failed to save eBook:', error);
    return false;
  }
};

/**
 * Get an eBook file for a specific book
 */
export const getEbook = async (bookId: string): Promise<Omit<StoredEbook, 'bookId'> | null> => {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(bookId);

      request.onsuccess = () => {
        if (request.result) {
          const { bookId: _, ...rest } = request.result as StoredEbook;
          resolve(rest);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[EbookStorage] Failed to get eBook:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('[EbookStorage] Failed to get eBook:', error);
    return null;
  }
};

/**
 * Check if a book has an eBook file attached
 */
export const hasEbook = async (bookId: string): Promise<boolean> => {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getKey(bookId);

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };

      request.onerror = () => {
        resolve(false);
      };
    });
  } catch (error) {
    return false;
  }
};

/**
 * Delete an eBook file for a specific book
 */
export const deleteEbook = async (bookId: string): Promise<void> => {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(bookId);

      request.onsuccess = () => {
        console.log(`[EbookStorage] Deleted eBook for book ${bookId}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[EbookStorage] Failed to delete eBook:', request.error);
        resolve();
      };
    });
  } catch (error) {
    console.error('[EbookStorage] Failed to delete eBook:', error);
  }
};

/**
 * Get the total size of stored eBooks in bytes
 */
export const getStorageUsed = async (): Promise<number> => {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const ebooks = request.result as StoredEbook[];
        const totalSize = ebooks.reduce((sum, ebook) => sum + (ebook.size || 0), 0);
        resolve(totalSize);
      };

      request.onerror = () => {
        resolve(0);
      };
    });
  } catch (error) {
    return 0;
  }
};

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * List all stored eBooks (without the actual file data)
 */
export const listEbooks = async (): Promise<{ bookId: string; fileName: string; fileType: 'epub' | 'pdf'; size: number; storedAt: number }[]> => {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const ebooks = request.result as StoredEbook[];
        resolve(ebooks.map(({ bookId, fileName, fileType, size, storedAt }) => ({
          bookId,
          fileName,
          fileType,
          size,
          storedAt
        })));
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (error) {
    return [];
  }
};

/**
 * Get count of stored eBooks
 */
export const getEbookCount = async (): Promise<number> => {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(0);
      };
    });
  } catch (error) {
    return 0;
  }
};

/**
 * Migrate from localStorage to IndexedDB (one-time migration)
 */
export const migrateFromLocalStorage = async (): Promise<void> => {
  const STORAGE_PREFIX = 'libris-ebook-';
  let migrated = 0;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const bookId = key.replace(STORAGE_PREFIX, '');
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const success = await saveEbook(bookId, parsed.fileName, parsed.fileType, parsed.data);
          if (success) {
            localStorage.removeItem(key);
            migrated++;
          }
        }
      } catch (e) {
        console.error('[EbookStorage] Migration failed for key:', key, e);
      }
    }
  }

  if (migrated > 0) {
    console.log(`[EbookStorage] Migrated ${migrated} eBooks from localStorage to IndexedDB`);
  }
};

// Run migration on load
migrateFromLocalStorage().catch(console.error);

export const ebookStorage = {
  save: saveEbook,
  get: getEbook,
  has: hasEbook,
  delete: deleteEbook,
  getStorageUsed,
  formatBytes,
  list: listEbooks,
  count: getEbookCount,
  MAX_FILE_SIZE
};
