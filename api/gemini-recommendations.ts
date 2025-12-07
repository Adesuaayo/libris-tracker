/**
 * Vercel Function: /api/gemini-recommendations
 * Backend handler for Gemini book recommendations
 * API key is stored as GEMINI_API_KEY env variable (never exposed to client)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { checkRateLimit } from './rate-limiter';

export default async (req: VercelRequest, res: VercelResponse) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { books, userId } = req.body;

  // Validate input
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  if (!Array.isArray(books)) {
    return res.status(400).json({ error: 'Books array required' });
  }

  // Check rate limit
  const rateLimit = checkRateLimit(userId);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset-In', rateLimit.resetIn.toString());

  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: `Rate limited. Try again in ${Math.ceil(rateLimit.resetIn / 1000)}s`,
      resetIn: rateLimit.resetIn
    });
  }

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Gemini API] Missing GEMINI_API_KEY environment variable');
    return res.status(500).json({ error: 'Backend configuration error' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    if (books.length === 0) {
      return res.status(200).json([
        { 
          title: "No books yet", 
          author: "System", 
          reason: "Please add some books to your library so I can understand your taste!" 
        }
      ]);
    }

    const completedBooks = books
      .filter((b: any) => b.status === 'Completed')
      .map((b: any) => `${b.title} by ${b.author} (Rated: ${b.rating || 'N/A'}/5)`)
      .join(', ');

    const booksToAnalyze = completedBooks || books
      .map((b: any) => `${b.title} (${b.genre})`)
      .join(', ');

    const prompt = `
      Based on the following books I have read:
      ${booksToAnalyze}

      Please recommend 3 new books I might enjoy. 
      For each book, provide the title, author, and a brief, compelling reason why it fits my taste.
    `;

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
    return res.status(200).json(recommendations);
  } catch (error: any) {
    console.error('[Gemini API] Recommendation Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate recommendations' 
    });
  }
};
