/* ══════════════════════════════════════════════════
   js/stats.js — 다크 테마 완전 적용
   ══════════════════════════════════════════════════ */

/* 다크 팔레트 */
const DARK_COLORS = [
    '#3B82F6','#22C55E','#EF4444','#F5C842',
    '#A78BFA','#F97316','#06B6D4','#EC4899',
];

function buildStats() {
    if (!lottoData.length) return;

    const total    = lottoData.length;
    const recent   = lottoData.slice(0, 30);

    const freq = {};
    for (let n = 1; n <= 45; n++) freq[n] = 0;
    lottoData.forEach(d => d.nums.forEach(n => freq[n]++));

    const recentFreq = {};
    for (let n = 1; n <= 45; n++) recentFreq[n] = 0;
    recent.forEach(d => d.nums.forEach(n => recentFreq[n]++));

    const lastSeen = {};
    lottoData.forEach((d, i) => d.nums.forEach(n => { if (!(n in lastSeen)) lastSeen[n] = i; }));

    /* 요약 카드 */
    const sums   = lottoData.map(d => d.stats.sum);
    const avgSum = Math.round(sums.reduce((a, b) => a + b) / sums.length);
    const ends   = lottoData.map(d => d.stats.endsum);

    const eoCnt = {};
    lottoData.forEach(d => { const r = d.stats.ratio.even_odd; eoCnt[r] = (eoCnt[r]||0)+1; });
    const topEO = Object.entries(eoCnt).sort((a, b) => b[1] - a[1])[0];

    const lhCnt = {};
    lottoData.forEach(d => { const r = d.stats.ratio.low_high; lhCnt[r] = (lhCnt[r]||0)+1; });

    document.getElementById('s-avgsum').textContent = avgSum;
    document.getElementById('s-ratio').textContent  = topEO[0];
    document.getElementById('s-count').textContent  = total + '회';
    document.getElementById('s-endsum').textContent = Math.round(ends.reduce((a, b) => a + b) / ends.length);

    renderHotCold(freq, recentFreq, total);
    renderFreqBars(freq, total);
    renderSumChart(sums);
    renderOddEvenChart(eoCnt, total);
    renderLowHighChart(lhCnt, total);
    renderGapTable(lastSeen, freq, total);
    renderRecentHistory();
}

/* ── 핫/콜드 ── */
function renderHotCold(freq, recentFreq, total) {
    const el = document.getElementById('hot-cold-wrap');
    if (!el) return;

    const trending = Array.from({ length: 45 }, (_, i) => i + 1).map(n => ({
        n,
        diff:   (recentFreq[n] / 30) - (freq[n] / total),
        recent: recentFreq[n],
    })).sort((a, b) => b.diff - a.diff);

    const hot  = trending.slice(0, 8);
    const cold = trending.slice(-8).reverse();

    el.innerHTML = '';

    const makeCol = (title, emoji, titleColor, nums) => {
        const col = document.createElement('div');
        col.className = 'hc-col';

        const ttl = document.createElement('div');
        ttl.className = 'hc-title';
        ttl.style.color = titleColor;
        ttl.innerHTML = `<span>${emoji}</span>${title}`;
        col.appendChild(ttl);

        const row = document.createElement('div');
        row.className = 'hc-balls';
        nums.forEach(({ n, diff, recent }) => {
            const ball = mkBall(n, 'mini-ball');
            ball.title = `최근30회 ${recent}번 (${diff >= 0 ? '+' : ''}${(diff*100).toFixed(1)}%p)`;
            row.appendChild(ball);
        });
        col.appendChild(row);
        el.appendChild(col);
    };

    makeCol('핫 번호', '🔥', '#EF4444', hot);
    makeCol('콜드 번호', '🧊', '#60A5FA', cold);
}

/* ── 출현 빈도 TOP 15 ── */
function renderFreqBars(freq, total) {
    const el = document.getElementById('freq-bars');
    if (!el) return;
    el.innerHTML = '';

    const sorted = Object.entries(freq)
        .map(([n, c]) => [+n, c])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
    const maxF = sorted[0][1];

    sorted.forEach(([num, cnt]) => {
        const row = document.createElement('div');
        row.className = 'freq-row';

        const ball = mkBall(num, 'mini-ball');

        const barWrap = document.createElement('div');
        barWrap.className = 'freq-bar-wrap';
        const fill = document.createElement('div');
        fill.className = 'freq-bar';
        fill.style.background = bHex(num);
        fill.style.width = '0%';
        barWrap.appendChild(fill);

        const pct = document.createElement('div');
        pct.className   = 'freq-count';
        pct.textContent = cnt + '회';

        row.append(ball, barWrap, pct);
        el.appendChild(row);
        requestAnimationFrame(() => {
            fill.style.width = Math.round(cnt / maxF * 100) + '%';
        });
    });
}

/* ── 합계 분포 ── */
function renderSumChart(sums) {
    const el = document.getElementById('sum-chart');
    if (!el) return;
    el.innerHTML = '';

    const buckets = {};
    const labels  = [];
    for (let b = 60; b <= 220; b += 20) { buckets[b] = 0; labels.push(b); }
    sums.forEach(s => {
        const b = Math.min(Math.floor(s / 20) * 20, 220);
        const k = Math.max(b, 60);
        buckets[k] = (buckets[k] || 0) + 1;
    });

    const maxB  = Math.max(...Object.values(buckets));
    const chartH = 72;
    const W      = labels.length * 28;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${chartH + 22}`);
    svg.setAttribute('class', 'w-full');

    labels.forEach((b, i) => {
        const cnt    = buckets[b] || 0;
        const h      = cnt ? Math.max(Math.round(cnt / maxB * chartH), 3) : 0;
        const x      = i * 28 + 2;
        const y      = chartH - h;
        const isMain = b >= 120 && b <= 159;

        /* 바 */
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x); rect.setAttribute('y', y);
        rect.setAttribute('width', 24); rect.setAttribute('height', h);
        rect.setAttribute('rx', 4);
        rect.setAttribute('fill', isMain ? '#3B82F6' : 'rgba(255,255,255,0.12)');
        svg.appendChild(rect);

        /* x축 레이블 */
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', x + 12); txt.setAttribute('y', chartH + 15);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-size', '8'); txt.setAttribute('fill', '#475569');
        txt.textContent = b;
        svg.appendChild(txt);

        /* 값 레이블 */
        if (cnt >= maxB * 0.4) {
            const vt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            vt.setAttribute('x', x + 12); vt.setAttribute('y', y - 4);
            vt.setAttribute('text-anchor', 'middle');
            vt.setAttribute('font-size', '8');
            vt.setAttribute('fill', isMain ? '#3B82F6' : '#64748B');
            vt.setAttribute('font-weight', isMain ? 'bold' : 'normal');
            vt.textContent = cnt;
            svg.appendChild(vt);
        }
    });

    el.appendChild(svg);
}

/* ── 도넛 차트 ── */
function renderDonut(canvasId, items, total) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    el.innerHTML = '';

    const SIZE = 110, cx = 55, cy = 55, R = 40, r = 25;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute('class', 'w-full max-w-[110px] mx-auto');

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
        const xi1 = cx + r * Math.cos(angle - sweep);
        const yi1 = cy + r * Math.sin(angle - sweep);
        const xi2 = cx + r * Math.cos(angle);
        const yi2 = cy + r * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`);
        path.setAttribute('fill', DARK_COLORS[idx % DARK_COLORS.length]);
        path.setAttribute('stroke', '#0F172A');
        path.setAttribute('stroke-width', '1.5');
        svg.appendChild(path);
    });

    /* 중앙 */
    const top = sorted[0];
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t1.setAttribute('x', cx); t1.setAttribute('y', cy - 3);
    t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('font-size', '9');
    t1.setAttribute('font-weight', 'bold'); t1.setAttribute('fill', '#F1F5F9');
    t1.textContent = top[0];
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t2.setAttribute('x', cx); t2.setAttribute('y', cx + 9);
    t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('font-size', '8');
    t2.setAttribute('fill', '#94A3B8');
    t2.textContent = (top[1] / total * 100).toFixed(0) + '%';
    svg.appendChild(t1); svg.appendChild(t2);
    el.appendChild(svg);

    /* 범례 */
    const legend = document.createElement('div');
    legend.className = 'donut-legend';
    sorted.slice(0, 4).forEach(([label, cnt], idx) => {
        const row = document.createElement('div');
        row.className = 'donut-leg-item';
        row.innerHTML = `
            <span class="donut-leg-dot" style="background:${DARK_COLORS[idx % DARK_COLORS.length]};border-radius:3px;"></span>
            <span style="flex:1;font-size:10.5px;">${label}</span>
            <span style="font-size:10.5px;color:var(--text);">${(cnt/total*100).toFixed(1)}%</span>`;
        legend.appendChild(row);
    });
    el.appendChild(legend);
}

function renderOddEvenChart(eoCnt, total) { renderDonut('oe-chart', Object.entries(eoCnt), total); }
function renderLowHighChart(lhCnt, total) { renderDonut('lh-chart', Object.entries(lhCnt), total); }

/* ── 미출현 간격 ── */
function renderGapTable(lastSeen, freq, total) {
    const el = document.getElementById('gap-table');
    if (!el) return;
    el.innerHTML = '';

    const gaps = Array.from({ length: 45 }, (_, i) => i + 1)
        .map(n => ({ n, gap: lastSeen[n] ?? 9999, freq: freq[n] }))
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 10);

    const maxGap = gaps[0].gap;

    gaps.forEach(({ n, gap }, rank) => {
        const row = document.createElement('div');
        row.className = 'gap-row';

        const rankEl = document.createElement('div');
        rankEl.className   = 'gap-rank';
        rankEl.textContent = rank + 1;

        const ball = mkBall(n, 'mini-ball');

        const barWrap = document.createElement('div');
        barWrap.style.cssText = 'flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;';
        const fill = document.createElement('div');
        fill.style.cssText = `height:100%;border-radius:99px;width:0%;transition:width .7s cubic-bezier(.4,0,.2,1);
            background:${gap >= 15 ? '#EF4444' : gap >= 8 ? '#F5C842' : '#22C55E'};`;
        barWrap.appendChild(fill);

        const info = document.createElement('div');
        info.className   = 'gap-count';
        info.style.color = gap >= 15 ? '#EF4444' : gap >= 8 ? '#F5C842' : 'var(--text2)';
        info.textContent = gap + '회';

        row.append(rankEl, ball, barWrap, info);
        el.appendChild(row);
        requestAnimationFrame(() => { fill.style.width = Math.round(gap / maxGap * 100) + '%'; });
    });
}

/* ── 최근 회차 ── */
function renderRecentHistory() {
    const histEl = document.getElementById('history-list');
    if (!histEl) return;
    histEl.innerHTML = '';

    lottoData.slice(0, 10).forEach(d => {
        const fmt = String(d.date).replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');
        const row = document.createElement('div');
        row.className = 'hist-row';

        const meta = document.createElement('div');
        meta.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex-shrink:0;width:44px;';
        meta.innerHTML = `
            <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;color:var(--gold);">${d.no}회</span>
            <span style="font-size:9.5px;color:var(--text3);">${fmt.slice(5)}</span>`;

        const ballsWrap = document.createElement('div');
        ballsWrap.className = 'hist-balls';
        d.nums.forEach(n => ballsWrap.appendChild(mkBall(n, 'mini-ball')));

        /* 보너스 */
        const bonusWrap = document.createElement('div');
        bonusWrap.className = 'hist-bonus';
        bonusWrap.innerHTML = '<span>＋</span>';
        const bon = mkBall(d.bonus, 'mini-ball');
        bon.style.opacity = '0.45';
        bonusWrap.appendChild(bon);

        /* 태그 */
        const tags = document.createElement('div');
        tags.style.cssText = 'display:flex;flex-direction:column;gap:3px;flex-shrink:0;';
        const odd = d.nums.filter(n => n % 2 !== 0).length;
        const low = d.nums.filter(n => n <= 23).length;
        const mkTag = (txt, color) => {
            const t = document.createElement('span');
            t.style.cssText = `font-size:9px;padding:2px 6px;border-radius:99px;white-space:nowrap;
                background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:${color};`;
            t.textContent = txt;
            return t;
        };
        tags.append(
            mkTag('합 ' + d.stats.sum, 'var(--gold)'),
            mkTag(`홀${odd}짝${6-odd}`, 'var(--text2)'),
        );

        row.append(meta, ballsWrap, bonusWrap, tags);
        histEl.appendChild(row);
    });
}
