/**
 * Vercel Function: /api/gemini-analyze
 * Backend handler for Gemini reading habit analysis
 * API key is stored as GEMINI_API_KEY env variable (never exposed to client)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { checkRateLimit } from './rate-limiter';

export default async (req: VercelRequest, res: VercelResponse) => {
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

  if (books.length < 1) {
    return res.status(200).json({ 
      analysis: 'Add at least 1 book to get an analysis of your habits!' 
    });
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Gemini API] Missing GEMINI_API_KEY environment variable');
    return res.status(500).json({ error: 'Backend configuration error' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const bookList = books
      .map((b: any) => `${b.title} (${b.genre}, ${b.status})`)
      .join('; ');

    const prompt = `
      Analyze my reading habits based on this list: ${bookList}. 
      Tell me what kind of reader I am in 50 words or less. Be fun and encouraging.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.status(200).json({ 
      analysis: response.text || 'Analysis unavailable.' 
    });
  } catch (error: any) {
    console.error('[Gemini API] Analysis Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to analyze habits' 
    });
  }
};
