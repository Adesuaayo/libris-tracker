import React, { useRef, memo, useEffect } from 'react';
import { Search } from 'lucide-react';

interface LibrarySearchProps {
  onSearchChange: (term: string) => void;
  initialValue?: string;
}

// Isolated search component to prevent keyboard dismissal on Android
// Uses uncontrolled input with debounced callback
export const LibrarySearch: React.FC<LibrarySearchProps> = memo(({ onSearchChange, initialValue = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Set initial value on mount
  useEffect(() => {
    if (inputRef.current && initialValue) {
      inputRef.current.value = initialValue;
    }
  }, []);

  const handleInput = () => {
    const value = inputRef.current?.value || '';
    
    // Debounce the callback to parent
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300); // 300ms debounce
  };

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Search books..."
        defaultValue={initialValue}
        onInput={handleInput}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm text-sm"
      />
    </div>
  );
});

LibrarySearch.displayName = 'LibrarySearch';
