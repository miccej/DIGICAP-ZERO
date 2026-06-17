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

// Serve generated logos directly for easy user download
app.get("/digicap_console_logo.png", (req, res) => {
  res.sendFile(path.resolve("digicap_console_logo.png"));
});
app.get("/digicap_console_logo.jpg", (req, res) => {
  res.sendFile(path.resolve("digicap_console_logo.jpg"));
});
app.get("/digicap_console_logo.svg", (req, res) => {
  res.sendFile(path.resolve("digicap_console_logo.svg"));
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
    if (!db || !email || !orderId) return res.status(400).json({ error: "Missing data" });
    const docId = email.toLowerCase().trim();
    const licenseDoc = await db.collection("licenses").doc(docId).get();
    if (licenseDoc.exists) {
      const data = licenseDoc.data();
      if (data && ['active', 'on_trial', 'subscribed', 'past_due'].includes(data.status)) {
        return res.status(200).json({ success: true, license: data });
      }
    }
    res.status(401).json({ error: "Invalid license" });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
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


