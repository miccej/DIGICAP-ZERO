import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json";

export function getAdminDb() {
  try {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!rawKey) {
      console.warn("[WARN] FIREBASE_SERVICE_ACCOUNT_KEY not found.");
      return null;
    }

    // Robust handling of the service account key string
    let cleanKey = rawKey.trim();
    
    // Handle cases where the key might be double-quoted or single-quoted in the env var
    if ((cleanKey.startsWith("'") && cleanKey.endsWith("'")) || 
        (cleanKey.startsWith('"') && cleanKey.endsWith('"'))) {
      cleanKey = cleanKey.slice(1, -1);
    }

    // Handle escaped newlines in the private key (common issue on Vercel)
    if (cleanKey.includes("\\n")) {
      cleanKey = cleanKey.replace(/\\n/g, "\n");
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(cleanKey);
    } catch (parseErr) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON.");
      throw parseErr;
    }

    if (getApps().length === 0) {
      initializeApp({ 
        credential: cert(serviceAccount)
      });
      console.log("[FIREBASE] Admin SDK Initialized Successfully");
    }
    
    const dbId = process.env.FIRESTORE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId || "(default)";
    return getFirestore(dbId);
  } catch (err) {
    console.error("Firebase Admin Init Failed:", err);
    return null;
  }
}

export async function processWebhook(req: any, res: any) {
  console.log("\n[!!!] WEBHOOK INCOMING [!!!]");
  
  try {
    const payload = req.body;
    if (!payload || !payload.data) {
      console.error("!!! [WEBHOOK] Empty or malformed body received !!!");
      return res.status(400).json({ error: "Malformed payload" });
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
      return res.status(200).json({ received: true, warning: "no_email" });
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
    } else {
      console.error("[WEBHOOK] Database not initialized.");
    }

    // Return 200 at the VERY END for Vercel
    return res.status(200).json({ received: true, at: new Date().toISOString() });

  } catch (err) {
    console.error("❌ [WEBHOOK PROCESSING ERROR]:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
