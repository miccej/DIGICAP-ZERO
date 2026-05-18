import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import SmeeClient from "smee-client";

import firebaseConfig from "./firebase-applet-config.json";

// --- FIREBASE ADMIN SETUP ---
function getAdminDb() {
  try {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!rawKey) {
      console.warn("[WARN] FIREBASE_SERVICE_ACCOUNT_KEY not found in environment.");
      return null;
    }

    const serviceAccount = JSON.parse(rawKey);

    if (getApps().length === 0) {
      initializeApp({ 
        credential: cert(serviceAccount)
      });
      console.log("[FIREBASE] Admin SDK Initialized Successfully");
    }
    // Specifiera databaseId från konfigen
    return getFirestore(firebaseConfig.firestoreDatabaseId || "(default)");
  } catch (err) {
    console.error("Firebase Admin Init Failed:", err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`[BOOT] DigiCap v10.0 STARTING...`);

  // 1. Middlewares
  app.use(cors());
  app.use(express.json());

  // 2. LOGGING
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // --- 3. API RUTTER ---
  console.log("[INIT] Setting up API Routes...");

  // Health check
  app.get(["/api/health", "/api/health/"], (req, res) => {
    res.status(200).json({ 
      status: "online", 
      version: "16.0-ADMIN-READY",
      node_env: process.env.NODE_ENV,
      secret_status: !!(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT),
      time: new Date().toISOString()
    });
  });

  // Snabb-test för dig
  app.get("/api/ping", (req, res) => {
    res.send("PONG - Server v15.0 GOLD is alive at " + new Date().toISOString());
  });

  // Webhook: Här landar Lemon Squeezy
  app.post(["/api/webhook", "/api/webhook/", "/api/lemon-squeezy-webhook", "/api/webhooks/lemon"], async (req, res) => {
    console.log("\n[!!!] WEBHOOK INCOMING [!!!]");
    console.log("[HEADERS]", JSON.stringify(req.headers, null, 2));
    
    // Skicka svar direkt för att undvika timeout hos Lemon Squeezy
    res.status(200).json({ 
      received: true, 
      at: new Date().toISOString()
    });

    try {
      const payload = req.body;
      if (!payload || !payload.data) {
        console.error("!!! [WEBHOOK] Empty or malformed body received !!!");
        return;
      }

      const attributes = payload.data.attributes || {};
      const meta = payload.meta || {};
      
      const email = (attributes.user_email || attributes.email || "").toLowerCase().trim();
      const event = meta.event_name;
      const status = attributes.status;
      const variant = attributes.variant_name;

      console.log(`[LS-WEBHOOK] Event=${event} Email=${email} Status=${status}`);

      if (!email) {
        console.warn("[WEBHOOK] No email found in payload, searching meta data...");
        // Ibland ligger email i meta om det är en manuell resend eller liknande
        const metaEmail = (meta.custom_data?.email || "").toLowerCase().trim();
        if (!metaEmail) {
          console.error("[WEBHOOK] Critical: No email found anywhere in payload.");
          return;
        }
      }

      const db = getAdminDb();
      if (db && email) {
        const docId = email;
        const updateData: any = {
          email: docId,
          status: status || "active", // Default till active om status saknas (vid t.ex. order_created)
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

        // Logga för historik
        await db.collection("webhook_logs").add({
          eventName: event,
          email: email,
          status: status,
          timestamp: new Date().toISOString(),
          variant: variant
        });
      } else if (!db) {
        console.error("❌ [WEBHOOK] Database not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY in Vercel!");
      }
    } catch (err) {
      console.error("❌ [WEBHOOK PROCESSING ERROR]:", err);
    }
    console.log("--- [WEBHOOK END] ---\n");
  });

  // Diagnostic GET för att verifiera att routen lever
  app.get("/api/webhook", (req, res) => {
    res.send("DIGICAP WEBHOOK ENDPOINT IS LIVE. USE POST.");
  });

  // Admin: Hämta loggar och licenser
  app.get("/api/webhook-logs", async (req, res) => {
    try {
      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }

      const licensesSnapshot = await db.collection("licenses").orderBy("updatedAt", "desc").limit(100).get();
      const licenses = licensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const logsSnapshot = await db.collection("webhook_logs").orderBy("timestamp", "desc").limit(100).get();
      const logs = logsSnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          eventName: d.eventName || "unknown",
          timestamp: d.timestamp,
          email: d.email || "unknown",
          status: d.status
        };
      });

      res.status(200).json({ logs, licenses });
    } catch (err) {
      console.error("Fetch logs error:", err);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // API for anonymous license verification (for Apple/Corporate users)
  app.post("/api/verify-license", async (req, res) => {
    try {
      const { email, orderId } = req.body;
      if (!email || !orderId) {
        return res.status(400).json({ error: "Email and Order ID/License Key are required" });
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }

      const docId = email.toLowerCase().trim();
      const inputId = String(orderId).trim().replace("#", "");
      
      console.log(`[VERIFY-REQ] Email: ${docId}, Input: ${inputId}`);

      // 1. Try to find by Email first (most common)
      const licenseDoc = await db.collection("licenses").doc(docId).get();

      if (licenseDoc.exists) {
        const data = licenseDoc.data();
        if (data) {
          const dbOrderId = String(data.order_id || data.orderId || "");
          const dbLicenseKey = String(data.license_key || data.licenseKey || "");
          
          // Check if status is valid
          const isValidStatus = ['active', 'on_trial', 'past_due', 'subscribed'].includes(data.status);
          
          // Match against Order ID or License Key
          const isMatch = (dbOrderId === inputId || dbOrderId === "#" + inputId) || 
                          (dbLicenseKey.toLowerCase() === inputId.toLowerCase());

          console.log(`[VERIFY-EMAIL-MATCH] Found doc. Status: ${data.status}, Match: ${isMatch}`);

          if (isValidStatus && isMatch) {
            return res.status(200).json({ success: true, license: data });
          }
        }
      }

      // 2. If not found by email, try searching all licenses for the Order ID or License Key
      // This helps if they used a different email for the purchase than they use for the app
      console.log(`[VERIFY-QUERY] Searching all docs for ID: ${inputId}`);
      
      const queryByOrder = await db.collection("licenses").where("order_id", "==", parseInt(inputId, 10) || inputId).get();
      const queryByOrderString = await db.collection("licenses").where("order_id", "==", inputId).get();
      
      let foundDoc = !queryByOrder.empty ? queryByOrder.docs[0] : (!queryByOrderString.empty ? queryByOrderString.docs[0] : null);

      if (foundDoc) {
        const data = foundDoc.data();
        const isValidStatus = ['active', 'on_trial', 'past_due', 'subscribed'].includes(data.status);
        console.log(`[VERIFY-QUERY-MATCH] Found doc by OrderID. Status: ${data.status}`);
        if (isValidStatus) {
          return res.status(200).json({ success: true, license: data });
        }
      }

      return res.status(401).json({ error: "Invalid license status, Email or Order ID" });
    } catch (err) {
      console.error("API Error verify-license:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- 4. FRONTEND SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      // Om det är en API-rutt som inte matchat så skicka inte index.html
      if (req.url.startsWith("/api/")) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ SERVER V10.0 ADMIN READY ON PORT ${PORT}`);
    
    // Starta Smee-reläet automatiskt BARA I UTVECKLING
    if (process.env.NODE_ENV !== "production") {
      const smee = new SmeeClient({
        source: 'https://smee.io/X6tY7d2Z3r4v5w8q',
        target: `http://localhost:${PORT}/api/webhook`,
        logger: {
          info: (msg: string) => console.log(`[SMEE-INFO] ${msg}`),
          error: (msg: string) => console.error(`[SMEE-ERROR] ${msg}`)
        }
      });
      smee.start();
      console.log(`[SMEE] Forwarding from smee.io to local /api/webhook`);
    }
  });
}

startServer().catch(err => {
  console.error("CRITICAL BOOT ERROR:", err);
});
