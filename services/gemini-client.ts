/**
 * Frontend service for calling backend Gemini API
 * All calls go through your Vercel backend, never directly to Google
 * This keeps your API key secure on the server
 */

import { Book } from '../types';
import { supabase } from './supabase';

// Get the base URL for the backend API
const getBackendUrl = (): string => {
  // In production (deployed on Vercel), this will auto-resolve to your domain
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000'; // Local dev: Vite dev server
  }
  // Production: same domain as frontend
  return window.location.origin;
};

/**
 * Get current user ID for rate limiting
 */
const getUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return user.id;
};

/**
 * Get book recommendations from backend
 */
export const getBookRecommendations = async (books: Book[]): Promise<any[]> => {
  try {
    const userId = await getUserId();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/gemini-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ books, userId }),
    });

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`${data.error} Please try again in a moment.`);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get recommendations');
    }

    return await response.json();
  } catch (error: any) {
    console.error('[Frontend] Recommendation Error:', error);
    throw error;
  }
};

/**
 * Get book summary from backend
 */
export const getBookSummary = async (title: string, author: string): Promise<string> => {
  try {
    const userId = await getUserId();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/gemini-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, author, userId }),
    });

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`${data.error} Please try again in a moment.`);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate summary');
    }

    const data = await response.json();
    return data.summary;
  } catch (error: any) {
    console.error('[Frontend] Summary Error:', error);
    throw error;
  }
};

/**
 * Analyze reading habits from backend
 */
export const analyzeReadingHabits = async (books: Book[]): Promise<string> => {
  try {
    const userId = await getUserId();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/gemini-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ books, userId }),
    });

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`${data.error} Please try again in a moment.`);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze habits');
    }

    const data = await response.json();
    return data.analysis;
  } catch (error: any) {
    console.error('[Frontend] Analysis Error:', error);
    throw error;
  }
};

/**
 * Check backend health (useful for debugging)
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/health`);
    return response.ok;
  } catch (error) {
    console.warn('[Frontend] Backend health check failed:', error);
    return false;
  }
};
