/**
 * eBook Storage Service
 * 
 * Stores eBook files (EPUB/PDF) in localStorage as base64 strings.
 * Files are stored separately from book data due to their large size.
 * 
 * Storage key format: libris-ebook-{bookId}
 */

interface StoredEbook {
  fileName: string;
  fileType: 'epub' | 'pdf';
  data: string; // Base64 encoded file data
  storedAt: number;
}

const STORAGE_PREFIX = 'libris-ebook-';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

/**
 * Save an eBook file for a specific book
 */
export const saveEbook = (bookId: string, fileName: string, fileType: 'epub' | 'pdf', data: string): boolean => {
  try {
    const storedEbook: StoredEbook = {
      fileName,
      fileType,
      data,
      storedAt: Date.now()
    };
    
    localStorage.setItem(`${STORAGE_PREFIX}${bookId}`, JSON.stringify(storedEbook));
    console.log(`[EbookStorage] Saved ${fileType.toUpperCase()} for book ${bookId}`);
    return true;
  } catch (error) {
    console.error('[EbookStorage] Failed to save eBook:', error);
    // This usually happens when localStorage is full
    return false;
  }
};

/**
 * Get an eBook file for a specific book
 */
export const getEbook = (bookId: string): StoredEbook | null => {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${bookId}`);
    if (!stored) return null;
    
    return JSON.parse(stored) as StoredEbook;
  } catch (error) {
    console.error('[EbookStorage] Failed to get eBook:', error);
    return null;
  }
};

/**
 * Check if a book has an eBook file attached
 */
export const hasEbook = (bookId: string): boolean => {
  return localStorage.getItem(`${STORAGE_PREFIX}${bookId}`) !== null;
};

/**
 * Delete an eBook file for a specific book
 */
export const deleteEbook = (bookId: string): void => {
  localStorage.removeItem(`${STORAGE_PREFIX}${bookId}`);
  console.log(`[EbookStorage] Deleted eBook for book ${bookId}`);
};

/**
 * Get the total size of stored eBooks in bytes (approximate)
 */
export const getStorageUsed = (): number => {
  let totalSize = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // UTF-16 = 2 bytes per char
      }
    }
  }
  
  return totalSize;
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
 * List all stored eBooks
 */
export const listEbooks = (): { bookId: string; fileName: string; fileType: 'epub' | 'pdf'; storedAt: number }[] => {
  const ebooks: { bookId: string; fileName: string; fileType: 'epub' | 'pdf'; storedAt: number }[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const bookId = key.replace(STORAGE_PREFIX, '');
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored) as StoredEbook;
          ebooks.push({
            bookId,
            fileName: parsed.fileName,
            fileType: parsed.fileType,
            storedAt: parsed.storedAt
          });
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
  }
  
  return ebooks;
};

export const ebookStorage = {
  save: saveEbook,
  get: getEbook,
  has: hasEbook,
  delete: deleteEbook,
  getStorageUsed,
  formatBytes,
  list: listEbooks,
  MAX_FILE_SIZE
};
