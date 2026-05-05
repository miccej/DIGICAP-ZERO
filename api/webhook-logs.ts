import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Local file logging doesn't work on Vercel serverless functions.
  // This endpoint is a placeholder. For live logs, integrate a database.
  return res.json({ 
    message: "Local logs are not supported on Vercel. Please check Vercel dashboard logs or integrate a database for persistent logging.",
    logs: [] 
  });
}
