export type Phase = "READY" | "BATTLE" | "GET" | "RECOVERY";
export type Height = "HIGH" | "MID" | "LOW";
export type Limb = "HAND" | "FOOT";
export type SpecialJudge = "NONE" | "EVADE_HIGH" | "GRAB";
export type CardType = "ATTACK" | "DEFENSE";
export type PlayerId = "P1" | "P2";

export interface AttackJudge {
  height: Height;
  limb: Limb;
}

export interface CardBase {
  id: string;        // internal id
  setId: string;     // AWL-AT-055 같은 코드
  character: string;
  name: string;
  type: CardType;
  keywords: string[];
  effectsRaw: string; // 원문 텍스트 유지
}

export interface AttackCard extends CardBase {
  type: "ATTACK";
  judge: AttackJudge;
  specialJudge: SpecialJudge;
  damage: number;
  speed: number;
  fpOnHit: number | null;
  fpOnGuard: number | null;
  fpOnCounter: number | null;
}

export interface DefenseCard extends CardBase {
  type: "DEFENSE";
  // MVP: 방어/회피 가능한 높이(임시). 나중에 룰북 기준으로 확장
  guardHeights: Height[];
  evadeHeights: Height[];
}

export type Card = AttackCard | DefenseCard;

export type CombatEvent =
  | { t: "PHASE"; phase: Phase }
  | { t: "READY_SUBMIT"; p: PlayerId; cardId: string }
  | { t: "READY_REVEAL"; p1: string; p2: string }
  | { t: "FP_APPLIED"; p: PlayerId; fpUsed: number; baseSpeed?: number; finalSpeed?: number }
  | { t: "BATTLE_RESULT"; result: string; note?: string }
  | { t: "DAMAGE"; from: PlayerId; to: PlayerId; amount: number }
  | { t: "FP_CHANGE"; p: PlayerId; delta: number; reason: string }
  | { t: "STATE"; p1hp: number; p2hp: number; p1fp: number; p2fp: number };

export interface PlayerConfig {
  id: PlayerId;
  hp: number;
  fp?: number;
  hand: string[];
  list: string[];
}

export interface PlayerState {
  hp: number;
  fp: number;
  hand: string[];
  list: string[];
  battleCardId: string | null;
}
