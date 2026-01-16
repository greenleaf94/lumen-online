// public/deck.js
let allCards = [];
let deck = [];

function $(id) { return document.getElementById(id); }

function normalizeCards(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.cards)) return payload.cards;
  return [];
}

function saveDeck() {
  localStorage.setItem("lumen_deck_v1", JSON.stringify(deck));
}

function loadDeck() {
  try {
    const v = JSON.parse(localStorage.getItem("lumen_deck_v1") || "[]");
    if (Array.isArray(v)) deck = v;
  } catch {}
}

function renderDeck() {
  const el = $("deckList");
  if (!el) return;
  el.innerHTML = "";

  const counts = new Map();
  for (const id of deck) counts.set(id, (counts.get(id) || 0) + 1);

  const rows = [...counts.entries()]
    .map(([id, cnt]) => {
      const c = allCards.find(x => x.id === id);
      const name = c ? c.name : id;
      const ch = c ? c.character : "?";
      return { id, cnt, name, ch };
    })
    .sort((a,b)=> (a.ch+a.name).localeCompare(b.ch+b.name));

  const total = deck.length;
  $("deckCount").textContent = String(total);

  for (const r of rows) {
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `
      <div class="left">
        <b>[${r.ch}]</b> ${r.name} <span class="muted">(${r.id})</span>
      </div>
      <div class="right">
        <span class="pill">x${r.cnt}</span>
        <button data-id="${r.id}" class="btnSmall">-</button>
        <button data-id="${r.id}" class="btnSmall">+</button>
      </div>
    `;
    div.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (!id) return;
        if (btn.textContent === "+") deck.push(id);
        else {
          const idx = deck.lastIndexOf(id);
          if (idx >= 0) deck.splice(idx, 1);
        }
        saveDeck();
        renderDeck();
      });
    });
    el.appendChild(div);
  }
}

function renderCards(list) {
  const el = $("cardList");
  if (!el) return;
  el.innerHTML = "";

  if (!list.length) {
    el.innerHTML = `<div class="muted">표시할 카드가 없습니다.</div>`;
    return;
  }

  for (const c of list) {
    const div = document.createElement("div");
    div.className = "row";
    const jt = c.judgementText || (c.judgement ? `${c.judgement.height ?? ""} ${c.judgement.limb ?? ""}` : "");
    const sp = c.stats?.speed ?? "";
    const dm = c.stats?.damage ?? "";
    div.innerHTML = `
      <div class="left">
        <div><b>[${c.character}]</b> ${c.name}</div>
        <div class="muted">${c.id} · ${jt} · SPD ${sp} · DMG ${dm}</div>
      </div>
      <div class="right">
        <button data-id="${c.id}" class="btn">덱에 추가</button>
      </div>
    `;
    div.querySelector("button").addEventListener("click", () => {
      deck.push(c.id);
      saveDeck();
      renderDeck();
    });
    el.appendChild(div);
  }
}

function applyFilter() {
  const hero = $("heroFilter").value;
  const q = ($("search").value || "").trim().toLowerCase();

  let list = allCards;

  if (hero !== "ALL") {
    list = list.filter(c => c.character === hero);
  }
  if (q) {
    list = list.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.id || "").toLowerCase().includes(q)
    );
  }

  renderCards(list.slice(0, 300)); // 너무 많으면 브라우저가 느려져서 상한
}

async function boot() {
  loadDeck();
  renderDeck();

  $("status").textContent = "카드 DB 로딩 중...";

  const res = await fetch("/api/cards");
  const payload = await res.json();

  allCards = normalizeCards(payload);

  if (!allCards.length) {
    $("status").textContent = "카드가 0장입니다. /api/cards/debug 를 확인하세요.";
  } else {
    $("status").textContent = `카드 ${allCards.length}장 로딩 완료`;
  }

  // hero dropdown 구성
  const heroes = [...new Set(allCards.map(c => c.character))].filter(Boolean).sort();
  const heroSel = $("heroFilter");
  heroSel.innerHTML = `<option value="ALL">전체</option>` + heroes.map(h => `<option value="${h}">${h}</option>`).join("");

  $("heroFilter").addEventListener("change", applyFilter);
  $("search").addEventListener("input", applyFilter);

  $("btnClearDeck").addEventListener("click", () => {
    deck = [];
    saveDeck();
    renderDeck();
  });

  $("btnExport").addEventListener("click", () => {
    const obj = { version: 1, deck };
    prompt("복사해서 저장하세요 (deck json):", JSON.stringify(obj));
  });

  applyFilter();
}

window.addEventListener("load", boot);
