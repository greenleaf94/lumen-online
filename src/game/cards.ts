export type CardKind = "ATTACK" | "DEFENSE" | "SPECIAL" | "ULTIMATE";

export type Card = {
  id: string;              // FirstAppearance 같은 유니크 키
  character: string;       // "세츠메이" 등
  name: string;
  kind: CardKind;          // 지금은 대충 ATTACK/DEFENSE만
  judgement: string;       // "상단 손", "중단 발", "수비"...
  specialJudgement?: string;
  damage?: number | null;
  speed?: number | null;
  onHit?: string | number | null;
  onGuard?: string | number | null;
  onCounter?: string | number | null;
  effectsText?: string;    // 원문 유지(표시/로그용)
  // 나중에 여기에 effectsScript(구조화 효과) 붙일 자리
};

const n = (v: any) => (v === "" || v === undefined ? null : Number(v));

export const CARDS: Card[] = [
  {
    id: "AWL-AT-055",
    character: "세츠메이",
    name: "스매시 훅",
    kind: "ATTACK",
    judgement: "중단 손",
    damage: 500,
    speed: 6,
    onHit: 1,
    onGuard: -5,
    onCounter: 2,
    effectsText: "①사용 시, 패를 1장 버린다."
  },
  { id: "UNC-AT-046", character: "세츠메이", name: "대거 스윙", kind: "ATTACK", judgement: "상단 손", damage: 400, speed: 6, onHit: 2, onGuard: -2, onCounter: 4 },
  {
    id: "AWL-AT-049",
    character: "세츠메이",
    name: "스로킥",
    kind: "ATTACK",
    judgement: "하단 발",
    specialJudgement: "상단 회피",
    damage: 300,
    speed: 6,
    onHit: 1,
    onGuard: -4,
    onCounter: 2,
    effectsText: "이 기술은 6속도 이하 기술만 회피할 수 있다."
  },
  {
    id: "LMI-AT-053",
    character: "세츠메이",
    name: "바이퍼 어썰트",
    kind: "ATTACK",
    judgement: "하단 발",
    damage: 300,
    speed: 6,
    onHit: 2,
    onGuard: -4,
    onCounter: 3,
    effectsText: "①사용 시, 자신의 FP가 <+3>이상인 경우 이 기술의 가드 판정을 <-2>로 변경한다."
  },
  {
    id: "ST3-017",
    character: "세츠메이",
    name: "카운터 랫",
    kind: "ATTACK",
    judgement: "중단 발",
    damage: 500,
    speed: 7,
    onHit: 1,
    onGuard: -6,
    onCounter: 3,
    effectsText: "①카운터 시 리스트에서 5속도 기술로 캐치할 수 있다. 그 후 캐치한 기술과 이 기술을 브레이크한다."
  },
  {
    id: "UNC-AT-047",
    character: "세츠메이",
    name: "하이킥",
    kind: "ATTACK",
    judgement: "상단 발",
    damage: 500,
    speed: 7,
    onHit: 2,
    onGuard: -3,
    onCounter: 1,
    effectsText: "①상대의 회피 시, 상대는 2FP를 얻는다."
  },
  {
    id: "ST1-017",
    character: "세츠메이",
    name: "다운 슬래쉬",
    kind: "ATTACK",
    judgement: "하단 손",
    damage: 400,
    speed: 7,
    onHit: 3,
    onGuard: -6,
    onCounter: 4,
    effectsText: "①판정 전 상대가 수비 기술인 경우 히트 판정이<+5>로 변경되고 8속도로 고정된다."
  },
  {
    id: "LMI-AT-051",
    character: "세츠메이",
    name: "디팽잉 록",
    kind: "ATTACK",
    judgement: "상단 손",
    specialJudgement: "그랩",
    damage: 400,
    speed: 7,
    onHit: 1,
    onGuard: null,
    onCounter: 2,
    effectsText: "①이 기술은 콤보에 사용할 수 없다. ②그랩 무효 시 상대 5FP. ③판정 전 상대 기술이 <상단 손> 공격이면 자신 2FP."
  },
  {
    id: "ST1-018",
    character: "세츠메이",
    name: "세츠메이 킥",
    kind: "ATTACK",
    judgement: "중단 발",
    damage: 500,
    speed: 8,
    onHit: "콤보",
    onGuard: -8,
    onCounter: "콤보",
    effectsText: "①사용 후 이 기술을 브레이크한다."
  },
  {
    id: "ST1-015",
    character: "세츠메이",
    name: "대쉬",
    kind: "DEFENSE",
    judgement: "수비",
    damage: null,
    speed: null,
    onHit: "X",
    onGuard: "X",
    onCounter: "X",
    effectsText: "①판정 후 데미지를 받지 않았다면 6FP를 얻는다. 그 후 레디 페이즈를 다시 진행한다."
  },
  {
    id: "ST1-011",
    character: "세츠메이",
    name: "스탠딩 가드",
    kind: "DEFENSE",
    judgement: "수비",
    onHit: null,
    onGuard: "방어",
    onCounter: "X",
    effectsText: "①방어시 자신은 200데미지를 받는다."
  },
  {
    id: "ST1-012",
    character: "세츠메이",
    name: "다운 가드",
    kind: "DEFENSE",
    judgement: "수비",
    onHit: null,
    onGuard: "회피/방어",
    onCounter: "방어",
    effectsText: "①회피 시 상대 기술 속도-3 만큼 FP(최대9). ②방어 시 200데미지."
  }
];
