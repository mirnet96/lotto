// 바이오리듬(신체·감성·지성 주기) 계산과, 그 값을 이용한 로또 번호 생성 로직.
// 순수 함수만 있는 모듈이라 웹/RN 어디서든 그대로 재사용할 수 있습니다.

const CYCLES = {
  physical: { days: 23, label: '신체', color: '#EF4444' },
  emotional: { days: 28, label: '감성', color: '#3B82F6' },
  intellectual: { days: 33, label: '지성', color: '#22C55E' },
};

export const BIORHYTHM_CYCLES = CYCLES;

/** mulberry32 시드 기반 PRNG (tarotEngine.js와 동일한 방식) */
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

/** 생년월일(YYYY-MM-DD)로부터 기준일까지 경과 일수 */
export function daysSinceBirth(birthdateStr, targetDate = new Date()) {
  const birth = new Date(`${birthdateStr}T00:00:00`);
  const target = new Date(targetDate);
  birth.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - birth) / 86400000);
}

function cycleValue(daysSince, cycleDays) {
  return Math.sin((2 * Math.PI * daysSince) / cycleDays) * 100;
}

/**
 * 특정 날짜의 신체/감성/지성 주기 값(-100~100)을 반환합니다.
 * @returns {{physical:{...,value:number}, emotional:{...}, intellectual:{...}}}
 */
export function getBiorhythm(birthdateStr, targetDate = new Date()) {
  const days = daysSinceBirth(birthdateStr, targetDate);
  const result = {};
  for (const [key, cycle] of Object.entries(CYCLES)) {
    result[key] = { ...cycle, value: cycleValue(days, cycle.days) };
  }
  return result;
}

/**
 * 기준일 앞뒤로 rangeDays만큼의 파형 시리즈를 반환합니다 (차트용).
 * @returns {Array<{date:string, offset:number, physical:number, emotional:number, intellectual:number}>}
 */
export function getBiorhythmSeries(birthdateStr, centerDate = new Date(), rangeDays = 15) {
  const series = [];
  for (let offset = -rangeDays; offset <= rangeDays; offset++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + offset);
    const days = daysSinceBirth(birthdateStr, d);
    const point = {
      date: d.toISOString().slice(0, 10),
      offset,
    };
    for (const [key, cycle] of Object.entries(CYCLES)) {
      point[key] = cycleValue(days, cycle.days);
    }
    series.push(point);
  }
  return series;
}

/** -100~100 값을 1~45 번호로 매핑 */
function valueToNumber(value) {
  const n = Math.round(((value + 100) / 200) * 44) + 1;
  return Math.min(45, Math.max(1, n));
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function numberWeight(n, dominantKey, recentFrequency) {
  let w = 1;
  if (dominantKey === 'physical') {
    const last = n % 10;
    if ([7, 8, 9, 0].includes(last)) w += 1.2;
    if (n >= 31) w += 0.8;
  } else if (dominantKey === 'emotional') {
    if (n % 2 === 0) w += 1.6;
  } else if (dominantKey === 'intellectual') {
    if (recentFrequency) w += (recentFrequency[n] ?? 0) * 1.8;
    else if (isPrime(n)) w += 1.2;
  }
  return w;
}

/**
 * 오늘의 바이오리듬 값으로 로또 번호 6개를 만듭니다.
 * - 신체/감성/지성 값을 각각 1~45 번호로 매핑해 최대 3개를 고정수로 사용
 * - 나머지는 가장 값이 높은(우세한) 주기의 성향에 따라 가중 추출
 *   (신체 우세: 높은 번호대/끝수, 감성 우세: 짝수, 지성 우세: 실제 최근 당첨 데이터 기반 "분석적" 번호)
 *
 * @param {ReturnType<typeof getBiorhythm>} biorhythm
 * @param {Object} [options]
 * @param {boolean} [options.dateSeeded] - true면 생년월일+오늘 날짜로 시드 고정(하루 동안 같은 결과)
 * @param {string} [options.birthdateStr] - dateSeeded용 시드 재료
 * @param {Object|null} [options.recentFrequency] - lottoStats.js의 최근 당첨 빈도 맵
 * @returns {{ numbers: number[], fixedNumbers: number[], dominant: string }}
 */
export function numbersFromBiorhythm(biorhythm, { dateSeeded = true, birthdateStr = '', recentFrequency = null, variantIndex = 0 } = {}) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const seed = dateSeeded
    ? hashStringToInt(`${birthdateStr}-${todayKey}-biorhythm-v${variantIndex}`)
    : (Math.random() * 4294967296) >>> 0;
  const rand = mulberry32(seed);

  const fixedSet = new Set();
  Object.values(biorhythm).forEach((c) => fixedSet.add(valueToNumber(c.value)));
  const fixedNumbers = [...fixedSet];

  const dominant = Object.entries(biorhythm).sort((a, b) => Math.abs(b[1].value) - Math.abs(a[1].value))[0][0];

  const candidates = [];
  for (let n = 1; n <= 45; n++) {
    if (!fixedSet.has(n)) candidates.push(n);
  }
  const keyed = candidates.map((n) => ({
    n,
    key: -Math.log(rand()) / numberWeight(n, dominant, recentFrequency),
  }));
  keyed.sort((a, b) => a.key - b.key);

  const remainingCount = 6 - fixedNumbers.length;
  const picked = keyed.slice(0, remainingCount).map((k) => k.n);
  const numbers = [...fixedNumbers, ...picked].sort((a, b) => a - b);

  return { numbers, fixedNumbers, dominant };
}

/**
 * 오늘의 바이오리듬으로 로또 번호 5세트를 한 번에 만듭니다 (메인 앱의 "5게임 생성"과 동일한 방식).
 * dateSeeded=true면 세트별로 다른 값이 나오되, 하루 동안은 같은 5세트가 유지됩니다.
 *
 * @returns {Array<{ numbers: number[], fixedNumbers: number[], dominant: string }>}
 */
export function setsFromBiorhythm(biorhythm, options = {}, count = 5) {
  return Array.from({ length: count }, (_, i) =>
    numbersFromBiorhythm(biorhythm, { ...options, variantIndex: i })
  );
}
