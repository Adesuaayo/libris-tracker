import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

// Simple in-memory rate limiting
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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { books, userId } = JSON.parse(event.body || '{}');

  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'User ID required' }) };
  }

  if (!Array.isArray(books)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Books array required' }) };
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: `Rate limited. Try again in ${Math.ceil(rateLimit.resetIn / 1000)}s`, resetIn: rateLimit.resetIn })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Gemini API] Missing GEMINI_API_KEY environment variable');
    return { statusCode: 500, body: JSON.stringify({ error: 'Backend configuration error' }) };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    if (books.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ analysis: 'Add some books to get personalized reading insights!' }) };
    }

    const bookSummary = books.map((b: any) => `${b.title} by ${b.author} (${b.genre}, ${b.status})`).join('; ');

    const prompt = `Analyze these reading habits based on: ${bookSummary}. Provide a brief, insightful analysis (under 50 words) about their reading preferences and a suggestion.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const analysis = response.text || 'Unable to analyze reading habits.';
    return { statusCode: 200, body: JSON.stringify({ analysis }) };
  } catch (error: any) {
    console.error('[Gemini API] Analysis Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Failed to analyze reading habits' }) };
  }
};
