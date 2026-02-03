import { useState, FormEvent } from 'react';
import { BookNote } from '../types';
import { Button } from './Button';
import { Quote, FileText, Plus, Trash2, X, BookOpen } from 'lucide-react';

interface BookNotesProps {
  bookId: string;
  bookTitle: string;
  notes: BookNote[];
  onAddNote: (note: Omit<BookNote, 'id' | 'createdAt'>) => void;
  onDeleteNote: (noteId: string) => void;
}

export function BookNotes({
  bookId,
  notes,
  onAddNote,
  onDeleteNote
}: BookNotesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [noteType, setNoteType] = useState<'quote' | 'note'>('quote');
  const [content, setContent] = useState('');
  const [page, setPage] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onAddNote({
      bookId,
      type: noteType,
      content: content.trim(),
      page: page ? parseInt(page) : undefined
    });

    setContent('');
    setPage('');
    setShowAddForm(false);
  };

  const quotes = notes.filter((n: BookNote) => n.type === 'quote');
  const personalNotes = notes.filter((n: BookNote) => n.type === 'note');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Notes & Quotes</h3>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="text-sm py-1.5 px-3">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">
                Add {noteType === 'quote' ? 'Quote' : 'Note'}
              </h3>
              <button onClick={() => setShowAddForm(false)} className="p-1">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNoteType('quote')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    noteType === 'quote'
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-base text-text-secondary'
                  }`}
                >
                  <Quote className="w-4 h-4" />
                  Quote
                </button>
                <button
                  type="button"
                  onClick={() => setNoteType('note')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    noteType === 'note'
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-base text-text-secondary'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Note
                </button>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {noteType === 'quote' ? 'Quote text' : 'Your thoughts'}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={noteType === 'quote' 
                    ? '"Enter the quote here..."' 
                    : 'What did you think about this part?'
                  }
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  autoFocus
                />
              </div>

              {/* Page Number */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Page number (optional)
                </label>
                <input
                  type="number"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  placeholder="123"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-border bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!content.trim()} className="flex-1">
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Quote className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No quotes or notes yet</p>
          <p className="text-sm">Save your favorite passages!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Quotes Section */}
          {quotes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Quote className="w-4 h-4" /> Quotes ({quotes.length})
              </h4>
              {quotes.map((note: BookNote) => (
                <NoteCard key={note.id} note={note} onDelete={onDeleteNote} />
              ))}
            </div>
          )}

          {/* Notes Section */}
          {personalNotes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <FileText className="w-4 h-4" /> Notes ({personalNotes.length})
              </h4>
              {personalNotes.map((note: BookNote) => (
                <NoteCard key={note.id} note={note} onDelete={onDeleteNote} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: BookNote;
  onDelete: (id: string) => void;
}

function NoteCard({ note, onDelete }: NoteCardProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div 
      className={`relative p-4 rounded-xl ${
        note.type === 'quote' 
          ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400' 
          : 'bg-surface-base border border-surface-border'
      }`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {note.type === 'quote' ? (
        <p className="italic text-text-secondary">"{note.content}"</p>
      ) : (
        <p className="text-text-secondary">{note.content}</p>
      )}
      
      <div className="flex items-center justify-between mt-2">
        {note.page && (
          <span className="text-xs text-text-muted">
            Page {note.page}
          </span>
        )}
        <span className="text-xs text-text-muted">
          {new Date(note.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(note.id)}
        className={`absolute top-2 right-2 p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 transition-opacity ${
          showDelete ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default BookNotes;
