let socket = null;
let seat = null;
let roomId = null;

let cards = [];
const deck = [];     // cardId[]
const startHand = []; // cardId[]
const startList = []; // cardId[]

const el = (id) => document.getElementById(id);

function cardById(id){ return cards.find(c => c.id === id); }

function renderPool(){
  const poolEl = el("pool");
  poolEl.innerHTML = "";
  cards.forEach(c => {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `<div><b>${c.name}</b> <span class="small">(${c.judgement}) spd:${c.speed ?? "-"} dmg:${c.damage ?? "-"}</span></div>`;
    const btn = document.createElement("button");
    btn.textContent = "덱에 추가";
    btn.disabled = deck.length >= 20 || deck.includes(c.id);
    btn.onclick = () => { deck.push(c.id); renderDeck(); };
    row.appendChild(btn);
    poolEl.appendChild(row);
  });
}

function renderDeck(){
  el("deckCount").textContent = String(deck.length);
  const deckEl = el("deck");
  deckEl.innerHTML = "";
  deck.forEach(id => {
    const c = cardById(id);
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `<div><b>${c.name}</b> <span class="small">${c.id}</span></div>`;
    const btn = document.createElement("button");
    btn.textContent = "제거";
    btn.onclick = () => {
      const i = deck.indexOf(id);
      if(i>=0) deck.splice(i,1);
      // 선택도 같이 정리
      [startHand, startList].forEach(arr => {
        const j = arr.indexOf(id);
        if(j>=0) arr.splice(j,1);
      });
      renderDeck(); renderSetupPick(); renderPool();
    };
    row.appendChild(btn);
    deckEl.appendChild(row);
  });

  el("toSetupBtn").disabled = deck.length !== 20;
  renderPool();
  renderSetupPick();
}

function renderSetupPick(){
  el("handCount").textContent = String(startHand.length);
  el("listCount").textContent = String(startList.length);

  const handEl = el("handPick"); handEl.innerHTML = "";
  const listEl = el("listPick"); listEl.innerHTML = "";

  // deck에서 아직 안 뽑힌 카드들
  const remaining = deck.filter(id => !startHand.includes(id) && !startList.includes(id));

  remaining.forEach(id => {
    const c = cardById(id);
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `<div><b>${c.name}</b> <span class="small">${c.id}</span></div>`;
    const b1 = document.createElement("button");
    b1.textContent = "패로";
    b1.disabled = startHand.length >= 5;
    b1.onclick = () => { startHand.push(id); renderSetupPick(); };

    const b2 = document.createElement("button");
    b2.textContent = "리스트로";
    b2.disabled = startList.length >= 9;
    b2.onclick = () => { startList.push(id); renderSetupPick(); };

    row.appendChild(b1); row.appendChild(b2);
    // 남은 카드들은 패 영역에 “선택 후보”로 보여주자(가독성 위해)
    handEl.appendChild(row.cloneNode(true));
  });

  // 선택된 패/리스트 표시
  const showPicked = (targetEl, arr) => {
    targetEl.innerHTML = "";
    arr.forEach(id => {
      const c = cardById(id);
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `<div><b>${c.name}</b> <span class="small">${c.id}</span></div>`;
      const btn = document.createElement("button");
      btn.textContent = "빼기";
      btn.onclick = () => { const i = arr.indexOf(id); if(i>=0) arr.splice(i,1); renderSetupPick(); };
      row.appendChild(btn);
      targetEl.appendChild(row);
    });
  };
  showPicked(handEl, startHand);
  showPicked(listEl, startList);

  el("submitDeckBtn").disabled = !(deck.length === 20 && startHand.length === 5 && startList.length === 9 && socket && roomId && seat);
}

async function boot(){
  cards = await fetch("/api/cards").then(r=>r.json());
  renderPool(); renderDeck(); renderSetupPick();
}
boot();

el("joinBtn").onclick = async () => {
  const rid = el("roomId").value.trim();
  if(!rid) return alert("room id를 입력해줘");
  roomId = rid;

  socket = io();

  socket.emit("room:join", roomId, (res) => {
    if(!res.ok) return alert(res.error);
    seat = res.seat;
    el("joinInfo").textContent = `입장 완료: ${roomId} / 내 자리: ${seat}`;
    el("advanceBtn").disabled = false;
  });

  socket.on("room:update", (snap) => {
    el("readyInfo").textContent = `Ready: P1=${!!snap.ready?.P1} / P2=${!!snap.ready?.P2}`;
  });

  socket.on("game:state", (state) => renderGame(state));
};

el("toSetupBtn").onclick = () => {
  alert("이제 시작 패 5장 / 리스트 9장을 골라서 제출하면 돼");
};

el("submitDeckBtn").onclick = () => {
  const side = deck.filter(id => !startHand.includes(id) && !startList.includes(id));
  socket.emit("deck:submit", { roomId, seat, hand: startHand, list: startList, side }, (res) => {
    if(!res.ok) alert(res.error);
  });
};

el("advanceBtn").onclick = () => {
  socket.emit("game:advance", roomId);
};

el("getSkipBtn").onclick = () => {
  socket.emit("get:skip", { roomId, seat });
};

function renderGame(state){
  el("gameMeta").textContent = `턴 ${state.turn} / 페이즈 ${state.phase} / 우선권 ${state.priority}`;
  el("log").textContent = state.log.join("\n");

  const me = state.players[seat];
  const myHandEl = el("myHand");
  const myListEl = el("myList");
  myHandEl.innerHTML = "";
  myListEl.innerHTML = "";

  me.hand.forEach(id => {
    const c = cardById(id);
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `<div><b>${c?.name ?? id}</b> <span class="small">${id}</span></div>`;
    myHandEl.appendChild(row);
  });

  me.list.forEach(id => {
    const c = cardById(id);
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `<div><b>${c?.name ?? id}</b> <span class="small">${id}</span></div>`;
    const btn = document.createElement("button");
    btn.textContent = "GET: 패로";
    const canAct = state.phase === "GET" && state.priority === seat;
    btn.disabled = !canAct;
    btn.onclick = () => socket.emit("get:take", { roomId, seat, cardId: id });
    row.appendChild(btn);
    myListEl.appendChild(row);
  });

  // GET에서만 버튼 활성
  el("getSkipBtn").disabled = !(state.phase === "GET" && state.priority === seat);
}
