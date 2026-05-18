import { getAdminDb } from "./_shared.js";

export default async function handler(req: any, res: any) {
  try {
    const db = getAdminDb();
    if (!db) return res.status(500).json({ error: "Firebase not initialized" });

    const licensesSnapshot = await db.collection("licenses").orderBy("updatedAt", "desc").limit(100).get();
    const licenses = licensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const logsSnapshot = await db.collection("webhook_logs").orderBy("timestamp", "desc").limit(100).get();
    const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ logs, licenses });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
}
