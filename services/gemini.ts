import { GoogleGenAI, Type } from "@google/genai";
import { Book, ReadingStatus } from "../types";
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