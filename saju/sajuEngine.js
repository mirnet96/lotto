// 사주(四柱, Four Pillars) 계산과, 그 오행 구성을 이용한 로또 번호 생성 로직.
// 순수 함수만 있는 모듈이라 웹/RN 어디서든 재사용할 수 있습니다.
//
// ⚠️ 정밀한 사주 명리학은 절기(입춘·경칩 등) 기준으로 월주 경계를 계산해야
// 하지만, 이 구현은 재미로 보는 용도라 절기 대신 양력 달력 기준으로
// 간단화했습니다. 정통 사주와 월주/시주가 다를 수 있습니다.

const STEMS = [
  { char: '갑', hanja: '甲', element: '목', yin_yang: '양' },
  { char: '을', hanja: '乙', element: '목', yin_yang: '음' },
  { char: '병', hanja: '丙', element: '화', yin_yang: '양' },
  { char: '정', hanja: '丁', element: '화', yin_yang: '음' },
  { char: '무', hanja: '戊', element: '토', yin_yang: '양' },
  { char: '기', hanja: '己', element: '토', yin_yang: '음' },
  { char: '경', hanja: '庚', element: '금', yin_yang: '양' },
  { char: '신', hanja: '辛', element: '금', yin_yang: '음' },
  { char: '임', hanja: '壬', element: '수', yin_yang: '양' },
  { char: '계', hanja: '癸', element: '수', yin_yang: '음' },
];

const BRANCHES = [
  { char: '자', hanja: '子', element: '수', animal: '쥐' },
  { char: '축', hanja: '丑', element: '토', animal: '소' },
  { char: '인', hanja: '寅', element: '목', animal: '호랑이' },
  { char: '묘', hanja: '卯', element: '목', animal: '토끼' },
  { char: '진', hanja: '辰', element: '토', animal: '용' },
  { char: '사', hanja: '巳', element: '화', animal: '뱀' },
  { char: '오', hanja: '午', element: '화', animal: '말' },
  { char: '미', hanja: '未', element: '토', animal: '양' },
  { char: '신', hanja: '申', element: '금', animal: '원숭이' },
  { char: '유', hanja: '酉', element: '금', animal: '닭' },
  { char: '술', hanja: '戌', element: '토', animal: '개' },
  { char: '해', hanja: '亥', element: '수', animal: '돼지' },
];

export const ELEMENT_LABELS = { 목: '목(나무)', 화: '화(불)', 토: '토(흙)', 금: '금(쇠)', 수: '수(물)' };

function mod(n, m) {
  return ((n % m) + m) % m;
}

function pillar(stemIdx, branchIdx) {
  const stem = STEMS[mod(stemIdx, 10)];
  const branch = BRANCHES[mod(branchIdx, 12)];
  return {
    stem,
    branch,
    label: `${stem.char}${branch.char}`,
    hanja: `${stem.hanja}${branch.hanja}`,
  };
}

/**
 * 생년월일(YYYY-MM-DD)과 태어난 시(0~23, 선택)로 사주 네 기둥을 계산합니다.
 * @param {string} birthdateStr
 * @param {number|null} birthHour - 0~23, 모르면 null (이 경우 시주는 계산하지 않음)
 * @returns {{ year: object, month: object, day: object, hour: object|null }}
 */
export function calculateSaju(birthdateStr, birthHour = null) {
  const [y, m, d] = birthdateStr.split('-').map(Number);

  // 연주: 입춘(양력 2/4 전후) 이전 출생이면 전년도로 취급하는 간단화된 규칙
  const effectiveYear = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y;
  const yearStemIdx = mod(effectiveYear - 1984, 10);
  const yearBranchIdx = mod(effectiveYear - 1984, 12);
  const yearPillar = pillar(yearStemIdx, yearBranchIdx);

  // 월주: 오호둔(五虎遁) 규칙 — 연간에 따라 인월(1월)의 시작 천간이 정해짐.
  // 절기 대신 양력 달력 월을 그대로 사용하는 간단화된 방식입니다.
  const monthStartStemIdx = mod(mod(yearStemIdx, 5) * 2 + 2, 10);
  const monthStemIdx = mod(monthStartStemIdx + (m - 1), 10);
  const monthBranchIdx = mod(m + 1, 12);
  const monthPillar = pillar(monthStemIdx, monthBranchIdx);

  // 일주: 60갑자 연속 순환. 기준일 1900-01-31 = 갑자일(甲子日)로 계산.
  const target = new Date(`${birthdateStr}T00:00:00`);
  const reference = new Date('1900-01-31T00:00:00');
  const daysSince = Math.round((target - reference) / 86400000);
  const dayStemIdx = mod(daysSince, 10);
  const dayBranchIdx = mod(daysSince, 12);
  const dayPillar = pillar(dayStemIdx, dayBranchIdx);

  // 시주: 오자둔(五子遁) 규칙 — 일간에 따라 자시(23~01시)의 시작 천간이 정해짐.
  let hourPillar = null;
  if (birthHour !== null && birthHour !== undefined && !Number.isNaN(birthHour)) {
    const hourBranchIdx = Math.floor(mod(birthHour + 1, 24) / 2);
    const hourStartStemIdx = mod(dayStemIdx, 5) * 2;
    const hourStemIdx = mod(hourStartStemIdx + hourBranchIdx, 10);
    hourPillar = pillar(hourStemIdx, hourBranchIdx);
  }

  return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };
}

/** 사주 네 기둥(8자 또는 시주 없으면 6자)의 오행 분포를 셉니다. */
export function countElements(saju) {
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const pillars = [saju.year, saju.month, saju.day, saju.hour].filter(Boolean);
  pillars.forEach((p) => {
    counts[p.stem.element] += 1;
    counts[p.branch.element] += 1;
  });
  return counts;
}

/** mulberry32 시드 기반 PRNG (tarotEngine.js / biorhythmEngine.js와 동일한 방식) */
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

/**
 * 오행 구성에 따라 번호 1개의 가중치를 계산합니다 (타로 원소 가중치와 같은 결).
 * - 목(성장): 낮은~중간 번호(1~22)를 우대
 * - 화(확산): 상위 번호대(31~45)나 끝수 7,8,9,0을 우대
 * - 토(안정): 중간 번호대(16~30)를 우대
 * - 금(결단): 실제 최근 당첨 데이터가 있으면 그 빈도, 없으면 소수(素數)를 우대
 * - 수(지혜): 짝수를 우대
 */
function numberWeight(n, counts, recentFrequency) {
  let w = 1;
  if (counts.목 > 0 && n >= 1 && n <= 22) w += counts.목 * 0.7;
  if (counts.화 > 0) {
    const last = n % 10;
    if ([7, 8, 9, 0].includes(last)) w += counts.화 * 0.6;
    if (n >= 31) w += counts.화 * 0.4;
  }
  if (counts.토 > 0 && n >= 16 && n <= 30) w += counts.토 * 0.8;
  if (counts.금 > 0) {
    if (recentFrequency) w += (recentFrequency[n] ?? 0) * 1.6;
    else if (isPrime(n)) w += counts.금 * 0.7;
  }
  if (counts.수 > 0 && n % 2 === 0) w += counts.수 * 0.8;
  return w;
}

/**
 * 사주 오행 구성으로 로또 번호 6개(1세트)를 만듭니다.
 * @param {ReturnType<typeof calculateSaju>} saju
 * @param {Object} [options]
 * @param {boolean} [options.dateSeeded] - true면 생년월일+오늘 날짜로 시드 고정
 * @param {string} [options.birthdateStr] - dateSeeded용 시드 재료
 * @param {Object|null} [options.recentFrequency]
 * @param {number} [options.variantIndex] - 여러 세트를 만들 때 세트 구분용
 * @returns {{ numbers: number[], dominant: string }}
 */
export function numbersFromSaju(saju, { dateSeeded = true, birthdateStr = '', recentFrequency = null, variantIndex = 0 } = {}) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const seed = dateSeeded
    ? hashStringToInt(`${birthdateStr}-${todayKey}-saju-v${variantIndex}`)
    : (Math.random() * 4294967296) >>> 0;
  const rand = mulberry32(seed);

  const counts = countElements(saju);
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  const candidates = Array.from({ length: 45 }, (_, i) => i + 1);
  const keyed = candidates.map((n) => ({
    n,
    key: -Math.log(rand()) / numberWeight(n, counts, recentFrequency),
  }));
  keyed.sort((a, b) => a.key - b.key);

  const numbers = keyed.slice(0, 6).map((k) => k.n).sort((a, b) => a - b);
  return { numbers, dominant };
}

/** 같은 사주로 로또 번호 5세트를 한 번에 만듭니다. */
export function setsFromSaju(saju, options = {}, count = 5) {
  return Array.from({ length: count }, (_, i) =>
    numbersFromSaju(saju, { ...options, variantIndex: i })
  );
}

/* ══════════════════════════════════════════════════
   여기서부터: 오늘의 총평 / 재물운 / 골든타임 / 행운 아이템 등
   "재미로 보는 사주 운세" 콘텐츠용 함수들
   ══════════════════════════════════════════════════ */

// 오행 상생(生, 낳는 관계)·상극(剋, 억누르는 관계) 순환
const GENERATES = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // 내가 낳는 오행 = 식상(활동/사업)
const CONTROLS = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' };  // 내가 극하는 오행 = 재성(재물)
const CONTROLLED_BY = { 목: '금', 화: '수', 토: '목', 금: '화', 수: '토' }; // 나를 극하는 오행 = 관성(직장/명예)
const GENERATED_BY = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' };  // 나를 낳는 오행 = 인성(지원/학문)

// 하도낙서(河圖洛書) 기반 오행-숫자 대응. 각 오행의 상징 숫자 두 개.
export const ELEMENT_LUCKY_DIGITS = { 목: [3, 8], 화: [2, 7], 토: [5, 10], 금: [4, 9], 수: [1, 6] };

const ELEMENT_DIRECTION = { 목: '동쪽', 화: '남쪽', 토: '중앙', 금: '서쪽', 수: '북쪽' };
const ELEMENT_COLOR_ITEM = {
  목: { color: '초록색', item: '화분이나 나무 소재 소품' },
  화: { color: '빨간색', item: '캔들이나 붉은 계열 액세서리' },
  토: { color: '노란색·베이지', item: '도자기 소품이나 흙빛 지갑' },
  금: { color: '흰색·골드', item: '메탈 액세서리나 은색 열쇠고리' },
  수: { color: '파란색·검정', item: '물병이나 검은색 지갑' },
};
const ELEMENT_FENGSHUI_TIP = {
  목: '집 안에 작은 화분을 하나 들이거나, 창문을 열어 바람을 통하게 해보세요.',
  화: '현관이나 거실에 밝은 조명을 하나 켜두면 기운이 살아납니다.',
  토: '현관 앞 신발을 깔끔하게 정리하고 외출하세요.',
  금: '지갑 속 불필요한 영수증이나 카드를 정리해보세요.',
  수: '자기 전 물 한 잔을 준비해두고, 머리맡을 깨끗이 정돈하세요.',
};

// 일간(day stem)별 성향 한 줄 요약. 같은 오행이라도 양간/음간에 따라 결이 다르게.
const STEM_PERSONALITY = {
  갑: '큰 나무처럼 곧고 리더십이 강한',
  을: '화초처럼 유연하고 적응력이 좋은',
  병: '태양처럼 밝고 정열적인',
  정: '촛불처럼 섬세하고 따뜻한',
  무: '산처럼 묵직하고 신뢰감 있는',
  기: '논밭처럼 포용력 있고 실속 있는',
  경: '무쇠처럼 강인하고 결단력 있는',
  신: '보석처럼 예리하고 세련된',
  임: '바다처럼 대범하고 지혜로운',
  계: '이슬비처럼 섬세하고 통찰력 있는',
};

const NUMBER_STYLE_TEXT = {
  목: '낮은~중간 번호(1~22)를 중심으로',
  화: '높은 번호대(31~45)나 7·8·9·0으로 끝나는 번호를 중심으로',
  토: '중간 번호대(16~30)를 중심으로',
  금: '실제 최근 당첨 데이터를 참고하거나 소수(2,3,5,7…) 위주로',
  수: '짝수 번호를 중심으로',
};

function elementCharSet(el) {
  // 태어난 날짜/시드에 따라 두 상징수 중 하나를 정하고, 1~45 안의 후보(그 수 + 10의 배수)를 모두 모음
  const digits = ELEMENT_LUCKY_DIGITS[el];
  const candidates = new Set();
  digits.forEach((d) => {
    for (let n = d; n <= 45; n += 10) candidates.add(n);
  });
  return [...candidates].sort((a, b) => a - b);
}

/**
 * 일간(본인의 본질을 뜻하는 글자) 기반 성향 한 줄 + 재물운/사업운/직장운/연애운 해설을 만듭니다.
 * 연애운은 전통 명리학의 "재성(남성의 배우자성)/관성(여성의 배우자성)" 구분을 간단히 반영해
 * 성별에 따라 다른 오행을 봅니다. 성별을 모르면 재성 기준으로 봅니다.
 *
 * @param {ReturnType<typeof calculateSaju>} saju
 * @param {Object} [options]
 * @param {'male'|'female'|''} [options.gender]
 * @param {string} [options.birthdateStr] - 이번 주 금전운 문구를 날짜별로 다르게 하기 위한 시드 재료
 */
export function buildFortuneSummary(saju, { gender = '', birthdateStr = '' } = {}) {
  const dayElement = saju.day.stem.element;
  const dayChar = saju.day.stem.char;
  const counts = countElements(saju);

  const wealthEl = CONTROLS[dayElement];
  const businessEl = GENERATES[dayElement];
  const careerEl = CONTROLLED_BY[dayElement];
  const loveEl = gender === 'female' ? CONTROLLED_BY[dayElement] : CONTROLS[dayElement];

  const strengthText = (el, count) => {
    if (count >= 3) return '뚜렷하게 자리잡아 있어 그 기운이 강하게 작용합니다';
    if (count >= 1) return '은은하게 자리하고 있어 무난한 흐름을 보입니다';
    return '사주 안에 거의 없어 다소 아쉬운 흐름이지만, 노력으로 충분히 보완할 수 있습니다';
  };

  const personality = `${STEM_PERSONALITY[dayChar]} 사주입니다. 일간이 ${ELEMENT_LABELS[dayElement]}인 만큼, ${dayElement === '목' ? '성장과 시작의' : dayElement === '화' ? '열정과 표현의' : dayElement === '토' ? '안정과 신뢰의' : dayElement === '금' ? '결단과 원칙의' : '유연함과 통찰의'} 기운을 타고났습니다.`;

  const wealth = `재물운을 뜻하는 ${ELEMENT_LABELS[wealthEl]} 기운이 ${strengthText(wealthEl, counts[wealthEl])}`;
  const business = `사업·확장운을 뜻하는 ${ELEMENT_LABELS[businessEl]} 기운이 ${strengthText(businessEl, counts[businessEl])}`;
  const career = `직장·이직운을 뜻하는 ${ELEMENT_LABELS[careerEl]} 기운이 ${strengthText(careerEl, counts[careerEl])}`;
  const love = `연애·결혼운을 뜻하는 ${ELEMENT_LABELS[loveEl]} 기운이 ${strengthText(loveEl, counts[loveEl])}`;

  // 이번 주 금전운: 날짜(주 단위) + 생년월일로 시드를 고정해, 같은 주에는 같은 문구가 나오도록
  const weekKey = getWeekKey(new Date());
  const seed = hashStringToInt(`${birthdateStr}-${weekKey}-wealth`);
  const rand = mulberry32(seed);
  const wealthCount = counts[wealthEl];
  const weeklyPool = wealthCount >= 2
    ? [
        '재성이 뜻하는 기운이 활성화되는 시기로, 뜻밖의 행운이나 귀인의 조력이 따를 수 있습니다.',
        '재물의 흐름이 원활한 시기라, 계획했던 지출이나 투자에 좋은 결과가 따를 수 있습니다.',
        '금전 감각이 예민해지는 때라, 평소보다 재물을 다루는 안목이 밝아집니다.',
      ]
    : [
        '재성이 다소 잠잠한 시기라, 큰 지출보다는 지키고 아끼는 편이 유리합니다.',
        '재물운이 조용히 흐르는 시기이니, 무리한 투자보다는 관망하는 자세가 좋습니다.',
        '들어오는 재물보다 나가는 재물을 먼저 살펴야 하는 시기입니다.',
      ];
  const weeklyWealth = weeklyPool[Math.floor(rand() * weeklyPool.length)];

  return { personality, wealth, business, career, love, weeklyWealth, wealthEl, businessEl, careerEl, loveEl };
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // 그 주의 일요일로 고정
  return d.toISOString().slice(0, 10);
}

/**
 * 사주에서 부족하거나(0~1개) 넘치는(3개 이상) 오행을 찾아, 로또 번호 조합에 쓸 "보완/극대화" 전략을 정합니다.
 * @returns {{ mode: 'boost'|'complement', element: string, text: string }}
 */
export function pickNumberStrategy(saju) {
  const counts = countElements(saju);
  const entries = Object.entries(counts);
  const [minEl, minCount] = entries.sort((a, b) => a[1] - b[1])[0];
  const [maxEl, maxCount] = entries.sort((a, b) => b[1] - a[1])[0];

  if (minCount <= 1) {
    return {
      mode: 'complement',
      element: minEl,
      text: `${ELEMENT_LABELS[minEl]} 기운이 부족하여 이를 보완해 주는 ${NUMBER_STYLE_TEXT[minEl]} 번호를 조합했습니다.`,
    };
  }
  return {
    mode: 'boost',
    element: maxEl,
    text: `${ELEMENT_LABELS[maxEl]} 기운이 강하게 자리잡고 있어, 이 기운을 극대화하는 ${NUMBER_STYLE_TEXT[maxEl]} 번호를 조합했습니다.`,
  };
}

/**
 * 메인 조합(사주 맞춤형 종합) 1세트. pickNumberStrategy()가 고른 오행을 강하게 반영합니다.
 */
export function mainNumberSet(saju, { dateSeeded = true, birthdateStr = '', recentFrequency = null } = {}) {
  const strategy = pickNumberStrategy(saju);
  const boostedCounts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0, ...countElements(saju) };
  boostedCounts[strategy.element] += 2; // 전략 오행에 가중치를 더 실어줌

  const todayKey = new Date().toISOString().slice(0, 10);
  const seed = hashStringToInt(`${birthdateStr}-${todayKey}-saju-main`);
  const rand = mulberry32(seed);

  const candidates = Array.from({ length: 45 }, (_, i) => i + 1);
  const keyed = candidates.map((n) => ({ n, key: -Math.log(rand()) / numberWeight(n, boostedCounts, recentFrequency) }));
  keyed.sort((a, b) => a.key - b.key);
  const numbers = keyed.slice(0, 6).map((k) => k.n).sort((a, b) => a - b);

  return { numbers, strategy };
}

/**
 * 재물운 극대화 조합 1세트. 재성(財星) 오행에 가중치를 집중합니다.
 */
/**
 * 특정 오행 하나에 가중치를 집중한 로또 번호 6개를 만듭니다.
 * (재물운=재성, 사업운=식상, 직장운=관성, 연애운=재성/관성 각각의 오행에 재사용됩니다)
 *
 * @param {ReturnType<typeof calculateSaju>} saju
 * @param {string} element - '목'|'화'|'토'|'금'|'수'
 * @param {string} seedTag - 세트별로 다른 결과가 나오도록 구분하는 시드 재료
 */
function elementFocusedSet(saju, element, seedTag, { birthdateStr = '', recentFrequency = null, dateSeeded = true } = {}) {
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  counts[element] = 3; // 해당 오행만 강하게 반영

  const todayKey = new Date().toISOString().slice(0, 10);
  const seed = dateSeeded
    ? hashStringToInt(`${birthdateStr}-${todayKey}-saju-${seedTag}`)
    : (Math.random() * 4294967296) >>> 0;
  const rand = mulberry32(seed);

  const candidates = Array.from({ length: 45 }, (_, i) => i + 1);
  const keyed = candidates.map((n) => ({ n, key: -Math.log(rand()) / numberWeight(n, counts, recentFrequency) }));
  keyed.sort((a, b) => a.key - b.key);
  const numbers = keyed.slice(0, 6).map((k) => k.n).sort((a, b) => a - b);

  return { numbers, element };
}

export function wealthNumberSet(saju, options = {}) {
  const dayElement = saju.day.stem.element;
  const wealthEl = CONTROLS[dayElement];
  const { numbers } = elementFocusedSet(saju, wealthEl, 'wealth', options);
  return { numbers, wealthElement: wealthEl };
}

/**
 * 사주 맞춤형 로또 번호 5세트를 한 번에 만듭니다 (메인 앱의 "5게임 생성"과 동일한 개수).
 * 각 세트가 서로 다른 운세 영역(종합/재물/사업/직장/연애)에 가중치를 둡니다.
 *
 * @param {ReturnType<typeof calculateSaju>} saju
 * @param {Object} [options]
 * @param {'male'|'female'|''} [options.gender]
 * @param {boolean} [options.dateSeeded]
 * @param {string} [options.birthdateStr]
 * @param {Object|null} [options.recentFrequency]
 * @returns {Array<{ label: string, numbers: number[], element: string }>}
 */
export function fiveNumberSets(saju, { gender = '', dateSeeded = true, birthdateStr = '', recentFrequency = null } = {}) {
  const dayElement = saju.day.stem.element;
  const wealthEl = CONTROLS[dayElement];
  const businessEl = GENERATES[dayElement];
  const careerEl = CONTROLLED_BY[dayElement];
  const loveEl = gender === 'female' ? CONTROLLED_BY[dayElement] : CONTROLS[dayElement];

  const main = mainNumberSet(saju, { dateSeeded, birthdateStr, recentFrequency });

  return [
    { label: '메인 조합 · 사주 종합', numbers: main.numbers, element: main.strategy.element },
    { label: '재물운 극대화', ...elementFocusedSet(saju, wealthEl, 'wealth', { dateSeeded, birthdateStr, recentFrequency }) },
    { label: '사업운 극대화', ...elementFocusedSet(saju, businessEl, 'business', { dateSeeded, birthdateStr, recentFrequency }) },
    { label: '직장·이직운 극대화', ...elementFocusedSet(saju, careerEl, 'career', { dateSeeded, birthdateStr, recentFrequency }) },
    { label: '연애·결혼운 극대화', ...elementFocusedSet(saju, loveEl, 'love', { dateSeeded, birthdateStr, recentFrequency }) },
  ];
}

/**
 * 행운의 단수 1개. 일간(day master)의 오행이 가진 하도낙서 상징수 중 하나를,
 * 그날 날짜로 시드를 고정해 1~45 범위 안에서 고릅니다.
 */
export function luckyDigit(saju, { birthdateStr = '' } = {}) {
  const dayElement = saju.day.stem.element;
  const pool = elementCharSet(dayElement);
  const todayKey = new Date().toISOString().slice(0, 10);
  const rand = mulberry32(hashStringToInt(`${birthdateStr}-${todayKey}-saju-lucky1`));
  const n = pool[Math.floor(rand() * pool.length)];
  return { number: n, element: dayElement };
}

/**
 * 행운의 골든타임(시간대) + 방향. 일간의 오행이 가리키는 방향과,
 * 그 오행에 해당하는 지지(띠) 시간대 중 하나를 그날 시드로 고릅니다.
 */
export function goldenTime(saju, { birthdateStr = '' } = {}) {
  const dayElement = saju.day.stem.element;
  const direction = ELEMENT_DIRECTION[dayElement];

  const matchingBranches = BRANCHES.filter((b) => b.element === dayElement);
  const todayKey = new Date().toISOString().slice(0, 10);
  const rand = mulberry32(hashStringToInt(`${birthdateStr}-${todayKey}-saju-time`));
  const branch = matchingBranches.length
    ? matchingBranches[Math.floor(rand() * matchingBranches.length)]
    : BRANCHES[Math.floor(rand() * 12)];

  const branchIdx = BRANCHES.indexOf(branch);
  const startHour = mod(branchIdx * 2 - 1, 24);
  const endHour = mod(startHour + 2, 24);
  const fmt = (h) => `${String(h).padStart(2, '0')}:00`;

  return {
    timeRange: `${fmt(startHour)} ~ ${fmt(endHour)}`,
    direction,
    text: `오늘 ${fmt(startHour)} ~ ${fmt(endHour)} 사이, ${direction} 방향의 판매점을 이용해보세요.`,
  };
}

export function luckyColorItem(saju) {
  const dayElement = saju.day.stem.element;
  const { color, item } = ELEMENT_COLOR_ITEM[dayElement];
  return { color, item, text: `${color} 계열의 ${item}, 오늘 하나 챙겨보세요.` };
}

export function fengshuiTip(saju) {
  const dayElement = saju.day.stem.element;
  return ELEMENT_FENGSHUI_TIP[dayElement];
}

const CLOSING_MESSAGES = [
  '로또는 일상의 소소한 설렘일 뿐, 진짜 대운은 당신의 성실함 속에서 자라납니다.',
  '오늘 하루도 스스로를 믿고 나아가는 당신을 응원합니다.',
  '운은 준비된 사람에게 곁을 내어준다고 하죠. 오늘도 좋은 하루 보내세요.',
  '숫자 하나하나보다, 그 숫자를 고르며 웃었던 오늘의 마음이 더 소중합니다.',
  '작은 행운들이 모여 큰 행복이 됩니다. 오늘도 고생 많으셨어요.',
];

export function closingMessage({ birthdateStr = '' } = {}) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const rand = mulberry32(hashStringToInt(`${birthdateStr}-${todayKey}-closing`));
  return CLOSING_MESSAGES[Math.floor(rand() * CLOSING_MESSAGES.length)];
}
