// src/server.ts
import express from "express";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const CARDS_DB_PATH = path.join(PUBLIC_DIR, "cards_db.json");

// 정적 파일
app.use(express.static(PUBLIC_DIR));

function loadCardsDb() {
  if (!fs.existsSync(CARDS_DB_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(CARDS_DB_PATH, "utf-8");
  return JSON.parse(raw);
}

// 카드 DB
app.get("/api/cards", (req, res) => {
  const db = loadCardsDb();
  if (!db) {
    return res.status(500).json({
      error: "cards_db.json_not_found",
      message: "public/cards_db.json 파일이 없습니다. npm run build:cards 를 먼저 실행하세요.",
      expectedPath: CARDS_DB_PATH
    });
  }
  res.json(db);
});

// 디버그용(지금 상태 확인)
app.get("/api/cards/debug", (req, res) => {
  const exists = fs.existsSync(CARDS_DB_PATH);
  let count: number | null = null;
  try {
    const db = exists ? loadCardsDb() : null;
    const cards = Array.isArray(db) ? db : db?.cards;
    count = Array.isArray(cards) ? cards.length : null;
  } catch {}
  res.json({
    cwd: ROOT,
    cardsDbPath: CARDS_DB_PATH,
    exists,
    count
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
  console.log(`[server] serving public from: ${PUBLIC_DIR}`);
});
