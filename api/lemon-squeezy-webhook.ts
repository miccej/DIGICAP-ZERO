import { processWebhook } from "./_shared";

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    return processWebhook(req, res);
  }
  if (req.method === "GET") {
    return res.status(200).send("DIGICAP WEBHOOK ENDPOINT IS LIVE. USE POST.");
  }
  return res.status(405).json({ error: "Method not allowed" });
}
