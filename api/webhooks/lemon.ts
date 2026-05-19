import { processWebhook } from "../_shared.ts";

/**
 * Lemon Squeezy Webhook Handler
 * This file is for Vercel file-based routing.
 * The actual logic resides in _shared.ts to keep it DRY and consistent with AI Studio's local server.
 */
export default async function handler(req: any, res: any) {
  console.log(`[VERCEL-WEBHOOK] ${req.method} /api/webhooks/lemon`);
  
  if (req.method !== "POST") {
    if (req.method === "GET") {
      return res.status(200).send("DIGICAP LEMON WEBHOOK IS LIVE. USE POST.");
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    return await processWebhook(req, res);
  } catch (err: any) {
    console.error("[VERCEL-WEBHOOK-ERROR]", err);
    return res.status(500).json({ error: "internal_server_error", details: err.message });
  }
}
