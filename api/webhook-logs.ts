import { getAdminDb } from "./_shared.js";

export default async function handler(req: any, res: any) {
  try {
    const db = getAdminDb();
    if (!db) {
      console.error("[API] Firebase Admin initialization failed - check your FIREBASE_SERVICE_ACCOUNT secret.");
      return res.status(500).json({ error: "Firebase not initialized. Check server logs." });
    }

    const licensesSnapshot = await db.collection("licenses").orderBy("updatedAt", "desc").limit(100).get();
    const licenses = licensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const logsSnapshot = await db.collection("webhook_logs").orderBy("timestamp", "desc").limit(100).get();
    const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ logs, licenses, debug: "ok" });
  } catch (err: any) {
    console.error("[API] Webhook logs error:", err);
    res.status(500).json({ 
      error: "Failed to fetch logs", 
      details: err.message,
      stack: err.stack?.split('\n')[0] 
    });
  }
}
