/* ══════════════════════════════════════════════════
   js/generator.js — 번호 생성 알고리즘 + 카드 렌더링
   1223회차 실데이터 기반 통계 반영
   ══════════════════════════════════════════════════ */

/* ── 실데이터 기반 가중치 계산 ────────────────────── */
function buildWeights(data, recentWindow = 30) {
    const total = data.length;
    const freq  = {};
    for (let n = 1; n <= 45; n++) freq[n] = 0;
    data.forEach(d => d.nums.forEach(n => freq[n]++));

    const recentFreq = {};
    for (let n = 1; n <= 45; n++) recentFreq[n] = 0;
    data.slice(0, recentWindow).forEach(d => d.nums.forEach(n => recentFreq[n]++));

    /* 마지막 출현 간격 */
    const lastSeen = {};
    data.forEach((d, i) => d.nums.forEach(n => { if (!(n in lastSeen)) lastSeen[n] = i; }));

    /* 종합 가중치: 전체빈도 50% + 최근빈도 30% + 간격보정 20% */
    const weights = {};
    const maxFreq   = Math.max(...Object.values(freq));
    const maxRecent = Math.max(...Object.values(recentFreq));

    for (let n = 1; n <= 45; n++) {
        const wFreq   = (freq[n]   / maxFreq)   * 50;
        const wRecent = (recentFreq[n] / Math.max(maxRecent, 1)) * 30;
        /* 오래 안 나온 번호에 소폭 가산 (과잉 반영 방지) */
        const gap     = lastSeen[n] || 0;
        const wGap    = Math.min(gap / 20, 1) * 20;
        weights[n] = Math.max(wFreq + wRecent + wGap, 1);
    }
    return weights;
}

/* ── 실데이터 통계 구조 ── */
function buildStatSummary(data) {
    const sums = data.map(d => d.stats.sum);
    const avgS = sums.reduce((a, b) => a + b) / sums.length;

    /* 홀짝 비율 분포 */
    const eoCnt = {};
    data.forEach(d => { const r = d.stats.ratio.even_odd; eoCnt[r] = (eoCnt[r] || 0) + 1; });
    const topEO = Object.entries(eoCnt).sort((a, b) => b[1] - a[1])[0][0];

    /* 고저 비율 분포 */
    const lhCnt = {};
    data.forEach(d => { const r = d.stats.ratio.low_high; lhCnt[r] = (lhCnt[r] || 0) + 1; });
    const topLH = Object.entries(lhCnt).sort((a, b) => b[1] - a[1])[0][0];

    /* 연속 쌍 분포 */
    const consecCnt = { 0: 0, 1: 0, 2: 0 };
    data.forEach(d => {
        const s = [...d.nums].sort((a, b) => a - b);
        let p = 0;
        for (let i = 0; i < s.length - 1; i++) if (s[i + 1] === s[i] + 1) p++;
        consecCnt[Math.min(p, 2)]++;
    });

    return { avgSum: avgS, topEO, topLH, consecCnt, total: data.length };
}

/* ── 점수 계산 (실데이터 통계 기반) ── */
function scoreNums(arr, weights, summary) {
    let score = 100;
    const sum = arr.reduce((a, b) => a + b, 0);

    /* 합계: 평균(138) ±20 구간 최고점 */
    const diff = Math.abs(sum - 138);
    if      (diff <= 15)  score += 25;
    else if (diff <= 30)  score += 15;
    else if (diff <= 50)  score += 5;
    else                  score -= 10;

    /* 홀짝 3:3이 33.5%, 2:4가 26.7% */
    const odd = arr.filter(n => n % 2 !== 0).length;
    const eo  = { 3: 25, 2: 18, 4: 18, 1: 5, 5: 5, 0: -10, 6: -10 };
    score += eo[odd] || 0;

    /* 고저(1~23 저) 3:3 30.6%, 4:2 29.2% */
    const low = arr.filter(n => n <= 23).length;
    const lh  = { 3: 22, 4: 20, 2: 15, 5: 8, 1: 5, 0: -10, 6: -10 };
    score += lh[low] || 0;

    /* 연속쌍: 0쌍 48.3%, 1쌍 39.2% */
    const s = [...arr].sort((a, b) => a - b);
    let pairs = 0;
    for (let i = 0; i < s.length - 1; i++) if (s[i + 1] === s[i] + 1) pairs++;
    if      (pairs === 0) score += 15;
    else if (pairs === 1) score += 10;
    else if (pairs >= 3)  score -= 15;

    /* 3연속 금지 */
    for (let i = 0; i < s.length - 2; i++) {
        if (s[i + 1] === s[i] + 1 && s[i + 2] === s[i] + 2) { score -= 30; break; }
    }

    /* 구간(존) 커버: 4구간 52.6% 최다 */
    const zones = new Set(s.map(n => Math.min(4, Math.floor((n - 1) / 10)))).size;
    const zs = { 5: 15, 4: 20, 3: 8, 2: -10 };
    score += zs[zones] || 0;

    /* 끝수 중복 패널티 */
    const endCnt = {};
    for (const n of arr) { const e = n % 10; endCnt[e] = (endCnt[e] || 0) + 1; }
    for (const c of Object.values(endCnt)) { if (c >= 3) score -= 20; }

    /* 가중치 점수 (핫번호 가산) */
    const maxW    = Math.max(...Object.values(weights));
    const wScore  = arr.reduce((acc, n) => acc + (weights[n] || 0), 0);
    score += Math.round((wScore / (maxW * 6)) * 20);

    return score;
}

/* ── 유효성 필터 ── */
function isValid(arr) {
    const sum = arr.reduce((a, b) => a + b, 0);
    if (sum < 88 || sum > 188) return false;

    const odd = arr.filter(n => n % 2 !== 0).length;
    if (odd === 0 || odd === 6) return false;

    const low = arr.filter(n => n <= 23).length;
    if (low === 0 || low === 6) return false;

    const s = [...arr].sort((a, b) => a - b);
    for (let i = 0; i < s.length - 2; i++) {
        if (s[i + 1] === s[i] + 1 && s[i + 2] === s[i] + 2) return false;
    }

    const endCnt = {};
    for (const n of arr) { const e = n % 10; endCnt[e] = (endCnt[e] || 0) + 1; if (endCnt[e] >= 3) return false; }

    const zones = new Set(s.map(n => Math.min(4, Math.floor((n - 1) / 10)))).size;
    if (zones < 3) return false;

    return true;
}

/* ── 가중치 랜덤 추출 ── */
function weightedPick(pool, weights) {
    const w = pool.map(n => weights[n] || 1);
    const total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
}

/* ── 핵심 생성 함수 ── */
function smartNums(excludeNums = [], weights = freqMap, summary = null) {
    const exclude = new Set(excludeNums);
    const pool    = Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !exclude.has(n));
    let best = null, bestScore = -Infinity;

    for (let t = 0; t < 800; t++) {
        const s = new Set();
        const available = [...pool];
        while (s.size < 6 && available.length > s.size) {
            const pick = weightedPick(available.filter(n => !s.has(n)), weights);
            s.add(pick);
        }
        if (s.size < 6) continue;
        const arr = [...s].sort((a, b) => a - b);
        if (!isValid(arr)) continue;
        const sc = scoreNums(arr, weights, summary);
        if (sc > bestScore) { bestScore = sc; best = arr; if (sc >= 175) break; }
    }

    /* 폴백 */
    if (!best) {
        for (let t = 0; t < 400; t++) {
            const s = new Set();
            while (s.size < 6) s.add(pool[Math.floor(Math.random() * pool.length)]);
            const arr = [...s].sort((a, b) => a - b);
            if (isValid(arr)) return { nums: arr, score: 0 };
        }
        const s = new Set();
        while (s.size < 6) s.add(pool[Math.floor(Math.random() * pool.length)]);
        return { nums: [...s].sort((a, b) => a - b), score: 0 };
    }
    return { nums: best, score: bestScore };
}

/* ── 등급 뱃지 ── */
function getQualityBadge(score) {
    if (score >= 185) return { label: 'S+', cls: 'bg-purple-50 text-purple-700 border border-purple-300' };
    if (score >= 175) return { label: 'S급', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
    if (score >= 160) return { label: 'A급', cls: 'bg-green-50 text-green-700 border border-green-200' };
    return { label: 'B급', cls: 'bg-blue-50 text-blue-700 border border-blue-200' };
}

/* ── 번호 저장 ── */
function applySet(nums, cardEl, btnEl) {
    const arr = getHistory();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    arr.unshift({ id: Date.now(), date: dateStr, nums });
    setHistory(arr);
    cardEl.classList.add('saved');
    btnEl.innerHTML = `<span class="material-symbols-rounded text-[14px]">check</span><span>저장됨</span>`;
    btnEl.classList.replace('text-slate-400', 'text-green-600');
    btnEl.classList.add('border-green-200', 'bg-green-50', 'pointer-events-none');
    toast('번호가 저장되었습니다');
}

/* ── 5세트 생성 및 렌더링 ── */
function generateAll(excludeNums = []) {
    const btn  = document.getElementById('genBtn');
    const wrap = document.getElementById('sets-container');
    btn.classList.add('spinning');
    wrap.innerHTML = '';

    /* 실데이터 가중치 사용 */
    const weights = Object.keys(freqMap).length
        ? buildWeights(lottoData, 30)
        : freqMap;

    Array.from({ length: 5 }).forEach((_, i) => {
        const { nums, score } = smartNums(excludeNums, weights);

        const card = document.createElement('div');
        card.className = 'set-card relative flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl px-2.5 py-3 mb-2.5 shadow-sm transition-colors duration-200';

        if (score > 0) {
            const qb    = getQualityBadge(score);
            const badge = document.createElement('div');
            badge.className   = `absolute top-1.5 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${qb.cls}`;
            badge.textContent = qb.label;
            card.appendChild(badge);
        }

        const lbl = document.createElement('div');
        lbl.className   = 'font-display text-[17px] text-slate-400 min-w-[18px] text-center flex-shrink-0';
        lbl.textContent = 'ABCDE'[i];

        const row = document.createElement('div');
        row.className = 'flex flex-1 min-w-0 items-center';
        row.style.gap = 'clamp(3px, 1vw, 6px)';
        nums.forEach((n, j) => row.appendChild(mkBall(n, 'ball', i * 65 + j * 42)));

        const meta = document.createElement('div');
        meta.className = 'flex flex-col gap-1.5 items-end flex-shrink-0 pt-4';

        const sumEl = document.createElement('div');
        sumEl.className   = 'text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full whitespace-nowrap';
        sumEl.textContent = '합 ' + nums.reduce((a, b) => a + b, 0);

        const applyBtn = document.createElement('button');
        applyBtn.className = 'flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-400 cursor-pointer whitespace-nowrap transition-all duration-150 hover:bg-green-50 hover:border-green-200 hover:text-green-600';
        applyBtn.innerHTML = `<span class="material-symbols-rounded text-[14px]">bookmark</span>`;
        applyBtn.onclick   = () => applySet(nums, card, applyBtn);

        meta.append(sumEl, applyBtn);
        card.append(lbl, row, meta);
        wrap.appendChild(card);
    });

    setTimeout(() => btn.classList.remove('spinning'), 550);
}
