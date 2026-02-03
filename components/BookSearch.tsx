import React, { useState, useRef, memo } from 'react';
import { Button } from './Button';
import { Search, Loader2 } from 'lucide-react';

interface BookSearchProps {
  onSelectBook: (book: any) => void;
}

// Completely isolated search component - won't re-render with parent
export const BookSearch: React.FC<BookSearchProps> = memo(({ onSelectBook }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchGoogleBooks = async () => {
    const query = inputRef.current?.value?.trim() || '';
    if (!query) return;
    
    setIsSearching(true);
    setShowResults(true);
    
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
      );
      const data = await res.json();
      setSearchResults(data.items || []);
    } catch (error) {
      console.error("Error fetching books", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (item: any) => {
    onSelectBook(item);
    setSearchResults([]);
    setShowResults(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        Auto-fill from Google Books
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-form-type="other"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              searchGoogleBooks();
            }
          }}
          placeholder="Search by title or ISBN..."
          className="flex-1 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm px-3 py-2 border"
        />
        <Button 
          type="button" 
          onClick={searchGoogleBooks} 
          disabled={isSearching} 
          variant="secondary"
        >
          {isSearching ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {showResults && searchResults.length > 0 && (
        <ul className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
          {searchResults.map((item) => {
            let thumbnailUrl = item.volumeInfo.imageLinks?.smallThumbnail || '';
            if (thumbnailUrl?.startsWith('http://')) {
              thumbnailUrl = thumbnailUrl.replace('http://', 'https://');
            }

            return (
              <li
                key={item.id}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3"
                onClick={() => handleSelect(item)}
              >
                {thumbnailUrl && (
                  <img src={thumbnailUrl} alt="" className="w-8 h-12 object-cover rounded" />
                )}
                <div className="text-sm">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {item.volumeInfo.title}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {item.volumeInfo.authors?.join(', ')}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

BookSearch.displayName = 'BookSearch';
