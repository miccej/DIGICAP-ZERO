import { processWebhook } from "./_shared.ts";

export default async function handler(req: any, res: any) {
  console.log(`[HANDLER] Method=${req.method} Path=${req.url}`);
  
  if (req.method === "POST") {
    try {
      return await processWebhook(req, res);
    } catch (err) {
      console.error("[HANDLER-ERROR]", err);
      // Even if it fails, we should probably return something to LS to stop retries if it's a code error
      if (!res.writableEnded) {
        return res.status(500).json({ error: "handler_failed", details: String(err) });
      }
    }
  }
  
  if (req.method === "GET") {
    return res.status(200).send("DIGICAP WEBHOOK ENDPOINT IS LIVE. USE POST.");
  }
  
  return res.status(405).json({ error: "Method not allowed" });
}
