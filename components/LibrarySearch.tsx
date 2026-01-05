import React, { useRef, memo, useCallback } from 'react';
import { Search } from 'lucide-react';

interface LibrarySearchProps {
  onSearchChange: (term: string) => void;
}

// Isolated search component to prevent keyboard dismissal on Android
// Does NOT update parent on every keystroke - only on blur or Enter
export const LibrarySearch: React.FC<LibrarySearchProps> = memo(({ onSearchChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Only update parent when user is done typing (blur or Enter)
  const commitSearch = useCallback(() => {
    const value = inputRef.current?.value || '';
    onSearchChange(value);
  }, [onSearchChange]);

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
        defaultValue=""
        onBlur={commitSearch}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitSearch();
            inputRef.current?.blur();
          }
        }}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm text-sm"
      />
    </div>
  );
});

LibrarySearch.displayName = 'LibrarySearch';
