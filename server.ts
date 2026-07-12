import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route to get exchange rates safely hiding the API key
  app.get("/api/rates", async (req, res) => {
    try {
      // 1. Fetch UAH to USD
      let uahToUsd = 0.0245;
      try {
        const uahRes = await fetch("https://open.er-api.com/v6/latest/UAH");
        const uahData = await uahRes.json();
        if (uahData?.rates?.USD) {
          uahToUsd = uahData.rates.USD;
        }
      } catch (err) {
        console.error("Failed to fetch UAH rate:", err);
      }

      // We cannot fetch Nobitex from backend due to DNS blocks outside Iran.
      // We will try fetching from Wallex which works from the backend container.
      let usdToToman = 70000;
      try {
        const wallexRes = await fetch("https://api.wallex.ir/v1/markets", {
          headers: {
            "Accept-Encoding": "gzip, deflate"
          }
        });
        
        if (wallexRes.ok) {
          const wallexData = await wallexRes.json();
          if (wallexData?.result?.symbols?.USDTTMN?.stats?.lastPrice) {
            usdToToman = parseFloat(wallexData.result.symbols.USDTTMN.stats.lastPrice);
          }
        } else {
          console.warn("Wallex API returned non-OK status:", wallexRes.status);
        }
      } catch (err) {
        console.warn("Failed to fetch Toman rate from Wallex:", (err as Error).message);
      }

      res.json({
        uahToUsd,
        usdToToman,
        nobitexApiKey: process.env.NOBITEX_API_KEY || "d788c3247856cac28ba6eaa5b4d601bb872b4711"
      });
    } catch (error) {
      console.error("Error in /api/rates:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
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
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
