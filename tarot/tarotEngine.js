// 웹(PWA)과 React Native 양쪽에서 동일하게 import해서 쓰는 순수 JS 모듈입니다.
// DOM이나 RN 전용 API에 의존하지 않으므로 파일을 그대로 복사해서 두 프로젝트에
// 각각 넣으면 됩니다.

import { FULL_DECK } from './tarotDeck.js';

/**
 * mulberry32 시드 기반 PRNG.
 * "오늘의 카드" 같은 날짜 고정 뽑기에 사용합니다. 같은 시드값이면
 * 항상 같은 결과가 나옵니다 (기존 운세 모드와 동일한 방식).
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 문자열을 32bit 정수 해시로 변환 (날짜 문자열 시드 생성용) */
function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** YYYY-MM-DD 형식의 오늘 날짜 문자열 */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const POSITION_LABEL_SETS = {
  2: [
    { key: 'situation', label_ko: '상황' },
    { key: 'solution', label_ko: '해결책' },
  ],
  3: [
    { key: 'past', label_ko: '과거' },
    { key: 'present', label_ko: '현재' },
    { key: 'future', label_ko: '미래' },
  ],
  5: [
    { key: 'cause', label_ko: '원인' },
    { key: 'present', label_ko: '현재' },
    { key: 'obstacle', label_ko: '장애물' },
    { key: 'advice', label_ko: '조언' },
    { key: 'result', label_ko: '결과' },
  ],
};

/**
 * 타로 카드를 뽑습니다.
 *
 * @param {Object} options
 * @param {1|2|3|5} options.spread - 스프레드 장수
 * @param {boolean} options.dateSeeded - true면 오늘 하루 동안 같은 결과 고정,
 *                                        false면 매번 랜덤 (새로고침 시 다른 카드)
 * @returns {Array<{card: object, reversed: boolean, position: string|null, positionLabel: string|null}>}
 */
export function drawTarot({ spread = 1, dateSeeded = true } = {}) {
  if (![1, 2, 3, 5].includes(spread)) {
    throw new Error('spread는 1, 2, 3, 5 중 하나만 지원합니다.');
  }

  const seed = dateSeeded
    ? hashStringToInt(`${todayKey()}-spread${spread}`)
    : (Math.random() * 4294967296) >>> 0;

  const rand = mulberry32(seed);

  // 카드 인덱스를 섞어서 중복 없이 뽑기 (피셔-예이츠)
  const indices = FULL_DECK.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const drawn = indices.slice(0, spread).map((cardIndex, position) => {
    const reversed = rand() < 0.5;
    const posInfo = POSITION_LABEL_SETS[spread] ? POSITION_LABEL_SETS[spread][position] : null;

    return {
      card: FULL_DECK[cardIndex],
      reversed,
      position: posInfo ? posInfo.key : null,
      positionLabel: posInfo ? posInfo.label_ko : null,
    };
  });

  return {
    spread,
    dateSeeded,
    seed,
    drawnAt: new Date().toISOString(),
    cards: drawn,
  };
}

/**
 * 뽑힌 카드(들)로 한국어 운세 해석 텍스트를 만듭니다.
 * @param {ReturnType<typeof drawTarot>} draw
 * @returns {{ perCard: Array<{position:string|null,label:string|null,card:object,reversed:boolean,text:string}>, summary: string }}
 */
export function interpretDraw(draw) {
  const perCard = draw.cards.map(({ card, reversed, position, positionLabel }) => {
    const meaning = reversed ? card.reversed_ko : card.upright_ko;
    const orientation = reversed ? '역방향' : '정방향';
    const prefix = positionLabel ? `[${positionLabel}] ` : '';

    return {
      position,
      label: positionLabel,
      card,
      reversed,
      text: `${prefix}${card.name_ko} (${orientation}) — ${meaning}`,
    };
  });

  let summary;
  if (draw.spread === 1) {
    summary = `오늘의 카드는 ${perCard[0].card.name_ko}입니다. ${
      draw.cards[0].reversed ? perCard[0].card.reversed_ko : perCard[0].card.upright_ko
    }`;
  } else {
    summary = perCard.map((p) => p.text).join(' / ');
  }

  return { perCard, summary };
}

/**
 * 뽑힌 카드 정보를 바탕으로 로또 번호 6개(1~45, 중복 없음)를 생성합니다.
 * 같은 draw 객체를 넣으면 항상 같은 번호가 나옵니다 (재현 가능).
 *
 * 변환 규칙: 카드의 전체 인덱스(0~77) + 정/역방향 + 스프레드 내 위치를
 * 조합해 해시 시드를 만들고, 그 시드로 1~45 범위를 셔플해 앞 6개를 취합니다.
 *
 * @param {ReturnType<typeof drawTarot>} draw
 * @returns {number[]} 오름차순 정렬된 6개 번호
 */
export function numbersFromDraw(draw) {
  const seedParts = draw.cards
    .map(({ card, reversed }, i) => `${card.id}-${reversed ? 'R' : 'U'}-${i}`)
    .join('|');

  const seed = hashStringToInt(`${seedParts}-${draw.seed}`);
  const rand = mulberry32(seed);

  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 6).sort((a, b) => a - b);
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

/** 뽑힌 카드들의 수트(원소) 구성을 센다 */
function computeElementCounts(draw) {
  const counts = { wands: 0, cups: 0, swords: 0, pentacles: 0 };
  draw.cards.forEach(({ card }) => {
    if (card.suit && counts[card.suit] !== undefined) counts[card.suit] += 1;
  });
  return counts;
}

/**
 * 원소 구성에 따라 번호 1개의 가중치를 계산합니다.
 * - 완드(불): 끝수가 높은 숫자(7,8,9,0)나 상위 번호대(31~45)를 우대 — "공격적인" 번호 느낌
 * - 컵(물): 짝수를 우대 — "조화로운" 조합 느낌
 * - 소드(공기): "분석적" 성향 — 실제 최근 당첨 데이터(recentFrequency)가 있으면
 *   최근 자주 나온 "핫 넘버"를 우대하고, 데이터가 없으면(오프라인 등) 소수(素數)를
 *   우대하는 것으로 대체합니다.
 * - 펜타클(땅): 중간 번호대(16~30)를 우대 — "안정적인" 번호 느낌
 *
 * 이건 실제 당첨 확률과는 무관한 연출용 가중치이며, 카드가 하나도 없는
 * 원소는 가중치에 영향을 주지 않습니다.
 *
 * @param {Object|null} recentFrequency - lottoStats.js의 getRecentNumberFrequency()가
 *   반환하는 { [번호]: 0~1 정규화된 최근 출현 빈도 } 맵. 없으면 소수 대체 로직 사용.
 */
function numberWeight(n, counts, recentFrequency) {
  let w = 1;

  if (counts.wands > 0) {
    const lastDigit = n % 10;
    if ([7, 8, 9, 0].includes(lastDigit)) w += counts.wands * 0.6;
    if (n >= 31) w += counts.wands * 0.4;
  }
  if (counts.cups > 0 && n % 2 === 0) {
    w += counts.cups * 0.8;
  }
  if (counts.swords > 0) {
    if (recentFrequency) {
      w += counts.swords * (recentFrequency[n] ?? 0) * 1.2;
    } else if (isPrime(n)) {
      w += counts.swords * 0.7;
    }
  }
  if (counts.pentacles > 0 && n >= 16 && n <= 30) {
    w += counts.pentacles * 0.8;
  }

  return w;
}

/**
 * 78장 전용 번호 생성 (원소 가중치 기반, 카드 고유번호 고정수는 쓰지 않음).
 *
 * 이전 버전은 뽑힌 카드의 고유번호를 "행운의 고정수"로 강제 포함시켰는데,
 * 5장 스프레드처럼 카드가 많으면 카드 번호(마이너 1~14, 메이저 1~21)가
 * 최대 5자리를 차지해버려서 1~45 범위 중 낮은 번호로만 쏠리는 문제가
 * 있었습니다. 그래서 6자리 전부를 원소 가중치 알고리즘으로만 뽑습니다.
 *
 * @param {ReturnType<typeof buildDrawFromPicks>} draw
 * @param {Object} [options]
 * @param {Object|null} [options.recentFrequency] - lottoStats.js에서 가져온
 *   최근 당첨 번호 빈도 맵. 소드(공기) 카드가 있을 때만 영향을 줍니다.
 * @returns {{ numbers: number[] }} numbers는 오름차순 6개
 */
export function numbersFromDrawWeighted(draw, { recentFrequency = null } = {}) {
  const seedParts = draw.cards
    .map(({ card, reversed }, i) => `${card.id}-${reversed ? 'R' : 'U'}-${i}`)
    .join('|');
  const seed = hashStringToInt(`${seedParts}-${draw.seed}-weighted`);
  const rand = mulberry32(seed);

  const counts = computeElementCounts(draw);
  const candidates = Array.from({ length: 45 }, (_, i) => i + 1);

  const keyed = candidates.map((n) => ({
    n,
    key: -Math.log(rand()) / numberWeight(n, counts, recentFrequency),
  }));
  keyed.sort((a, b) => a.key - b.key);

  const numbers = keyed.slice(0, 6).map((k) => k.n).sort((a, b) => a - b);

  return { numbers };
}

/**
 * 편의 함수: 뽑기 + 해석 + 번호 생성을 한 번에.
 * @param {Object} options - drawTarot과 동일한 옵션
 */
export function readTarotFortune(options) {
  const draw = drawTarot(options);
  const interpretation = interpretDraw(draw);
  const numbers = numbersFromDraw(draw);

  return { draw, interpretation, numbers };
}

/**
 * "부채꼴에서 직접 카드를 고르는" UI를 위한 사전 셔플.
 *
 * 일반 drawTarot()은 뽑는 즉시 결과가 정해지지만, 실제 카드 선택 UI는
 * 반대 순서로 동작합니다: 먼저 덱 전체(예: 메이저 22장)를 뒷면 상태로
 * 미리 섞어서 화면에 깔아두고, 사용자가 "직관적으로" 슬롯을 고르면
 * 그 슬롯에 이미 배정돼 있던 카드를 나중에 공개하는 방식입니다.
 *
 * @param {Array} pool - 셔플할 카드 배열 (보통 FULL_DECK.filter(c => c.arcana === 'major'))
 * @param {Object} options
 * @param {boolean} options.dateSeeded - true면 오늘 하루 동안 같은 배치 고정
 * @param {string} options.seedKey - 같은 날짜에도 용도별로 다른 배치가 필요할 때 구분용 키
 * @returns {Array<{card: object, reversed: boolean}>} pool과 같은 길이, 화면상 슬롯 순서와 1:1 대응
 */
export function shuffleForSelection(pool, { dateSeeded = false, seedKey = '' } = {}) {
  const seed = dateSeeded
    ? hashStringToInt(`${todayKey()}-select-${pool.length}-${seedKey}`)
    : (Math.random() * 4294967296) >>> 0;

  const rand = mulberry32(seed);

  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.map((cardIndex) => ({
    card: pool[cardIndex],
    reversed: rand() < 0.5,
  }));
}

/**
 * 운세 카테고리와 연결된 수트(원소). 78장 풀을 쓸 때 셔플 단계에서
 * 해당 수트 카드가 앞쪽(= 실제로 뽑힐 확률이 높은 자리)에 나오도록
 * 가중치를 줍니다. 완전히 그 수트만 나오는 건 아니고 "조금 더 자주"
 * 나오는 정도의 연출입니다.
 */
const CATEGORY_SUIT_BIAS = {
  general: null,
  love: 'cups',
  career: 'wands',
  wealth: 'pentacles',
  health: 'swords',
};

export const SUIT_ELEMENT_LABELS = {
  wands: '불',
  cups: '물',
  swords: '공기',
  pentacles: '땅',
};

/**
 * shuffleForSelection()의 카테고리 가중치 버전. 78장 전체 풀을 쓸 때
 * "셔플하기" 연출 뒤에 호출해서, 그 카테고리와 어울리는 수트 카드가
 * 조금 더 자주 상위(= 먼저 뽑히는 자리)에 오도록 만듭니다.
 *
 * 가중치 셔플은 각 카드에 랜덤 키 -ln(rand())/weight를 부여하고
 * 오름차순 정렬하는 방식(가중 무작위 순열)을 씁니다 — 가중치가 높을수록
 * 평균적으로 앞쪽에 오지만, 매번 순서가 달라지는 성질은 그대로 유지됩니다.
 *
 * @param {Array} pool - 보통 FULL_DECK 전체(78장)
 * @param {string} categoryKey - FORTUNE_CATEGORIES의 key
 * @param {Object} options
 * @param {boolean} options.dateSeeded
 * @param {string} options.seedKey
 */
export function shuffleForSelectionWeighted(pool, categoryKey, { dateSeeded = false, seedKey = '' } = {}) {
  const favoredSuit = CATEGORY_SUIT_BIAS[categoryKey] ?? null;

  const seed = dateSeeded
    ? hashStringToInt(`${todayKey()}-wselect-${pool.length}-${categoryKey}-${seedKey}`)
    : (Math.random() * 4294967296) >>> 0;

  const rand = mulberry32(seed);

  const keyed = pool.map((card) => {
    let weight = card.arcana === 'major' ? 1.15 : 1; // 메이저는 살짝 더 자주 — "운명적 메시지"의 비중
    if (favoredSuit && card.suit === favoredSuit) weight *= 2.2;
    return { card, key: -Math.log(rand()) / weight };
  });

  keyed.sort((a, b) => a.key - b.key);

  return keyed.map(({ card }) => ({ card, reversed: rand() < 0.5 }));
}

/**
 * shuffleForSelection()으로 미리 배정해둔 결과에서, 사용자가 실제로 고른
 * 슬롯 인덱스들을 뽑아 interpretDraw()/numbersFromDraw()가 바로 쓸 수 있는
 * draw 객체 형태로 변환합니다.
 *
 * @param {ReturnType<typeof shuffleForSelection>} assigned
 * @param {number[]} pickedSlotIndices - 사용자가 고른 순서대로의 슬롯 인덱스 (길이 1 또는 3)
 * @returns {ReturnType<typeof drawTarot>}
 */
export function buildDrawFromPicks(assigned, pickedSlotIndices) {
  const spread = pickedSlotIndices.length;
  const labels = POSITION_LABEL_SETS[spread] ?? null;

  const cards = pickedSlotIndices.map((slotIndex, order) => {
    const { card, reversed } = assigned[slotIndex];
    const posInfo = labels ? labels[order] : null;

    return {
      card,
      reversed,
      position: posInfo ? posInfo.key : null,
      positionLabel: posInfo ? posInfo.label_ko : null,
    };
  });

  return {
    spread,
    dateSeeded: false,
    seed: 0,
    drawnAt: new Date().toISOString(),
    cards,
  };
}

/**
 * 운세 카테고리(연애/사업/건강/재물/총운) 목록.
 * angle에는 조사(은/는)까지 미리 붙여둡니다 — 카테고리가 5개뿐이라
 * 동적 조사 처리 로직을 따로 두지 않고 문구 자체에 포함시켰습니다.
 */
const CATEGORIES = {
  general: { label: '총운', angle: '삶 전반의 흐름은' },
  love: { label: '연애운', angle: '마음이 향하는 관계와 감정의 흐름은' },
  career: { label: '사업운', angle: '지금 벌이고 있는 일과 성과의 흐름은' },
  wealth: { label: '재물운', angle: '돈이 들어오고 나가는 흐름은' },
  health: { label: '건강운', angle: '몸과 마음의 컨디션은' },
};

export const FORTUNE_CATEGORIES = Object.keys(CATEGORIES).map((key) => ({
  key,
  label: CATEGORIES[key].label,
}));

const TIMING_UPRIGHT = [
  '가까운 시일 내에 변화가 느껴질 수 있습니다.',
  '지금 이 순간부터 서서히 좋은 신호들이 나타날 거예요.',
  '생각보다 빠르게 원하는 방향으로 흘러갈 가능성이 있습니다.',
];

const TIMING_REVERSED = [
  '조금 더 시간을 두고 지켜보는 편이 좋겠습니다.',
  '지금 당장보다는 한두 걸음 물러나 재정비할 때입니다.',
  '서두르면 오히려 늦어질 수 있으니 여유를 갖고 지켜보세요.',
];

function pickTiming(card, reversed) {
  const pool = reversed ? TIMING_REVERSED : TIMING_UPRIGHT;
  return pool[card.id % pool.length];
}

/**
 * 카테고리(연애/사업/건강/재물/총운)에 맞춰 카드별 상세 해석 + 종합 조언을 만듭니다.
 * interpretDraw()보다 한 단계 더 자세한 "운세 보기" 화면용 텍스트입니다.
 *
 * perCard 각 항목은 화면에서 문단 하나로 합쳐 써도 되고(detail),
 * meaning/timingText/adviceText/cautionText로 나눠서 항목별로 보여줘도 됩니다.
 *
 * @param {string} categoryKey - FORTUNE_CATEGORIES의 key 중 하나 (없으면 'general')
 * @param {ReturnType<typeof drawTarot>} draw
 * @returns {{
 *   categoryLabel: string,
 *   perCard: Array<{
 *     position:string|null, label:string|null, card:object, reversed:boolean,
 *     headline:string, meaning:string, timingText:string, adviceText:string,
 *     cautionText:string, detail:string
 *   }>,
 *   overall: string
 * }}
 */
export function buildCategoryReading(categoryKey, draw) {
  const category = CATEGORIES[categoryKey] ?? CATEGORIES.general;
  const base = interpretDraw(draw);

  const perCard = base.perCard.map(({ card, reversed, position, label }) => {
    const meaning = reversed ? card.reversed_ko : card.upright_ko;
    const timingText = pickTiming(card, reversed);
    const adviceText = reversed
      ? '지금은 서두르기보다 한 박자 늦춰서 상황을 살펴볼 때입니다.'
      : '지금 느껴지는 흐름을 믿고 한 걸음 나아가도 좋은 때입니다.';
    const cautionText = reversed
      ? '특히 성급한 결정이나 감정적인 대응은 피하는 게 좋습니다.'
      : '다만 너무 낙관하기보다는 주변 상황도 함께 살펴보세요.';

    const openingText = `${category.label}으로 보면, ${category.angle} "${meaning}"로 요약됩니다.`;

    const arcanaNote = card.arcana === 'major'
      ? '메이저 카드 — 인생의 큰 전환점이나 운명적인 메시지에 가깝습니다.'
      : `마이너 카드(${SUIT_ELEMENT_LABELS[card.suit]} · ${card.suit_name_ko}) — 지금 일상에서 겪고 있는 구체적인 상황과 대처법에 가깝습니다.`;

    return {
      position,
      label,
      card,
      reversed,
      elementLabel: card.suit ? SUIT_ELEMENT_LABELS[card.suit] : null,
      headline: `${card.name_ko} (${reversed ? '역방향' : '정방향'})`,
      meaning: openingText,
      timingText,
      adviceText,
      cautionText,
      arcanaNote,
      detail: `${openingText} ${timingText} ${adviceText} ${cautionText}`,
    };
  });

  const overall = buildStoryOverall(category, draw, perCard);

  return { categoryLabel: category.label, perCard, overall };
}

/**
 * 뽑힌 카드들의 메이저/마이너 구성과 우세한 원소를 근거로 하나의 종합
 * 총평 문단을 만듭니다. AI 호출 없이 규칙 기반으로 조합하는 방식이라
 * 완전히 자유로운 문장은 아니지만, 뽑힌 조합에 따라 실제로 다른 문장이
 * 나오도록 구성했습니다.
 */
function buildStoryOverall(category, draw, perCard) {
  const majors = draw.cards.filter((c) => c.card.arcana === 'major');
  const minors = draw.cards.filter((c) => c.card.arcana === 'minor');

  let opening;
  if (draw.spread === 1) {
    const only = draw.cards[0].card;
    opening = only.arcana === 'major'
      ? '메이저 카드가 나왔습니다. 오늘은 사소한 일보다 인생의 큰 흐름에 더 마음을 써야 하는 날로 보입니다.'
      : `마이너 카드(${SUIT_ELEMENT_LABELS[only.suit]} · ${only.suit_name_ko})가 나왔습니다. 거창한 사건보다는 지금 겪고 있는 구체적인 상황에 집중해보세요.`;
  } else if (minors.length === 0) {
    opening = '이번엔 모두 메이저 카드로만 나왔습니다. 사소한 일보다는 인생의 큰 흐름이 움직이고 있는 시기로 보입니다.';
  } else if (majors.length === 0) {
    opening = '이번 조합은 모두 일상 속 카드로만 이루어져 있어, 거창한 사건보다는 지금 겪고 있는 구체적인 상황에 집중해서 보시면 됩니다.';
  } else {
    const majorNames = majors.map((c) => c.card.name_ko).join(', ');
    const minorNames = minors.map((c) => c.card.name_ko).join(', ');
    opening = `거대한 변화(${majorNames})를 앞두고, 일상적인 부분(${minorNames})에서는 실질적인 대처가 필요한 시기로 보입니다.`;
  }

  const counts = computeElementCounts(draw);
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  let elementLine = '';
  if (dominant && dominant[1] > 0) {
    const elementFlavor = {
      wands: '적극적으로 움직이고 도전할수록 좋은 결과로 이어질 가능성이 큽니다.',
      cups: '감정과 관계를 잘 다스리는 것이 가장 중요한 열쇠가 됩니다.',
      swords: '차분히 상황을 분석하고 정보를 정리하는 태도가 도움이 됩니다.',
      pentacles: '무리하게 서두르기보다 안정적으로 다지는 편이 유리합니다.',
    };
    elementLine = ` 전체적으로 ${SUIT_ELEMENT_LABELS[dominant[0]]}(${dominant[0] === 'wands' ? '완드' : dominant[0] === 'cups' ? '컵' : dominant[0] === 'swords' ? '소드' : '펜타클'}) 기운이 강하게 흐르고 있어, ${elementFlavor[dominant[0]]}`;
  }

  const closing = draw.spread >= 3
    ? ` ${category.label} 흐름을 종합하면, ${perCard[perCard.length - 1].adviceText}`
    : '';

  return `${opening}${elementLine}${closing}`;
}
