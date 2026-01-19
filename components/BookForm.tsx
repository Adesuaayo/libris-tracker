import React, { useState, useRef, useEffect } from 'react';
import { Book, BookFormat, ReadingStatus } from '../types';
import { Button } from './Button';
import { Loader2, Upload, X, Image as ImageIcon, FileText, BookOpen } from 'lucide-react';
import { storageApi } from '../services/supabase';
import { ebookStorage } from '../services/ebookStorage';
import { useToastActions } from './Toast';
import { BookSearch } from './BookSearch';

// Session storage key for persisting eBook data across potential re-renders
const EBOOK_SESSION_KEY = 'libris-temp-ebook';
const FORM_SESSION_KEY = 'libris-temp-form';

interface BookFormProps {
  initialData?: Book;
  onSubmit: (book: Book) => void;
  onCancel: () => void;
}

export const BookForm: React.FC<BookFormProps> = ({ initialData, onSubmit, onCancel }) => {
  console.log('[BookForm] Component rendering, initialData:', initialData?.id);
  
  const [formData, setFormData] = useState<Partial<Book>>(() => {
    console.log('[BookForm] Initializing formData state');
    // Try to restore from sessionStorage first (for re-renders)
    if (!initialData) {
      const saved = sessionStorage.getItem(FORM_SESSION_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log('[BookForm] Restored formData from sessionStorage:', parsed.title);
          return parsed;
        } catch (e) {
          console.error('[BookForm] Failed to parse saved form data');
        }
      }
    }
    return initialData || {
      title: '',
      author: '',
      genre: 'Fiction',
      status: ReadingStatus.TO_READ,
      format: BookFormat.PHYSICAL,
      rating: 0,
      notes: '',
      coverUrl: ''
    };
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialData?.coverUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [ebookFile, setEbookFile] = useState<string | null>(null);
  const [ebookFileName, setEbookFileName] = useState<string | null>(initialData?.ebookFileName || null);
  const [ebookFileType, setEbookFileType] = useState<'epub' | 'pdf' | null>(initialData?.ebookFileType || null);
  
  // Use ref to persist eBook data across potential re-renders from file picker
  const ebookDataRef = useRef<{file: string; name: string; type: 'epub' | 'pdf'} | null>(null);
  
  // Also persist form data in ref
  const formDataRef = useRef<Partial<Book>>(formData);
  
  const toast = useToastActions();

  // Sync formData to ref and sessionStorage whenever it changes
  useEffect(() => {
    formDataRef.current = formData;
    console.log('[BookForm] formData updated:', formData.title, formData.author);
    // Save to sessionStorage for persistence
    if (formData.title || formData.author) {
      sessionStorage.setItem(FORM_SESSION_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  // On mount, check sessionStorage for any persisted eBook data
  useEffect(() => {
    const savedEbook = sessionStorage.getItem(EBOOK_SESSION_KEY);
    if (savedEbook) {
      try {
        const parsed = JSON.parse(savedEbook);
        console.log('[BookForm] Restored eBook from sessionStorage:', parsed.name);
        setEbookFile(parsed.file);
        setEbookFileName(parsed.name);
        setEbookFileType(parsed.type);
        ebookDataRef.current = parsed;
      } catch (e) {
        console.error('[BookForm] Failed to parse saved eBook data');
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large. Please select an image under 5MB.");
            return;
        }
        setSelectedFile(file);
        // Create preview URL for display
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const removeCover = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFormData(prev => ({ ...prev, coverUrl: '' }));
  };

  const handleEbookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[BookForm] handleEbookFileChange called');
    const file = e.target.files?.[0];
    if (file) {
      console.log('[BookForm] File selected:', file.name, file.size);
      
      // Check file size (50MB limit for eBooks)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("eBook file is too large. Please select a file under 50MB.");
        return;
      }

      // Check file type
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.epub') && !fileName.endsWith('.pdf')) {
        toast.error("Only EPUB and PDF files are supported.");
        return;
      }

      const fileType: 'epub' | 'pdf' = fileName.endsWith('.epub') ? 'epub' : 'pdf';

      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        console.log('[BookForm] eBook file read successfully:', file.name, 'Type:', fileType, 'Size:', file.size, 'Base64 length:', base64Data.length);
        
        // Store in state
        setEbookFile(base64Data);
        setEbookFileName(file.name);
        setEbookFileType(fileType);
        
        // Store in ref
        ebookDataRef.current = { file: base64Data, name: file.name, type: fileType };
        
        // Store in sessionStorage for persistence across re-renders
        try {
          sessionStorage.setItem(EBOOK_SESSION_KEY, JSON.stringify({ file: base64Data, name: file.name, type: fileType }));
          console.log('[BookForm] Saved eBook to sessionStorage');
        } catch (e) {
          console.error('[BookForm] Failed to save to sessionStorage (might be too large):', e);
        }
        
        toast.success(`${fileType.toUpperCase()} file attached!`);
      };
      reader.onerror = (error) => {
        console.error('[BookForm] FileReader error:', error);
        toast.error("Failed to read the file. Please try again.");
      };
      reader.readAsDataURL(file);
    } else {
      console.log('[BookForm] No file in event');
    }
  };

  const removeEbookFile = () => {
    setEbookFile(null);
    setEbookFileName(null);
    setEbookFileType(null);
    ebookDataRef.current = null;
    sessionStorage.removeItem(EBOOK_SESSION_KEY);
    console.log('[BookForm] Removed eBook file');
  };

  // Handle book selection from search - called by BookSearch component
  const handleBookSelect = async (item: any) => {
    const info = item.volumeInfo;
    let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
    
    // Convert http:// to https:// for Android security
    if (coverUrl && coverUrl.startsWith('http://')) {
      coverUrl = coverUrl.replace('http://', 'https://');
    }
    
    setFormData(prev => ({
      ...prev,
      title: info.title,
      author: info.authors ? info.authors[0] : 'Unknown',
      genre: info.categories ? info.categories[0] : 'General',
      coverUrl: '', // Will be set after upload
      notes: info.description?.substring(0, 200) + '...' || ''
    }));
    
    // Download Google Books image and convert to file for upload
    if (coverUrl) {
      try {
        console.log('Downloading cover from:', coverUrl);
        const response = await fetch(coverUrl, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' });
        setSelectedFile(file);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch (error: any) {
        console.error('Failed to download Google Books cover:', error);
        setPreviewUrl(coverUrl);
        setFormData(prev => ({ ...prev, coverUrl }));
        setSelectedFile(null);
      }
    } else {
      setPreviewUrl('');
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author) return;
    
    setIsUploading(true);
    
    try {
      const bookId = initialData?.id || crypto.randomUUID();
      let coverUrl = formData.coverUrl || '';
      
      // If a new file was selected, upload it to Supabase Storage
      if (selectedFile) {
        try {
          coverUrl = await storageApi.uploadCover(selectedFile, bookId);
        } catch (uploadError: any) {
          console.error('Cover upload failed:', uploadError);
          // If upload fails, continue without cover (or keep existing)
          toast.warning(`Cover upload failed. Saving book without new cover.`);
          coverUrl = initialData?.coverUrl || '';
        }
      }

      // Save eBook file to localStorage if present
      // Use ref as backup in case state was lost during file picker
      // Also check sessionStorage as ultimate backup
      let finalEbookFile = ebookFile || ebookDataRef.current?.file;
      let finalEbookFileName = ebookFileName || ebookDataRef.current?.name;
      let finalEbookFileType = ebookFileType || ebookDataRef.current?.type;
      
      // Check sessionStorage as final fallback
      if (!finalEbookFile) {
        const savedEbook = sessionStorage.getItem(EBOOK_SESSION_KEY);
        if (savedEbook) {
          try {
            const parsed = JSON.parse(savedEbook);
            finalEbookFile = parsed.file;
            finalEbookFileName = parsed.name;
            finalEbookFileType = parsed.type;
            console.log('[BookForm] Recovered eBook from sessionStorage:', parsed.name);
          } catch (e) {
            console.error('[BookForm] Failed to parse sessionStorage eBook');
          }
        }
      }
      
      console.log('[BookForm] eBook state check - state:', !!ebookFile, 'ref:', !!ebookDataRef.current, 'final:', !!finalEbookFile);
      
      if (finalEbookFile && finalEbookFileName && finalEbookFileType) {
        console.log('[BookForm] Saving eBook to IndexedDB with bookId:', bookId);
        const saved = await ebookStorage.save(bookId, finalEbookFileName, finalEbookFileType, finalEbookFile);
        const hasIt = await ebookStorage.has(bookId);
        console.log('[BookForm] eBook save result:', saved, 'Has check:', hasIt);
        if (!saved) {
          toast.warning('eBook file could not be saved. File may be too large (max 100MB).');
        } else {
          const ebookList = await ebookStorage.list();
          console.log('[BookForm] eBook saved successfully. Storage keys:', ebookList);
          // Clear sessionStorage after successful save
          sessionStorage.removeItem(EBOOK_SESSION_KEY);
        }
      } else {
        console.log('[BookForm] No eBook to save. finalEbookFile:', !!finalEbookFile, 'finalEbookFileName:', finalEbookFileName, 'finalEbookFileType:', finalEbookFileType);
      }
      
      const newBook: Book = {
        id: bookId,
        title: formData.title!,
        author: formData.author!,
        genre: formData.genre || 'General',
        status: formData.status as ReadingStatus,
        format: formData.format as BookFormat,
        rating: Number(formData.rating),
        dateStarted: formData.dateStarted,
        dateFinished: formData.dateFinished,
        notes: formData.notes,
        coverUrl: coverUrl,
        addedAt: initialData?.addedAt || Date.now(),
        // Store just metadata - actual file is in localStorage
        ebookFileName: finalEbookFileName || initialData?.ebookFileName || undefined,
        ebookFileType: finalEbookFileType || initialData?.ebookFileType || undefined,
      };
      
      // Clear sessionStorage after successful save
      sessionStorage.removeItem(FORM_SESSION_KEY);
      sessionStorage.removeItem(EBOOK_SESSION_KEY);
      
      onSubmit(newBook);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto border border-slate-100 dark:border-slate-700">
      {/* Debug Panel */}
      <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-[10px] text-yellow-800 dark:text-yellow-200 space-y-1">
        <p><strong>DEBUG:</strong></p>
        <p>Title: "{formData.title}" | Author: "{formData.author}"</p>
        <p>eBook State: {ebookFile ? `YES (${(ebookFile.length/1024).toFixed(0)}KB)` : 'NO'}</p>
        <p>eBook Ref: {ebookDataRef.current ? `YES (${ebookDataRef.current.name})` : 'NO'}</p>
        <p>eBook Session: {sessionStorage.getItem(EBOOK_SESSION_KEY) ? 'YES' : 'NO'}</p>
        <p>Form Session: {sessionStorage.getItem(FORM_SESSION_KEY) ? 'YES' : 'NO'}</p>
        <p>FileName: {ebookFileName || 'none'}</p>
      </div>

      <div className="mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{initialData ? 'Edit Book' : 'Add New Book'}</h2>
        {!initialData && (
          <BookSearch onSelectBook={handleBookSelect} />
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title & Author */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <input 
              required
              name="title" 
              value={formData.title} 
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Author</label>
            <input 
              required
              name="author" 
              value={formData.author} 
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2" 
            />
          </div>
        </div>

        {/* Cover Image Section */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Book Cover</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Preview */}
                <div className="relative w-24 h-36 flex-shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm flex items-center justify-center overflow-hidden group">
                    {previewUrl ? (
                        <>
                            <img src={previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={removeCover}
                                className="absolute top-1 right-1 bg-white/90 dark:bg-slate-800/90 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                title="Remove cover"
                            >
                                <X className="w-3 h-3" />
                            </button>
                            {selectedFile && (
                                <div className="absolute bottom-0 left-0 right-0 bg-brand-500 text-white text-[10px] text-center py-0.5">
                                    New file
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center p-2">
                             <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                             <span className="text-[10px] text-slate-400 dark:text-slate-500">No Image</span>
                        </div>
                    )}
                </div>

                {/* Inputs */}
                <div className="flex-1 w-full space-y-3">
                    <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Image URL (from web)</label>
                        <input
                            type="text"
                            name="coverUrl"
                            placeholder="https://example.com/image.jpg"
                            value={formData.coverUrl || ''}
                            onChange={(e) => {
                                handleChange(e);
                                setPreviewUrl(e.target.value);
                                setSelectedFile(null);
                            }}
                            className="block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="relative">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Or upload from device</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="cover-upload"
                        />
                        <label
                            htmlFor="cover-upload"
                            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer w-full sm:w-auto justify-center"
                        >
                            <Upload className="w-4 h-4" />
                            Choose Image
                        </label>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">Max 5MB. Stored locally.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* eBook File Section */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-violet-100 dark:border-violet-800">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <BookOpen className="w-4 h-4 inline mr-2" />
              eBook File (EPUB/PDF)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Attach an EPUB or PDF file to read directly in the app
            </p>
            
            {(ebookFileName || ebookDataRef.current?.name) ? (
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 border border-violet-200 dark:border-violet-700">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  (ebookFileType || ebookDataRef.current?.type) === 'epub' 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{ebookFileName || ebookDataRef.current?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{ebookFileType || ebookDataRef.current?.type} file</p>
                </div>
                <button
                  type="button"
                  onClick={removeEbookFile}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept=".epub,.pdf"
                  onChange={handleEbookFileChange}
                  className="hidden"
                  id="ebook-upload"
                />
                <label
                  htmlFor="ebook-upload"
                  className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-violet-300 dark:border-violet-600 text-sm font-medium rounded-lg text-violet-700 dark:text-violet-300 bg-white/50 dark:bg-slate-800/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-colors w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  Choose EPUB or PDF File
                </label>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">Max 50MB. Stored locally on your device.</p>
              </div>
            )}
        </div>

        {/* Genre & Format */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Genre</label>
                <input 
                name="genre" 
                value={formData.genre} 
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2" 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Format</label>
                <select 
                name="format" 
                value={formData.format} 
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2"
                >
                {Object.values(BookFormat).map(f => (
                    <option key={f} value={f}>{f}</option>
                ))}
                </select>
            </div>
        </div>

        {/* Dates & Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select 
              name="status" 
              value={formData.status} 
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2"
            >
              {Object.values(ReadingStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date Started</label>
            <input 
              type="date"
              name="dateStarted" 
              value={formData.dateStarted || ''} 
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2" 
            />
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date Finished</label>
            <input 
              type="date"
              name="dateFinished" 
              value={formData.dateFinished || ''} 
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2" 
            />
          </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Rating (0-5)</label>
            <div className="flex items-center gap-2">
                <input 
                type="number"
                min="0"
                max="5"
                step="0.5"
                name="rating" 
                value={formData.rating} 
                onChange={handleChange}
                className="mt-1 block w-20 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2" 
                />
                 <span className="text-sm text-slate-400 dark:text-slate-500 mt-1">/ 5</span>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes / Thoughts</label>
            <textarea 
                name="notes" 
                rows={3}
                value={formData.notes} 
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 border px-3 py-2" 
            />
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isUploading}>Cancel</Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Save Book'}
          </Button>
        </div>
      </form>
    </div>
  );
};