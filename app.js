/* ══════════════════════════════════════════════════
   app.js  —  LOTTO+
   ══════════════════════════════════════════════════ */

const LS_KEY = 'lotto_my_history_v1';
let lottoData = [];
let avgSum = 137;
let freqMap = {};

/* ── localStorage ── */
function getHistory() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
}
function setHistory(arr) {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
    refreshBadges();
}
function refreshBadges() {
    const n = getHistory().length;
    ['pc-badge', 'mob-badge'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (n > 0) { el.textContent = n > 99 ? '99+' : n; el.classList.remove('hidden'); }
        else el.classList.add('hidden');
    });
}

/* ── Tabs ── */
function switchTab(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    ['tn-', 'bn-'].forEach(prefix =>
        document.querySelectorAll(`[id^="${prefix}"]`).forEach(b => b.classList.remove('active'))
    );
    document.getElementById('page-' + name).classList.add('active');
    ['tn-', 'bn-'].forEach(prefix => {
        const el = document.getElementById(prefix + name);
        if (el) el.classList.add('active');
    });
    if (name === 'myhistory') renderMyHistory();
    if (name !== 'qr') stopCamera();
}

/* ── Ball helpers ── */
function bCls(n) {
    if (n <= 10) return 'b-y';
    if (n <= 20) return 'b-b';
    if (n <= 30) return 'b-r';
    if (n <= 40) return 'b-g';
    return 'b-gr';
}
function bHex(n) {
    if (n <= 10) return '#FBC02D';
    if (n <= 20) return '#1976D2';
    if (n <= 30) return '#E53935';
    if (n <= 40) return '#757575';
    return '#43A047';
}

/* size: 'ball' | 'mini-ball' | 'freq-mini-ball' */
function mkBall(n, size = 'ball', delay = 0) {
    const d = document.createElement('div');
    /* Tailwind 유틸리티 + 커스텀 클래스 조합 */
    const baseMap = {
        'ball':           'relative overflow-hidden rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
        'mini-ball':      'relative overflow-hidden rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 w-[30px] h-[30px] text-[11px]',
        'freq-mini-ball': 'relative overflow-hidden rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 w-7 h-7 text-[11px]',
    };
    d.className = `${size} ${bCls(n)} ${baseMap[size] || ''}`;
    if (size === 'ball') {
        d.style.width  = 'var(--ball-size)';
        d.style.height = 'var(--ball-size)';
        d.style.fontSize = 'var(--ball-font)';
        d.classList.add('anim');
        if (delay) d.style.animationDelay = delay + 'ms';
    }
    d.textContent = n;
    return d;
}

/* ── Toast ── */
let toastTimer;
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ── Save one set ── */
function applySet(nums, cardEl, btnEl) {
    const arr = getHistory();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    arr.unshift({ id: Date.now(), date: dateStr, nums });
    setHistory(arr);
    cardEl.classList.add('saved');
    btnEl.classList.add('done');
    btnEl.innerHTML = `<span class="material-symbols-rounded text-[14px]">check</span><span>저장됨</span>`;
    btnEl.classList.replace('text-slate-400', 'text-green-600');
    btnEl.classList.add('border-green-200', 'bg-green-50', 'pointer-events-none');
    toast('번호가 저장되었습니다');
}

/* ── 번호 생성 알고리즘 ── */
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
        const maxFreq = Math.max(...Object.values(freqMap));
        const freqScore = arr.reduce((acc, n) => acc + (freqMap[n] || 0), 0);
        score += Math.round((freqScore / (maxFreq * 6)) * 20);
    }
    return score;
}

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

function weightedRandom(pool) {
    if (!Object.keys(freqMap).length)
        return pool[Math.floor(Math.random() * pool.length)];
    const weights = pool.map(n => freqMap[n] || 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
}

function smartNums(excludeNums = []) {
    const exclude = new Set(excludeNums);
    const pool = Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !exclude.has(n));
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

function getQualityBadge(score) {
    if (score >= 160) return { label: 'S급', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
    if (score >= 140) return { label: 'A급', cls: 'bg-green-50 text-green-700 border border-green-200' };
    return { label: 'B급', cls: 'bg-blue-50 text-blue-700 border border-blue-200' };
}

/* ── Generate ── */
function generateAll(excludeNums = []) {
    const btn = document.getElementById('genBtn');
    btn.classList.add('spinning');
    const wrap = document.getElementById('sets-container');
    wrap.innerHTML = '';

    Array.from({ length: 5 }).forEach((_, i) => {
        const { nums, score } = smartNums(excludeNums);

        /* 카드 */
        const card = document.createElement('div');
        card.className = 'set-card relative flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl px-2.5 py-3 mb-2.5 shadow-sm transition-colors duration-200';

        /* 등급 뱃지 */
        if (score > 0) {
            const qb = getQualityBadge(score);
            const badge = document.createElement('div');
            badge.className = `absolute top-1.5 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${qb.cls}`;
            badge.textContent = qb.label;
            card.appendChild(badge);
        }

        /* 레이블 */
        const lbl = document.createElement('div');
        lbl.className = 'font-display text-[17px] text-slate-400 min-w-[18px] text-center flex-shrink-0';
        lbl.textContent = 'ABCDE'[i];

        /* 공 행 */
        const row = document.createElement('div');
        row.className = 'flex flex-1 min-w-0 items-center';
        row.style.gap = 'clamp(3px, 1vw, 6px)';
        nums.forEach((n, j) => row.appendChild(mkBall(n, 'ball', i * 65 + j * 42)));

        /* 메타 */
        const meta = document.createElement('div');
        meta.className = 'flex flex-col gap-1.5 items-end flex-shrink-0 pt-4';

        const sumEl = document.createElement('div');
        sumEl.className = 'text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full whitespace-nowrap';
        sumEl.textContent = '합 ' + nums.reduce((a, b) => a + b, 0);

        const applyBtn = document.createElement('button');
        applyBtn.className = 'flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-400 cursor-pointer whitespace-nowrap transition-all duration-150 hover:bg-green-50 hover:border-green-200 hover:text-green-600';
        applyBtn.innerHTML = `<span class="material-symbols-rounded text-[14px]">bookmark</span>`;
        applyBtn.onclick = () => applySet(nums, card, applyBtn);

        meta.append(sumEl, applyBtn);
        card.append(lbl, row, meta);
        wrap.appendChild(card);
    });

    setTimeout(() => btn.classList.remove('spinning'), 550);
}

/* ══════════════════════════════════════════════════
   QR 카메라 + 스캔 (html5-qrcode)
   ══════════════════════════════════════════════════ */
let html5QrCode = null;
let camActive   = false;
let scannedNums = [];

async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const btn         = document.getElementById('cam-toggle-btn');
    const placeholder = document.getElementById('qr-placeholder');
    const readerEl    = document.getElementById('reader');
    statusEl.textContent = '카메라 준비 중...';
    statusEl.className = 'text-center text-[13px] text-slate-400 mb-3 min-h-[20px]';
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode('reader');
        await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            (decodedText) => handleQRResult(decodedText)
        );
        camActive = true;
        placeholder.style.display = 'none';
        readerEl.style.display    = 'block';
        statusEl.textContent = 'QR코드를 사각형 안에 맞춰주세요';
        statusEl.className = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
        btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-500 cursor-pointer mb-3 transition-all';
        btn.innerHTML = `<span class="material-symbols-rounded">stop_circle</span><span>카메라 중지</span>`;
    } catch (err) {
        console.error(err);
        statusEl.textContent = '카메라를 시작할 수 없습니다. 권한을 확인해 주세요.';
        statusEl.className = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
    }
}

async function stopCamera() {
    if (!html5QrCode) return;
    try {
        if (camActive) { await html5QrCode.stop(); camActive = false; }
        const btn         = document.getElementById('cam-toggle-btn');
        const statusEl    = document.getElementById('cam-status');
        const placeholder = document.getElementById('qr-placeholder');
        const readerEl    = document.getElementById('reader');
        readerEl.style.display    = 'none';
        placeholder.style.display = 'flex';
        statusEl.textContent = '';
        btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200 transition-all hover:bg-blue-700';
        btn.innerHTML = `<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>`;
    } catch (err) { console.error('카메라 중지 실패', err); }
}

function handleQRResult(data) {
    if (navigator.vibrate) navigator.vibrate(100);
    stopCamera();
    const urlParts = data.split('v=');
    if (urlParts.length < 2) { showQRError('올바른 로또 QR 형식이 아닙니다.'); return; }
    const qrRawNumbers = urlParts[1].split('q');
    let allNums = [];
    for (let i = 1; i < qrRawNumbers.length; i++) {
        const gameStr = qrRawNumbers[i];
        for (let j = 0; j < gameStr.length; j += 2) {
            const num = parseInt(gameStr.substring(j, j + 2), 10);
            if (num >= 1 && num <= 45) allNums.push(num);
        }
    }
    if (!allNums.length) { showQRError('유효한 번호를 찾지 못했습니다.'); return; }
    scannedNums = [...new Set(allNums)].sort((a, b) => a - b);
    const panel    = document.getElementById('qr-result-panel');
    const numsWrap = document.getElementById('qr-res-nums');
    const statusEl = document.getElementById('cam-status');
    numsWrap.innerHTML = '';
    scannedNums.forEach(n => numsWrap.appendChild(mkBall(n, 'mini-ball')));
    panel.classList.remove('hidden');
    statusEl.textContent = `${scannedNums.length}개 번호 스캔 완료`;
    statusEl.className = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
    toast(`${scannedNums.length}개 번호 인식됨`);
}

function showQRError(msg) {
    const statusEl = document.getElementById('cam-status');
    statusEl.textContent = msg;
    statusEl.className = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
}

function applyQRExclude() {
    if (!scannedNums.length) return;
    switchTab('home');
    generateAll(scannedNums);
    toast('스캔된 번호 제외 후 생성 완료');
}

function resetQR() {
    scannedNums = [];
    document.getElementById('qr-result-panel').classList.add('hidden');
    document.getElementById('cam-status').textContent = '';
    startCamera();
}

/* ── My History ── */
function renderMyHistory() {
    const wrap = document.getElementById('my-wrap');
    const arr  = getHistory();
    wrap.innerHTML = '';
    if (!arr.length) {
        wrap.innerHTML = `
            <div class="flex flex-col items-center gap-3 py-14 text-center">
                <span class="material-symbols-rounded text-5xl text-slate-200">article</span>
                <p class="text-[14px] text-slate-400">저장된 번호가 없어요</p>
                <small class="text-[12px] text-slate-300">홈에서 마음에 드는 번호를 저장해 보세요</small>
            </div>`;
        return;
    }
    const bar = document.createElement('div');
    bar.className = 'flex justify-between items-center text-[13px] text-slate-400 mb-3';
    bar.innerHTML = `<span>총 <strong class="text-blue-600">${arr.length}세트</strong> 저장됨</span>`;
    wrap.appendChild(bar);

    arr.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-slate-200 rounded-2xl p-4 mb-2.5 shadow-sm';
        card.id = 'mi-' + item.id;

        const hdr = document.createElement('div');
        hdr.className = 'flex justify-between items-center mb-2.5';
        hdr.innerHTML = `
            <span class="flex items-center gap-1 text-[12px] text-slate-400">
                <span class="material-symbols-rounded text-[15px]">calendar_today</span>${item.date}
            </span>
            <span class="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">합 ${item.nums.reduce((a, b) => a + b, 0)}</span>`;

        const nums = document.createElement('div');
        nums.className = 'flex flex-wrap gap-1.5 mb-2.5';
        item.nums.forEach(n => nums.appendChild(mkBall(n, 'mini-ball')));

        const acts = document.createElement('div');
        acts.className = 'flex justify-end';
        const db = document.createElement('button');
        db.className = 'flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-[11px] text-red-500 cursor-pointer transition-colors hover:bg-red-100';
        db.innerHTML = `<span class="material-symbols-rounded text-[14px]">delete</span>삭제`;
        db.onclick = () => deleteItem(item.id);
        acts.appendChild(db);

        card.append(hdr, nums, acts);
        wrap.appendChild(card);
    });

    const cb = document.createElement('button');
    cb.className = 'w-full mt-1.5 py-3 border border-red-200 rounded-xl text-[13px] text-red-500 cursor-pointer transition-colors hover:bg-red-50';
    cb.textContent = '전체 삭제';
    cb.onclick = () => {
        if (confirm('저장된 번호를 모두 삭제할까요?')) { setHistory([]); renderMyHistory(); }
    };
    wrap.appendChild(cb);
}

function deleteItem(id) {
    const el = document.getElementById('mi-' + id);
    if (!el) return;
    el.style.opacity   = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => { setHistory(getHistory().filter(x => x.id !== id)); renderMyHistory(); }, 200);
}

/* ── Stats ── */
function buildStats() {
    if (!lottoData.length) return;
    const sums = lottoData.map(d => d.stats.sum);
    const ends = lottoData.map(d => d.stats.endsum);
    const rc = {};
    lottoData.forEach(d => { const r = d.stats.ratio.even_odd; rc[r] = (rc[r] || 0) + 1; });
    const topR = Object.entries(rc).sort((a, b) => b[1] - a[1])[0][0];
    document.getElementById('s-avgsum').textContent = Math.round(sums.reduce((a, b) => a + b) / sums.length);
    document.getElementById('s-ratio').textContent  = topR;
    document.getElementById('s-count').textContent  = lottoData.length + '회';
    document.getElementById('s-endsum').textContent = Math.round(ends.reduce((a, b) => a + b) / ends.length);

    /* 빈도 바 */
    const freq = {};
    lottoData.forEach(d => d.nums.forEach(n => freq[n] = (freq[n] || 0) + 1));
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxF   = sorted[0][1];
    const barsEl = document.getElementById('freq-bars');
    barsEl.innerHTML = '';
    sorted.forEach(([num, cnt]) => {
        const row  = document.createElement('div');
        row.className = 'flex items-center gap-2.5 mb-2';
        const ball = document.createElement('div');
        ball.className = `freq-mini-ball ${bCls(+num)}`;
        ball.textContent = num;
        const bg   = document.createElement('div');
        bg.className = 'flex-1 h-2 bg-slate-100 rounded-full overflow-hidden';
        const fill = document.createElement('div');
        fill.className = 'freq-bar-fill';
        fill.style.background = bHex(+num);
        bg.appendChild(fill);
        const ce  = document.createElement('div');
        ce.className = 'text-[12px] text-slate-400 min-w-[28px] text-right';
        ce.textContent = cnt + '회';
        row.append(ball, bg, ce);
        barsEl.appendChild(row);
        requestAnimationFrame(() => { fill.style.width = Math.round(cnt / maxF * 100) + '%'; });
    });

    /* 최근 회차 */
    const histEl = document.getElementById('history-list');
    histEl.innerHTML = '';
    lottoData.slice(0, 8).forEach(d => {
        const fmt = d.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');
        const row = document.createElement('div');
        row.className = 'border-b border-slate-100 py-2.5 last:border-b-0 last:pb-0';

        const meta = document.createElement('div');
        meta.className = 'flex justify-between items-center mb-2';
        meta.innerHTML = `<span class="font-display text-[15px] text-blue-600 tracking-wider">${d.no}회</span><span class="text-[11px] text-slate-400">${fmt}</span>`;

        const br = document.createElement('div');
        br.className = 'flex flex-wrap gap-1.5 items-center';
        d.nums.forEach(n => br.appendChild(mkBall(n, 'mini-ball')));
        const sep = document.createElement('div');
        sep.className = 'text-slate-300 text-base px-0.5';
        sep.textContent = '+';
        br.appendChild(sep);
        const bon = document.createElement('div');
        bon.className = `mini-ball ${bCls(d.bonus)} opacity-50`;
        bon.textContent = d.bonus;
        br.appendChild(bon);

        const tags = document.createElement('div');
        tags.className = 'flex flex-wrap gap-1.5 mt-1.5';
        tags.innerHTML = `
            <span class="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">합 ${d.stats.sum}</span>
            <span class="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">끝수 ${d.stats.endsum}</span>
            <span class="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">${d.stats.ratio.even_odd} 홀짝</span>
            <span class="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">${d.stats.ratio.low_high} 고저</span>`;

        row.append(meta, br, tags);
        histEl.appendChild(row);
    });
}

/* ── Init ── */
async function init() {
    try {
        const res = await fetch('./lotto.json');
        lottoData = await res.json();
    } catch {
        lottoData = [
            { no:1223, date:'20260509', nums:[16,18,20,32,33,39], bonus:26, stats:{ sum:158, endsum:28, ratio:{ even_odd:'4:2', low_high:'3:3' } } },
            { no:1222, date:'20260502', nums:[4,11,17,22,32,41],  bonus:34, stats:{ sum:127, endsum:17, ratio:{ even_odd:'3:3', low_high:'4:2' } } },
            { no:1221, date:'20260425', nums:[6,13,18,28,30,36],  bonus:9,  stats:{ sum:131, endsum:31, ratio:{ even_odd:'5:1', low_high:'3:3' } } },
            { no:1220, date:'20260418', nums:[2,7,14,25,38,42],   bonus:19, stats:{ sum:128, endsum:18, ratio:{ even_odd:'3:3', low_high:'3:3' } } },
            { no:1219, date:'20260411', nums:[9,12,21,29,35,44],  bonus:3,  stats:{ sum:150, endsum:20, ratio:{ even_odd:'2:4', low_high:'2:4' } } },
            { no:1218, date:'20260404', nums:[1,8,15,27,33,40],   bonus:22, stats:{ sum:124, endsum:14, ratio:{ even_odd:'3:3', low_high:'4:2' } } },
            { no:1217, date:'20260328', nums:[5,11,19,24,36,43],  bonus:30, stats:{ sum:138, endsum:28, ratio:{ even_odd:'3:3', low_high:'3:3' } } },
            { no:1216, date:'20260321', nums:[3,10,17,28,31,45],  bonus:16, stats:{ sum:134, endsum:24, ratio:{ even_odd:'2:4', low_high:'3:3' } } },
            { no:1215, date:'20260314', nums:[7,13,22,26,37,41],  bonus:5,  stats:{ sum:146, endsum:26, ratio:{ even_odd:'3:3', low_high:'3:3' } } },
            { no:1214, date:'20260307', nums:[2,9,18,23,34,42],   bonus:28, stats:{ sum:128, endsum:18, ratio:{ even_odd:'4:2', low_high:'4:2' } } },
        ];
    }
    freqMap = {};
    lottoData.forEach(d => d.nums.forEach(n => { freqMap[n] = (freqMap[n] || 0) + 1; }));
    if (lottoData.length)
        avgSum = Math.round(lottoData.reduce((a, b) => a + b.stats.sum, 0) / lottoData.length);
    generateAll();
    buildStats();
    refreshBadges();
}

init();
