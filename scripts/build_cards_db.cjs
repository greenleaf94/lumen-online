// scripts/build_cards_db.cjs
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const XLSX_PATH = path.join(process.cwd(), "data", "Lumen_DB.xlsx");
const OUT_JSON_PATH = path.join(process.cwd(), "public", "cards_db.json");
const OUT_UNPARSED_PATH = path.join(process.cwd(), "public", "effects_unparsed.json");

function toStr(v) {
  return (v ?? "").toString().trim();
}
function toStat(v) {
  const s = toStr(v);
  if (!s || s === "X") return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

// ①②③… 단위로 분리
function splitClauses(text) {
  const s = toStr(text);
  if (!s) return [];
  const parts = s.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/).map(x => x.trim()).filter(Boolean);
  return parts.length ? parts : [s];
}

function guessTrigger(clause) {
  if (clause.includes("사용 시")) return "ON_USE";
  if (clause.includes("판정 전")) return "BEFORE_JUDGEMENT";
  if (clause.includes("판정 후")) return "AFTER_JUDGEMENT";
  if (clause.includes("히트 시")) return "ON_HIT";
  if (clause.includes("카운터 시")) return "ON_COUNTER";
  if (clause.includes("상대의 회피 시") || clause.includes("상대 회피 시")) return "ON_OPP_EVADE";
  if (clause.includes("회피 시")) return "ON_EVADE";
  if (clause.includes("방어 시") || clause.includes("가드 시")) return "ON_GUARD";
  return "UNKNOWN";
}

function parseCondition(clause) {
  let m = clause.match(/자신의\s*FP가\s*<\+?(\d+)>\s*이상/);
  if (m) return { type: "SELF_FP_GTE", value: Number(m[1]) };
  if (clause.includes("상대가 수비 기술인 경우") || clause.includes("상대 기술이 수비")) {
    return { type: "OPP_IS_DEFENSE" };
  }
  return null;
}

function parseActions(clause) {
  const actions = [];
  const constraints = {};

  // 회피 제한: "6속도 이하 기술만 회피"
  let m = clause.match(/(\d+)\s*속도\s*이하\s*기술만\s*회피/);
  if (m) constraints.evadeMaxSpeed = Number(m[1]);

  // 콤보 불가
  if (clause.includes("콤보에 사용할 수 없다")) constraints.noCombo = true;

  // FP 획득
  m = clause.match(/(자신|상대)\s*는?\s*(\d+)\s*FP를\s*얻는다/);
  if (m) {
    actions.push({
      type: "GAIN_FP",
      target: m[1] === "자신" ? "SELF" : "OPP",
      amount: Number(m[2]),
    });
  }

  // 속도 고정
  m = clause.match(/(\d+)\s*속도로\s*고정/);
  if (m) actions.push({ type: "SET_SPEED", value: Number(m[1]) });

  // 패 버리기
  m = clause.match(/(자신|상대)?.*패(?:를)?\s*(\d+)\s*장.*버린다/);
  if (m) {
    actions.push({
      type: "DISCARD",
      target: m[1] === "상대" ? "OPP" : "SELF",
      count: Number(m[2]),
      random: clause.includes("무작위"),
    });
  }

  // 브레이크
  if (clause.includes("브레이크한다")) actions.push({ type: "BREAK_SELF" });

  return { actions, constraints };
}

function extractKeywords(text) {
  const s = toStr(text);
  const keywords = [];
  const re = /[【\[]([^】\]]+)[】\]]/g;
  let m;
  while ((m = re.exec(s)) !== null) keywords.push(m[1].trim());
  return Array.from(new Set(keywords));
}

function build() {
  console.log("🔧 build_cards_db 시작");
  console.log("XLSX_PATH =", XLSX_PATH);

  if (!fs.existsSync(XLSX_PATH)) {
    console.error("❌ 엑셀 파일이 없습니다:", XLSX_PATH);
    process.exit(1);
  }

  // public 폴더 없으면 만들기
  fs.mkdirSync(path.join(process.cwd(), "public"), { recursive: true });

  const wb = xlsx.readFile(XLSX_PATH);
  console.log("sheets =", wb.SheetNames);

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  console.log("rows =", rows.length);
  console.log("keys(sample) =", Object.keys(rows[0] || {}));

  const unparsed = [];
  const cards = rows.map((r) => {
    const id = toStr(r.FirstAppearance);
    const effectsText = toStr(r.Effects);
    const clauses = splitClauses(effectsText);

    const parsedClauses = [];
    const mergedConstraints = {};

    for (const clause of clauses) {
      const trigger = guessTrigger(clause);
      const condition = parseCondition(clause);
      const { actions, constraints } = parseActions(clause);

      Object.assign(mergedConstraints, constraints);

      const parsedOk = actions.length > 0 || Object.keys(constraints).length > 0;
      parsedClauses.push({ trigger, condition, actions, raw: clause, parsed: parsedOk });

      if (!parsedOk && clause) unparsed.push({ id, cardName: toStr(r.CardName), clause });
    }

    return {
      id,
      character: toStr(r.Character),
      name: toStr(r.CardName),
      judgement: toStr(r.Judgement),
      specialJudgement: toStr(r.SpecialJudgement),
      stats: {
        damage: toStat(r.Damage),
        speed: toStat(r.Speed),
        onHit: toStat(r.OnHit),
        onGuard: toStat(r.OnGuard),
        onCounter: toStat(r.OnCounter),
      },
      effectsText,
      effectsParsed: {
        keywords: extractKeywords(effectsText),
        constraints: mergedConstraints,
        clauses: parsedClauses,
      },
      firstAppearance: id,
    };
  });

  const out = {
    version: "1.1",
    generatedAt: new Date().toISOString(),
    count: cards.length,
    cards,
  };

  fs.writeFileSync(OUT_JSON_PATH, JSON.stringify(out, null, 2), "utf8");
  fs.writeFileSync(OUT_UNPARSED_PATH, JSON.stringify({ count: unparsed.length, unparsed }, null, 2), "utf8");

  console.log(`✅ cards_db.json 생성 완료: ${cards.length}장`);
  console.log(`🧩 파싱 실패 clause: ${unparsed.length} -> public/effects_unparsed.json`);
  console.log("OUT_JSON_PATH =", OUT_JSON_PATH);
}

build();

