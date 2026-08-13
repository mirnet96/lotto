// 관상(觀相) 재미 콘텐츠 + 로또 번호 생성 로직.
// ⚠️ 실제 사진을 분석하는 AI/컴퓨터비전 기능은 아닙니다. 전통 관상학의 오부위(이마·눈·코·입·턱)
// 개념을 빌려온 "재미로 보는" 콘텐츠이며, 매일 날짜(+닉네임)로 시드를 고정해 같은 날엔
// 같은 결과가 나오도록 구성했습니다.

const FACE_PARTS = {
  이마: {
    label: '이마',
    trait: '지혜와 직관',
    numberStyle: '낮은 번호대(1~15)를 중심으로',
    phrases: [
      '이마가 넓고 반듯해 생각이 트여있고, 새로운 걸 배우는 속도가 빠른 인상입니다.',
      '이마의 기운이 맑아, 위기 상황에서도 침착하게 판단하는 힘이 느껴집니다.',
      '이마 라인이 시원해 대인관계에서 신뢰를 먼저 얻는 타입으로 보입니다.',
    ],
  },
  눈: {
    label: '눈',
    trait: '총명함과 판단력',
    numberStyle: '홀수 번호를 중심으로',
    phrases: [
      '눈빛이 또렷해 사람과 상황을 꿰뚫어보는 관찰력이 좋은 인상입니다.',
      '눈매에 총기가 있어, 중요한 순간에 흔들리지 않는 결단력이 보입니다.',
      '눈가에 부드러운 기운이 있어 주변 사람들에게 편안함을 주는 상입니다.',
    ],
  },
  코: {
    label: '코',
    trait: '재물운',
    numberStyle: '최근 당첨 데이터를 참고하거나 소수(2,3,5,7…) 위주로',
    phrases: [
      '콧대가 반듯해 재물을 스스로 모으고 지키는 힘이 강한 상입니다.',
      '코끝이 도톰해 실속을 챙기는 재물운이 은근히 따르는 인상입니다.',
      '코의 균형이 좋아, 큰 욕심 없이도 꾸준히 재물이 쌓이는 타입으로 보입니다.',
    ],
  },
  입: {
    label: '입',
    trait: '대인관계와 애정운',
    numberStyle: '짝수 번호를 중심으로',
    phrases: [
      '입매가 단정해 말과 행동에 믿음이 가는 인상이라 사람이 잘 따릅니다.',
      '입꼬리가 살짝 올라가 있어 애정운·대인운이 두루 좋은 상입니다.',
      '입술이 도톰해 정이 많고, 주변에 귀인이 따르는 인상입니다.',
    ],
  },
  턱: {
    label: '턱',
    trait: '말년운과 안정',
    numberStyle: '높은 번호대(31~45)를 중심으로',
    phrases: [
      '턱선이 둥글고 안정적이라 나이 들수록 편안해지는 말년운이 보입니다.',
      '턱에 힘이 있어 한번 정한 목표는 끝까지 밀고 나가는 뚝심이 느껴집니다.',
      '턱 라인이 부드러워 주변과의 조화 속에서 안정을 찾는 상입니다.',
    ],
  },
};

const CLOSING_MESSAGES = [
  '관상은 오늘의 기운을 재미로 보는 것일 뿐, 진짜 인상은 매일의 표정과 마음가짐이 만듭니다.',
  '좋은 상은 타고나는 것보다 매일 웃는 얼굴에서 만들어진다고 하죠. 오늘도 활짝 웃어보세요.',
  '오늘 하루도 스스로에게 좋은 인상을 남기는 하루 되세요.',
];

/** mulberry32 시드 기반 PRNG (다른 운세 엔진들과 동일한 방식) */
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

function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

export const FACE_PART_KEYS = Object.keys(FACE_PARTS);
export { FACE_PARTS };

/**
 * 오늘의 관상 총평(부위별 해석 + 복 지수)을 만듭니다.
 * @param {Object} [options]
 * @param {string} [options.seedKey] - 닉네임 등, 사람마다 다른 결과가 나오게 하는 시드 재료
 * @returns {{ luckScore: number, dominant: string, parts: Record<string, string> }}
 */
export function buildGwansangSummary({ seedKey = '' } = {}) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const rand = mulberry32(hashStringToInt(`${seedKey}-${todayKey}-gwansang`));

  const parts = {};
  FACE_PART_KEYS.forEach((key) => {
    const pool = FACE_PARTS[key].phrases;
    parts[key] = pool[Math.floor(rand() * pool.length)];
  });

  const luckScore = 60 + Math.floor(rand() * 40); // 60~99

  const dominant = FACE_PART_KEYS[Math.floor(rand() * FACE_PART_KEYS.length)];

  return { luckScore, dominant, parts };
}

function numberWeightForPart(n, part, recentFrequency) {
  let w = 1;
  if (part === '이마' && n >= 1 && n <= 15) w += 2;
  if (part === '눈' && n % 2 === 1) w += 1.6;
  if (part === '코') {
    if (recentFrequency) w += (recentFrequency[n] ?? 0) * 1.6;
    else if (isPrime(n)) w += 1.6;
  }
  if (part === '입' && n % 2 === 0) w += 1.6;
  if (part === '턱' && n >= 31 && n <= 45) w += 2;
  return w;
}

/**
 * 관상 오부위(이마·눈·코·입·턱) 각각에 가중치를 둔 로또 번호 5세트를 만듭니다.
 * @param {Object} [options]
 * @param {boolean} [options.dateSeeded]
 * @param {string} [options.seedKey]
 * @param {Object|null} [options.recentFrequency]
 * @returns {Array<{ label: string, part: string, numbers: number[] }>}
 */
export function fiveNumberSetsFromGwansang({ dateSeeded = true, seedKey = '', recentFrequency = null } = {}) {
  const todayKey = new Date().toISOString().slice(0, 10);

  return FACE_PART_KEYS.map((part) => {
    const seed = dateSeeded
      ? hashStringToInt(`${seedKey}-${todayKey}-gwansang-${part}`)
      : (Math.random() * 4294967296) >>> 0;
    const rand = mulberry32(seed);

    const candidates = Array.from({ length: 45 }, (_, i) => i + 1);
    const keyed = candidates.map((n) => ({
      n,
      key: -Math.log(rand()) / numberWeightForPart(n, part, recentFrequency),
    }));
    keyed.sort((a, b) => a.key - b.key);
    const numbers = keyed.slice(0, 6).map((k) => k.n).sort((a, b) => a - b);

    return { label: `${part} 조합 · ${FACE_PARTS[part].trait}`, part, numbers };
  });
}

export function closingMessage({ seedKey = '' } = {}) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const rand = mulberry32(hashStringToInt(`${seedKey}-${todayKey}-gwansang-closing`));
  return CLOSING_MESSAGES[Math.floor(rand() * CLOSING_MESSAGES.length)];
}
