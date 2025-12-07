/**
 * Vercel Function: /api/health
 * Simple health check endpoint to verify the backend is running
 */

import { VercelResponse } from '@vercel/node';

export default (_req: VercelResponse, res: VercelResponse) => {
  return res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Libris backend is running'
  });
};
