import { GameState, Seat, computePriority, canTakeFromList } from "./state";

export function advancePhase(state: GameState): GameState {
  const next = structuredClone(state);
  const order: GameState["phase"][] = ["LUMEN", "READY", "BATTLE", "GET", "RECOVERY"];
  const idx = order.indexOf(next.phase as any);
  const nextPhase = order[(idx + 1) % order.length];

  // RECOVERY -> 다음 턴
  if (next.phase === "RECOVERY") {
    next.turn += 1;
    next.log.push(`턴 ${next.turn} 시작`);
  }

  next.phase = nextPhase;

  // GET 진입 직전에 우선권 이동
  if (next.phase === "GET") {
    next.priority = computePriority(next.priority, next.players.P1, next.players.P2);
    next.log.push(`겟 페이즈: 우선권은 ${next.priority}`);
  } else {
    next.log.push(`${next.phase} 페이즈`);
  }

  return next;
}

export function getTakeFromList(state: GameState, seat: Seat, cardId: string): GameState {
  const next = structuredClone(state);
  if (next.phase !== "GET") return next;

  const me = next.players[seat];
  const opp: Seat = seat === "P1" ? "P2" : "P1";

  if (me.skipGet) {
    next.log.push(`${seat}: 겟 페이즈 스킵 상태`);
    return next;
  }
  if (me.hand.length >= me.handLimit) {
    next.log.push(`${seat}: 패 상한(${me.handLimit})이라 겟 불가`);
    return next;
  }
  const idx = me.list.indexOf(cardId);
  if (idx === -1) {
    next.log.push(`${seat}: 리스트에 없는 카드`);
    return next;
  }

  // “상대에게 보여준 뒤” 패로
  me.list.splice(idx, 1);
  me.hand.push(cardId);
  next.log.push(`${seat}: 리스트 카드 공개 → 패로 (${cardId})`);

  // 우선권 플레이어부터 처리 후, 상대 차례로 넘기는 아주 단순한 방식(=GET 행동권 토글)
  next.priority = opp;
  return next;
}

export function getSkip(state: GameState, seat: Seat): GameState {
  const next = structuredClone(state);
  if (next.phase !== "GET") return next;
  next.log.push(`${seat}: 겟 페이즈 선택 스킵`);
  next.priority = seat === "P1" ? "P2" : "P1";
  return next;
}
