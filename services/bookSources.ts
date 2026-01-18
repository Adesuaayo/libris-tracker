// Service to find free online reading sources for books

export interface BookSource {
  id: string;
  name: string;
  type: 'preview' | 'full' | 'sample';
  url: string;
  icon: string;
  description: string;
}

export interface BookSourcesResult {
  sources: BookSource[];
  loading: boolean;
  error?: string;
}

// Build Google Books preview URL
export const getGoogleBooksPreviewUrl = (title: string, author: string): string => {
  const query = encodeURIComponent(`${title} ${author}`);
  return `https://www.google.com/books?q=${query}&btnG=Search+Books`;
};

// Build Open Library read URL
export const getOpenLibraryUrl = (title: string, author: string): string => {
  const query = encodeURIComponent(`${title} ${author}`);
  return `https://openlibrary.org/search?q=${query}&mode=ebooks&has_fulltext=true`;
};

// Build Project Gutenberg search URL
export const getProjectGutenbergUrl = (title: string, author: string): string => {
  const query = encodeURIComponent(`${title} ${author}`);
  return `https://www.gutenberg.org/ebooks/search/?query=${query}`;
};

// Build Internet Archive search URL
export const getInternetArchiveUrl = (title: string, author: string): string => {
  const query = encodeURIComponent(`${title} ${author}`);
  return `https://archive.org/search?query=${query}&and[]=mediatype%3A"texts"`;
};

// Build LibriVox audiobook search URL (for free audiobooks)
export const getLibriVoxUrl = (title: string, author: string): string => {
  const query = encodeURIComponent(`${title} ${author}`);
  return `https://librivox.org/search?q=${query}&search_form=advanced`;
};

// Build Anna's Archive search URL (shadow library)
export const getAnnasArchiveUrl = (title: string, author: string): string => {
  const query = encodeURIComponent(`${title} ${author}`);
  return `https://annas-archive.li/search?q=${query}`;
};

// Get all available reading sources for a book
export const getBookSources = (title: string, author: string): BookSource[] => {
  return [
    {
      id: 'google-books',
      name: 'Google Books',
      type: 'preview',
      url: getGoogleBooksPreviewUrl(title, author),
      icon: '📖',
      description: 'Preview available chapters'
    },
    {
      id: 'open-library',
      name: 'Open Library',
      type: 'full',
      url: getOpenLibraryUrl(title, author),
      icon: '📚',
      description: 'Free to borrow with account'
    },
    {
      id: 'project-gutenberg',
      name: 'Project Gutenberg',
      type: 'full',
      url: getProjectGutenbergUrl(title, author),
      icon: '📜',
      description: 'Free public domain books'
    },
    {
      id: 'internet-archive',
      name: 'Internet Archive',
      type: 'full',
      url: getInternetArchiveUrl(title, author),
      icon: '🏛️',
      description: 'Digital library lending'
    },
    {
      id: 'librivox',
      name: 'LibriVox',
      type: 'full',
      url: getLibriVoxUrl(title, author),
      icon: '🎧',
      description: 'Free audiobooks'
    },
    {
      id: 'annas-archive',
      name: "Anna's Archive",
      type: 'full',
      url: getAnnasArchiveUrl(title, author),
      icon: '📕',
      description: 'Shadow library - find any book'
    }
  ];
};

// Check if Google Books has a preview available (API call)
export const checkGoogleBooksAvailability = async (title: string, author: string): Promise<{
  hasPreview: boolean;
  previewUrl?: string;
  infoUrl?: string;
  thumbnail?: string;
}> => {
  try {
    const query = encodeURIComponent(`${title}+inauthor:${author}`);
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
    );
    
    if (!response.ok) {
      return { hasPreview: false };
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const volumeInfo = book.volumeInfo;
      const accessInfo = book.accessInfo;
      
      return {
        hasPreview: accessInfo?.viewability !== 'NO_PAGES',
        previewUrl: volumeInfo?.previewLink,
        infoUrl: volumeInfo?.infoLink,
        thumbnail: volumeInfo?.imageLinks?.thumbnail
      };
    }
    
    return { hasPreview: false };
  } catch (error) {
    console.error('Error checking Google Books:', error);
    return { hasPreview: false };
  }
};

// Check Open Library for available editions
export const checkOpenLibraryAvailability = async (title: string, author: string): Promise<{
  hasReadable: boolean;
  readUrl?: string;
  borrowUrl?: string;
}> => {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=1&has_fulltext=true`
    );
    
    if (!response.ok) {
      return { hasReadable: false };
    }
    
    const data = await response.json();
    
    if (data.docs && data.docs.length > 0) {
      const book = data.docs[0];
      const key = book.key;
      
      return {
        hasReadable: book.has_fulltext || false,
        readUrl: key ? `https://openlibrary.org${key}` : undefined,
        borrowUrl: book.lending_edition_s 
          ? `https://openlibrary.org/borrow/ia/${book.lending_edition_s}` 
          : undefined
      };
    }
    
    return { hasReadable: false };
  } catch (error) {
    console.error('Error checking Open Library:', error);
    return { hasReadable: false };
  }
};
