import { getAdminDb } from "./_shared";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  
  try {
    const { email, orderId } = req.body;
    const db = getAdminDb();
    if (!db || !email || !orderId) return res.status(400).json({ error: "Missing data" });

    const docId = email.toLowerCase().trim();
    const licenseDoc = await db.collection("licenses").doc(docId).get();

    if (licenseDoc.exists) {
      const data = licenseDoc.data();
      // Allow active, on_trial, or subscribed
      const validStatuses = ['active', 'on_trial', 'subscribed', 'past_due'];
      if (data && validStatuses.includes(data.status)) {
        return res.status(200).json({ success: true, license: data });
      }
    }
    res.status(401).json({ error: "Invalid license" });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}
