/**
 * Vercel Function: /api/gemini-summary
 * Backend handler for Gemini book summaries
 * API key is stored as GEMINI_API_KEY env variable (never exposed to client)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { checkRateLimit } from './rate-limiter';

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, author, userId } = req.body;

  // Validate input
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author required' });
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

    const prompt = `Write a concise 2-sentence hook/summary for the book "${title}" by ${author}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.status(200).json({ 
      summary: response.text || 'No summary available.' 
    });
  } catch (error: any) {
    console.error('[Gemini API] Summary Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate summary' 
    });
  }
};
