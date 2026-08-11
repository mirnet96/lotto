// 타로 결과 기록을 localStorage에 저장하고 불러오는 순수 JS 모듈입니다.
// 하루에 하나의 기록만 남기며(같은 날 다시 뽑으면 최신 결과로 덮어씀),
// history.html의 월별 달력 화면에서 이 모듈을 사용합니다.

const STORAGE_KEY = 'lottoSeulgi.tarotHistory';

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 전체 기록을 { 'YYYY-MM-DD': entry, ... } 형태의 객체로 반환합니다.
 * localStorage를 못 쓰는 환경(프라이빗 모드 등)이면 빈 객체를 반환합니다.
 */
export function loadAllReadings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('타로 기록을 불러오지 못했습니다.', e);
    return {};
  }
}

/**
 * 오늘(또는 지정한 날짜)의 결과를 저장합니다. 같은 날짜에 이미 기록이 있으면 덮어씁니다.
 *
 * @param {Object} entry
 * @param {string} entry.category - 카테고리 key
 * @param {string} entry.categoryLabel - 카테고리 한글 라벨
 * @param {number} entry.spread - 1 또는 3
 * @param {Array<{id:number, reversed:boolean, position:string|null, positionLabel:string|null}>} entry.cards
 * @param {number[]} entry.numbers - 로또 번호 6개
 * @param {string} [dateKey] - 저장할 날짜 (기본값: 오늘)
 * @returns {boolean} 저장 성공 여부
 */
export function saveReading(entry, dateKey = todayKey()) {
  try {
    const all = loadAllReadings();
    all[dateKey] = { ...entry, date: dateKey, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    console.warn('타로 기록 저장에 실패했습니다.', e);
    return false;
  }
}

/** 특정 날짜의 기록을 반환 (없으면 null) */
export function loadReadingByDate(dateKey) {
  return loadAllReadings()[dateKey] ?? null;
}

/**
 * 주어진 연/월(1~12)에 해당하는 기록만 필터링해서 반환합니다.
 * @returns {Object} { 'YYYY-MM-DD': entry, ... }
 */
export function loadReadingsForMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const all = loadAllReadings();
  return Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith(prefix)));
}

/** 특정 날짜의 기록을 삭제 */
export function deleteReading(dateKey) {
  try {
    const all = loadAllReadings();
    delete all[dateKey];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    return false;
  }
}
