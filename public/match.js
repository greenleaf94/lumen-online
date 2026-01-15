let cards = [];
let deck = null;

let myList = [];
let myHand = [];

function loadDeck() {
  const raw = localStorage.getItem("lumen_deck_v1_1");
  if (!raw) return null;
  return JSON.parse(raw);
}
function byId(id) {
  return cards.find(c => c.id === id);
}

function render() {
  const deckInfo = document.getElementById("deckInfo");
  if (!deck) {
    deckInfo.innerHTML = "<b>덱이 없음</b> — / 로 돌아가서 덱을 저장해줘.";
    return;
  }

  deckInfo.innerHTML = `
    <b>캐릭터:</b> ${deck.character}<br/>
    <b>특성:</b> ${deck.trait ? byId(deck.trait)?.name : "없음"}<br/>
    <b>기술:</b> ${deck.techniques.length}/20
  `;

  document.getElementById("myList").innerHTML = myList.map(id => {
    const c = byId(id);
    return `
      <div class="cardLine">
        <div><b>${c.name}</b> <small>${c.id}</small></div>
        <div><button data-get="${c.id}">겟(패로)</button></div>
      </div>
    `;
  }).join("");

  document.getElementById("myHand").innerHTML = myHand.map(id => {
    const c = byId(id);
    return `<div class="cardLine"><div><b>${c.name}</b></div><div><small>${c.effectsText || ""}</small></div></div>`;
  }).join("");
}

function doGet(cardId) {
  // 룰북: 리스트에서 1장 보여주고 패에 넣기(지금은 로컬 시연만)
  const idx = myList.indexOf(cardId);
  if (idx === -1) return;
  myList.splice(idx, 1);
  myHand.push(cardId);
  render();
}

async function init() {
  const res = await fetch("/api/cards");
  const db = await res.json();
  cards = db.cards;

  deck = loadDeck();
  if (deck) {
    myList = [...deck.techniques]; // 20장
    myHand = []; // 시작 패는 일단 0장(추후 룰 반영)
  }

  document.getElementById("reloadDeck").addEventListener("click", () => {
    deck = loadDeck();
    if (!deck) return alert("저장된 덱이 없어!");
    myList = [...deck.techniques];
    myHand = [];
    render();
  });

  document.body.addEventListener("click", (e) => {
    const gid = e.target.getAttribute("data-get");
    if (gid) doGet(gid);
  });

  render();
}

init();
