import React, { useState } from 'react';
import { Book, BookFormat, ReadingStatus } from '../types';
import { Button } from './Button';
import { Search, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { storageApi } from '../services/supabase';
import { useToastActions } from './Toast';

interface BookFormProps {
  initialData?: Book;
  onSubmit: (book: Book) => void;
  onCancel: () => void;
}

export const BookForm: React.FC<BookFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Book>>(initialData || {
    title: '',
    author: '',
    genre: 'Fiction',
    status: ReadingStatus.TO_READ,
    format: BookFormat.PHYSICAL,
    rating: 0,
    notes: '',
    coverUrl: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialData?.coverUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToastActions();

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

  const searchGoogleBooks = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=5`);
      const data = await res.json();
      if (data.items) {
        setSearchResults(data.items);
      }
    } catch (error) {
      console.error("Error fetching books", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectBook = async (item: any) => {
    const info = item.volumeInfo;
    const coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
    
    setFormData(prev => ({
      ...prev,
      title: info.title,
      author: info.authors ? info.authors[0] : 'Unknown',
      genre: info.categories ? info.categories[0] : 'General',
      coverUrl: '', // Will be set after upload
      notes: info.description?.substring(0, 200) + '...' || ''
    }));
    
    // Download Google Books image and convert to file for upload
    // This ensures images work on Android (avoid CORS issues)
    if (coverUrl) {
      try {
        const response = await fetch(coverUrl);
        const blob = await response.blob();
        const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
        setSelectedFile(file);
        // Create preview URL for display
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Failed to download Google Books cover:', error);
        // Fallback to direct URL
        setPreviewUrl(coverUrl);
        setFormData(prev => ({ ...prev, coverUrl }));
      }
    } else {
      setPreviewUrl('');
      setSelectedFile(null);
    }
    
    setSearchResults([]);
    setSearchQuery('');
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
      };
      onSubmit(newBook);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto border border-slate-100 dark:border-slate-700">
      <div className="mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{initialData ? 'Edit Book' : 'Add New Book'}</h2>
        {!initialData && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Auto-fill from Google Books</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or ISBN..."
                className="flex-1 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm px-3 py-2 border"
              />
              <Button type="button" onClick={searchGoogleBooks} disabled={isSearching} variant="secondary">
                {isSearching ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <ul className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {searchResults.map((item) => (
                  <li 
                    key={item.id} 
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3"
                    onClick={() => selectBook(item)}
                  >
                    {item.volumeInfo.imageLinks?.smallThumbnail && (
                      <img src={item.volumeInfo.imageLinks.smallThumbnail} alt="" className="w-8 h-12 object-cover rounded" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{item.volumeInfo.title}</p>
                      <p className="text-slate-500 dark:text-slate-400">{item.volumeInfo.authors?.join(', ')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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