import { Card } from "./types.js";

export const SETSUMEI_CARDS: Card[] = [
  {
    id: "smash_hook",
    setId: "AWL-AT-055",
    character: "세츠메이",
    name: "스매시 훅",
    type: "ATTACK",
    judge: { height: "MID", limb: "HAND" },
    specialJudge: "NONE",
    damage: 500,
    speed: 6,
    fpOnHit: 1,
    fpOnGuard: -5,
    fpOnCounter: 2,
    keywords: [],
    effectsRaw: "①사용 시, 패를 1장 버린다."
  },
  {
    id: "dagger_swing",
    setId: "UNC-AT-046",
    character: "세츠메이",
    name: "대거 스윙",
    type: "ATTACK",
    judge: { height: "HIGH", limb: "HAND" },
    specialJudge: "NONE",
    damage: 400,
    speed: 6,
    fpOnHit: 2,
    fpOnGuard: -2,
    fpOnCounter: 4,
    keywords: [],
    effectsRaw: ""
  },
  {
    id: "throw_kick",
    setId: "AWL-AT-049",
    character: "세츠메이",
    name: "스로킥",
    type: "ATTACK",
    judge: { height: "LOW", limb: "FOOT" },
    specialJudge: "EVADE_HIGH",
    damage: 300,
    speed: 6,
    fpOnHit: 1,
    fpOnGuard: -4,
    fpOnCounter: 2,
    keywords: ["EVADE"],
    effectsRaw: "이 기술은 6속도 이하 기술만 회피할 수 있다."
  },
  {
    id: "viper_assault",
    setId: "LMI-AT-053",
    character: "세츠메이",
    name: "바이퍼 어썰트",
    type: "ATTACK",
    judge: { height: "LOW", limb: "FOOT" },
    specialJudge: "NONE",
    damage: 300,
    speed: 6,
    fpOnHit: 2,
    fpOnGuard: -4,
    fpOnCounter: 3,
    keywords: [],
    effectsRaw: "①사용 시, 자신의 FP가 <+3>이상인 경우 이 기술의 가드 판정을 <-2>로 변경한다."
  },
  {
    id: "counter_rat",
    setId: "ST3-017",
    character: "세츠메이",
    name: "카운터 랫",
    type: "ATTACK",
    judge: { height: "MID", limb: "FOOT" },
    specialJudge: "NONE",
    damage: 500,
    speed: 7,
    fpOnHit: 1,
    fpOnGuard: -6,
    fpOnCounter: 3,
    keywords: [],
    effectsRaw: "①카운터 시 리스트에서 5속도 기술로 캐치할 수 있다.그 후 캐치한 기술과 이 기술을 브레이크한다."
  },
  {
    id: "high_kick",
    setId: "UNC-AT-047",
    character: "세츠메이",
    name: "하이킥",
    type: "ATTACK",
    judge: { height: "HIGH", limb: "FOOT" },
    specialJudge: "NONE",
    damage: 500,
    speed: 7,
    fpOnHit: 2,
    fpOnGuard: -3,
    fpOnCounter: 1,
    keywords: [],
    effectsRaw: "①상대의 회피 시, 상대는 2FP를 얻는다."
  },
  {
    id: "down_slash",
    setId: "ST1-017",
    character: "세츠메이",
    name: "다운 슬래쉬",
    type: "ATTACK",
    judge: { height: "LOW", limb: "HAND" },
    specialJudge: "NONE",
    damage: 400,
    speed: 7,
    fpOnHit: 3,
    fpOnGuard: -6,
    fpOnCounter: 4,
    keywords: [],
    effectsRaw: "①판정 전 상대가 수비 기술인 경우 히트 판정이<+5>로 변경되고 8속도로 고정된다."
  },
  {
    id: "depanging_lock",
    setId: "LMI-AT-051",
    character: "세츠메이",
    name: "디팽잉 록",
    type: "ATTACK",
    judge: { height: "HIGH", limb: "HAND" },
    specialJudge: "GRAB",
    damage: 400,
    speed: 7,
    fpOnHit: 1,
    fpOnGuard: null,
    fpOnCounter: 2,
    keywords: ["GRAB", "NO_COMBO"],
    effectsRaw:
      "이 기술은 콤보에 사용할 수 없다. ①이 기술이 그랩 무효가 되었을 경우, 상대는 5FP를 얻는다. ②판정 전, 상대 기술이 <상단 손>판정 공격 기술일 경우 자신은 2FP를 얻는다."
  },
  {
    id: "setsumei_kick",
    setId: "ST1-018",
    character: "세츠메이",
    name: "세츠메이 킥",
    type: "ATTACK",
    judge: { height: "MID", limb: "FOOT" },
    specialJudge: "NONE",
    damage: 500,
    speed: 8,
    fpOnHit: null,
    fpOnGuard: -8,
    fpOnCounter: null,
    keywords: ["COMBO"],
    effectsRaw: "①사용 후 이 기술을 브레이크한다."
  },
  {
    id: "dash",
    setId: "ST1-015",
    character: "세츠메이",
    name: "대쉬",
    type: "DEFENSE",
    guardHeights: [],
    evadeHeights: ["HIGH", "MID", "LOW"],
    keywords: [],
    effectsRaw: "①판정 후 데미지를 받지 않았다면 6FP를 얻는다.그 후 상대 배틀 존의 기술과 이 기술을 각 리스트로이동 후 레디 페이즈를 다시 진행한다."
  },
  {
    id: "standing_guard",
    setId: "ST1-011",
    character: "세츠메이",
    name: "스탠딩 가드",
    type: "DEFENSE",
    guardHeights: ["HIGH", "MID"],
    evadeHeights: [],
    keywords: ["GUARD"],
    effectsRaw: "이 기술은 자신이 직접 브레이크할 수 없다.①방어시 자신은 200데미지를 받는다."
  },
  {
    id: "down_guard",
    setId: "ST1-012",
    character: "세츠메이",
    name: "다운 가드",
    type: "DEFENSE",
    guardHeights: ["MID", "LOW"],
    evadeHeights: ["MID", "LOW"],
    keywords: ["EVADE", "GUARD"],
    effectsRaw:
      "이 기술은 자신이 직접 브레이크할 수 없다.①회피 시 상대 기술 속도-3 만큼 FP를 얻는다.(최대 9FP)②방어 시 자신은 200데미지를 받는다."
  }
];

export const CARD_MAP: Record<string, Card> = Object.fromEntries(SETSUMEI_CARDS.map(c => [c.id, c]));

// 클라에 공개 가능한 최소 정보
export const CARD_PUBLIC = SETSUMEI_CARDS.map(c => ({
  id: c.id,
  name: c.name,
  type: c.type,
  character: c.character
}));
