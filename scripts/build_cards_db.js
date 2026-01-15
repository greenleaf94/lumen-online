// scripts/build_cards_db.js
const fs = require("fs");
const path = require("path");

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readJson(p) {
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function normalizeDb(payload) {
  // 1) cards 배열만 있는 경우
  if (Array.isArray(payload)) {
    return { version: "1.1", generatedAt: new Date().toISOString(), count: payload.length, cards: payload };
  }
  // 2) { cards: [...] } 형태
  if (payload && Array.isArray(payload.cards)) {
    return {
      version: payload.version ?? "1.1",
      generatedAt: payload.generatedAt ?? new Date().toISOString(),
      count: payload.count ?? payload.cards.length,
      cards: payload.cards
    };
  }
  throw new Error("DB JSON 형식이 이상함: 배열 또는 {cards:[...]} 형태여야 함");
}

function validateCards(cards) {
  const required = ["id", "name", "character"];
  let bad = 0;
  for (const c of cards) {
    for (const k of required) {
      if (!c || c[k] === undefined || c[k] === null || c[k] === "") {
        bad++;
        break;
      }
    }
  }
  if (bad > 0) {
    console.warn(`[WARN] 필수 필드 누락 카드가 ${bad}개 있음 (id/name/character)`);
  }
}

const ROOT = process.cwd();

// 마스터 DB 후보들 (네가 어디에 두든 찾아서 씀)
const CANDIDATES = [
  path.join(ROOT, "data", "cards_db_master_1_1.json"),
  path.join(ROOT, "data", "cards_db_master.json"),
  path.join(ROOT, "public", "cards_db_master_1_1.json"),
  path.join(ROOT, "public", "cards_db_master.json"),
  path.join(ROOT, "cards_db_master_1_1.json"),
  path.join(ROOT, "cards_db_master.json"),
  // 이미 최종 파일을 직접 관리하는 경우도 지원
  path.join(ROOT, "public", "cards_db.json")
];

const OUT_PATH = path.join(ROOT, "public", "cards_db.json");

const src = CANDIDATES.find(exists);
if (!src) {
  console.error("[ERROR] 마스터 DB를 찾을 수 없음. 아래 중 한 곳에 JSON을 넣어줘:");
  for (const p of CANDIDATES) console.error(" - " + p);
  process.exit(1);
}

const payload = readJson(src);
const db = normalizeDb(payload);
validateCards(db.cards);

ensureDir(path.dirname(OUT_PATH));
fs.writeFileSync(OUT_PATH, JSON.stringify(db, null, 2), "utf-8");

console.log(`[OK] cards_db.json 생성 완료`);
console.log(`  - src: ${src}`);
console.log(`  - out: ${OUT_PATH}`);
console.log(`  - version: ${db.version}`);
console.log(`  - count: ${db.cards.length}`);
console.log(`  - sample: ${db.cards.slice(0, 5).map(c => c.name).join(", ")}`);
