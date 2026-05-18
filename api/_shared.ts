import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Load config more robustly for serverless
function getFirebaseConfig() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (err) {
    console.warn("[WARN] Could not load firebase-applet-config.json:", err);
  }
  return {};
}

export function getAdminDb() {
  try {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!rawKey) {
      console.warn("[WARN] FIREBASE_SERVICE_ACCOUNT_KEY not found.");
      return null;
    }

    let cleanKey = rawKey.trim();
    if ((cleanKey.startsWith("'") && cleanKey.endsWith("'")) || 
        (cleanKey.startsWith('"') && cleanKey.endsWith('"'))) {
      cleanKey = cleanKey.slice(1, -1);
    }

    if (cleanKey.includes("\\n")) {
      cleanKey = cleanKey.replace(/\\n/g, "\n");
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(cleanKey);
    } catch (parseErr) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Check Vercel environment variables.");
      throw parseErr;
    }

    if (getApps().length === 0) {
      initializeApp({ 
        credential: cert(serviceAccount)
      });
      console.log("[FIREBASE] Admin SDK Initialized Successfully");
    }
    
    const config = getFirebaseConfig();
    const dbId = process.env.FIRESTORE_DATABASE_ID || config.firestoreDatabaseId || "(default)";
    return getFirestore(dbId);
  } catch (err) {
    console.error("Firebase Admin Init Failed:", err);
    return null;
  }
}

export async function processWebhook(req: any, res: any) {
  console.log("\n[!!!] WEBHOOK PROCESSING START [!!!]");
  
  try {
    const payload = req.body;
    if (!payload || !payload.data) {
      console.error("!!! [WEBHOOK] Empty body received !!!");
      return res.status(400).json({ error: "Malformed payload" });
    }

    const attributes = payload.data.attributes || {};
    const meta = payload.meta || {};
    
    const email = (attributes.user_email || attributes.email || meta.custom_data?.email || "").toLowerCase().trim();
    const event = meta.event_name;
    const status = attributes.status;
    const variant = attributes.variant_name;

    console.log(`[LS-WEBHOOK] Event=${event} Email=${email} Status=${status}`);

    if (!email) {
      console.warn("[WEBHOOK] No email found.");
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
      console.log(`✅ [FIREBASE] Synced license for ${docId}`);

      await db.collection("webhook_logs").add({
        eventName: event,
        email: email,
        status: status,
        timestamp: new Date().toISOString(),
        variant: variant
      });
    } else {
      console.error("[ERROR] Firestore DB not initialized");
    }

    console.log("[WEBHOOK] Success. Sending 200...");
    return res.status(200).json({ received: true, at: new Date().toISOString() });

  } catch (err) {
    console.error("❌ [WEBHOOK ERROR]:", err);
    return res.status(500).json({ error: "Internal processing error", details: String(err) });
  }
}
