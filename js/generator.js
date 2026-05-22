/* ══════════════════════════════════════════════════
   js/generator.js — 다크 테마 완전 적용
   ══════════════════════════════════════════════════ */

function buildWeights(data, recentWindow = 30) {
    const total = data.length;
    const freq  = {};
    for (let n = 1; n <= 45; n++) freq[n] = 0;
    data.forEach(d => d.nums.forEach(n => freq[n]++));

    const recentFreq = {};
    for (let n = 1; n <= 45; n++) recentFreq[n] = 0;
    data.slice(0, recentWindow).forEach(d => d.nums.forEach(n => recentFreq[n]++));

    const lastSeen = {};
    data.forEach((d, i) => d.nums.forEach(n => { if (!(n in lastSeen)) lastSeen[n] = i; }));

    const weights  = {};
    const maxFreq  = Math.max(...Object.values(freq));
    const maxRecent= Math.max(...Object.values(recentFreq));
    for (let n = 1; n <= 45; n++) {
        const wFreq   = (freq[n]   / maxFreq)            * 50;
        const wRecent = (recentFreq[n] / Math.max(maxRecent, 1)) * 30;
        const gap     = lastSeen[n] || 0;
        const wGap    = Math.min(gap / 20, 1) * 20;
        weights[n] = Math.max(wFreq + wRecent + wGap, 1);
    }
    return weights;
}

function scoreNums(arr, weights) {
    let score = 100;
    const sum = arr.reduce((a, b) => a + b, 0);
    const diff = Math.abs(sum - 138);
    if      (diff <= 15) score += 25;
    else if (diff <= 30) score += 15;
    else if (diff <= 50) score += 5;
    else                 score -= 10;

    const odd = arr.filter(n => n % 2 !== 0).length;
    score += ({ 3:25, 2:18, 4:18, 1:5, 5:5, 0:-10, 6:-10 })[odd] || 0;

    const low = arr.filter(n => n <= 23).length;
    score += ({ 3:22, 4:20, 2:15, 5:8, 1:5, 0:-10, 6:-10 })[low] || 0;

    const s = [...arr].sort((a, b) => a - b);
    let pairs = 0;
    for (let i = 0; i < s.length - 1; i++) if (s[i+1] === s[i]+1) pairs++;
    if      (pairs === 0) score += 15;
    else if (pairs === 1) score += 10;
    else if (pairs >= 3)  score -= 15;

    for (let i = 0; i < s.length - 2; i++) {
        if (s[i+1] === s[i]+1 && s[i+2] === s[i]+2) { score -= 30; break; }
    }

    const zones = new Set(s.map(n => Math.min(4, Math.floor((n-1)/10)))).size;
    score += ({ 5:15, 4:20, 3:8, 2:-10 })[zones] || 0;

    const endCnt = {};
    for (const n of arr) { const e = n % 10; endCnt[e] = (endCnt[e]||0)+1; }
    for (const c of Object.values(endCnt)) if (c >= 3) score -= 20;

    const maxW   = Math.max(...Object.values(weights));
    const wScore = arr.reduce((acc, n) => acc + (weights[n]||0), 0);
    score += Math.round((wScore / (maxW * 6)) * 20);
    return score;
}

function isValid(arr) {
    const sum = arr.reduce((a, b) => a + b, 0);
    if (sum < 88 || sum > 188) return false;
    const odd = arr.filter(n => n % 2 !== 0).length;
    if (odd === 0 || odd === 6) return false;
    const low = arr.filter(n => n <= 23).length;
    if (low === 0 || low === 6) return false;
    const s = [...arr].sort((a, b) => a - b);
    for (let i = 0; i < s.length - 2; i++)
        if (s[i+1] === s[i]+1 && s[i+2] === s[i]+2) return false;
    const endCnt = {};
    for (const n of arr) { const e = n % 10; endCnt[e] = (endCnt[e]||0)+1; if (endCnt[e] >= 3) return false; }
    const zones = new Set(s.map(n => Math.min(4, Math.floor((n-1)/10)))).size;
    if (zones < 3) return false;
    return true;
}

function weightedPick(pool, weights) {
    const w = pool.map(n => weights[n] || 1);
    const total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
}

function smartNums(excludeNums = [], weights = freqMap) {
    const exclude = new Set(excludeNums);
    const pool    = Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !exclude.has(n));
    let best = null, bestScore = -Infinity;

    for (let t = 0; t < 800; t++) {
        const s = new Set();
        while (s.size < 6) s.add(weightedPick(pool.filter(n => !s.has(n)), weights));
        if (s.size < 6) continue;
        const arr = [...s].sort((a, b) => a - b);
        if (!isValid(arr)) continue;
        const sc = scoreNums(arr, weights);
        if (sc > bestScore) { bestScore = sc; best = arr; if (sc >= 175) break; }
    }

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

/* ── 등급 뱃지 (다크 테마) ── */
function getQualityBadge(score) {
    if (score >= 185) return { label: '✨ S+', color: '#C084FC', bg: 'rgba(192,132,252,0.15)', border: 'rgba(192,132,252,0.35)' };
    if (score >= 175) return { label: '⭐ S급', color: '#F5C842', bg: 'rgba(245,200,66,0.12)', border: 'rgba(245,200,66,0.3)' };
    if (score >= 160) return { label: '🔥 A급', color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.28)' };
    return                    { label: '💧 B급', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.28)' };
}

/* ── 세트 라벨 이모지 ── */
const SET_EMOJIS = ['🅐','🅑','🅒','🅓','🅔'];

/* ── 저장 ── */
function applySet(nums, cardEl, btnEl) {
    const arr = getHistory();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    arr.unshift({ id: Date.now(), date: dateStr, nums });
    setHistory(arr);

    /* 버튼 상태 변경 */
    btnEl.innerHTML  = '✅ 저장됨';
    btnEl.style.borderColor = 'rgba(34,197,94,0.4)';
    btnEl.style.background  = 'rgba(34,197,94,0.1)';
    btnEl.style.color       = '#22C55E';
    btnEl.style.pointerEvents = 'none';

    /* 카드 테두리 반짝임 */
    cardEl.style.borderColor = 'rgba(245,200,66,0.4)';
    setTimeout(() => { cardEl.style.borderColor = ''; }, 1200);

    if (typeof toast === 'function') toast('⭐ 번호가 저장되었습니다');
    if (typeof updateBadge === 'function') updateBadge();
}

/* ── 5세트 생성 & 렌더링 ── */
function generateAll(excludeNums = []) {
    const btn  = document.getElementById('genBtn');
    const icon = document.getElementById('gen-icon');
    const wrap = document.getElementById('sets-container');

    /* 버튼 스핀 */
    if (icon) {
        icon.style.transition = 'transform 0.55s cubic-bezier(.4,0,.2,1)';
        icon.style.transform  = 'rotate(360deg)';
        setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 560);
    }
    wrap.innerHTML = '';

    const weights = Object.keys(freqMap).length ? buildWeights(lottoData, 30) : freqMap;

    Array.from({ length: 5 }).forEach((_, i) => {
        const { nums, score } = smartNums(excludeNums, weights);
        const sum = nums.reduce((a, b) => a + b, 0);
        const odd = nums.filter(n => n % 2 !== 0).length;

        const card = document.createElement('div');
        card.className = 'set-card';
        /* 입장 애니메이션 딜레이 */
        card.style.animationDelay = (i * 60) + 'ms';
        card.style.animation = `fadeIn .3s ease both`;

        /* ── 카드 헤더 ── */
        const header = document.createElement('div');
        header.className = 'set-card-header';

        const lbl = document.createElement('div');
        lbl.className = 'set-label';
        lbl.innerHTML = `<span class="emoji">${SET_EMOJIS[i]}</span> 세트 ${'ABCDE'[i]}`;

        const rightWrap = document.createElement('div');
        rightWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';

        /* 등급 뱃지 */
        if (score > 0) {
            const qb    = getQualityBadge(score);
            const badge = document.createElement('span');
            badge.style.cssText = `font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;
                background:${qb.bg};border:1px solid ${qb.border};color:${qb.color};letter-spacing:.3px;`;
            badge.textContent = qb.label;
            rightWrap.appendChild(badge);
        }

        /* 저장 버튼 */
        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.innerHTML = '<span class="emoji">⭐</span> 저장';
        saveBtn.onclick   = () => applySet(nums, card, saveBtn);
        rightWrap.appendChild(saveBtn);

        header.append(lbl, rightWrap);

        /* ── 볼 행 ── */
        const ballsRow = document.createElement('div');
        ballsRow.className = 'balls-row';
        nums.forEach(n => ballsRow.appendChild(mkBall(n, 'ball')));

        /* ── 카드 푸터 (합계 + 홀짝) ── */
        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:10px;';

        const sumTag = document.createElement('span');
        sumTag.style.cssText = 'font-size:10.5px;color:var(--text2);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:3px 9px;border-radius:99px;';
        sumTag.textContent = '합계 ' + sum;

        const eoTag = document.createElement('span');
        eoTag.style.cssText = 'font-size:10.5px;color:var(--text2);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:3px 9px;border-radius:99px;';
        eoTag.textContent = `홀${odd} 짝${6-odd}`;

        footer.append(sumTag, eoTag);

        card.append(header, ballsRow, footer);
        wrap.appendChild(card);
    });
}
