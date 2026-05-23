/* ══════════════════════════════════════════════════
   js/stats.js — 볼 한줄 고정 + 다크 테마
   ══════════════════════════════════════════════════ */

const DARK_COLORS = ['#3B82F6','#22C55E','#EF4444','#F5C842','#A78BFA','#F97316','#06B6D4','#EC4899'];

/* 볼 행 스타일 헬퍼 — 모든 곳에서 동일하게 사용 */
function makeBallRow(gap) {
    const row = document.createElement('div');
    row.style.cssText = [
        'display:flex',
        'flex-wrap:nowrap',
        'align-items:center',
        `gap:${gap||4}px`,
        'overflow:hidden',
    ].join(';');
    return row;
}

function addBall(row, n, cls) {
    const b = mkBall(n, cls || 'mini-ball');
    b.style.flexShrink = '0';
    b.style.flexGrow   = '0';
    row.appendChild(b);
    return b;
}

function buildStats() {
    if (!lottoData.length) return;
    const total  = lottoData.length;
    const recent = lottoData.slice(0, 30);
    const freq = {}, recentFreq = {}, lastSeen = {};
    for (let n=1;n<=45;n++){freq[n]=0;recentFreq[n]=0;}
    lottoData.forEach(d=>d.nums.forEach(n=>freq[n]++));
    recent.forEach(d=>d.nums.forEach(n=>recentFreq[n]++));
    lottoData.forEach((d,i)=>d.nums.forEach(n=>{if(!(n in lastSeen))lastSeen[n]=i;}));

    const sums   = lottoData.map(d=>d.stats.sum);
    const avgSum = Math.round(sums.reduce((a,b)=>a+b)/sums.length);
    const ends   = lottoData.map(d=>d.stats.endsum);
    const eoCnt  = {}, lhCnt = {};
    lottoData.forEach(d=>{
        const eo = d.stats.ratio.even_odd; eoCnt[eo]=(eoCnt[eo]||0)+1;
        const lh = d.stats.ratio.low_high; lhCnt[lh]=(lhCnt[lh]||0)+1;
    });
    const topEO = Object.entries(eoCnt).sort((a,b)=>b[1]-a[1])[0];

    document.getElementById('s-avgsum').textContent = avgSum;
    document.getElementById('s-ratio').textContent  = topEO[0];
    document.getElementById('s-count').textContent  = total+'회';
    document.getElementById('s-endsum').textContent = Math.round(ends.reduce((a,b)=>a+b)/ends.length);

    renderHotCold(freq, recentFreq, total);
    renderFreqBars(freq, total);
    renderSumChart(sums);
    renderOddEvenChart(eoCnt, total);
    renderLowHighChart(lhCnt, total);
    renderGapTable(lastSeen, freq, total);
    renderRecentHistory();
}

/* ── 핫/콜드 — 볼 가로 배치 ── */
function renderHotCold(freq, recentFreq, total) {
    const el = document.getElementById('hot-cold-wrap');
    if (!el) return;
    const trending = Array.from({length:45},(_,i)=>i+1)
        .map(n=>({n, diff:(recentFreq[n]/30)-(freq[n]/total), recent:recentFreq[n]}))
        .sort((a,b)=>b.diff-a.diff);
    const hot  = trending.slice(0,8);
    const cold = trending.slice(-8).reverse();
    el.innerHTML = '';

    ['hot','cold'].forEach(type => {
        const nums  = type==='hot' ? hot : cold;
        const col   = document.createElement('div');
        col.style.cssText = 'flex:1;min-width:0;';

        const ttl = document.createElement('div');
        ttl.style.cssText = `display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;margin-bottom:8px;color:${type==='hot'?'#EF4444':'#60A5FA'};`;
        ttl.innerHTML = type==='hot' ? '🔥 핫 번호' : '🧊 콜드 번호';
        col.appendChild(ttl);

        /* ── 볼을 가로 wrap으로 — 세로 나열 방지 ── */
        const row = document.createElement('div');
        row.style.cssText = [
            'display:flex',
            'flex-wrap:wrap',       /* 핫/콜드는 8개라 2줄 허용 */
            'align-items:center',
            'gap:5px',
        ].join(';');

        nums.forEach(({n}) => {
            const b = mkBall(n, 'mini-ball');
            b.style.flexShrink = '0';
            row.appendChild(b);
        });
        col.appendChild(row);
        el.appendChild(col);
    });
}

/* ── 출현 빈도 TOP 15 — 볼 + 바 한줄 ── */
function renderFreqBars(freq, total) {
    const el = document.getElementById('freq-bars');
    if (!el) return;
    el.innerHTML = '';
    const sorted = Object.entries(freq).map(([n,c])=>[+n,c]).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const maxF = sorted[0][1];

    sorted.forEach(([num, cnt]) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';

        const ball = mkBall(num, 'mini-ball');
        ball.style.flexShrink = '0';

        const barWrap = document.createElement('div');
        barWrap.style.cssText = 'flex:1;height:10px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;';
        const fill = document.createElement('div');
        fill.className = 'freq-bar';
        fill.style.background = bHex(num);
        barWrap.appendChild(fill);

        const pct = document.createElement('div');
        pct.style.cssText = 'font-size:11px;color:#94A3B8;flex-shrink:0;width:36px;text-align:right;';
        pct.textContent = cnt+'회';

        row.append(ball, barWrap, pct);
        el.appendChild(row);
        requestAnimationFrame(()=>{ fill.style.width = Math.round(cnt/maxF*100)+'%'; });
    });
}

/* ── 합계 분포 SVG ── */
function renderSumChart(sums) {
    const el = document.getElementById('sum-chart');
    if (!el) return;
    el.innerHTML = '';
    const buckets={}, labels=[];
    for (let b=60;b<=220;b+=20){buckets[b]=0;labels.push(b);}
    sums.forEach(s=>{const b=Math.max(Math.min(Math.floor(s/20)*20,220),60);buckets[b]=(buckets[b]||0)+1;});
    const maxB=Math.max(...Object.values(buckets));
    const H=72, W=labels.length*28;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${W} ${H+22}`);
    svg.setAttribute('style','width:100%;');
    labels.forEach((b,i)=>{
        const cnt=buckets[b]||0, h=cnt?Math.max(Math.round(cnt/maxB*H),3):0;
        const x=i*28+2, y=H-h, isMain=b>=120&&b<=159;
        const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
        rect.setAttribute('x',x);rect.setAttribute('y',y);rect.setAttribute('width',24);rect.setAttribute('height',h);rect.setAttribute('rx',4);
        rect.setAttribute('fill',isMain?'#3B82F6':'rgba(255,255,255,0.12)');
        svg.appendChild(rect);
        const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
        txt.setAttribute('x',x+12);txt.setAttribute('y',H+15);txt.setAttribute('text-anchor','middle');txt.setAttribute('font-size','8');txt.setAttribute('fill','#475569');
        txt.textContent=b; svg.appendChild(txt);
        if (cnt>=maxB*0.4){
            const vt=document.createElementNS('http://www.w3.org/2000/svg','text');
            vt.setAttribute('x',x+12);vt.setAttribute('y',y-4);vt.setAttribute('text-anchor','middle');vt.setAttribute('font-size','8');
            vt.setAttribute('fill',isMain?'#3B82F6':'#64748B');vt.setAttribute('font-weight',isMain?'bold':'normal');
            vt.textContent=cnt; svg.appendChild(vt);
        }
    });
    el.appendChild(svg);
}

/* ── 도넛 ── */
function renderDonut(canvasId, items, total) {
    const el=document.getElementById(canvasId);
    if(!el) return;
    el.innerHTML='';
    const SIZE=110,cx=55,cy=55,R=40,r=25;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute('style','width:100%;max-width:110px;display:block;margin:0 auto;');
    let angle=-Math.PI/2;
    const sorted=[...items].sort((a,b)=>b[1]-a[1]);
    sorted.forEach(([,cnt],idx)=>{
        const frac=cnt/total, sweep=frac*2*Math.PI;
        const x1=cx+R*Math.cos(angle),y1=cy+R*Math.sin(angle);
        angle+=sweep;
        const x2=cx+R*Math.cos(angle),y2=cy+R*Math.sin(angle);
        const xi1=cx+r*Math.cos(angle-sweep),yi1=cy+r*Math.sin(angle-sweep);
        const xi2=cx+r*Math.cos(angle),yi2=cy+r*Math.sin(angle);
        const large=sweep>Math.PI?1:0;
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',`M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`);
        path.setAttribute('fill',DARK_COLORS[idx%DARK_COLORS.length]);
        path.setAttribute('stroke','#0F172A');path.setAttribute('stroke-width','1.5');
        svg.appendChild(path);
    });
    const top=sorted[0];
    ['text','text'].forEach((tag,k)=>{
        const t=document.createElementNS('http://www.w3.org/2000/svg',tag);
        t.setAttribute('x',cx);t.setAttribute('y',k===0?cy-3:cy+9);
        t.setAttribute('text-anchor','middle');t.setAttribute('font-size',k===0?'9':'8');
        t.setAttribute('fill',k===0?'#F1F5F9':'#94A3B8');if(k===0)t.setAttribute('font-weight','bold');
        t.textContent=k===0?top[0]:(top[1]/total*100).toFixed(0)+'%';
        svg.appendChild(t);
    });
    el.appendChild(svg);
    const legend=document.createElement('div');
    legend.style.cssText='display:flex;flex-direction:column;gap:5px;margin-top:10px;';
    sorted.slice(0,4).forEach(([label,cnt],idx)=>{
        const row=document.createElement('div');
        row.style.cssText='display:flex;align-items:center;gap:6px;font-size:10.5px;color:#94A3B8;';
        row.innerHTML=`<span style="width:10px;height:10px;border-radius:3px;background:${DARK_COLORS[idx%DARK_COLORS.length]};flex-shrink:0;"></span><span style="flex:1;">${label}</span><span>${(cnt/total*100).toFixed(1)}%</span>`;
        legend.appendChild(row);
    });
    el.appendChild(legend);
}
function renderOddEvenChart(eoCnt,total){renderDonut('oe-chart',Object.entries(eoCnt),total);}
function renderLowHighChart(lhCnt,total){renderDonut('lh-chart',Object.entries(lhCnt),total);}

/* ── 미출현 갭 ── */
function renderGapTable(lastSeen, freq, total) {
    const el=document.getElementById('gap-table');
    if(!el) return;
    el.innerHTML='';
    const gaps=Array.from({length:45},(_,i)=>i+1)
        .map(n=>({n,gap:lastSeen[n]??9999}))
        .sort((a,b)=>b.gap-a.gap).slice(0,10);
    const maxGap=gaps[0].gap;
    gaps.forEach(({n,gap},rank)=>{
        const row=document.createElement('div');
        row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);';
        const rankEl=document.createElement('div');
        rankEl.style.cssText='font-size:10px;color:#64748B;width:16px;flex-shrink:0;';
        rankEl.textContent=rank+1;
        const ball=mkBall(n,'mini-ball');
        ball.style.flexShrink='0';
        const barWrap=document.createElement('div');
        barWrap.style.cssText='flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;';
        const fill=document.createElement('div');
        fill.style.cssText=`height:100%;border-radius:99px;width:0;transition:width .7s cubic-bezier(.4,0,.2,1);background:${gap>=15?'#EF4444':gap>=8?'#F5C842':'#22C55E'};`;
        barWrap.appendChild(fill);
        const info=document.createElement('div');
        info.style.cssText=`font-size:11px;flex-shrink:0;width:40px;text-align:right;color:${gap>=15?'#EF4444':gap>=8?'#F5C842':'#94A3B8'};`;
        info.textContent=gap+'회';
        row.append(rankEl,ball,barWrap,info);
        el.appendChild(row);
        requestAnimationFrame(()=>{fill.style.width=Math.round(gap/maxGap*100)+'%';});
    });
}

/* ── 최근 회차 — 볼 한줄 ── */
function renderRecentHistory() {
    const histEl=document.getElementById('history-list');
    if(!histEl) return;
    histEl.innerHTML='';
    lottoData.slice(0,10).forEach(d=>{
        const fmt=String(d.date).replace(/(\d{4})(\d{2})(\d{2})/,'$1.$2.$3');
        const row=document.createElement('div');
        row.style.cssText='display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);';

        const meta=document.createElement('div');
        meta.style.cssText='flex-shrink:0;width:44px;';
        meta.innerHTML=`<div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;color:#F5C842;">${d.no}회</div><div style="font-size:9.5px;color:#64748B;">${fmt.slice(5)}</div>`;

        /* 볼 행 — nowrap */
        const ballsWrap=document.createElement('div');
        ballsWrap.style.cssText='display:flex;flex-wrap:nowrap;align-items:center;gap:3px;flex:1;overflow:hidden;';
        d.nums.forEach(n=>{
            const b=mkBall(n,'mini-ball');
            b.style.flexShrink='0';
            ballsWrap.appendChild(b);
        });

        /* 보너스 */
        const bonusWrap=document.createElement('div');
        bonusWrap.style.cssText='display:flex;align-items:center;gap:2px;flex-shrink:0;';
        bonusWrap.innerHTML='<span style="font-size:9px;color:#64748B;">+</span>';
        const bon=mkBall(d.bonus,'mini-ball');
        bon.style.opacity='0.45'; bon.style.flexShrink='0';
        bonusWrap.appendChild(bon);

        /* 태그 */
        const tags=document.createElement('div');
        tags.style.cssText='display:flex;flex-direction:column;gap:3px;flex-shrink:0;';
        const odd=d.nums.filter(n=>n%2!==0).length;
        const mkTag=(txt,color)=>{
            const t=document.createElement('span');
            t.style.cssText=`font-size:9px;padding:2px 5px;border-radius:99px;white-space:nowrap;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:${color};`;
            t.textContent=txt; return t;
        };
        tags.append(mkTag('합 '+d.stats.sum,'#F5C842'), mkTag('홀'+odd+'짝'+(6-odd),'#94A3B8'));

        row.append(meta,ballsWrap,bonusWrap,tags);
        histEl.appendChild(row);
    });
}
