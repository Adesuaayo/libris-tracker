import { useState } from 'react';
import { BookCollection, Book, COLLECTION_COLORS, COLLECTION_ICONS } from '../types';
import { 
  FolderPlus, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  X, 
  Check,
  BookOpen,
  Folder
} from 'lucide-react';

interface BookCollectionsProps {
  collections: BookCollection[];
  books: Book[];
  onCreateCollection: (collection: Omit<BookCollection, 'id' | 'createdAt' | 'bookIds'>) => void;
  onUpdateCollection: (collection: BookCollection) => void;
  onDeleteCollection: (id: string) => void;
  onViewCollection: (collection: BookCollection) => void;
}

export function BookCollections({ 
  collections, 
  books,
  onCreateCollection, 
  onUpdateCollection, 
  onDeleteCollection,
  onViewCollection
}: BookCollectionsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [newIcon, setNewIcon] = useState('📚');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const getBookCountForCollection = (collection: BookCollection) => {
    return (collection.bookIds || []).filter(id => books.some(b => b.id === id)).length;
  };

  const getCollectionPreviewBooks = (collection: BookCollection) => {
    return (collection.bookIds || [])
      .map(id => books.find(b => b.id === id))
      .filter((b): b is Book => !!b)
      .slice(0, 3);
  };

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateCollection({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
        icon: newIcon,
      });
      setNewName('');
      setNewDescription('');
      setNewColor('blue');
      setNewIcon('📚');
      setIsCreating(false);
    }
  };

  const handleStartEdit = (collection: BookCollection) => {
    setEditingId(collection.id);
    setNewName(collection.name);
    setNewDescription(collection.description || '');
    setNewColor(collection.color);
    setNewIcon(collection.icon);
  };

  const handleSaveEdit = (collection: BookCollection) => {
    onUpdateCollection({
      ...collection,
      name: newName.trim() || collection.name,
      description: newDescription.trim() || undefined,
      color: newColor,
      icon: newIcon,
    });
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setNewColor('blue');
    setNewIcon('📚');
    setShowIconPicker(false);
  };

  const getColorClass = (color: string, variant: 'bg' | 'text' | 'border' = 'bg') => {
    const colorMap: Record<string, Record<string, string>> = {
      rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-700' },
      pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-300 dark:border-pink-700' },
      fuchsia: { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-600 dark:text-fuchsia-400', border: 'border-fuchsia-300 dark:border-fuchsia-700' },
      purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700' },
      violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-300 dark:border-violet-700' },
      indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-700' },
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
      sky: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-300 dark:border-sky-700' },
      cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-300 dark:border-cyan-700' },
      teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-300 dark:border-teal-700' },
      emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700' },
      green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
      lime: { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-600 dark:text-lime-400', border: 'border-lime-300 dark:border-lime-700' },
      yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700' },
      amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700' },
      orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
      red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
      slate: { bg: 'bg-slate-100 dark:bg-slate-700/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-600' },
    };
    return colorMap[color]?.[variant] || colorMap.blue[variant];
  };

  return (
    <div className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Folder className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Collections</h2>
              <p className="text-sm text-text-muted">Organize your library</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
          >
            <FolderPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Create New Collection Form */}
        {isCreating && (
          <div className="bg-surface-base rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-10 h-10 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center text-xl hover:bg-surface-base transition-colors"
              >
                {newIcon}
              </button>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                className="flex-1 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
                autoFocus
              />
            </div>

            {showIconPicker && (
              <div className="grid grid-cols-8 gap-2 p-2 bg-surface-card rounded-lg border border-surface-border">
                {COLLECTION_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => { setNewIcon(icon); setShowIconPicker(false); }}
                    className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-surface-base transition-colors ${newIcon === icon ? 'bg-violet-100 dark:bg-violet-900/30' : ''}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />

            <div>
              <p className="text-xs text-text-muted mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_COLORS.slice(0, 12).map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-6 h-6 rounded-full ${getColorClass(color, 'bg')} ${newColor === color ? 'ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-surface-card' : ''} transition-all`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setIsCreating(false); resetForm(); }}
                className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-elevated rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Collection List */}
        {collections.length === 0 && !isCreating ? (
          <div className="text-center py-8">
            <Folder className="w-12 h-12 mx-auto text-text-muted mb-3" />
            <p className="text-text-muted mb-2">No collections yet</p>
            <button
              onClick={() => setIsCreating(true)}
              className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              Create your first collection
            </button>
          </div>
        ) : (
          collections.map(collection => {
            const isEditing = editingId === collection.id;
            const bookCount = getBookCountForCollection(collection);
            const previewBooks = getCollectionPreviewBooks(collection);

            if (isEditing) {
              return (
                <div key={collection.id} className="bg-surface-base rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-10 h-10 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center text-xl"
                    >
                      {newIcon}
                    </button>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {showIconPicker && (
                    <div className="grid grid-cols-8 gap-2 p-2 bg-surface-card rounded-lg border border-surface-border">
                      {COLLECTION_ICONS.map(icon => (
                        <button
                          key={icon}
                          onClick={() => { setNewIcon(icon); setShowIconPicker(false); }}
                          className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-surface-base ${newIcon === icon ? 'bg-violet-100 dark:bg-violet-900/30' : ''}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />

                  <div className="flex flex-wrap gap-2">
                    {COLLECTION_COLORS.slice(0, 12).map(color => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className={`w-6 h-6 rounded-full ${getColorClass(color, 'bg')} ${newColor === color ? 'ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-surface-card' : ''}`}
                      />
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditingId(null); resetForm(); }}
                      className="p-2 text-text-muted hover:bg-surface-elevated rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSaveEdit(collection)}
                      className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={collection.id}
                className={`rounded-xl border ${getColorClass(collection.color, 'border')} ${getColorClass(collection.color, 'bg')} p-4 transition-all hover:shadow-md cursor-pointer`}
                onClick={() => onViewCollection(collection)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{collection.icon}</span>
                    <div>
                      <h3 className={`font-semibold ${getColorClass(collection.color, 'text')}`}>
                        {collection.name}
                      </h3>
                      {collection.description && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {collection.description}
                        </p>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        {bookCount} {bookCount === 1 ? 'book' : 'books'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {!collection.isDefault && (
                      <>
                        <button
                          onClick={() => handleStartEdit(collection)}
                          className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-white/50 dark:hover:bg-surface-elevated rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteCollection(collection.id)}
                          className="p-1.5 text-text-muted hover:text-red-500 hover:bg-white/50 dark:hover:bg-surface-elevated rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <ChevronRight className={`w-5 h-5 ${getColorClass(collection.color, 'text')} opacity-50`} />
                  </div>
                </div>

                {/* Book Preview */}
                {previewBooks.length > 0 && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-surface-border/50">
                    {previewBooks.map(book => (
                      <div key={book.id} className="w-10 h-14 rounded overflow-hidden bg-surface-card shadow-sm">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-text-muted" />
                          </div>
                        )}
                      </div>
                    ))}
                    {bookCount > 3 && (
                      <div className="w-10 h-14 rounded bg-surface-base flex items-center justify-center">
                        <span className="text-xs text-text-muted">+{bookCount - 3}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
