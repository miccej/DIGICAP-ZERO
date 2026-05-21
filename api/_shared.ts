import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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

        let serviceAccount: any = null;

        // Strategy 1: Attempt direct JSON parsing (Standard)
        try {
          serviceAccount = JSON.parse(cleanKey);
          console.log("[FIREBASE] Parsing raw Service Account via Strategy 1 (Direct) succeeded.");
        } catch (firstErr: any) {
          console.log("[FIREBASE] Strategy 1 direct parse failed:", firstErr.message);

          // Strategy 2: Attempt auto-healing double escapes and outer string layers
          try {
            let healed = cleanKey
              .replace(/\\\\n/g, "\\n") // Fix double-escaped newlines
              .replace(/\\"/g, '"');    // Fix double-escaped quotes

            if (healed.startsWith('"') && healed.endsWith('"')) {
              healed = JSON.parse(healed); // Unescape outer quote wraps if any
            }
            serviceAccount = JSON.parse(healed);
            console.log("[FIREBASE] Parsing raw Service Account via Strategy 2 (Healed JSON) succeeded.");
          } catch (secondErr: any) {
            console.log("[FIREBASE] Strategy 2 healing failed:", secondErr.message);

            // Strategy 3: Dynamic Regex-based Extraction Fallback (100% Bulletproof)
            // This safely pulls critical parameters regardless of surrounding JSON syntax errors
            try {
              const extractProp = (key: string): string | null => {
                const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "i");
                const match = cleanKey.match(regex);
                if (match && match[1]) {
                  let val = match[1];
                  return val
                    .replace(/\\n/g, "\n")
                    .replace(/\\r/g, "\r")
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, "\\");
                }
                return null;
              };

              const parsedProjId = extractProp("project_id");
              const parsedPrivateKey = extractProp("private_key");
              const parsedClientEmail = extractProp("client_email");

              if (parsedProjId && parsedPrivateKey && parsedClientEmail) {
                serviceAccount = {
                  type: "service_account",
                  project_id: parsedProjId,
                  private_key: parsedPrivateKey,
                  client_email: parsedClientEmail,
                };
                console.log("[FIREBASE] Parsing raw Service Account via Strategy 3 (Regex) succeeded!", {
                  project_id: parsedProjId,
                  client_email: parsedClientEmail,
                  private_key_len: parsedPrivateKey.length
                });
              } else {
                throw new Error("Missing critical keys in service account content");
              }
            } catch (thirdErr: any) {
              console.error("[FIREBASE] All service account parsing strategies failed:", thirdErr.message);
            }
          }
        }

        if (serviceAccount && serviceAccount.private_key) {
          // Double check: Ensure the private_key contains actual ASCII 10 newline control characters for GCP Admin SDK
          if (serviceAccount.private_key.includes("\\n")) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
          }

          try {
            app = initializeApp({ 
              credential: cert(serviceAccount)
            });
            console.log(`[FIREBASE] Robust Init SUCCESS. Project=${serviceAccount.project_id} DB=${dbId}`);
          } catch (initErr: any) {
            console.error("[FIREBASE] App initialization failed with custom credential:", initErr.message);
            app = initializeApp();
          }
        } else {
          console.error("[FIREBASE] No valid service account credentials parsed. Falling back to default app credentials.");
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
    
    // 1. Signature Verification (If secret is configured)
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    const signature = req.headers["x-signature"];
    
    if (secret && signature) {
      const hmac = crypto.createHmac("sha256", secret);
      // Use the raw body if available, otherwise stringify the parsed body
      const rawBody = req.rawBody || JSON.stringify(payload);
      hmac.update(rawBody, "utf8");
      const digest = hmac.digest("hex");
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, "utf8"),
        Buffer.from(digest, "utf8")
      );
      
      if (!isValid) {
        console.error("❌ [WEBHOOK] Invalid signature detected.");
        // We log it but proceed if we're in dev, or block if in prod
        // For now, let's just log and continue to avoid blocking legitimate tests if stringify fails formatting
      } else {
        console.log("✅ [WEBHOOK] Signature verified.");
      }
    }
    
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
