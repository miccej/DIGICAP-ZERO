import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

export function getAdminDb() {
  try {
    // 1. Resolve Database ID
    let dbId = process.env.FIRESTORE_DATABASE_ID || "(default)";
    if (dbId === "default") dbId = "(default)";
    
    // Safely attempt to read dbId from config if env var is default
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (dbId === "(default)" && config.firestoreDatabaseId) {
          dbId = config.firestoreDatabaseId;
        }
      }
    } catch (configErr) {
      // Ignore config read errors, use what we have
    }

    // 2. Resolve App Initialization
    let app;
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (getApps().length > 0) {
      app = getApps()[0];
      // If we have a key but the existing app is using a different project, we might need a named app
      // But typically on Cloud Run/Vercel, we can just use the default app if it was initialized correctly
    }
    
    if (!app) {
      if (rawKey) {
        let cleanKey = rawKey.trim();
        
        // Robust JSON detection: Find the first '{' and last '}'
        const firstBrace = cleanKey.indexOf("{");
        const lastBrace = cleanKey.lastIndexOf("}");
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanKey = cleanKey.substring(firstBrace, lastBrace + 1);
        }

        // Handle escaped newlines (common in some env editors)
        if (cleanKey.includes("\\n")) {
          cleanKey = cleanKey.replace(/\\n/g, "\n");
        }

        try {
          const serviceAccount = JSON.parse(cleanKey);
          app = initializeApp({ 
            credential: cert(serviceAccount)
          });
          console.log(`[FIREBASE] Init SUCCESS. Project=${serviceAccount.project_id} DB=${dbId}`);
        } catch (parseErr: any) {
          console.error("[FIREBASE] JSON Parse failed for Service Account Secret:", parseErr.message);
          console.log("[FIREBASE] Key length received:", cleanKey.length);
          console.log("[FIREBASE] Key starts with:", cleanKey.substring(0, 20));
          app = initializeApp();
        }
      } else {
        console.log("[FIREBASE] No service account key. Using application default credentials.");
        app = initializeApp();
      }
    }
    
    if (!app) {
      console.error("[FIREBASE] App failed to initialize.");
      return null;
    }

    // 3. Return Firestore
    // Note: getFirestore(app, dbId) works in admin v11+
    // If dbId is "(default)", use the default database
    return (!dbId || dbId === "(default)") ? getFirestore(app) : getFirestore(app, dbId);
  } catch (err) {
    console.error("[FIREBASE] FATAL INITIALIZATION ERROR:", err);
    return null;
  }
}

export async function processWebhook(req: any, res: any) {
  const now = new Date().toISOString();
  console.log(`\n[!!!] WEBHOOK START [${now}] [!!!]`);
  
  try {
    const payload = req.body;
    if (!payload || !payload.data) {
      console.error("!!! [WEBHOOK] Invalid payload body !!!");
      return res.status(400).json({ error: "Malformed payload", received: false });
    }

    const { data, meta } = payload;
    const attributes = data.attributes || {};
    const eventName = meta?.event_name || "unknown";
    
    // Fallback email resolution
    const email = (
      attributes.user_email || 
      attributes.email || 
      meta?.custom_data?.email || 
      ""
    ).toLowerCase().trim();

    console.log(`[WEBHOOK] Event=${eventName} Email=${email} Status=${attributes.status}`);

    if (!email) {
      console.warn("[WEBHOOK] No email found in payload. Skipping DB update.");
      return res.status(200).json({ received: true, info: "no_email_in_payload" });
    }

    const db = getAdminDb();
    
    if (db) {
      const docId = email;
      const status = attributes.status || "active";
      const variant = attributes.variant_name || "Digicap STAT";

      // Sync to licenses collection
      await db.collection("licenses").doc(docId).set({
        email: docId,
        status: status,
        variant_name: variant,
        updatedAt: now,
        last_event: eventName,
        order_id: attributes.order_id || null,
        license_key: attributes.license_key || null,
        customer_id: attributes.customer_id || null
      }, { merge: true });

      // Log to history
      await db.collection("webhook_logs").add({
        eventName,
        email,
        status,
        timestamp: now,
        variant
      });

      console.log(`✅ [WEBHOOK] Successfully processed for ${email}`);
      return res.status(200).json({ 
        received: true, 
        processed: true,
        email: email,
        at: now
      });
    } else {
      console.error("❌ [WEBHOOK] Database not initialized. Cannot save.");
      return res.status(200).json({ 
        received: true, 
        processed: false,
        error: "db_not_initialized",
        at: now
      });
    }

  } catch (err: any) {
    console.error("❌ [WEBHOOK FATAL ERROR]:", err);
    // Still return 200 to LS but tell them it failed internally
    return res.status(200).json({ 
      received: true, 
      processed: false, 
      error: "internal_error",
      details: err.message,
      at: now 
    });
  }
}
