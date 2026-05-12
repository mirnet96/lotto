/* ══════════════════════════════════════════════════
   js/generator.js — 번호 생성 알고리즘 + 카드 렌더링
   ══════════════════════════════════════════════════ */

/* ── 점수 계산 ── */
function scoreNums(arr) {
    let score = 100;
    const sum = arr.reduce((a, b) => a + b, 0);
    if (sum >= 115 && sum <= 160) score += 20;
    else if (sum >= 100 && sum <= 175) score += 5;

    const odd = arr.filter(n => n % 2 !== 0).length;
    if (odd === 3) score += 15;
    else if (odd === 2 || odd === 4) score += 8;

    const low = arr.filter(n => n <= 23).length;
    if (low === 3) score += 15;
    else if (low === 2 || low === 4) score += 8;

    let maxConsec = 1, cur = 1;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] === arr[i - 1] + 1) { cur++; maxConsec = Math.max(maxConsec, cur); }
        else cur = 1;
    }
    if (maxConsec === 1) score += 10;
    else if (maxConsec === 2) score += 5;

    const zones = new Set(arr.map(n => Math.min(4, Math.floor((n - 1) / 10))));
    score += zones.size * 8;

    if (Object.keys(freqMap).length > 0) {
        const maxFreq   = Math.max(...Object.values(freqMap));
        const freqScore = arr.reduce((acc, n) => acc + (freqMap[n] || 0), 0);
        score += Math.round((freqScore / (maxFreq * 6)) * 20);
    }
    return score;
}

/* ── 유효성 검사 ── */
function isValid(arr) {
    const sum = arr.reduce((a, b) => a + b, 0);
    if (sum < 100 || sum > 175) return false;

    const odd = arr.filter(n => n % 2 !== 0).length;
    if (odd === 0 || odd === 6) return false;

    const low = arr.filter(n => n <= 23).length;
    if (low === 0 || low === 6) return false;

    for (let i = 0; i < arr.length - 2; i++) {
        if (arr[i + 1] === arr[i] + 1 && arr[i + 2] === arr[i] + 2) return false;
    }

    const endCnt = {};
    for (const n of arr) {
        const e = n % 10;
        endCnt[e] = (endCnt[e] || 0) + 1;
        if (endCnt[e] >= 3) return false;
    }

    const zones = new Set(arr.map(n => Math.min(4, Math.floor((n - 1) / 10))));
    if (zones.size < 3) return false;

    return true;
}

/* ── 가중치 랜덤 ── */
function weightedRandom(pool) {
    if (!Object.keys(freqMap).length)
        return pool[Math.floor(Math.random() * pool.length)];
    const weights = pool.map(n => freqMap[n] || 1);
    const total   = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
}

/* ── 스마트 번호 생성 ── */
function smartNums(excludeNums = []) {
    const exclude = new Set(excludeNums);
    const pool    = Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !exclude.has(n));
    let best = null, bestScore = -1;

    for (let t = 0; t < 500; t++) {
        const s = new Set();
        while (s.size < 6 && pool.length > s.size)
            s.add(weightedRandom(pool.filter(n => !s.has(n))));
        if (s.size < 6) continue;
        const arr = [...s].sort((a, b) => a - b);
        if (!isValid(arr)) continue;
        const sc = scoreNums(arr);
        if (sc > bestScore) { bestScore = sc; best = arr; if (sc >= 160) break; }
    }

    if (!best) {
        for (let t = 0; t < 300; t++) {
            const s = new Set();
            while (s.size < 6) s.add(pool[Math.floor(Math.random() * pool.length)]);
            const arr = [...s].sort((a, b) => a - b);
            const sum = arr.reduce((a, b) => a + b, 0);
            if (sum >= avgSum - 22 && sum <= avgSum + 22) return { nums: arr, score: 0 };
        }
        const s = new Set();
        while (s.size < 6) s.add(pool[Math.floor(Math.random() * pool.length)]);
        return { nums: [...s].sort((a, b) => a - b), score: 0 };
    }
    return { nums: best, score: bestScore };
}

/* ── 등급 뱃지 ── */
function getQualityBadge(score) {
    if (score >= 160) return { label: 'S급', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
    if (score >= 140) return { label: 'A급', cls: 'bg-green-50 text-green-700 border border-green-200' };
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
    btnEl.classList.add('done');
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

    Array.from({ length: 5 }).forEach((_, i) => {
        const { nums, score } = smartNums(excludeNums);

        const card = document.createElement('div');
        card.className = 'set-card relative flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl px-2.5 py-3 mb-2.5 shadow-sm transition-colors duration-200';

        if (score > 0) {
            const qb    = getQualityBadge(score);
            const badge = document.createElement('div');
            badge.className = `absolute top-1.5 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${qb.cls}`;
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
