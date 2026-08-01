import express from "express";
import path from "path";
import cors from "cors";
import { getAdminDb, processWebhook } from "./api/_shared.ts";

const app = express();
const PORT = 3000;

// 1. GLOBAL MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. LOGGING
app.use((req, res, next) => {
  if (!req.url.startsWith("/@vite")) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// 3. API ROUTES (Synchronous)

// Webhooks
app.post(["/api/webhook", "/api/lemon-squeezy-webhook", "/api/webhooks/lemon"], async (req, res) => {
  await processWebhook(req, res);
});

app.get("/api/webhook", (req, res) => {
  res.send("DIGICAP WEBHOOK ENDPOINT IS LIVE. USE POST.");
});

// Admin protected logos
app.get("/api/admin/logos/:format", (req, res) => {
  const { format } = req.params;
  const { password } = req.query;
  
  if (password !== "1731") {
    return res.status(403).json({ error: "Forbidden. Requires admin password." });
  }

  const formatMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml"
  };

  const mimeType = formatMap[format];
  if (!mimeType) {
    return res.status(400).json({ error: "Invalid format" });
  }

  const fileExt = format === 'jpeg' ? 'jpg' : format;
  const filePath = path.resolve(`digicap_console_logo.${fileExt}`);
  
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="digicap_console_logo.${fileExt}"`);
  res.sendFile(filePath);
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "online", 
    version: "19.5-CSP-CLEAN",
    time: new Date().toISOString()
  });
});

// Admin Logs
app.get("/api/webhook-logs", async (req, res) => {
  try {
    const db = getAdminDb();
    if (!db) {
      console.error("[API] Firebase Admin failed. Check FIREBASE_SERVICE_ACCOUNT.");
      return res.status(500).json({ error: "Database initialization failed" });
    }
    const licensesSnapshot = await db.collection("licenses").orderBy("updatedAt", "desc").limit(100).get();
    const licenses = licensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const logsSnapshot = await db.collection("webhook_logs").orderBy("timestamp", "desc").limit(100).get();
    const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fetch recent user activities
    let activities: any[] = [];
    try {
      const activitySnapshot = await db.collection("user_activity").orderBy("timestamp", "desc").limit(150).get();
      activities = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (actErr: any) {
      console.log("[API] Failed to fetch activities: Wait, maybe collection empty?", actErr.message);
    }

    res.status(200).json({ logs, licenses, activities, debug: "v19.1" });
  } catch (err: any) {
    console.error("[API] Webhook logs error:", err);
    res.status(500).json({ error: "Failed to fetch logs", details: err.message });
  }
});

// Verify License
app.post("/api/verify-license", async (req, res) => {
  try {
    const { email, orderId } = req.body;
    const db = getAdminDb();
    
    const cleanEmail = (email || "").toString().toLowerCase().trim();
    const cleanKey = (orderId || "").toString().trim();

    if (!cleanEmail && !cleanKey) {
      return res.status(400).json({ error: "Missing email or order ID" });
    }

    const validStatuses = ['active', 'on_trial', 'subscribed', 'past_due', 'paid'];

    if (db) {
      // 1. Direct lookup by email doc ID
      if (cleanEmail) {
        const licenseDoc = await db.collection("licenses").doc(cleanEmail).get();
        if (licenseDoc.exists) {
          const data = licenseDoc.data();
          if (data && validStatuses.includes(data.status)) {
            return res.status(200).json({ success: true, license: data });
          }
        }
      }

      // 2. Query by license_key if key provided
      if (cleanKey) {
        const keyQuery = await db.collection("licenses").where("license_key", "==", cleanKey).limit(1).get();
        if (!keyQuery.empty) {
          const data = keyQuery.docs[0].data();
          if (data && validStatuses.includes(data.status)) {
            return res.status(200).json({ success: true, license: data });
          }
        }

        // 3. Query by order_id (string or number)
        const orderQuery = await db.collection("licenses").where("order_id", "==", cleanKey).limit(1).get();
        if (!orderQuery.empty) {
          const data = orderQuery.docs[0].data();
          if (data && validStatuses.includes(data.status)) {
            return res.status(200).json({ success: true, license: data });
          }
        }
        
        const orderNum = Number(cleanKey);
        if (!isNaN(orderNum)) {
          const orderNumQuery = await db.collection("licenses").where("order_id", "==", orderNum).limit(1).get();
          if (!orderNumQuery.empty) {
            const data = orderNumQuery.docs[0].data();
            if (data && validStatuses.includes(data.status)) {
              return res.status(200).json({ success: true, license: data });
            }
          }
        }
      }

      // 4. Query by email field search if doc ID lookup didn't match directly
      if (cleanEmail) {
        const emailQuery = await db.collection("licenses").where("email", "==", cleanEmail).limit(1).get();
        if (!emailQuery.empty) {
          const data = emailQuery.docs[0].data();
          if (data && validStatuses.includes(data.status)) {
            return res.status(200).json({ success: true, license: data });
          }
        }
      }
    }

    return res.status(401).json({ error: "Invalid license" });
  } catch (err: any) {
    console.error("Error in /api/verify-license:", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// 4. FRONTEND SERVING (Dynamic)
import fs from "fs";

async function startFrontend() {
  const distPath = path.join(process.cwd(), "dist");

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      console.log("🔌 Attempting to load Vite dev middleware...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("🚀 Vite dev server middleware mounted successfully.");
    } catch (err: any) {
      console.warn("⚠️ Failed to load Vite development middleware, falling back to static serving:", err.message);
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        if (req.url.startsWith("/api/")) return res.status(404).json({ error: "API route not found" });
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else {
    console.log("📦 Serving built frontend from /dist (Production Mode)");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.url.startsWith("/api/")) return res.status(404).json({ error: "API route not found" });
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ LOCAL SERVER READY ON PORT ${PORT}`);
    });
  }
}

startFrontend();

export { app };
export default app;


