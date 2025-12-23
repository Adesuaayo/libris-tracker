import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 3;
const WINDOW_MS = 60000;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: WINDOW_MS };
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: userLimit.resetTime - now };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count, resetIn: userLimit.resetTime - now };
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Libris backend is running on Render'
  });
});

// Book recommendations
app.post('/api/gemini-recommendations', async (req, res) => {
  const { books, userId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  if (!Array.isArray(books)) {
    return res.status(400).json({ error: 'Books array required' });
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: `Rate limited. Try again in ${Math.ceil(rateLimit.resetIn / 1000)}s`, 
      resetIn: rateLimit.resetIn 
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Gemini API] Missing GEMINI_API_KEY');
    return res.status(500).json({ error: 'Backend configuration error' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    if (books.length === 0) {
      return res.json([{ 
        title: "No books yet", 
        author: "System", 
        reason: "Please add some books to your library so I can understand your taste!" 
      }]);
    }

    const completedBooks = books
      .filter((b: any) => b.status === 'Completed')
      .map((b: any) => `${b.title} by ${b.author} (Rated: ${b.rating || 'N/A'}/5)`)
      .join(', ');

    const booksToAnalyze = completedBooks || books.map((b: any) => `${b.title} (${b.genre})`).join(', ');

    const prompt = `Based on the following books I have read: ${booksToAnalyze}. Please recommend 3 new books I might enjoy. For each book, provide the title, author, and a brief, compelling reason why it fits my taste.`;

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

    const recommendations = JSON.parse(response.text || '[]');
    res.json(recommendations);
  } catch (error: any) {
    console.error('[Gemini API] Recommendation Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate recommendations' });
  }
});

// Book summary
app.post('/api/gemini-summary', async (req, res) => {
  const { title, author, userId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author required' });
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: `Rate limited. Try again in ${Math.ceil(rateLimit.resetIn / 1000)}s`, 
      resetIn: rateLimit.resetIn 
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Backend configuration error' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Provide a brief, engaging 2-sentence summary of the book "${title}" by ${author}. Focus on the main theme and why readers enjoy it.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ summary: response.text || 'No summary available.' });
  } catch (error: any) {
    console.error('[Gemini API] Summary Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

// Reading analysis
app.post('/api/gemini-analyze', async (req, res) => {
  const { books, userId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  if (!Array.isArray(books)) {
    return res.status(400).json({ error: 'Books array required' });
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: `Rate limited. Try again in ${Math.ceil(rateLimit.resetIn / 1000)}s`, 
      resetIn: rateLimit.resetIn 
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Backend configuration error' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    if (books.length === 0) {
      return res.json({ analysis: 'Add some books to get personalized reading insights!' });
    }

    const bookSummary = books.map((b: any) => `${b.title} by ${b.author} (${b.genre}, ${b.status})`).join('; ');
    const prompt = `Analyze these reading habits based on: ${bookSummary}. Provide a brief, insightful analysis (under 50 words) about their reading preferences and a suggestion.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ analysis: response.text || 'Unable to analyze reading habits.' });
  } catch (error: any) {
    console.error('[Gemini API] Analysis Error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze reading habits' });
  }
});

// Serve static files in production
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
