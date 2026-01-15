// scripts/build_cards_db.js
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

// 입력/출력 경로
const XLSX_PATH = path.join(process.cwd(), "data", "Lumen_DB.xlsx");
const OUT_JSON_PATH = path.join(process.cwd(), "public", "cards_db.json");
const OUT_UNPARSED_PATH = path.join(process.cwd(), "public", "effects_unparsed.json");

// 유틸
function toStr(v) {
  return (v ?? "").toString().trim();
}
function toStat(v) {
  const s = toStr(v);
  if (!s || s === "X") return null;
  // -8 같은 값도 숫자로
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s; // 콤보/방어/회피/상쇄 등
}

// ①②③… 분리
function splitClauses(text) {
  const s = toStr(text);
  if (!s) return [];
  // "①...②..." 형태를 clause 단위로
  const parts = s.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/).map(x => x.trim()).filter(Boolean);
  if (parts.length === 1) return [parts[0]];
  return parts;
}

// 트리거 추정
function guessTrigger(clause) {
  const c = clause;
  if (c.includes("사용 시")) return "ON_USE";
  if (c.includes("판정 전")) return "BEFORE_JUDGEMENT";
  if (c.includes("판정 후")) return "AFTER_JUDGEMENT";
  if (c.includes("히트 시")) return "ON_HIT";
  if (c.includes("카운터 시")) return "ON_COUNTER";
  if (c.includes("상쇄 시")) return "ON_CLASH";
  if (c.includes("브레이크 시")) return "ON_BREAK";
  if (c.includes("턴 종료")) return "ON_TURN_END";
  if (c.includes("상대의 회피 시") || c.includes("상대 회피 시")) return "ON_OPP_EVADE";
  if (c.includes("자신의 회피 시") || c.includes("회피 시")) return "ON_EVADE";
  if (c.includes("방어 시") || c.includes("가드 시")) return "ON_GUARD";
  return "UNKNOWN";
}

// 아주 기본적인 조건 파싱(필요할 때 확장)
function parseCondition(clause) {
  // 예: "자신의 FP가 <+3>이상인 경우"
  let m = clause.match(/자신의\s*FP가\s*<\+?(\d+)>\s*이상/);
  if (m) return { type: "SELF_FP_GTE", value: Number(m[1]) };

  // 예: "상대 기술이 <상단 손>판정 공격 기술일 경우"
  m = clause.match(/상대\s*기술.*<([^>]+)>/);
  if (m) return { type: "OPP_HAS_TAG", value: m[1] };

  // 예: "상대가 수비 기술인 경우"
  if (clause.includes("상대가 수비 기술인 경우") || clause.includes("상대 기술이 수비")) {
    return { type: "OPP_IS_DEFENSE" };
  }

  return null;
}

// 액션 파싱(처리 가능한 것부터 늘려가면 됨)
function parseActions(clause) {
  const actions = [];
  const constraints = {};

  // (A) 회피 제한: "이 기술은 6속도 이하 기술만 회피할 수 있다."
  let m = clause.match(/이\s*기술은\s*(\d+)\s*속도\s*이하\s*기술만\s*회피/);
  if (m) constraints.evadeMaxSpeed = Number(m[1]);

  m = clause.match(/이\s*기술은\s*(\d+)\s*속도\s*이상만\s*회피/);
  if (m) constraints.evadeMinSpeed = Number(m[1]);

  // (B) 콤보 불가
  if (clause.includes("콤보에 사용할 수 없다")) constraints.noCombo = true;

  // (C) FP 획득: "자신은 2FP를 얻는다", "상대는 4FP를 얻는다"
  m = clause.match(/(자신|상대)\s*는?\s*(\d+)\s*FP를\s*얻는다/);
  if (m) {
    actions.push({
      type: "GAIN_FP",
      target: m[1] === "자신" ? "SELF" : "OPP",
      amount: Number(m[2]),
    });
  }

  // (D) 데미지 가감: "이 기술 데미지+200"
  m = clause.match(/이\s*기술.*데미지\s*([+\-])\s*(\d+)/);
  if (m) {
    actions.push({
      type: "MOD_DAMAGE",
      mode: m[1] === "+" ? "ADD" : "SUB",
      value: Number(m[2]),
    });
  }

  // (E) 속도 고정: "8속도로 고정된다"
  m = clause.match(/(\d+)\s*속도로\s*고정/);
  if (m) {
    actions.push({
      type: "SET_SPEED",
      value: Number(m[1]),
    });
  }

  // (F) 가드 판정 변경: "<-2>로 변경"
  m = clause.match(/가드\s*판정.*<\s*(-?\d+)\s*>.*변경/);
  if (m) {
    actions.push({
      type: "SET_ONGUARD",
      value: Number(m[1]),
    });
  }

  // (G) 히트 판정 변경: "<+5>로 변경"
  m = clause.match(/히트\s*판정.*<\s*([+\-]?\d+)\s*>.*변경/);
  if (m) {
    actions.push({
      type: "SET_ONHIT",
      value: Number(m[1]),
    });
  }

  // (H) 패 버리기: "패를 1장 버린다" / "상대는 패 1장을 무작위로 버린다"
  m = clause.match(/(자신|상대)?.*패(?:를)?\s*(\d+)\s*장.*버린다/);
  if (m) {
    const target = m[1] === "상대" ? "OPP" : "SELF";
    actions.push({
      type: "DISCARD",
      target,
      count: Number(m[2]),
      random: clause.includes("무작위"),
    });
  }

  // (I) 브레이크
  if (clause.includes("브레이크한다") || clause.includes("브레이크한다.")) {
    actions.push({ type: "BREAK_SELF" });
  }

  return { actions, constraints };
}

// 키워드 추출: 【】 또는 [] 안에 있는 것들
function extractKeywords(text) {
  const s = toStr(text);
  const keywords = [];
  const re = /[【\[]([^】\]]+)[】\]]/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    keywords.push(m[1].trim());
  }
  return Array.from(new Set(keywords));
}

function build() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error("엑셀 파일이 없습니다:", XLSX_PATH);
    process.exit(1);
  }

  const wb = xlsx.readFile(XLSX_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const unparsed = [];
  const cards = rows.map((r) => {
    const id = toStr(r.FirstAppearance); // 유니크 보장(엑셀 확인됨)
    const effectsText = toStr(r.Effects);
    const clauses = splitClauses(effectsText);

    const parsedClauses = [];
    const mergedConstraints = {};
    for (const clause of clauses) {
      const trigger = guessTrigger(clause);
      const condition = parseCondition(clause);
      const { actions, constraints } = parseActions(clause);

      // constraints merge
      for (const k of Object.keys(constraints)) mergedConstraints[k] = constraints[k];

      const parsedOk = actions.length > 0 || Object.keys(constraints).length > 0;
      parsedClauses.push({
        trigger,
        condition,
        actions,
        raw: clause,
        parsed: parsedOk,
      });

      if (!parsedOk && clause) {
        unparsed.push({ id, cardName: toStr(r.CardName), clause });
      }
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
  console.log(`🧩 파싱 실패(추후 규칙 추가 대상): ${unparsed.length}개 clause -> public/effects_unparsed.json`);
}
