
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function check() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawKey) {
    console.log("No key found");
    return;
  }
  const serviceAccount = JSON.parse(rawKey);
  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  const db = getFirestore("ai-studio-31075da2-1743-43df-9d8c-2b7636019d40");
  
  console.log("--- LICENSES ---");
  const snap = await db.collection("licenses").get();
  snap.forEach(doc => {
    console.log(doc.id, "=>", JSON.stringify(doc.data(), null, 2));
  });

  console.log("\n--- WEBHOOK LOGS (Recent 10) ---");
  const logsSnap = await db.collection("webhook_logs").limit(10).get();
  logsSnap.forEach(doc => {
    const data = doc.data();
    console.log(doc.id, "=>", data.event_name, data.email, data.timestamp);
  });
}

check();
