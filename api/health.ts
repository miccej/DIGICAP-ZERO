export default function handler(req: any, res: any) {
  res.status(200).json({ 
    status: "online", 
    version: "18.0-VERCEL-NATIVE",
    time: new Date().toISOString()
  });
}
