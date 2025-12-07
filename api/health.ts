/**
 * Vercel Function: /api/health
 * Simple health check endpoint to verify the backend is running
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default (req: VercelRequest, res: VercelResponse) => {
  return res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Libris backend is running'
  });
};
