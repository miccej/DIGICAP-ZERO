import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json";

export function getAdminDb() {
  try {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!rawKey) {
      console.warn("[WARN] FIREBASE_SERVICE_ACCOUNT_KEY not found in environment.");
      return null;
    }

    let cleanKey = rawKey.trim();
    if (cleanKey.startsWith("'") || cleanKey.startsWith('"')) {
      cleanKey = cleanKey.slice(1, -1);
    }

    const serviceAccount = JSON.parse(cleanKey);

    if (getApps().length === 0) {
      initializeApp({ 
        credential: cert(serviceAccount)
      });
      console.log("[FIREBASE] Admin SDK Initialized Successfully");
    }
    return getFirestore(firebaseConfig.firestoreDatabaseId || "(default)");
  } catch (err) {
    console.error("Firebase Admin Init Failed:", err);
    return null;
  }
}

export async function processWebhook(req: any, res: any) {
  console.log("\n[!!!] WEBHOOK INCOMING [!!!]");
  
  // Return 200 immediately to LS
  res.status(200).json({ received: true, at: new Date().toISOString() });

  try {
    const payload = req.body;
    if (!payload || !payload.data) {
      console.error("!!! [WEBHOOK] Empty or malformed body received !!!");
      return;
    }

    const attributes = payload.data.attributes || {};
    const meta = payload.meta || {};
    
    // Support multiple places for email
    const email = (attributes.user_email || attributes.email || meta.custom_data?.email || "").toLowerCase().trim();
    const event = meta.event_name;
    const status = attributes.status;
    const variant = attributes.variant_name;

    console.log(`[LS-WEBHOOK] Event=${event} Email=${email} Status=${status}`);

    if (!email) {
      console.error("[WEBHOOK] No email found in payload.");
      return;
    }

    const db = getAdminDb();
    if (db) {
      const docId = email;
      const updateData: any = {
        email: docId,
        status: status || "active",
        variant_name: variant || "Digicap STAT",
        updatedAt: new Date().toISOString(),
        last_event: event,
        order_id: attributes.order_id || null,
        license_key: attributes.license_key || null,
        customer_id: attributes.customer_id || null,
        full_payload_received: true
      };
      
      await db.collection("licenses").doc(docId).set(updateData, { merge: true });
      console.log(`✅ [FIREBASE] Successfully synced license for ${docId}`);

      await db.collection("webhook_logs").add({
        eventName: event,
        email: email,
        status: status,
        timestamp: new Date().toISOString(),
        variant: variant
      });
    }
  } catch (err) {
    console.error("❌ [WEBHOOK PROCESSING ERROR]:", err);
  }
}
