import { RULES } from "./rules";

export type Seat = "P1" | "P2";
export type Phase = "DECK" | "LUMEN" | "READY" | "BATTLE" | "GET" | "RECOVERY";

export type PlayerState = {
  seat: Seat;
  hp: number;
  fp: number;
  handLimit: number;     // 임시
  hand: string[];        // cardId[]
  list: string[];        // cardId[]
  side: string[];        // cardId[]
  skipGet: boolean;      // “대응하지 않음” 등으로 get 스킵될 때
};

export type GameState = {
  roomId: string;
  turn: number;
  phase: Phase;
  priority: Seat;        // 우선권
  log: string[];
  players: Record<Seat, PlayerState>;
};

export function createInitialGame(roomId: string, p1: Omit<PlayerState, "seat">, p2: Omit<PlayerState, "seat">): GameState {
  return {
    roomId,
    turn: 1,
    phase: "LUMEN",
    priority: "P1",
    log: ["게임 시작! (임시로 루멘→레디→배틀→겟→리커버리 순서)"],
    players: {
      P1: { seat: "P1", ...p1 },
      P2: { seat: "P2", ...p2 }
    }
  };
}

export function computePriority(prev: "P1" | "P2", p1: PlayerState, p2: PlayerState): "P1" | "P2" {
  // 우선권: FP 높은 쪽, 같으면 HP, 같으면 패 많은 쪽, 전부 같으면 이전 우선권 유지
  if (p1.fp !== p2.fp) return p1.fp > p2.fp ? "P1" : "P2";
  if (p1.hp !== p2.hp) return p1.hp > p2.hp ? "P1" : "P2";
  if (p1.hand.length !== p2.hand.length) return p1.hand.length > p2.hand.length ? "P1" : "P2";
  return prev;
}

export function canTakeFromList(p: PlayerState) {
  return p.hand.length < p.handLimit && p.list.length > 0;
}

export function defaultPlayerState(): Omit<PlayerState, "seat"> {
  return {
    hp: 20,
    fp: 0,
    handLimit: RULES.DEFAULT_HAND_LIMIT,
    hand: [],
    list: [],
    side: [],
    skipGet: false
  };
}
