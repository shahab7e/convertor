var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.get("/api/rates", async (req, res) => {
    try {
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
      let usdToToman = 7e4;
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
        console.warn("Failed to fetch Toman rate from Wallex:", err.message);
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
