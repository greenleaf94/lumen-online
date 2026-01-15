import { CARD_MAP } from "./cards_setsumei.js";
import type { AttackCard, Card, CombatEvent, DefenseCard, Phase, PlayerConfig, PlayerId, PlayerState } from "./types.js";

function other(p: PlayerId): PlayerId {
  return p === "P1" ? "P2" : "P1";
}

// FP 보정(임시 규칙): FP>0이면 speed - FP, FP<0이면 speed + |FP|
function applyFpToSpeed(baseSpeed: number, fp: number): number {
  if (fp >= 0) return Math.max(0, baseSpeed - fp);
  return baseSpeed + Math.abs(fp);
}

// 특수판정(테스트용): EVADE_HIGH = 상대가 HIGH 공격 + 상대 원본 속도 <= 6이면 회피 가능
function canSpecialEvade(self: AttackCard, opp: AttackCard): boolean {
  if (self.specialJudge === "EVADE_HIGH") {
    return opp.judge.height === "HIGH" && opp.speed <= 6;
  }
  return false;
}

export class Game {
  phase: Phase = "READY";
  events: CombatEvent[] = [];
  p: Record<PlayerId, PlayerState>;

  constructor(p1: PlayerConfig, p2: PlayerConfig) {
    this.p = {
      P1: { hp: p1.hp, fp: p1.fp ?? 0, hand: [...p1.hand], list: [...p1.list], battleCardId: null },
      P2: { hp: p2.hp, fp: p2.fp ?? 0, hand: [...p2.hand], list: [...p2.list], battleCardId: null }
    };
    this.emit({ t: "PHASE", phase: this.phase });
    this.emitState();
  }

  private emit(e: CombatEvent) {
    this.events.push(e);
  }

  private emitState() {
    this.emit({
      t: "STATE",
      p1hp: this.p.P1.hp,
      p2hp: this.p.P2.hp,
      p1fp: this.p.P1.fp,
      p2fp: this.p.P2.fp
    });
  }

  ready(p: PlayerId, cardId: string) {
    if (this.phase !== "READY") throw new Error("Not in READY phase");
    const st = this.p[p];
    if (!st.hand.includes(cardId)) throw new Error(`${p} has no card ${cardId}`);

    st.battleCardId = cardId;
    this.emit({ t: "READY_SUBMIT", p, cardId });

    if (this.p.P1.battleCardId && this.p.P2.battleCardId) {
      this.emit({ t: "READY_REVEAL", p1: this.p.P1.battleCardId, p2: this.p.P2.battleCardId });
      this.phase = "BATTLE";
      this.emit({ t: "PHASE", phase: this.phase });

      this.resolveBattle();

      // MVP 턴 진행(간단): GET → 각자 리스트 top 1장 드로우 → RECOVERY → READY
      this.phase = "GET";
      this.emit({ t: "PHASE", phase: this.phase });
      this.drawTop("P1");
      this.drawTop("P2");

      this.phase = "RECOVERY";
      this.emit({ t: "PHASE", phase: this.phase });

      this.phase = "READY";
      this.emit({ t: "PHASE", phase: this.phase });
      this.emitState();
    }
  }

  private drawTop(p: PlayerId) {
    const st = this.p[p];
    const top = st.list.shift();
    if (top) st.hand.push(top);
  }

  private moveBattleToList(p: PlayerId, cardId: string) {
    const st = this.p[p];
    st.battleCardId = null;
    const idx = st.hand.indexOf(cardId);
    if (idx >= 0) st.hand.splice(idx, 1);
    st.list.push(cardId);
  }

  private resolveBattle() {
    const c1 = CARD_MAP[this.p.P1.battleCardId!];
    const c2 = CARD_MAP[this.p.P2.battleCardId!];

    let s1: number | null = null;
    let s2: number | null = null;

    if (c1.type === "ATTACK") {
      s1 = applyFpToSpeed(c1.speed, this.p.P1.fp);
      this.emit({ t: "FP_APPLIED", p: "P1", fpUsed: this.p.P1.fp, baseSpeed: c1.speed, finalSpeed: s1 });
    } else {
      this.emit({ t: "FP_APPLIED", p: "P1", fpUsed: this.p.P1.fp });
    }

    if (c2.type === "ATTACK") {
      s2 = applyFpToSpeed(c2.speed, this.p.P2.fp);
      this.emit({ t: "FP_APPLIED", p: "P2", fpUsed: this.p.P2.fp, baseSpeed: c2.speed, finalSpeed: s2 });
    } else {
      this.emit({ t: "FP_APPLIED", p: "P2", fpUsed: this.p.P2.fp });
    }

    // MVP: FP는 이번 판정에 소모
    this.p.P1.fp = 0;
    this.p.P2.fp = 0;

    if (c1.type === "ATTACK" && c2.type === "ATTACK") {
      this.resolveAttackVsAttack(c1, c2, s1!, s2!);
    } else if (c1.type === "ATTACK" && c2.type === "DEFENSE") {
      this.resolveAttackVsDefense("P1", c1, "P2", c2);
    } else if (c1.type === "DEFENSE" && c2.type === "ATTACK") {
      this.resolveAttackVsDefense("P2", c2, "P1", c1);
    } else {
      this.emit({ t: "BATTLE_RESULT", result: "BOTH_DEFENSE" });
    }

    this.moveBattleToList("P1", c1.id);
    this.moveBattleToList("P2", c2.id);
  }

  private resolveAttackVsAttack(c1: AttackCard, c2: AttackCard, s1: number, s2: number) {
    const p1Evade = canSpecialEvade(c1, c2);
    const p2Evade = canSpecialEvade(c2, c1);

    if (p1Evade && !p2Evade) {
      this.emit({ t: "BATTLE_RESULT", result: "P1_COUNTER", note: "special evade" });
      this.applyCounter("P1", c1, "P2");
      return;
    }
    if (p2Evade && !p1Evade) {
      this.emit({ t: "BATTLE_RESULT", result: "P2_COUNTER", note: "special evade" });
      this.applyCounter("P2", c2, "P1");
      return;
    }

    if (s1 === s2) {
      this.emit({ t: "BATTLE_RESULT", result: "DOUBLE_HIT" });
      this.applyHit("P1", c1, "P2");
      this.applyHit("P2", c2, "P1");
      return;
    }

    if (s1 < s2) {
      this.emit({ t: "BATTLE_RESULT", result: "P1_COUNTER" });
      this.applyCounter("P1", c1, "P2");
    } else {
      this.emit({ t: "BATTLE_RESULT", result: "P2_COUNTER" });
      this.applyCounter("P2", c2, "P1");
    }
  }

  private resolveAttackVsDefense(attackerP: PlayerId, atk: AttackCard, defenderP: PlayerId, def: DefenseCard) {
    const h = atk.judge.height;
    const evadeOk = def.evadeHeights.includes(h);
    const guardOk = def.guardHeights.includes(h);

    if (evadeOk) {
      this.emit({ t: "BATTLE_RESULT", result: defenderP === "P1" ? "P1_EVADE" : "P2_EVADE" });

      if (atk.fpOnGuard) this.fpChange(attackerP, atk.fpOnGuard, `${atk.name} guarded/evaded`);

      // 하이킥: 상대 회피 시 상대 +2FP
      if (atk.id === "high_kick") this.fpChange(defenderP, 2, "High Kick on opponent evade");

      // 다운 가드: 회피 시 FP = (상대 기술 속도 -3), 최대 9
      if (def.id === "down_guard") {
        const gain = Math.min(9, Math.max(0, atk.speed - 3));
        this.fpChange(defenderP, gain, "Down Guard on evade");
      }
      return;
    }

    if (guardOk) {
      this.emit({ t: "BATTLE_RESULT", result: defenderP === "P1" ? "P1_GUARD" : "P2_GUARD" });

      if (atk.fpOnGuard) this.fpChange(attackerP, atk.fpOnGuard, `${atk.name} guarded`);

      // 스탠딩/다운 가드: 방어 시 자신 200 데미지
      if (def.id === "standing_guard" || def.id === "down_guard") {
        this.damage(attackerP, defenderP, 200);
      }
      return;
    }

    this.emit({ t: "BATTLE_RESULT", result: attackerP === "P1" ? "P1_HIT" : "P2_HIT" });
    this.applyHit(attackerP, atk, defenderP);
  }

  private fpChange(p: PlayerId, delta: number, reason: string) {
    this.p[p].fp += delta;
    this.emit({ t: "FP_CHANGE", p, delta, reason });
  }

  private damage(from: PlayerId, to: PlayerId, amount: number) {
    this.p[to].hp -= amount;
    this.emit({ t: "DAMAGE", from, to, amount });
  }

  private applyHit(attackerP: PlayerId, atk: AttackCard, defenderP: PlayerId) {
    if (atk.fpOnHit) this.fpChange(attackerP, atk.fpOnHit, `${atk.name} hit`);
    this.damage(attackerP, defenderP, atk.damage);
  }

  private applyCounter(attackerP: PlayerId, atk: AttackCard, defenderP: PlayerId) {
    if (atk.fpOnCounter) this.fpChange(attackerP, atk.fpOnCounter, `${atk.name} counter`);
    this.damage(attackerP, defenderP, atk.damage);
  }

  // 클라에 보여줄 요약 뷰
  getPlayerView(p: PlayerId) {
    const me = this.p[p];
    const opp = this.p[other(p)];
    return {
      phase: this.phase,
      me: { hp: me.hp, fp: me.fp, hand: [...me.hand], listCount: me.list.length, submitted: !!me.battleCardId },
      opp: { hp: opp.hp, fp: opp.fp, handCount: opp.hand.length, listCount: opp.list.length, submitted: !!opp.battleCardId }
    };
  }
}
