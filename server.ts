import express from "express";
import path from "path";
import cors from "cors";
import { getAdminDb, processWebhook } from "./api/_shared.js";

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
app.post(["/api/webhook", "/api/lemon-squeezy-webhook"], async (req, res) => {
  await processWebhook(req, res);
});

app.get("/api/webhook", (req, res) => {
  res.send("DIGICAP WEBHOOK ENDPOINT IS LIVE. USE POST.");
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "online", 
    version: "19.0-SYNC-READY",
    time: new Date().toISOString()
  });
});

// Admin Logs
app.get("/api/webhook-logs", async (req, res) => {
  try {
    const db = getAdminDb();
    if (!db) return res.status(500).json({ error: "Firebase not initialized" });
    const licensesSnapshot = await db.collection("licenses").orderBy("updatedAt", "desc").limit(100).get();
    const licenses = licensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const logsSnapshot = await db.collection("webhook_logs").orderBy("timestamp", "desc").limit(100).get();
    const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ logs, licenses });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
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

async function startFrontend() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
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


