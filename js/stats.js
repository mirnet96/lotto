/* ══════════════════════════════════════════════════
   js/stats.js — 통계 대시보드 (1223회차 실데이터 기반)
   ══════════════════════════════════════════════════ */

function buildStats() {
    if (!lottoData.length) return;

    const total   = lottoData.length;
    const recent  = lottoData.slice(0, 30);
    const recent10 = lottoData.slice(0, 10);

    /* ── 전체 빈도 ── */
    const freq = {};
    for (let n = 1; n <= 45; n++) freq[n] = 0;
    lottoData.forEach(d => d.nums.forEach(n => freq[n]++));

    /* ── 최근 30회 빈도 ── */
    const recentFreq = {};
    for (let n = 1; n <= 45; n++) recentFreq[n] = 0;
    recent.forEach(d => d.nums.forEach(n => recentFreq[n]++));

    /* ── 마지막 출현 간격 ── */
    const lastSeen = {};
    lottoData.forEach((d, i) => d.nums.forEach(n => { if (!(n in lastSeen)) lastSeen[n] = i; }));

    /* ── 요약 카드 ── */
    const sums = lottoData.map(d => d.stats.sum);
    const avgSum = Math.round(sums.reduce((a, b) => a + b) / sums.length);
    const ends   = lottoData.map(d => d.stats.endsum);

    const eoCnt = {};
    lottoData.forEach(d => { const r = d.stats.ratio.even_odd; eoCnt[r] = (eoCnt[r] || 0) + 1; });
    const topEO = Object.entries(eoCnt).sort((a, b) => b[1] - a[1])[0];

    const lhCnt = {};
    lottoData.forEach(d => { const r = d.stats.ratio.low_high; lhCnt[r] = (lhCnt[r] || 0) + 1; });
    const topLH = Object.entries(lhCnt).sort((a, b) => b[1] - a[1])[0];

    document.getElementById('s-avgsum').textContent  = avgSum;
    document.getElementById('s-ratio').textContent   = topEO[0];
    document.getElementById('s-count').textContent   = total + '회';
    document.getElementById('s-endsum').textContent  = Math.round(ends.reduce((a, b) => a + b) / ends.length);

    /* ── 섹션 렌더 ── */
    renderHotCold(freq, recentFreq, total);
    renderFreqBars(freq, total);
    renderSumChart(sums);
    renderOddEvenChart(eoCnt, total);
    renderLowHighChart(lhCnt, total);
    renderGapTable(lastSeen, freq, total);
    renderRecentHistory();
}

/* ── 핫/콜드 번호 ── */
function renderHotCold(freq, recentFreq, total) {
    const el = document.getElementById('hot-cold-wrap');
    if (!el) return;

    /* 상승률: 최근30회 비율 - 전체비율 */
    const trending = Array.from({ length: 45 }, (_, i) => i + 1).map(n => ({
        n,
        diff: (recentFreq[n] / 30) - (freq[n] / total),
        recent: recentFreq[n],
        total:  freq[n],
    })).sort((a, b) => b.diff - a.diff);

    const hot  = trending.slice(0, 8);
    const cold = trending.slice(-8).reverse();

    el.innerHTML = '';

    ['hot', 'cold'].forEach(type => {
        const nums = type === 'hot' ? hot : cold;
        const wrap = document.createElement('div');
        wrap.className = 'flex-1 min-w-0';

        const ttl = document.createElement('div');
        ttl.className = 'flex items-center gap-1 text-[12px] font-bold mb-2 ' + (type === 'hot' ? 'text-red-500' : 'text-blue-400');
        ttl.innerHTML = type === 'hot'
            ? '<span class="material-symbols-rounded text-[15px]">whatshot</span>핫 번호 (최근 ↑)'
            : '<span class="material-symbols-rounded text-[15px]">ac_unit</span>콜드 번호 (최근 ↓)';
        wrap.appendChild(ttl);

        const row = document.createElement('div');
        row.className = 'flex flex-wrap gap-1.5';
        nums.forEach(({ n, diff, recent }) => {
            const ball = mkBall(n, 'mini-ball');
            ball.title = `최근30회 ${recent}번 (${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}%p)`;
            row.appendChild(ball);
        });
        wrap.appendChild(row);
        el.appendChild(wrap);
    });
}

/* ── 출현 빈도 바 (전체 TOP 15) ── */
function renderFreqBars(freq, total) {
    const barsEl = document.getElementById('freq-bars');
    if (!barsEl) return;
    barsEl.innerHTML = '';

    const sorted = Object.entries(freq).map(([n, c]) => [+n, c]).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const maxF   = sorted[0][1];

    sorted.forEach(([num, cnt]) => {
        const row  = document.createElement('div');
        row.className = 'flex items-center gap-2.5 mb-1.5';

        const ball = mkBall(num, 'freq-mini-ball');
        const bg   = document.createElement('div');
        bg.className = 'flex-1 h-2 bg-slate-100 rounded-full overflow-hidden';
        const fill = document.createElement('div');
        fill.className      = 'freq-bar-fill';
        fill.style.background = bHex(num);
        bg.appendChild(fill);

        const pct = document.createElement('div');
        pct.className   = 'text-[11px] text-slate-400 min-w-[52px] text-right';
        pct.textContent = cnt + '회 ' + (cnt / total * 100).toFixed(1) + '%';

        row.append(ball, bg, pct);
        barsEl.appendChild(row);
        requestAnimationFrame(() => { fill.style.width = Math.round(cnt / maxF * 100) + '%'; });
    });
}

/* ── 합계 분포 히스토그램 ── */
function renderSumChart(sums) {
    const el = document.getElementById('sum-chart');
    if (!el) return;
    el.innerHTML = '';

    const buckets = {};
    const labels  = [];
    for (let b = 60; b <= 220; b += 20) {
        buckets[b] = 0;
        labels.push(b);
    }
    sums.forEach(s => {
        const b = Math.min(Math.floor(s / 20) * 20, 220);
        const k = Math.max(b, 60);
        buckets[k] = (buckets[k] || 0) + 1;
    });

    const maxB = Math.max(...Object.values(buckets));
    const chartH = 72;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${labels.length * 28} ${chartH + 20}`);
    svg.setAttribute('class', 'w-full');

    labels.forEach((b, i) => {
        const cnt = buckets[b] || 0;
        const h   = cnt ? Math.max(Math.round(cnt / maxB * chartH), 3) : 0;
        const x   = i * 28 + 2;
        const y   = chartH - h;

        /* 바 색상: 120~159 구간(최다) 강조 */
        const isMain = b >= 120 && b <= 159;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', 24);
        rect.setAttribute('height', h);
        rect.setAttribute('rx', 3);
        rect.setAttribute('fill', isMain ? '#1976D2' : '#CBD5E1');
        svg.appendChild(rect);

        /* 레이블 */
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', x + 12);
        txt.setAttribute('y', chartH + 14);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-size', '8');
        txt.setAttribute('fill', '#94A3B8');
        txt.textContent = b;
        svg.appendChild(txt);

        /* 값 레이블 (높은 것만) */
        if (cnt >= maxB * 0.4) {
            const vt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            vt.setAttribute('x', x + 12);
            vt.setAttribute('y', y - 3);
            vt.setAttribute('text-anchor', 'middle');
            vt.setAttribute('font-size', '8');
            vt.setAttribute('fill', isMain ? '#1976D2' : '#94A3B8');
            vt.setAttribute('font-weight', isMain ? 'bold' : 'normal');
            vt.textContent = cnt;
            svg.appendChild(vt);
        }
    });

    el.appendChild(svg);
}

/* ── 도넛 차트 공통 함수 ── */
function renderDonut(canvasId, items, total) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    el.innerHTML = '';

    const SIZE = 110;
    const cx = SIZE / 2, cy = SIZE / 2, R = 40, r = 24;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute('class', 'w-full max-w-[110px] mx-auto');

    const COLORS = ['#1976D2','#43A047','#E53935','#FBC02D','#757575','#9C27B0','#FF5722'];
    let angle = -Math.PI / 2;

    const sorted = [...items].sort((a, b) => b[1] - a[1]);
    sorted.forEach(([label, cnt], idx) => {
        const frac  = cnt / total;
        const sweep = frac * 2 * Math.PI;
        const x1 = cx + R * Math.cos(angle);
        const y1 = cy + R * Math.sin(angle);
        angle += sweep;
        const x2 = cx + R * Math.cos(angle);
        const y2 = cy + R * Math.sin(angle);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const large = sweep > Math.PI ? 1 : 0;
        /* 도넛 경로: 바깥 호 → 안쪽 호 */
        const xi1 = cx + r * Math.cos(angle - sweep);
        const yi1 = cy + r * Math.sin(angle - sweep);
        const xi2 = cx + r * Math.cos(angle);
        const yi2 = cy + r * Math.sin(angle);
        path.setAttribute('d', `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`);
        path.setAttribute('fill', COLORS[idx % COLORS.length]);
        path.setAttribute('stroke', 'white');
        path.setAttribute('stroke-width', '1.5');
        svg.appendChild(path);
    });

    /* 중앙 텍스트 */
    const top = sorted[0];
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t1.setAttribute('x', cx); t1.setAttribute('y', cy - 4);
    t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('font-size', '9');
    t1.setAttribute('font-weight', 'bold'); t1.setAttribute('fill', '#1e293b');
    t1.textContent = top[0];
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t2.setAttribute('x', cx); t2.setAttribute('y', cy + 9);
    t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('font-size', '8');
    t2.setAttribute('fill', '#64748b');
    t2.textContent = (top[1] / total * 100).toFixed(0) + '%';
    svg.appendChild(t1); svg.appendChild(t2);
    el.appendChild(svg);

    /* 범례 */
    const legend = document.createElement('div');
    legend.className = 'flex flex-col gap-1 mt-2';
    sorted.slice(0, 5).forEach(([label, cnt], idx) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-1.5 text-[10px] text-slate-500';
        row.innerHTML = `<span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${COLORS[idx % COLORS.length]}"></span>
            <span class="flex-1">${label}</span>
            <span class="font-medium text-slate-700">${(cnt / total * 100).toFixed(1)}%</span>`;
        legend.appendChild(row);
    });
    el.appendChild(legend);
}

function renderOddEvenChart(eoCnt, total) {
    renderDonut('oe-chart', Object.entries(eoCnt), total);
}
function renderLowHighChart(lhCnt, total) {
    renderDonut('lh-chart', Object.entries(lhCnt), total);
}

/* ── 미출현 간격 테이블 ── */
function renderGapTable(lastSeen, freq, total) {
    const el = document.getElementById('gap-table');
    if (!el) return;
    el.innerHTML = '';

    /* 간격 긴 순 TOP 10 */
    const gaps = Array.from({ length: 45 }, (_, i) => i + 1)
        .map(n => ({ n, gap: lastSeen[n] ?? 9999, freq: freq[n] }))
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 10);

    const maxGap = gaps[0].gap;

    gaps.forEach(({ n, gap, freq: fc }) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2.5 mb-2';

        const ball = mkBall(n, 'mini-ball');

        const barWrap = document.createElement('div');
        barWrap.className = 'flex-1 h-2 bg-slate-100 rounded-full overflow-hidden';
        const fill = document.createElement('div');
        fill.className = 'h-full rounded-full transition-all duration-700';
        fill.style.background = gap >= 15 ? '#E53935' : gap >= 8 ? '#FBC02D' : '#43A047';
        barWrap.appendChild(fill);

        const info = document.createElement('div');
        info.className = 'text-[11px] text-slate-400 min-w-[72px] text-right whitespace-nowrap';
        info.textContent = gap + '회 미출현';

        row.append(ball, barWrap, info);
        el.appendChild(row);
        requestAnimationFrame(() => { fill.style.width = Math.round(gap / maxGap * 100) + '%'; });
    });
}

/* ── 최근 회차 기록 ── */
function renderRecentHistory() {
    const histEl = document.getElementById('history-list');
    if (!histEl) return;
    histEl.innerHTML = '';

    lottoData.slice(0, 10).forEach(d => {
        const fmt = String(d.date).replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');
        const row = document.createElement('div');
        row.className = 'border-b border-slate-100 py-2.5 last:border-b-0 last:pb-0';

        const meta = document.createElement('div');
        meta.className = 'flex justify-between items-center mb-2';
        meta.innerHTML = `
            <span class="font-display text-[15px] text-blue-600 tracking-wider">${d.no}회</span>
            <span class="text-[11px] text-slate-400">${fmt}</span>`;

        const br = document.createElement('div');
        br.className = 'flex flex-wrap gap-1.5 items-center';
        d.nums.forEach(n => br.appendChild(mkBall(n, 'mini-ball')));

        const sep = document.createElement('div');
        sep.className = 'text-slate-300 text-base px-0.5';
        sep.textContent = '+';
        br.appendChild(sep);

        const bon = mkBall(d.bonus, 'mini-ball');
        bon.style.opacity = '0.5';
        br.appendChild(bon);

        const tags = document.createElement('div');
        tags.className = 'flex flex-wrap gap-1 mt-1.5';
        const odd  = d.nums.filter(n => n % 2 !== 0).length;
        const low  = d.nums.filter(n => n <= 23).length;
        tags.innerHTML = `
            <span class="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">합 ${d.stats.sum}</span>
            <span class="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">끝수 ${d.stats.endsum}</span>
            <span class="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">홀${odd}짝${6-odd}</span>
            <span class="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">저${low}고${6-low}</span>`;

        row.append(meta, br, tags);
        histEl.appendChild(row);
    });
}
