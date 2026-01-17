import { GoogleGenAI, Type } from "@google/genai";
import { Book, ReadingStatus, ReadingPreferences } from "../types";
import { ENV_CONFIG } from "../src/config";

// Get the API key from the generated config (set at build time)
const apiKey = ENV_CONFIG.VITE_GEMINI_API_KEY || '';

console.log(`[Libris] Gemini Config: Key loaded, Length: ${apiKey?.length}`);

// Initialize with the found key (or a dummy one to prevent crash on load, handled later)
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' }); 

const checkApiKey = (): string | null => {
  if (!apiKey || apiKey.includes('your_actual_key') || apiKey.length < 10) {
    return `API Key Error. VITE_GEMINI_API_KEY is missing or invalid. Please check GitHub Secrets and ensure the workflow maps GEMINI_API_KEY → VITE_GEMINI_API_KEY.`;
  }
  return null;
};

// Helper to format errors in a user-friendly way
const formatError = (error: any): string => {
  const msg = error?.message || JSON.stringify(error) || '';
  
  // Rate limit / quota exceeded
  if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate')) {
    // Try to extract retry time
    const retryMatch = msg.match(/retry in (\d+)/i) || msg.match(/retryDelay.*?(\d+)/i);
    const waitTime = retryMatch ? Math.ceil(parseInt(retryMatch[1])) : 60;
    return `⏳ You're using AI features too quickly! The free tier allows 5 requests per minute. Please wait about ${waitTime} seconds and try again.`;
  }
  
  // Network errors
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
    return `🌐 Connection issue. Please check your internet and try again.`;
  }
  
  // API key issues
  if (msg.includes('API key') || msg.includes('unauthorized') || msg.includes('401')) {
    return `🔑 API authentication error. Please contact support.`;
  }
  
  // Generic fallback
  return `Something went wrong. Please try again in a moment.`;
};

export const getBookRecommendations = async (books: Book[], preferences?: ReadingPreferences): Promise<string> => {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  // Build preference context
  let preferenceContext = '';
  if (preferences && preferences.hasCompletedOnboarding) {
    const genresList = preferences.favoriteGenres.length > 0 
      ? `My favorite genres are: ${preferences.favoriteGenres.join(', ')}.` 
      : '';
    const moodsList = preferences.preferredMoods.length > 0 
      ? `I prefer books that feel: ${preferences.preferredMoods.join(', ')}.` 
      : '';
    const paceContext = preferences.readingPace === 'casual' 
      ? 'I read casually (1-5 books/year), so recommend accessible, engaging books.'
      : preferences.readingPace === 'avid' 
        ? 'I\'m an avid reader (20+ books/year), so feel free to recommend challenging or longer reads.'
        : 'I read regularly throughout the year.';
    const lengthPref = preferences.bookLengthPreference !== 'any' 
      ? `I prefer ${preferences.bookLengthPreference} books.` 
      : '';
    
    preferenceContext = `
    MY READING PREFERENCES:
    ${genresList}
    ${moodsList}
    ${paceContext}
    ${lengthPref}
    `;
  }

  if (books.length === 0 && !preferences?.hasCompletedOnboarding) {
    return JSON.stringify([{ title: "No books yet", author: "System", reason: "Please add some books to your library so I can understand your taste!" }]);
  }

  const completedBooks = books
    .filter(b => b.status === ReadingStatus.COMPLETED)
    .map(b => `${b.title} by ${b.author} (Genre: ${b.genre}, Rated: ${b.rating || 'N/A'}/5)`)
    .join(', ');

  const booksToAnalyze = completedBooks || books.map(b => `${b.title} (${b.genre})`).join(', ');

  const prompt = `
    ${preferenceContext}
    
    ${books.length > 0 ? `Based on the following books I have read: ${booksToAnalyze}` : 'I haven\'t added books yet, but use my preferences above.'}

    Please recommend 3 new books I might enjoy. 
    For each book, provide the title, author, and a brief, compelling reason why it fits my taste.
    Make sure to consider my genre preferences and reading mood preferences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
          },
        },
      }
    });
    return response.text || "[]";
  } catch (error: any) {
    console.error("Gemini Recommendation Error:", error);
    return formatError(error);
  }
};

export const getBookSummary = async (title: string, author: string): Promise<string> => {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  const prompt = `Write a concise 2-sentence hook/summary for the book "${title}" by ${author}.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No summary available.";
  } catch (error: any) {
    console.error("Gemini Summary Error:", error);
    return formatError(error);
  }
};

export const analyzeReadingHabits = async (books: Book[]): Promise<string> => {
    const keyError = checkApiKey();
    if (keyError) return keyError;

    if (books.length < 1) return "Add at least 1 book to get an analysis of your habits!";

    const bookList = books.map(b => `${b.title} (${b.genre}, ${b.status})`).join('; ');
    
    const prompt = `
        Analyze my reading habits based on this list: ${bookList}. 
        Tell me what kind of reader I am in 50 words or less. Be fun and encouraging.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Analysis unavailable.";
    } catch (error: any) {
        console.error("Gemini Analytics Error:", error);
        return formatError(error);
    }
}