const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || "0.0.0.0";
const STORE_PATH = path.join(__dirname, "data", "store.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

function loadStore() {
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return {
    rosters: {
      HotHeroes: Array.isArray(parsed?.rosters?.HotHeroes) ? parsed.rosters.HotHeroes : [],
      "Ιπτάμενοι": Array.isArray(parsed?.rosters?.["Ιπτάμενοι"]) ? parsed.rosters["Ιπτάμενοι"] : []
    },
    matches: Array.isArray(parsed?.matches) ? parsed.matches : [],
    messages: Array.isArray(parsed?.messages) ? parsed.messages : []
  };
}

function saveStore(store) {
  fs.writeFileSync(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function addCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function serveStatic(req, res) {
  const reqPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(reqPath).replace(/^\.\.(\/|\\|$)/, "");
  const fullPath = path.join(__dirname, safePath);

  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(fullPath, (err, file) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(file);
  });
}

const server = http.createServer(async (req, res) => {
  addCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/api/state" && req.method === "GET") return sendJson(res, 200, loadStore());

  if (req.url === "/api/players" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const team = body.team;
      const name = String(body.name || "").trim();
      if (!["HotHeroes", "Ιπτάμενοι"].includes(team) || !name) return sendJson(res, 400, { error: "Invalid player payload" });
      const store = loadStore();
      store.rosters[team].push(name);
      saveStore(store);
      return sendJson(res, 200, store);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.url === "/api/matches" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const date = String(body.date || "").trim();
      const time = String(body.time || "").trim();
      const court = String(body.court || "").trim();
      if (!date || !time || !court) return sendJson(res, 400, { error: "Invalid match payload" });
      const store = loadStore();
      store.matches.push({ id: createId(), date, time, court, hotScore: null, flyScore: null });
      store.matches.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
      saveStore(store);
      return sendJson(res, 200, store);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.url === "/api/scores" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const matchId = String(body.matchId || "");
      const hotScore = Number.parseInt(body.hotScore, 10);
      const flyScore = Number.parseInt(body.flyScore, 10);
      if (!matchId || Number.isNaN(hotScore) || Number.isNaN(flyScore)) return sendJson(res, 400, { error: "Invalid score payload" });
      const store = loadStore();
      const match = store.matches.find((item) => item.id === matchId);
      if (!match) return sendJson(res, 404, { error: "Match not found" });
      match.hotScore = hotScore;
      match.flyScore = flyScore;
      saveStore(store);
      return sendJson(res, 200, store);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const user = String(body.user || "").trim();
      const text = String(body.text || "").trim();
      if (!user || !text) return sendJson(res, 400, { error: "Invalid chat payload" });
      const store = loadStore();
      store.messages.unshift({ user, text, createdAt: Date.now() });
      store.messages = store.messages.slice(0, 100);
      saveStore(store);
      return sendJson(res, 200, store);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.url === "/api/chat" && req.method === "DELETE") {
    const store = loadStore();
    store.messages = [];
    saveStore(store);
    return sendJson(res, 200, store);
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`BasketLeaguePro running at http://${HOST}:${PORT}`);
});
