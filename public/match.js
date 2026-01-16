// ===== Deck Import/Export (Paste JSON) =====
function setStatus(msg) {
  const el = document.getElementById("deckLoadStatus");
  if (el) el.textContent = msg;
}

function normalizeDeckPayload(payload) {
  // 덱빌더에서 export한 형태: {version:1, deck:[id,id,...]}
  if (payload && Array.isArray(payload.deck)) {
    return payload.deck;
  }
  // 혹시 사용자가 바로 배열만 붙여넣었을 때
  if (Array.isArray(payload)) {
    return payload;
  }
  throw new Error("덱 JSON 형식이 올바르지 않습니다. { deck: [...] } 형태여야 해요.");
}

function saveDeckForPlayer(playerKey, deckArr) {
  localStorage.setItem(playerKey, JSON.stringify(deckArr));
}

function loadDeckForPlayer(playerKey) {
  try {
    return JSON.parse(localStorage.getItem(playerKey) || "[]");
  } catch {
    return [];
  }
}

function wireDeckPasteUI() {
  const input = document.getElementById("deckJsonInput");
  const btnP1 = document.getElementById("btnPasteP1");
  const btnP2 = document.getElementById("btnPasteP2");
  const btnClear = document.getElementById("btnClearDecks");

  if (!input || !btnP1 || !btnP2 || !btnClear) return;

  btnP1.addEventListener("click", () => {
    try {
      const payload = JSON.parse(input.value || "{}");
      const deckArr = normalizeDeckPayload(payload);
      saveDeckForPlayer("lumen_deck_p1", deckArr);
      setStatus(`✅ 플레이어1 덱 저장 완료 (총 ${deckArr.length}장)`);
    } catch (e) {
      setStatus("❌ " + (e.message || String(e)));
    }
  });

  btnP2.addEventListener("click", () => {
    try {
      const payload = JSON.parse(input.value || "{}");
      const deckArr = normalizeDeckPayload(payload);
      saveDeckForPlayer("lumen_deck_p2", deckArr);
      setStatus(`✅ 플레이어2 덱 저장 완료 (총 ${deckArr.length}장)`);
    } catch (e) {
      setStatus("❌ " + (e.message || String(e)));
    }
  });

  btnClear.addEventListener("click", () => {
    localStorage.removeItem("lumen_deck_p1");
    localStorage.removeItem("lumen_deck_p2");
    setStatus("🧹 플레이어1/2 덱 초기화 완료");
  });

  // 현재 저장된 덱 상태 표시
  const p1 = loadDeckForPlayer("lumen_deck_p1");
  const p2 = loadDeckForPlayer("lumen_deck_p2");
  setStatus(`현재 저장됨: P1 ${p1.length}장 / P2 ${p2.length}장`);
}

// match.js가 로드될 때 UI 연결
window.addEventListener("load", wireDeckPasteUI);
