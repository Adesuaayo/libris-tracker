import { useState } from 'react';
import { BookCollection, Book, ReadingStatus } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  X, 
  BookOpen,
  Check,
  Search
} from 'lucide-react';

interface CollectionViewProps {
  collection: BookCollection;
  books: Book[];
  allBooks: Book[];
  onBack: () => void;
  onAddBooks: (bookIds: string[]) => void;
  onRemoveBook: (bookId: string) => void;
  onViewBook: (book: Book) => void;
}

export function CollectionView({ 
  collection, 
  books, 
  allBooks,
  onBack, 
  onAddBooks,
  onRemoveBook,
  onViewBook
}: CollectionViewProps) {
  const [showAddBooks, setShowAddBooks] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Books not in this collection
  const availableBooks = allBooks.filter(
    book => !(collection.bookIds || []).includes(book.id)
  );

  const filteredAvailableBooks = availableBooks.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleAddSelectedBooks = () => {
    onAddBooks(selectedBooks);
    setSelectedBooks([]);
    setShowAddBooks(false);
    setSearchTerm('');
  };

  const getColorClass = (color: string, variant: 'bg' | 'text' | 'gradient' = 'bg') => {
    const colorMap: Record<string, Record<string, string>> = {
      rose: { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', gradient: 'from-rose-500 to-pink-500' },
      pink: { bg: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400', gradient: 'from-pink-500 to-fuchsia-500' },
      fuchsia: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-600 dark:text-fuchsia-400', gradient: 'from-fuchsia-500 to-purple-500' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', gradient: 'from-purple-500 to-violet-500' },
      violet: { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', gradient: 'from-violet-500 to-indigo-500' },
      indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', gradient: 'from-indigo-500 to-blue-500' },
      blue: { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-500 to-sky-500' },
      sky: { bg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', gradient: 'from-sky-500 to-cyan-500' },
      cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', gradient: 'from-cyan-500 to-teal-500' },
      teal: { bg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', gradient: 'from-teal-500 to-emerald-500' },
      emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-500 to-green-500' },
      green: { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', gradient: 'from-green-500 to-lime-500' },
      lime: { bg: 'bg-lime-500', text: 'text-lime-600 dark:text-lime-400', gradient: 'from-lime-500 to-yellow-500' },
      yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', gradient: 'from-yellow-500 to-amber-500' },
      amber: { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-500 to-orange-500' },
      orange: { bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', gradient: 'from-orange-500 to-red-500' },
      red: { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', gradient: 'from-red-500 to-rose-500' },
      slate: { bg: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400', gradient: 'from-slate-500 to-slate-600' },
    };
    return colorMap[color]?.[variant] || colorMap.blue[variant];
  };

  const getStatusBadge = (status: ReadingStatus) => {
    switch (status) {
      case ReadingStatus.COMPLETED:
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case ReadingStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-surface-base text-text-secondary';
    }
  };

  return (
    <div className="min-h-screen bg-surface-base pb-20">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getColorClass(collection.color, 'gradient')} pt-[env(safe-area-inset-top)] pb-6 px-4`}>
        <div className="flex items-center gap-3 pt-4 mb-4">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{collection.icon}</span>
              <h1 className="text-xl font-bold text-white">{collection.name}</h1>
            </div>
            {collection.description && (
              <p className="text-white/70 text-sm mt-1">{collection.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-white/80 text-sm">
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </p>
          <button
            onClick={() => setShowAddBooks(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Books
          </button>
        </div>
      </div>

      {/* Book Grid */}
      <div className="px-4 py-6">
        {books.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text-secondary mb-2">
              No books in this collection
            </h3>
            <p className="text-text-muted mb-4">
              Add books to organize your library
            </p>
            <button
              onClick={() => setShowAddBooks(true)}
              className={`px-4 py-2 ${getColorClass(collection.color, 'bg')} text-white rounded-lg hover:opacity-90 transition-colors`}
            >
              Add Books
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {books.map(book => (
              <div
                key={book.id}
                className="bg-surface-card rounded-xl overflow-hidden shadow-sm border border-surface-border group relative"
              >
                {/* Remove Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveBook(book.id); }}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Book Cover */}
                <div 
                  className="aspect-[2/3] bg-surface-border cursor-pointer"
                  onClick={() => onViewBook(book)}
                >
                  {book.coverUrl ? (
                    <img 
                      src={book.coverUrl} 
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-text-muted" />
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-3">
                  <h4 className="font-medium text-sm text-text-primary line-clamp-1">
                    {book.title}
                  </h4>
                  <p className="text-xs text-text-muted line-clamp-1">
                    {book.author}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs ${getStatusBadge(book.status)}`}>
                    {book.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Books Modal */}
      {showAddBooks && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-surface-card w-full max-w-lg max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-surface-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-text-primary">
                  Add Books to Collection
                </h3>
                <button
                  onClick={() => { setShowAddBooks(false); setSelectedBooks([]); setSearchTerm(''); }}
                  className="p-2 text-text-muted hover:bg-surface-border rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search books..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-base rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Book List */}
            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-2">
              {filteredAvailableBooks.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  {availableBooks.length === 0 
                    ? 'All your books are already in this collection'
                    : 'No books found'}
                </div>
              ) : (
                filteredAvailableBooks.map(book => (
                  <div
                    key={book.id}
                    onClick={() => toggleBookSelection(book.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      selectedBooks.includes(book.id)
                        ? 'bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-500'
                        : 'bg-surface-base hover:bg-surface-border border-2 border-transparent'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      selectedBooks.includes(book.id)
                        ? 'bg-violet-500 text-white'
                        : 'border-2 border-surface-border'
                    }`}>
                      {selectedBooks.includes(book.id) && <Check className="w-3 h-3" />}
                    </div>

                    {/* Book Cover */}
                    <div className="w-10 h-14 rounded overflow-hidden bg-surface-border flex-shrink-0">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-text-muted" />
                        </div>
                      )}
                    </div>

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text-primary text-sm line-clamp-1">
                        {book.title}
                      </h4>
                      <p className="text-xs text-text-muted line-clamp-1">
                        {book.author}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-border">
              <button
                onClick={handleAddSelectedBooks}
                disabled={selectedBooks.length === 0}
                className={`w-full py-3 ${getColorClass(collection.color, 'bg')} text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                Add {selectedBooks.length > 0 ? `${selectedBooks.length} Book${selectedBooks.length > 1 ? 's' : ''}` : 'Books'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
