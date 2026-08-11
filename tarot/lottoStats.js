// https://lotto.smart-alba.com/lotto.json 에서 실제 당첨 데이터를 가져와
// 최근 N회차의 번호별 출현 빈도를 계산합니다. 브라우저 fetch API를 쓰므로
// 웹에서만 동작합니다. RN에서 동일하게 쓰려면 이 파일의 fetch 호출부만
// react-native의 fetch로 그대로 옮기면 됩니다(로직은 동일).
//
// tarotEngine.js의 numbersFromDrawWeighted()에 recentFrequency로 넘겨주면
// 소드(공기) 카드가 있을 때 "최근 자주 나온 번호"를 우대하는 데 쓰입니다.

const LOTTO_JSON_URL = 'https://lotto.smart-alba.com/lotto.json';
const CACHE_KEY = 'lottoSeulgi.recentFrequency';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6시간 — 매주 갱신되는 데이터라 자주 새로 받을 필요는 없음

/**
 * @param {number} recentCount - 몇 회차를 "최근"으로 볼지 (기본 24회 ≈ 약 6개월)
 * @returns {Promise<Object|null>} { [번호]: 0~1로 정규화된 최근 출현 빈도 }.
 *   네트워크 실패 시 null (호출 쪽에서 대체 로직으로 자연스럽게 폴백됩니다).
 */
export async function getRecentNumberFrequency(recentCount = 24) {
  const cached = readCache();
  if (cached) return cached;

  try {
    const res = await fetch(LOTTO_JSON_URL);
    if (!res.ok) {
      throw new Error(`lotto.json 응답 오류: ${res.status}`);
    }

    const draws = await res.json();
    if (!Array.isArray(draws) || draws.length === 0) {
      throw new Error('lotto.json 형식이 예상과 다릅니다.');
    }

    // 회차(no) 내림차순이라고 가정하지만, 혹시 순서가 다를 경우를 대비해
    // 한 번 더 정렬한 뒤 앞에서부터 recentCount개를 "최근"으로 취급합니다.
    const sorted = [...draws].sort((a, b) => (b.no ?? 0) - (a.no ?? 0));
    const recent = sorted.slice(0, recentCount);

    const freq = {};
    for (let n = 1; n <= 45; n++) freq[n] = 0;

    recent.forEach((draw) => {
      (draw.nums ?? []).forEach((n) => {
        if (freq[n] !== undefined) freq[n] += 1;
      });
    });

    const maxCount = Math.max(...Object.values(freq), 1);
    const normalized = {};
    for (let n = 1; n <= 45; n++) {
      normalized[n] = freq[n] / maxCount;
    }

    writeCache(normalized);
    return normalized;
  } catch (e) {
    console.warn('최근 당첨 번호 통계를 불러오지 못했습니다. 대체 로직을 사용합니다.', e);
    return null;
  }
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > CACHE_TTL_MS) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch (e) {
    // sessionStorage를 못 쓰는 환경이면 그냥 캐시 없이 매번 fetch
  }
}
