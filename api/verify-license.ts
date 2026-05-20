import { getAdminDb } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  
  try {
    const { email, orderId } = req.body;
    const db = getAdminDb();
    if (!db) {
      console.error("[API] verify-license: Firebase Admin initialization failed.");
      return res.status(500).json({ error: "Database initialization error" });
    }
    if (!email || !orderId) return res.status(400).json({ error: "Missing required fields" });

    const docId = email.toLowerCase().trim();
    const licenseDoc = await db.collection("licenses").doc(docId).get();

    if (licenseDoc.exists) {
      const data = licenseDoc.data();
      // Allow active, on_trial, or subscribed
      const validStatuses = ['active', 'on_trial', 'subscribed', 'past_due'];
      const statusMatches = data && validStatuses.includes(data.status);
      
      // If we provided an orderId, it should match (loose comparison if one is number)
      const orderMatches = !orderId || String(data?.order_id) === String(orderId);

      if (statusMatches && orderMatches) {
        return res.status(200).json({ success: true, license: data });
      }
    }
    res.status(401).json({ error: "Invalid license" });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}
