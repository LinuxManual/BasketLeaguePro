const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || "0.0.0.0";
const STORE_PATH = path.join(__dirname, "data", "store.json");
const MAX_BODY_BYTES = 1_000_000;
const MAX_NAME_LENGTH = 80;
const MAX_TEXT_LENGTH = 500;
const MAX_SCORE = 300;
const TEAM_HOT = "HotHeroes";
const TEAM_FLY = "Ιπτάμενοι";
const LEGACY_TEAM_FLY = "Ξ™Ο€Ο„Ξ¬ΞΌΞµΞ½ΞΏΞΉ";
const TEAMS = [TEAM_HOT, TEAM_FLY];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

function normalizeText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeRoster(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((item) => normalizeText(item, MAX_NAME_LENGTH))
    .filter((item) => {
      const key = item.toLocaleLowerCase("el-GR");
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function loadStore() {
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const rosters = parsed?.rosters || {};
  return {
    rosters: {
      [TEAM_HOT]: normalizeRoster(rosters[TEAM_HOT]),
      [TEAM_FLY]: normalizeRoster([...(rosters[TEAM_FLY] || []), ...(rosters[LEGACY_TEAM_FLY] || [])])
    },
    matches: Array.isArray(parsed?.matches) ? parsed.matches : [],
    messages: Array.isArray(parsed?.messages) ? parsed.messages : []
  };
}

function saveStore(store) {
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, STORE_PATH);
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
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isValidTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
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

function scoreIsValid(value) {
  return Number.isInteger(value) && value >= 0 && value <= MAX_SCORE;
}

function sendNotFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const reqPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(decodeURIComponent(reqPath)).replace(/^([/\\])+/, "");
  const fullPath = path.resolve(__dirname, safePath);
  const relative = path.relative(__dirname, fullPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(fullPath, (err, file) => {
    if (err) {
      sendNotFound(res);
      return;
    }

    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0"
    });
    res.end(file);
  });
}

async function handlePlayers(req, res) {
  try {
    if (!["POST", "DELETE"].includes(req.method)) return sendJson(res, 405, { error: "Method not allowed" });

    const body = await readBody(req);
    const team = body.team;
    const name = normalizeText(body.name, MAX_NAME_LENGTH);
    if (!TEAMS.includes(team) || !name) return sendJson(res, 400, { error: "Invalid player payload" });

    const store = loadStore();
    if (req.method === "POST") {
      const exists = store.rosters[team].some((item) => item.toLocaleLowerCase("el-GR") === name.toLocaleLowerCase("el-GR"));
      if (!exists) store.rosters[team].push(name);
      saveStore(store);
      return sendJson(res, 200, store);
    }

    if (req.method === "DELETE") {
      const before = store.rosters[team].length;
      store.rosters[team] = store.rosters[team].filter((item) => item.toLocaleLowerCase("el-GR") !== name.toLocaleLowerCase("el-GR"));
      if (store.rosters[team].length === before) return sendJson(res, 404, { error: "Player not found" });
      saveStore(store);
      return sendJson(res, 200, store);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

async function handleMatches(req, res) {
  try {
    if (!["POST", "DELETE"].includes(req.method)) return sendJson(res, 405, { error: "Method not allowed" });

    const body = await readBody(req);
    const store = loadStore();

    if (req.method === "POST") {
      const date = normalizeText(body.date, 10);
      const time = normalizeText(body.time, 5);
      const court = normalizeText(body.court, MAX_NAME_LENGTH);
      if (!date || !time || !court || !isValidDate(date) || !isValidTime(time)) {
        return sendJson(res, 400, { error: "Invalid match payload" });
      }
      store.matches.push({ id: createId(), date, time, court, hotScore: null, flyScore: null });
      store.matches.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
      saveStore(store);
      return sendJson(res, 200, store);
    }

    if (req.method === "DELETE") {
      const matchId = String(body.matchId || "");
      const before = store.matches.length;
      store.matches = store.matches.filter((item) => item.id !== matchId);
      if (store.matches.length === before) return sendJson(res, 404, { error: "Match not found" });
      saveStore(store);
      return sendJson(res, 200, store);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

async function handleScores(req, res) {
  try {
    const body = await readBody(req);
    const matchId = String(body.matchId || "");
    const hotScore = Number.parseInt(body.hotScore, 10);
    const flyScore = Number.parseInt(body.flyScore, 10);
    if (!matchId || !scoreIsValid(hotScore) || !scoreIsValid(flyScore)) {
      return sendJson(res, 400, { error: "Invalid score payload" });
    }

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

async function handleChat(req, res) {
  try {
    const store = loadStore();
    if (req.method === "DELETE") {
      store.messages = [];
      saveStore(store);
      return sendJson(res, 200, store);
    }

    const body = await readBody(req);
    const user = normalizeText(body.user, MAX_NAME_LENGTH);
    const text = normalizeText(body.text, MAX_TEXT_LENGTH);
    if (!user || !text) return sendJson(res, 400, { error: "Invalid chat payload" });
    store.messages.unshift({ user, text, createdAt: Date.now() });
    store.messages = store.messages.slice(0, 100);
    saveStore(store);
    return sendJson(res, 200, store);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

const server = http.createServer(async (req, res) => {
  addCorsHeaders(res);
  const { pathname } = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === "/api/state" && req.method === "GET") return sendJson(res, 200, loadStore());
  if (pathname === "/api/players") return handlePlayers(req, res);
  if (pathname === "/api/matches") return handleMatches(req, res);
  if (pathname === "/api/scores" && req.method === "POST") return handleScores(req, res);
  if (pathname === "/api/chat" && ["POST", "DELETE"].includes(req.method)) return handleChat(req, res);
  if (pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, version: "4.0.0", uptime: process.uptime() });
  }

  if (pathname.startsWith("/api/")) {
    return sendJson(res, 405, { error: "Method or endpoint not allowed" });
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`BasketLeaguePro running at http://localhost:${PORT}`);
});
