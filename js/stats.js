/* ══════════════════════════════════════════════════
   js/stats.js — 통계 대시보드 렌더링
   ══════════════════════════════════════════════════ */

function buildStats() {
    if (!lottoData.length) return;

    /* ── 요약 카드 ── */
    const sums = lottoData.map(d => d.stats.sum);
    const ends = lottoData.map(d => d.stats.endsum);
    const rc   = {};
    lottoData.forEach(d => { const r = d.stats.ratio.even_odd; rc[r] = (rc[r] || 0) + 1; });
    const topR = Object.entries(rc).sort((a, b) => b[1] - a[1])[0][0];

    document.getElementById('s-avgsum').textContent = Math.round(sums.reduce((a, b) => a + b) / sums.length);
    document.getElementById('s-ratio').textContent  = topR;
    document.getElementById('s-count').textContent  = lottoData.length + '회';
    document.getElementById('s-endsum').textContent = Math.round(ends.reduce((a, b) => a + b) / ends.length);

    /* ── 출현 빈도 바 ── */
    const freq   = {};
    lottoData.forEach(d => d.nums.forEach(n => freq[n] = (freq[n] || 0) + 1));
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxF   = sorted[0][1];
    const barsEl = document.getElementById('freq-bars');
    barsEl.innerHTML = '';

    sorted.forEach(([num, cnt]) => {
        const row  = document.createElement('div');
        row.className = 'flex items-center gap-2.5 mb-2';

        const ball = mkBall(+num, 'freq-mini-ball');

        const bg   = document.createElement('div');
        bg.className = 'flex-1 h-2 bg-slate-100 rounded-full overflow-hidden';
        const fill = document.createElement('div');
        fill.className      = 'freq-bar-fill';
        fill.style.background = bHex(+num);
        bg.appendChild(fill);

        const ce  = document.createElement('div');
        ce.className   = 'text-[12px] text-slate-400 min-w-[28px] text-right';
        ce.textContent = cnt + '회';

        row.append(ball, bg, ce);
        barsEl.appendChild(row);
        requestAnimationFrame(() => { fill.style.width = Math.round(cnt / maxF * 100) + '%'; });
    });

    /* ── 최근 회차 목록 ── */
    const histEl = document.getElementById('history-list');
    histEl.innerHTML = '';

    lottoData.slice(0, 8).forEach(d => {
        const fmt = d.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');
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
        sep.className   = 'text-slate-300 text-base px-0.5';
        sep.textContent = '+';
        br.appendChild(sep);

        const bon = mkBall(d.bonus, 'mini-ball');
        bon.style.opacity = '0.5';
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
