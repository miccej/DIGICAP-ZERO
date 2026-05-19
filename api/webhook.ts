import { processWebhook } from "./_shared.ts";

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    return processWebhook(req, res);
  }
  return res.status(200).send("Endpoint active.");
}
