let cards = [];
let state = {
  character: "",
  trait: null,      // cardId
  techniques: [],   // cardId[]
};

function save() {
  localStorage.setItem("lumen_deck_v1_1", JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem("lumen_deck_v1_1");
  if (raw) state = JSON.parse(raw);
}

function byId(id) {
  return cards.find(c => c.id === id);
}

function render() {
  const traitArea = document.getElementById("traitArea");
  const techArea = document.getElementById("techArea");
  const pool = document.getElementById("cardPool");
  const search = document.getElementById("search").value.trim().toLowerCase();

  traitArea.innerHTML = state.trait ? cardLine(byId(state.trait), true) : "<em>미선택</em>";
  techArea.innerHTML = state.techniques.map(id => cardLine(byId(id), true)).join("");

  const filtered = cards
    .filter(c => c.character === state.character)
    .filter(c => (c.name || "").toLowerCase().includes(search))
    .filter(c => c.judgement !== "특성"); // 풀에는 특성 제외(아래에서 특성은 별도로 선택 UI로 처리)

  pool.innerHTML = filtered.map(c => cardLine(c, false)).join("");
}

function cardLine(card, inDeck) {
  if (!card) return "";
  const btn = inDeck
    ? `<button data-remove="${card.id}">빼기</button>`
    : `<button data-add="${card.id}">추가</button>`;

  return `
    <div class="cardLine">
      <div>
        <b>${card.name}</b> <small>(${card.id})</small><br/>
        <small>${card.judgement} / ${card.specialJudgement} | D:${card.stats.damage ?? "X"} S:${card.stats.speed ?? "X"}</small><br/>
        <small>${card.effectsText || ""}</small>
      </div>
      <div>${btn}</div>
    </div>
  `;
}

function canAdd(card) {
  // 같은 이름 2장 이상 불가
  const already = state.techniques.map(byId).some(c => c && c.name === card.name);
  if (already) return { ok: false, reason: "같은 이름은 1장만 가능" };

  if (card.judgement === "특성") {
    if (state.trait) return { ok: false, reason: "특성은 1장만" };
    return { ok: true };
  }

  if (state.techniques.length >= 20) return { ok: false, reason: "기술 20장 꽉 참" };
  return { ok: true };
}

function addCard(id) {
  const card = byId(id);
  if (!card) return;

  if (card.judgement === "특성") {
    const chk = canAdd(card);
    if (!chk.ok) return alert(chk.reason);
    state.trait = id;
    save();
    render();
    return;
  }

  const chk = canAdd(card);
  if (!chk.ok) return alert(chk.reason);
  state.techniques.push(id);
  save();
  render();
}

function removeCard(id) {
  if (state.trait === id) state.trait = null;
  state.techniques = state.techniques.filter(x => x !== id);
  save();
  render();
}

async function init() {
  load();

  const res = await fetch("/api/cards");
  const db = await res.json();
  cards = db.cards;

  const chars = Array.from(new Set(cards.map(c => c.character))).sort();
  const sel = document.getElementById("characterSelect");
  sel.innerHTML = chars.map(ch => `<option value="${ch}">${ch}</option>`).join("");

  if (!state.character) state.character = chars[0] || "";
  sel.value = state.character;

  sel.addEventListener("change", () => {
    state.character = sel.value;
    state.trait = null;
    state.techniques = [];
    save();
    render();
  });

  document.getElementById("clearDeckBtn").addEventListener("click", () => {
    if (!confirm("덱을 초기화할까?")) return;
    state.trait = null;
    state.techniques = [];
    save();
    render();
  });

  document.getElementById("saveDeckBtn").addEventListener("click", () => {
    save();
    alert("덱 저장 완료! match.html에서 불러올 수 있어.");
  });

  document.getElementById("search").addEventListener("input", render);

  document.body.addEventListener("click", (e) => {
    const add = e.target.getAttribute("data-add");
    const rem = e.target.getAttribute("data-remove");
    if (add) addCard(add);
    if (rem) removeCard(rem);
  });

  // 특성 선택 풀(캐릭터+특성만)
  const traitPool = cards.filter(c => c.character === state.character && c.judgement === "특성");
  const traitArea = document.getElementById("traitArea");
  traitArea.insertAdjacentHTML("beforebegin", `
    <div class="panel">
      <h3>특성 카드 선택</h3>
      ${traitPool.map(c => `<div class="cardLine"><div><b>${c.name}</b> <small>${c.id}</small></div><div><button data-add="${c.id}">선택</button></div></div>`).join("")}
    </div>
  `);

  render();
}

init();
