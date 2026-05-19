import { getAdminDb } from "./_shared.ts";

export default async function handler(req: any, res: any) {
  const db = getAdminDb();
  res.status(200).json({ 
    status: "online", 
    version: "18.2-VERCEL-NATIVE",
    firebase: db ? "initialized" : "failed",
    time: new Date().toISOString()
  });
}
