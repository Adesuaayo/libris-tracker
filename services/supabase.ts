/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { Book } from '../types';

// Helper to reliably get environment variables in Vite
const getEnv = (key: string) => {
  let val = '';
  // Check import.meta.env (Vite standard)
  if (import.meta.env && import.meta.env[key]) {
    val = String(import.meta.env[key]);
  }
  // Check process.env (Node/Polyfill)
  else if (typeof process !== 'undefined' && process.env && process.env[key]) {
    val = String(process.env[key]);
  }
  
  // Smart Clean: Remove accidental typos like y" or " characters from copy-pasting
  return val.trim().replace(/^y"|"$|^"|"/g, '');
};

let supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Auto-fix URL if missing protocol
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

// Export debug info for the UI
export const supabaseConfigDebug = {
  url: supabaseUrl,
  key: supabaseAnonKey,
  maskedKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 5)}` : 'Missing'
};

console.log("[Libris] Supabase Config:", supabaseConfigDebug);

export const checkSupabaseConfig = (): string | null => {
  if (!supabaseUrl) return "VITE_SUPABASE_URL is missing.";
  if (!supabaseAnonKey) return "VITE_SUPABASE_ANON_KEY is missing.";
  if (supabaseAnonKey.length < 30) return "VITE_SUPABASE_ANON_KEY looks too short.";
  return null;
};

// Initialize Supabase Client
// We explicitly set 'storage: window.localStorage' to ensure the session survives page reloads
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true, 
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage 
    }
  }
);

/**
 * Maps database snake_case columns to application camelCase properties
 */
const mapToApp = (row: any): Book => ({
    id: row.id,
    title: row.title,
    author: row.author,
    genre: row.genre,
    status: row.status,
    format: row.format,
    rating: row.rating,
    dateStarted: row.date_started,
    dateFinished: row.date_finished,
    notes: row.notes,
    coverUrl: row.cover_url,
    addedAt: row.added_at,
    currentPage: row.current_page,
    totalPages: row.total_pages,
    totalReadingMinutes: row.total_reading_minutes,
});

/**
 * Maps application camelCase properties to database snake_case columns
 */
const mapToDb = (book: Book, userId: string) => ({
    user_id: userId,
    title: book.title,
    author: book.author,
    genre: book.genre,
    status: book.status,
    format: book.format,
    rating: book.rating,
    date_started: book.dateStarted,
    date_finished: book.dateFinished,
    notes: book.notes,
    cover_url: book.coverUrl,
    added_at: book.addedAt,
    current_page: book.currentPage,
    total_pages: book.totalPages,
    total_reading_minutes: book.totalReadingMinutes,
});

export const bookApi = {
    async fetchBooks() {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('added_at', { ascending: false });
        
        if (error) throw error;
        return data ? data.map(mapToApp) : [];
    },

    async addBook(book: Book) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        // Remove ID so DB generates a real UUID
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ..._rest } = book;
        
        const { data, error } = await supabase
            .from('books')
            .insert([mapToDb(book, user.id)])
            .select()
            .single();
            
        if (error) throw error;
        return mapToApp(data);
    },

    async updateBook(book: Book) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const { error } = await supabase
            .from('books')
            .update(mapToDb(book, user.id))
            .eq('id', book.id);

        if (error) throw error;
        return book;
    },

    async deleteBook(id: string) {
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }
};

/**
 * Storage API for uploading book covers to Supabase Storage
 */
export const storageApi = {
    /**
     * Upload a cover image to Supabase Storage
     * @param file - The file to upload (from input or converted from base64)
     * @param bookId - Unique identifier for the book (used in filename)
     * @returns The public URL of the uploaded image
     */
    async uploadCover(file: File, bookId: string): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        // Create a unique filename: userId/bookId/timestamp.extension
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${bookId}/${Date.now()}.${fileExt}`;

        console.log('Uploading cover:', { fileName, fileSize: file.size, fileType: file.type });

        const { error: uploadError, data: uploadData } = await supabase.storage
            .from('book-covers')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('Upload error details:', {
                message: uploadError.message,
                name: uploadError.name,
                cause: uploadError.cause,
            });
            throw new Error(`Failed to upload cover: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('book-covers')
            .getPublicUrl(fileName);

        console.log('Public URL:', publicUrl);

        return publicUrl;
    },

    /**
     * Convert a base64 data URL to a File object
     */
    base64ToFile(base64: string, filename: string): File {
        const arr = base64.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    },

    /**
     * Delete a cover image from Supabase Storage
     */
    async deleteCover(url: string): Promise<void> {
        if (!url || !url.includes('book-covers')) return;
        
        try {
            // Extract the path from the URL
            const urlParts = url.split('/book-covers/');
            if (urlParts.length < 2) return;
            
            const path = urlParts[1];
            await supabase.storage.from('book-covers').remove([path]);
        } catch (error) {
            console.error('Error deleting cover:', error);
            // Don't throw - deletion failure shouldn't break the app
        }
    }
};