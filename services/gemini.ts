import { GoogleGenAI, Type } from "@google/genai";
import { Book, ReadingStatus } from "../types";

// Helper to reliably get environment variables
const getEnv = (key: string) => {
  let val = '';
  // Check both import.meta and process.env to cover all build scenarios
  const meta = import.meta as any;
  if (meta.env && meta.env[key]) {
    val = String(meta.env[key]);
  }
  else if (typeof process !== 'undefined' && process.env && process.env[key]) {
    val = String(process.env[key]);
  }
  return val.trim().replace(/^y"|"$|^"|"/g, '');
};

// Initialize Gemini Client
// Prioritize VITE_GEMINI_API_KEY which allows Vite to see it during the cloud build
const viteKey = getEnv('VITE_GEMINI_API_KEY');
const geminiKey = getEnv('GEMINI_API_KEY');
const standardKey = getEnv('API_KEY');

const apiKey = viteKey || geminiKey || standardKey;

console.log(`[Libris] Gemini Config: Key found? ${!!apiKey}`);

// Initialize with the found key (or a dummy one to prevent crash on load, handled later)
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' }); 

const checkApiKey = (): string | null => {
  if (!apiKey || apiKey.includes('your_actual_key') || apiKey.length < 10) {
    // Return detailed debug info for the phone alert
    return `API Key Error. 
    Debug Info: 
    VITE_GEMINI_API_KEY=${viteKey ? 'OK' : 'MISSING'}
    GEMINI_API_KEY=${geminiKey ? 'OK' : 'MISSING'}
    API_KEY=${standardKey ? 'OK' : 'MISSING'}
    
    Please check GitHub Secrets.`;
  }
  return null;
};

export const getBookRecommendations = async (books: Book[]): Promise<string> => {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  if (books.length === 0) {
    return JSON.stringify([{ title: "No books yet", author: "System", reason: "Please add some books to your library so I can understand your taste!" }]);
  }

  const completedBooks = books
    .filter(b => b.status === ReadingStatus.COMPLETED)
    .map(b => `${b.title} by ${b.author} (Rated: ${b.rating || 'N/A'}/5)`)
    .join(', ');

  const booksToAnalyze = completedBooks || books.map(b => `${b.title} (${b.genre})`).join(', ');

  const prompt = `
    Based on the following books I have read:
    ${booksToAnalyze}

    Please recommend 3 new books I might enjoy. 
    For each book, provide the title, author, and a brief, compelling reason why it fits my taste.
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
    return `Error: ${error.message || "Unknown error occurred"}`;
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
    return "Summary unavailable.";
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
        return `Error: ${error.message || "Unknown error occurred"}`;
    }
}