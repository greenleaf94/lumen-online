// public/match.js

let allCards = [];
let cardById = {};
let state = {
  p1: { deckIds: [], hand: [], list: [], side: [] },
  p2: { deckIds: [], hand: [], list: [], side: [] },
};

function $(id) { return document.getElementById(id); }

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
    if (Array.isArray(v)) return v;
    return [];
  } catch {
    return [];
  }
}

function normalizeDeckPayload(payload) {
  // deck builder export: { version: 1, deck: [id, id, ...] }
  if (payload && Array.isArray(payload.deck)) return payload.deck;
  // allow raw array paste
  if (Array.isArray(payload)) return payload;
  throw new Error("덱 JSON 형식이 올바르지 않습니다. { deck: [...] } 형태여야 해요.");
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initZonesFromDeckIds(deckIds) {
  // MVP 룰: 20장 중 특수 제외 기술들로
  // hand 5, list 9, side 나머지(+특수 포함)
  const cards = deckIds.map(id => cardById[id]).filter(Boolean);

  const specials = cards.filter(c => c.kind === "special");
  const tech = cards.filter(c => c.kind !== "special"); // attack/defense 등

  shuffle(tech);

  const hand = tech.slice(0, 5);
  const list = tech.slice(5, 14);
  const side = tech.slice(14).concat(specials);

  return { hand, list, side };
}

function renderCardMini(c) {
  const jt = c.judgementText || (c.judgement ? `${c.judgement.height ?? ""} ${c.judgement.limb ?? ""}` : "");
  const sp = c.stats?.speed ?? "";
  const dm = c.stats?.damage ?? "";
  return `
    <div class="miniCard">
      <div><b>${c.name}</b></div>
      <div class="muted">${c.id}</div>
      <div class="muted">${c.character} · ${jt}</div>
      <div class="muted">SPD ${sp} · DMG ${dm}</div>
    </div>
  `;
}

function renderZone(elId, cards) {
  const el = $(elId);
  if (!el) return;
  el.innerHTML = cards.length
    ? cards.map(renderCardMini).join("")
    : `<div class="muted">비어있음</div>`;
}

function renderDeckInfo() {
  const el = $("deckInfo");
  if (!el) return;

  const p1Count = state.p1.deckIds.length;
  const p2Count = state.p2.deckIds.length;

  el.innerHTML = `
    <div><b>저장된 덱</b></div>
    <div class="muted">P1: ${p1Count}장 / P2: ${p2Count}장</div>
    <div class="muted">※ 지금은 MVP로 P1 덱으로 "내 리스트/패"만 표시합니다.</div>
  `;
}

async function loadCardsDb() {
  const res = await fetch("/api/cards");
  const payload = await res.json();
  allCards = normalizeCards(payload);

  cardById = {};
  for (const c of allCards) cardById[c.id] = c;
}

function reloadDeckAndInitZones() {
  // 지금 화면은 "내 리스트/내 패"만 있으니 MVP로 P1 기준 표시
  state.p1.deckIds = loadDeckIdsFromStorage("lumen_deck_p1");
  state.p2.deckIds = loadDeckIdsFromStorage("lumen_deck_p2");

  const p1Zones = initZonesFromDeckIds(state.p1.deckIds);
  state.p1.hand = p1Zones.hand;
  state.p1.list = p1Zones.list;
  state.p1.side = p1Zones.side;

  renderDeckInfo();
  renderZone("myHand", state.p1.hand);
  renderZone("myList", state.p1.list);

  setDeckStatus(`✅ 덱 로드 완료: P1 ${state.p1.deckIds.length}장 / P2 ${state.p2.deckIds.length}장`);
}

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
      setDeckStatus(`✅ 플레이어1 덱 저장 완료 (총 ${deckArr.length}장)`);
    } catch (e) {
      setDeckStatus("❌ " + (e.message || String(e)));
    }
  });

  btnP2.addEventListener("click", () => {
    try {
      const payload = JSON.parse(input.value || "{}");
      const deckArr = normalizeDeckPayload(payload);
      localStorage.setItem("lumen_deck_p2", JSON.stringify(deckArr));
      setDeckStatus(`✅ 플레이어2 덱 저장 완료 (총 ${deckArr.length}장)`);
    } catch (e) {
      setDeckStatus("❌ " + (e.message || String(e)));
    }
  });

  btnClear.addEventListener("click", () => {
    localStorage.removeItem("lumen_deck_p1");
    localStorage.removeItem("lumen_deck_p2");
    setDeckStatus("🧹 플레이어1/2 덱 초기화 완료");
  });
}

function wireReloadButton() {
  const btn = $("reloadDeck");
  if (!btn) return;
  btn.addEventListener("click", () => {
    reloadDeckAndInitZones();
  });
}

async function boot() {
  wireDeckPasteUI();
  wireReloadButton();

  setDeckStatus("카드 DB 로딩 중...");
  await loadCardsDb();

  if (!allCards.length) {
    setDeckStatus("❌ 카드 DB가 0장입니다. /api/cards 를 확인하세요.");
    return;
  }

  reloadDeckAndInitZones();
}

window.addEventListener("load", boot);
