import { memo, useState } from 'react';
import { X, BookOpen, Clock, Star, FileText, Tag, Calendar, Globe } from 'lucide-react';
import { Book, BookNote, ReadingStatus } from '../types';
import { Button } from './Button';
import { ReadingTimer } from './ReadingTimer';
import { BookNotes } from './BookNotes';
import { ReadOnline } from './ReadOnline';

interface BookDetailModalProps {
  book: Book;
  notes: BookNote[];
  onClose: () => void;
  onEdit: (book: Book) => void;
  onSessionComplete: (bookId: string, durationMinutes: number) => void;
  onAddNote: (note: Omit<BookNote, 'id' | 'createdAt'>) => void;
  onDeleteNote: (noteId: string) => void;
}

export const BookDetailModal = memo<BookDetailModalProps>(({
  book,
  notes,
  onClose,
  onEdit,
  onSessionComplete,
  onAddNote,
  onDeleteNote
}) => {
  const [showReadOnline, setShowReadOnline] = useState(false);
  const bookNotes = notes.filter((n: BookNote) => n.bookId === book.id);
  
  const formatTotalTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-brand-500 to-purple-600 p-6 text-white">
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
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <FileText className="w-4 h-4" />
              <span>Format: {book.format}</span>
            </div>
            {book.totalReadingMinutes && book.totalReadingMinutes > 0 && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Total: {formatTotalTime(book.totalReadingMinutes)}</span>
              </div>
            )}
            {book.addedAt && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>Added: {new Date(book.addedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          {/* Book Notes/Personal Notes */}
          {book.notes && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Your Notes</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 italic">{book.notes}</p>
            </div>
          )}
          
          {/* Reading Timer - Only for In Progress books */}
          {book.status === ReadingStatus.IN_PROGRESS && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <ReadingTimer
                bookTitle={book.title}
                totalReadingMinutes={book.totalReadingMinutes || 0}
                onSessionComplete={(minutes: number) => onSessionComplete(book.id, minutes)}
              />
            </div>
          )}
          
          {/* Book Quotes & Notes */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
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
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={onClose}
              size="sm"
              className="flex-1"
            >
              Close
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowReadOnline(true)}
              size="sm"
              className="flex-1 flex items-center justify-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs">Read Online</span>
            </Button>
            <Button 
              onClick={() => onEdit(book)}
              size="sm"
              className="flex-1"
            >
              Edit Book
            </Button>
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
    </div>
  );
});

BookDetailModal.displayName = 'BookDetailModal';
