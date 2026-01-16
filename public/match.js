// public/match.js
let allCards = [];
let cardById = {};

const PHASES = ["READY", "RECOVERY", "GET", "BATTLE_SELECT", "BATTLE_RESOLVE", "END"];
const PHASE_KO = {
  READY: "레디(READY)",
  RECOVERY: "리커버리(RECOVERY)",
  GET: "겟(GET)",
  BATTLE_SELECT: "배틀 선택(BATTLE SELECT)",
  BATTLE_RESOLVE: "배틀 해결(BATTLE RESOLVE)",
  END: "턴 종료(END)"
};

let game = null;

// ---------- util ----------
function $(id) { return document.getElementById(id); }

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function setDeckStatus(msg) {
  const el = $("deckLoadStatus");
  if (el) el.textContent = msg;
}

function normalizeCards(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.cards)) return payload.cards;
  return [];
}

function loadDeckIdsFromStorage(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function normalizeDeckPayload(payload) {
  if (payload && Array.isArray(payload.deck)) return payload.deck;
  if (Array.isArray(payload)) return payload;
  throw new Error("덱 JSON 형식이 올바르지 않습니다. { deck: [...] } 형태여야 해요.");
}

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isDefense(card) {
  return card?.judgement?.kind === "defense" || card?.judgementText?.includes("수비");
}

function cardLabel(card) {
  if (!card) return "(알 수 없음)";
  const sp = card.stats?.speed ?? "";
  const dm = card.stats?.damage ?? "";
  return `${card.name} [${card.id}] (SPD ${sp} / DMG ${dm})`;
}

function pushLog(msg) {
  if (!game) return;
  game.log.push(msg);
  renderLog();
}

function renderLog() {
  const el = $("log");
  if (!el) return;
  if (!game || !game.log.length) {
    el.innerHTML = `<div class="muted">아직 로그가 없습니다.</div>`;
    return;
  }
  el.innerHTML = game.log.slice(-50).map(x => `<div>• ${x}</div>`).join("");
}

function ensureCardsLoadedOrThrow() {
  if (!allCards.length) throw new Error("카드 DB가 비어있습니다. /api/cards 를 확인하세요.");
}

async function loadCardsDb() {
  const res = await fetch("/api/cards");
  const payload = await res.json();
  allCards = normalizeCards(payload);

  cardById = {};
  for (const c of allCards) cardById[c.id] = c;
}

// ---------- deck paste UI ----------
function wireDeckPasteUI() {
  const input = $("deckJsonInput");
  const btnP1 = $("btnPasteP1");
  const btnP2 = $("btnPasteP2");
  const btnClear = $("btnClearDecks");

  if (!input || !btnP1 || !btnP2 || !btnClear) return;

  btnP1.addEventListener("click", () => {
    try {
      const payload = JSON.parse(input.value || "{}");
      const deckArr = normalizeDeckPayload(payload);
      localStorage.setItem("lumen_deck_p1", JSON.stringify(deckArr));
      setDeckStatus(`✅ P1 덱 저장 완료 (총 ${deckArr.length}장)`);
    } catch (e) {
      setDeckStatus("❌ " + (e.message || String(e)));
    }
  });

  btnP2.addEventListener("click", () => {
    try {
      const payload = JSON.parse(input.value || "{}");
      const deckArr = normalizeDeckPayload(payload);
      localStorage.setItem("lumen_deck_p2", JSON.stringify(deckArr));
      setDeckStatus(`✅ P2 덱 저장 완료 (총 ${deckArr.length}장)`);
    } catch (e) {
      setDeckStatus("❌ " + (e.message || String(e)));
    }
  });

  btnClear.addEventListener("click", () => {
    localStorage.removeItem("lumen_deck_p1");
    localStorage.removeItem("lumen_deck_p2");
    setDeckStatus("🧹 P1/P2 덱 초기화 완료");
  });

  // 상태 표시
  const p1 = loadDeckIdsFromStorage("lumen_deck_p1");
  const p2 = loadDeckIdsFromStorage("lumen_deck_p2");
  setDeckStatus(`현재 저장됨: P1 ${p1.length}장 / P2 ${p2.length}장`);
}

// ---------- match engine (MVP) ----------
function initZonesFromDeck(deckIds) {
  // MVP: 덱 = 기술 20장 전제로 단순 분배
  // hand 5 / list 9 / side 나머지 (지금 UI엔 side 표시 없음)
  const known = deckIds.filter(id => !!cardById[id]);
  const unknown = deckIds.filter(id => !cardById[id]);
  if (unknown.length) {
    // 로그는 나중에
  }

  const shuffled = shuffle(known);
  const hand = shuffled.slice(0, 5);
  const list = shuffled.slice(5, 14);
  const side = shuffled.slice(14);

  return { hand, list, side, unknown };
}

function newGameFromStoredDecks() {
  ensureCardsLoadedOrThrow();

  let p1Deck = loadDeckIdsFromStorage("lumen_deck_p1");
  let p2Deck = loadDeckIdsFromStorage("lumen_deck_p2");

  if (!p1Deck.length && !p2Deck.length) {
    throw new Error("저장된 덱이 없습니다. 먼저 match 화면에서 P1/P2 덱을 저장하세요.");
  }
  if (!p1Deck.length && p2Deck.length) p1Deck = p2Deck.slice();
  if (!p2Deck.length && p1Deck.length) p2Deck = p1Deck.slice(); // 테스트 편의상 자동 복제

  const p1 = initZonesFromDeck(p1Deck);
  const p2 = initZonesFromDeck(p2Deck);

  game = {
    turn: 1,
    active: 1,
    phase: "READY",
    players: {
      1: {
        hp: 3000,
        fp: 0,
        lumen: 0,
        deck: p1Deck,
        hand: p1.hand,
        list: p1.list,
        side: p1.side,
        break: [],
        battle: null,
        gotThisTurn: false,
        unknown: p1.unknown
      },
      2: {
        hp: 3000,
        fp: 0,
        lumen: 0,
        deck: p2Deck,
        hand: p2.hand,
        list: p2.list,
        side: p2.side,
        break: [],
        battle: null,
        gotThisTurn: false,
        unknown: p2.unknown
      }
    },
    log: []
  };

  pushLog("대전 시작!");
  if (p1.unknown.length) pushLog(`P1: DB에 없는 카드 ${p1.unknown.length}장(무시됨)`);
  if (p2.unknown.length) pushLog(`P2: DB에 없는 카드 ${p2.unknown.length}장(무시됨)`);

  renderAll();
}

function canAdvancePhase() {
  if (!game) return false;
  const phase = game.phase;
  const A = game.active;
  const pA = game.players[A];

  if (phase === "GET") {
    // 활성 플레이어는 겟 페이즈에서 리스트 1장을 선택해야 다음으로 진행
    return pA.gotThisTurn === true;
  }
  if (phase === "BATTLE_SELECT") {
    // 양쪽 모두 배틀 카드 선택해야 해결로 넘어감
    return !!game.players[1].battle && !!game.players[2].battle;
  }
  return true;
}

function nextPhase() {
  if (!game) return;

  if (!canAdvancePhase()) {
    pushLog("아직 선택이 끝나지 않았습니다.");
    renderAll();
    return;
  }

  const idx = PHASES.indexOf(game.phase);
  const next = PHASES[Math.min(idx + 1, PHASES.length - 1)];
  game.phase = next;

  // 페이즈 진입 시 자동 처리
  if (game.phase === "READY") {
    onEnterReady();
  } else if (game.phase === "RECOVERY") {
    onEnterRecovery();
  } else if (game.phase === "GET") {
    onEnterGet();
  } else if (game.phase === "BATTLE_SELECT") {
    onEnterBattleSelect();
  } else if (game.phase === "BATTLE_RESOLVE") {
    onEnterBattleResolve();
  } else if (game.phase === "END") {
    onEnterEnd();
  }

  renderAll();
}

function onEnterReady() {
  const A = game.active;
  pushLog(`턴 ${game.turn} 시작. 활성 플레이어: P${A}. (${PHASE_KO.READY})`);
  // 턴 시작 리셋
  game.players[1].battle = null;
  game.players[2].battle = null;
  game.players[A].gotThisTurn = false;
}

function onEnterRecovery() {
  const A = game.active;
  pushLog(`P${A} 리커버리. (${PHASE_KO.RECOVERY})`);
  // MVP: 브레이크에 카드가 있으면 1장 리스트로 복귀
  const p = game.players[A];
  if (p.break.length) {
    const recovered = p.break.shift();
    p.list.push(recovered);
    pushLog(`P${A} 브레이크에서 1장 리커버리: ${cardLabel(cardById[recovered])}`);
  } else {
    pushLog(`P${A} 브레이크가 비어있음`);
  }
}

function onEnterGet() {
  const A = game.active;
  pushLog(`P${A} 겟 페이즈. 리스트에서 1장을 선택해 패로 가져오세요. (${PHASE_KO.GET})`);
}

function onEnterBattleSelect() {
  pushLog(`배틀 선택. P1/P2 각각 패에서 1장을 선택하세요. (${PHASE_KO.BATTLE_SELECT})`);
}

function computeDamage(attackerCard, defenderCard) {
  const base = Number(attackerCard?.stats?.damage || 0);
  if (!defenderCard) return base;

  // MVP 방어 처리:
  // 상대가 수비 카드면 데미지 200 감소(최소 0)
  if (isDefense(defenderCard)) return Math.max(0, base - 200);

  return base;
}

function onEnterBattleResolve() {
  const c1 = cardById[game.players[1].battle];
  const c2 = cardById[game.players[2].battle];

  pushLog(`배틀 해결 시작. (${PHASE_KO.BATTLE_RESOLVE})`);
  pushLog(`P1 선택: ${cardLabel(c1)}`);
  pushLog(`P2 선택: ${cardLabel(c2)}`);

  const sp1 = Number(c1?.stats?.speed || 0);
  const sp2 = Number(c2?.stats?.speed || 0);

  // MVP: 속도 큰 쪽이 먼저 때림, 같으면 동시
  if (sp1 > sp2) {
    const dmg = computeDamage(c1, c2);
    game.players[2].hp -= dmg;
    pushLog(`P1 선공! P2에게 ${dmg} 데미지 (P2 HP: ${game.players[2].hp})`);
  } else if (sp2 > sp1) {
    const dmg = computeDamage(c2, c1);
    game.players[1].hp -= dmg;
    pushLog(`P2 선공! P1에게 ${dmg} 데미지 (P1 HP: ${game.players[1].hp})`);
  } else {
    const dmg1 = computeDamage(c1, c2);
    const dmg2 = computeDamage(c2, c1);
    game.players[2].hp -= dmg1;
    game.players[1].hp -= dmg2;
    pushLog(`동시 타격! P2 -${dmg1} (HP ${game.players[2].hp}), P1 -${dmg2} (HP ${game.players[1].hp})`);
  }

  // 사용 카드 처리 (MVP)
  // 패에서 제거 -> 리스트로 복귀 (브레이크/콤보/효과는 다음 단계에서 DSL로 처리)
  finalizeUsedCard(1);
  finalizeUsedCard(2);

  // KO 체크
  if (game.players[1].hp <= 0 || game.players[2].hp <= 0) {
    const winner = game.players[1].hp <= 0 && game.players[2].hp <= 0 ? "무승부" :
      (game.players[1].hp <= 0 ? "P2 승리" : "P1 승리");
    pushLog(`게임 종료: ${winner}`);
  } else {
    pushLog("배틀 해결 종료.");
  }
}

function finalizeUsedCard(pid) {
  const p = game.players[pid];
  const usedId = p.battle;
  if (!usedId) return;

  // hand에서 제거
  const idx = p.hand.indexOf(usedId);
  if (idx >= 0) p.hand.splice(idx, 1);

  // MVP: 사용 카드 리스트로 복귀 (계속 게임이 돌아가게)
  p.list.push(usedId);

  // battle 비움
  p.battle = null;
}

function onEnterEnd() {
  pushLog(`턴 종료. (${PHASE_KO.END})`);
  // 턴 넘기기
  game.turn += 1;
  game.active = game.active === 1 ? 2 : 1;

  // 다음 턴 READY로 자동 이동(버튼 한 번 더 누르게 할 수도 있는데, UX 위해 자동으로)
  game.phase = "READY";
  onEnterReady();
}

// ---------- interactions ----------
function onClickList(pid, cardId) {
  if (!game) return;
  if (game.phase !== "GET") return;
  if (game.active !== pid) return;

  const p = game.players[pid];
  if (p.gotThisTurn) return;

  const idx = p.list.indexOf(cardId);
  if (idx < 0) return;

  p.list.splice(idx, 1);
  p.hand.push(cardId);
  p.gotThisTurn = true;
  pushLog(`P${pid} GET: 리스트 → 패 : ${cardLabel(cardById[cardId])}`);
  renderAll();
}

function onClickHand(pid, cardId) {
  if (!game) return;
  if (game.phase !== "BATTLE_SELECT") return;

  const p = game.players[pid];
  if (!p.hand.includes(cardId)) return;

  p.battle = cardId;
  pushLog(`P${pid} 배틀 카드 선택: ${cardLabel(cardById[cardId])}`);
  renderAll();

  // 둘 다 선택되면 다음 페이즈 버튼 활성화
}

function renderCardTile(card, clickable, onClick) {
  const jt = card?.judgementText || (card?.judgement ? `${card.judgement.height ?? ""} ${card.judgement.limb ?? ""}` : "");
  const sp = card?.stats?.speed ?? "";
  const dm = card?.stats?.damage ?? "";
  const cls = `cardTile ${clickable ? "clickable" : ""}`;

  const div = document.createElement("div");
  div.className = cls;
  div.innerHTML = `
    <div class="title"><b>${card?.name ?? "?"}</b></div>
    <div class="muted">${card?.id ?? ""}</div>
    <div class="muted">${card?.character ?? ""} · ${jt}</div>
    <div class="muted">SPD ${sp} · DMG ${dm}</div>
  `;
  if (clickable) {
    div.addEventListener("click", onClick);
  }
  return div;
}

function renderZone(elId, ids, clickablePredicate, onClickFactory) {
  const el = $(elId);
  if (!el) return;
  el.innerHTML = "";

  if (!ids || !ids.length) {
    el.innerHTML = `<div class="muted">비어있음</div>`;
    return;
  }

  for (const id of ids) {
    const card = cardById[id];
    if (!card) continue;
    const clickable = clickablePredicate ? clickablePredicate(id) : false;
    el.appendChild(renderCardTile(card, clickable, onClickFactory ? onClickFactory(id) : null));
  }
}

function renderBattle(elId, cardId) {
  const el = $(elId);
  if (!el) return;
  el.innerHTML = "";

  if (!cardId) {
    el.innerHTML = `<div class="muted">선택 없음</div>`;
    return;
  }
  const card = cardById[cardId];
  if (!card) {
    el.innerHTML = `<div class="muted">알 수 없는 카드</div>`;
    return;
  }
  el.appendChild(renderCardTile(card, false, null));
}

function renderStats() {
  if (!game) return;

  const p1 = game.players[1];
  const p2 = game.players[2];

  setText("p1Stats", `HP ${p1.hp} · FP ${p1.fp} · Lumen ${p1.lumen} · Hand ${p1.hand.length} · List ${p1.list.length} · Break ${p1.break.length}`);
  setText("p2Stats", `HP ${p2.hp} · FP ${p2.fp} · Lumen ${p2.lumen} · Hand ${p2.hand.length} · List ${p2.list.length} · Break ${p2.break.length}`);
}

function renderPhaseUI() {
  if (!game) {
    setText("matchStatus", "대전이 시작되지 않았습니다.");
    setText("phaseHint", "덱 저장 후 [대전 시작]을 눌러주세요. P2 덱이 없으면 P1 덱으로 자동 복제해 테스트합니다.");
    $("btnNextPhase").disabled = true;
    return;
  }

  setText("matchStatus", `턴 ${game.turn} · 활성 P${game.active} · 현재 페이즈: ${PHASE_KO[game.phase]}`);
  const A = game.active;

  if (game.phase === "GET") {
    setText("phaseHint", `P${A}: 리스트에서 1장을 클릭해 패로 가져오세요. 완료 후 [다음 페이즈].`);
  } else if (game.phase === "BATTLE_SELECT") {
    setText("phaseHint", `P1과 P2 모두 패에서 1장을 클릭해 배틀존에 올리세요. 완료 후 [다음 페이즈].`);
  } else {
    setText("phaseHint", `[다음 페이즈]를 눌러 진행하세요.`);
  }

  $("btnNextPhase").disabled = !canAdvancePhase();
}

function renderAll() {
  renderPhaseUI();
  renderStats();

  if (!game) {
    renderLog();
    return;
  }

  // P1
  renderZone(
    "p1List",
    game.players[1].list,
    (id) => game.phase === "GET" && game.active === 1,
    (id) => () => onClickList(1, id)
  );
  renderZone(
    "p1Hand",
    game.players[1].hand,
    (id) => game.phase === "BATTLE_SELECT",
    (id) => () => onClickHand(1, id)
  );
  renderBattle("p1Battle", game.players[1].battle);
  renderZone("p1Break", game.players[1].break, null, null);

  // P2
  renderZone(
    "p2List",
    game.players[2].list,
    (id) => game.phase === "GET" && game.active === 2,
    (id) => () => onClickList(2, id)
  );
  renderZone(
    "p2Hand",
    game.players[2].hand,
    (id) => game.phase === "BATTLE_SELECT",
    (id) => () => onClickHand(2, id)
  );
  renderBattle("p2Battle", game.players[2].battle);
  renderZone("p2Break", game.players[2].break, null, null);

  renderLog();
}

// ---------- buttons ----------
function wireMatchButtons() {
  $("btnStartMatch")?.addEventListener("click", () => {
    try {
      newGameFromStoredDecks();
      $("btnNextPhase").disabled = !canAdvancePhase();
    } catch (e) {
      setText("matchStatus", "❌ " + (e.message || String(e)));
    }
  });

  $("btnNextPhase")?.addEventListener("click", () => {
    try {
      nextPhase();
      $("btnNextPhase").disabled = !canAdvancePhase();
    } catch (e) {
      pushLog("오류: " + (e.message || String(e)));
      renderAll();
    }
  });

  $("btnResetMatch")?.addEventListener("click", () => {
    game = null;
    setText("matchStatus", "리셋됨");
    setText("phaseHint", "");
    renderAll();
  });
}

// ---------- boot ----------
async function boot() {
  wireDeckPasteUI();
  wireMatchButtons();

  setDeckStatus("카드 DB 로딩 중...");
  try {
    await loadCardsDb();
    if (!allCards.length) {
      setDeckStatus("❌ 카드 DB 0장. /api/cards 확인");
    } else {
      setDeckStatus(`카드 ${allCards.length}장 로딩 완료. 덱 저장 후 대전 시작하세요.`);
    }
  } catch (e) {
    setDeckStatus("❌ 카드 DB 로딩 실패: " + (e.message || String(e)));
  }

  renderAll();
}

window.addEventListener("load", boot);
