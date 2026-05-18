import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

export function getAdminDb() {
  try {
    // 1. Resolve Database ID first
    let dbId = process.env.FIRESTORE_DATABASE_ID || "(default)";
    
    let config: any = {};
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (dbId === "(default)" && config.firestoreDatabaseId) {
          dbId = config.firestoreDatabaseId;
        }
      }
    } catch (configErr) {
      console.warn("[FIREBASE] Could not load config file for dbId identification.");
    }

    // 2. Check if already initialized
    let app;
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      // 3. Initialize if needed
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (rawKey) {
        let cleanKey = rawKey.trim();
        if ((cleanKey.startsWith("'") && cleanKey.endsWith("'")) || 
            (cleanKey.startsWith('"') && cleanKey.endsWith('"'))) {
          cleanKey = cleanKey.slice(1, -1);
        }
        if (cleanKey.includes("\\n")) {
          cleanKey = cleanKey.replace(/\\n/g, "\n");
        }

        try {
          const serviceAccount = JSON.parse(cleanKey);
          app = initializeApp({ 
            credential: cert(serviceAccount)
          });
          console.log(`[FIREBASE] Initialized with Service Account. Project=${serviceAccount.project_id}`);
        } catch (parseErr) {
          console.error("[FIREBASE] Parsing service account key failed. Falling back to default.");
          app = initializeApp();
        }
      } else {
        console.log("[FIREBASE] No Service Account key found. Using Application Default Credentials.");
        app = initializeApp();
      }
    }
    
    // 4. Return Firestore with correct dbId targeting
    return dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
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
    let dbStatus = "not_initialized";
    let dbIdUsed = process.env.FIRESTORE_DATABASE_ID || "(default)";

    if (db) {
      dbStatus = "ok";
      // Try to get more info for logging if possible
      try {
        const configPath = path.join(process.cwd(), "firebase-applet-config.json");
        if (fs.existsSync(configPath)) {
           const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
           if (!process.env.FIRESTORE_DATABASE_ID && config.firestoreDatabaseId) {
             dbIdUsed = config.firestoreDatabaseId;
           }
        }
      } catch (e) {}

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
      console.log(`✅ [FIREBASE] Synced license for ${docId} to DB: ${dbIdUsed}`);

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
    return res.status(200).json({ 
      received: true, 
      at: new Date().toISOString(),
      db: dbStatus,
      dbId: dbIdUsed
    });

  } catch (err) {
    console.error("❌ [WEBHOOK ERROR]:", err);
    return res.status(500).json({ error: "Internal processing error", details: String(err) });
  }
}
