import { memo, useState, useEffect, useRef } from 'react';
import { X, BookOpen, Clock, Star, FileText, Tag, Calendar, Globe, Pencil, BookMarked } from 'lucide-react';
import { Book, BookNote, ReadingStatus } from '../types';
import { ReadingTimer } from './ReadingTimer';
import { BookNotes } from './BookNotes';
import { ReadOnline } from './ReadOnline';
import { EBookReader } from './EBookReader';
import { ebookStorage } from '../services/ebookStorage';

interface BookDetailModalProps {
  book: Book;
  notes: BookNote[];
  onClose: () => void;
  onEdit: (book: Book) => void;
  onSessionComplete: (bookId: string, durationMinutes: number) => void;
  onAddNote: (note: Omit<BookNote, 'id' | 'createdAt'>) => void;
  onDeleteNote: (noteId: string) => void;
  onProgressUpdate?: (bookId: string, currentPage: number, totalPages: number) => void;
  onReaderStateChange?: (isOpen: boolean) => void;
  closeReaderTrigger?: number;
}

export const BookDetailModal = memo<BookDetailModalProps>(({
  book,
  notes,
  onClose,
  onEdit,
  onSessionComplete,
  onAddNote,
  onDeleteNote,
  onProgressUpdate,
  onReaderStateChange,
  closeReaderTrigger
}) => {
  const [showReadOnline, setShowReadOnline] = useState(false);
  const [showEBookReader, setShowEBookReader] = useState(false);
  const [hasEbook, setHasEbook] = useState(false);
  const [storedCount, setStoredCount] = useState(0);
  const [ebookData, setEbookData] = useState<{ data: string; fileName: string; fileType: 'epub' | 'pdf' } | null>(null);
  const bookNotes = notes.filter((n: BookNote) => n.bookId === book.id);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Check if book has an eBook file
  useEffect(() => {
    const checkEbook = async () => {
      console.log('[BookDetailModal] Checking for eBook. book.id:', book.id);
      const ebookList = await ebookStorage.list();
      setStoredCount(ebookList.length);
      console.log('[BookDetailModal] All stored eBooks:', ebookList);
      const stored = await ebookStorage.get(book.id);
      console.log('[BookDetailModal] Found stored eBook:', !!stored, stored?.fileName);
      if (stored) {
        setHasEbook(true);
        setEbookData({
          data: stored.data,
          fileName: stored.fileName,
          fileType: stored.fileType
        });
      } else {
        setHasEbook(false);
        setEbookData(null);
      }
    };
    checkEbook();
  }, [book.id]);

  // Notify parent when reader state changes
  useEffect(() => {
    onReaderStateChange?.(showEBookReader);
  }, [showEBookReader, onReaderStateChange]);

  // Close reader when parent requests it (via back button)
  const prevTriggerRef = useRef(closeReaderTrigger);
  useEffect(() => {
    if (closeReaderTrigger !== undefined && closeReaderTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = closeReaderTrigger;
      if (showEBookReader) {
        setShowEBookReader(false);
      }
    }
  }, [closeReaderTrigger, showEBookReader]);
  
  const formatTotalTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-accent to-purple-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex gap-4">
            {/* Book Cover */}
            <div className="w-24 h-36 flex-shrink-0 bg-white/20 rounded-lg shadow-lg overflow-hidden">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white/50" />
                </div>
              )}
            </div>
            
            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{book.title}</h2>
              <p className="text-white/80 text-sm">{book.author}</p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  book.status === ReadingStatus.COMPLETED 
                    ? 'bg-emerald-500/30 text-emerald-100' 
                    : book.status === ReadingStatus.IN_PROGRESS 
                    ? 'bg-amber-500/30 text-amber-100'
                    : 'bg-white/20 text-white/80'
                }`}>
                  {book.status}
                </span>
                {book.genre && (
                  <span className="px-2 py-1 rounded-full text-xs bg-white/20">
                    <Tag className="w-3 h-3 inline mr-1" />
                    {book.genre}
                  </span>
                )}
              </div>
              
              {book.rating && book.rating > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < book.rating! ? 'fill-amber-300 text-amber-300' : 'text-white/30'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Book Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <FileText className="w-4 h-4" />
              <span>Format: {book.format}</span>
            </div>
            {book.totalReadingMinutes && book.totalReadingMinutes > 0 && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Clock className="w-4 h-4" />
                <span>Total: {formatTotalTime(book.totalReadingMinutes)}</span>
              </div>
            )}
            {book.addedAt && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Calendar className="w-4 h-4" />
                <span>Added: {new Date(book.addedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          {/* Book Notes/Personal Notes */}
          {book.notes && (
            <div className="bg-surface-base rounded-lg p-4">
              <h4 className="text-sm font-medium text-text-secondary mb-2">Your Notes</h4>
              <p className="text-sm text-text-muted italic">{book.notes}</p>
            </div>
          )}
          
          {/* Reading Timer - Only for In Progress books */}
          {book.status === ReadingStatus.IN_PROGRESS && (
            <div className="border-t border-surface-border pt-6">
              <ReadingTimer
                bookTitle={book.title}
                totalReadingMinutes={book.totalReadingMinutes || 0}
                onSessionComplete={(minutes: number) => onSessionComplete(book.id, minutes)}
              />
            </div>
          )}
          
          {/* Book Quotes & Notes */}
          <div className="border-t border-surface-border pt-6">
            <BookNotes
              bookId={book.id}
              bookTitle={book.title}
              notes={bookNotes}
              onAddNote={onAddNote}
              onDeleteNote={onDeleteNote}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-surface-border p-2 bg-surface-base">
          <div className="flex gap-1">
            <button 
              onClick={onClose}
              className="p-2 text-text-secondary bg-surface-border rounded-lg hover:bg-surface-card transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            {hasEbook && (
              <button 
                onClick={() => setShowEBookReader(true)}
                className="flex-1 py-1.5 px-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex items-center justify-center gap-1"
              >
                <BookMarked className="w-3 h-3" />
                <span>Read Book</span>
              </button>
            )}
            <button 
              onClick={() => setShowReadOnline(true)}
              className="flex-1 py-1.5 px-2 text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors flex items-center justify-center gap-1"
            >
              <Globe className="w-3 h-3" />
              <span>Find Online</span>
            </button>
            <button 
              onClick={() => onEdit(book)}
              className="p-2 text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Read Online Modal */}
      {showReadOnline && (
        <ReadOnline
          bookTitle={book.title}
          bookAuthor={book.author}
          onClose={() => setShowReadOnline(false)}
        />
      )}

      {/* eBook Reader */}
      {showEBookReader && ebookData && (
        <EBookReader
          fileData={ebookData.data}
          fileType={ebookData.fileType}
          fileName={ebookData.fileName}
          bookTitle={book.title}
          onClose={() => setShowEBookReader(false)}
          onProgressUpdate={(currentPage, totalPages) => {
            onProgressUpdate?.(book.id, currentPage, totalPages);
          }}
        />
      )}
    </div>
  );
});

BookDetailModal.displayName = 'BookDetailModal';
