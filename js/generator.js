/* ══════════════════════════════════════════════════
   js/generator.js — 다크 테마 + 볼 한줄 고정
   ══════════════════════════════════════════════════ */

function buildWeights(data, recentWindow = 30) {
    const freq = {}, recentFreq = {}, lastSeen = {};
    for (let n = 1; n <= 45; n++) { freq[n] = 0; recentFreq[n] = 0; }
    data.forEach(d => d.nums.forEach(n => freq[n]++));
    data.slice(0, recentWindow).forEach(d => d.nums.forEach(n => recentFreq[n]++));
    data.forEach((d, i) => d.nums.forEach(n => { if (!(n in lastSeen)) lastSeen[n] = i; }));
    const maxF = Math.max(...Object.values(freq));
    const maxR = Math.max(...Object.values(recentFreq));
    const weights = {};
    for (let n = 1; n <= 45; n++) {
        const gap = lastSeen[n] || 0;
        weights[n] = Math.max(
            (freq[n] / maxF) * 50 +
            (recentFreq[n] / Math.max(maxR, 1)) * 30 +
            Math.min(gap / 20, 1) * 20, 1
        );
    }
    return weights;
}

function scoreNums(arr, weights) {
    let score = 100;
    const sum  = arr.reduce((a, b) => a + b, 0);
    const diff = Math.abs(sum - 138);
    score += diff <= 15 ? 25 : diff <= 30 ? 15 : diff <= 50 ? 5 : -10;
    const odd = arr.filter(n => n % 2 !== 0).length;
    score += ({3:25,2:18,4:18,1:5,5:5,0:-10,6:-10})[odd] || 0;
    const low = arr.filter(n => n <= 23).length;
    score += ({3:22,4:20,2:15,5:8,1:5,0:-10,6:-10})[low] || 0;
    const s = [...arr].sort((a,b)=>a-b);
    let pairs = 0;
    for (let i = 0; i < s.length-1; i++) if (s[i+1]===s[i]+1) pairs++;
    score += pairs===0 ? 15 : pairs===1 ? 10 : pairs>=3 ? -15 : 0;
    for (let i = 0; i < s.length-2; i++)
        if (s[i+1]===s[i]+1 && s[i+2]===s[i]+2) { score -= 30; break; }
    const zones = new Set(s.map(n => Math.min(4,Math.floor((n-1)/10)))).size;
    score += ({5:15,4:20,3:8,2:-10})[zones] || 0;
    const ec = {};
    for (const n of arr) { const e=n%10; ec[e]=(ec[e]||0)+1; }
    for (const c of Object.values(ec)) if (c>=3) score -= 20;
    const maxW  = Math.max(...Object.values(weights));
    score += Math.round((arr.reduce((a,n)=>a+(weights[n]||0),0)/(maxW*6))*20);
    return score;
}

function isValid(arr) {
    const sum = arr.reduce((a,b)=>a+b,0);
    if (sum<88||sum>188) return false;
    const odd = arr.filter(n=>n%2!==0).length;
    if (odd===0||odd===6) return false;
    const low = arr.filter(n=>n<=23).length;
    if (low===0||low===6) return false;
    const s = [...arr].sort((a,b)=>a-b);
    for (let i=0;i<s.length-2;i++)
        if (s[i+1]===s[i]+1&&s[i+2]===s[i]+2) return false;
    const ec={};
    for (const n of arr){const e=n%10;ec[e]=(ec[e]||0)+1;if(ec[e]>=3)return false;}
    if (new Set(s.map(n=>Math.min(4,Math.floor((n-1)/10)))).size<3) return false;
    return true;
}

function weightedPick(pool, weights) {
    const w = pool.map(n=>weights[n]||1);
    const total = w.reduce((a,b)=>a+b,0);
    let r = Math.random()*total;
    for (let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return pool[i];}
    return pool[pool.length-1];
}

function smartNums(excludeNums=[], weights=freqMap) {
    const exclude = new Set(excludeNums);
    const pool    = Array.from({length:45},(_,i)=>i+1).filter(n=>!exclude.has(n));
    let best=null, bestScore=-Infinity;
    for (let t=0;t<800;t++){
        const s=new Set();
        while(s.size<6) s.add(weightedPick(pool.filter(n=>!s.has(n)),weights));
        if(s.size<6) continue;
        const arr=[...s].sort((a,b)=>a-b);
        if(!isValid(arr)) continue;
        const sc=scoreNums(arr,weights);
        if(sc>bestScore){bestScore=sc;best=arr;if(sc>=175)break;}
    }
    if(!best){
        for(let t=0;t<400;t++){
            const s=new Set();
            while(s.size<6) s.add(pool[Math.floor(Math.random()*pool.length)]);
            const arr=[...s].sort((a,b)=>a-b);
            if(isValid(arr)) return {nums:arr,score:0};
        }
        const s=new Set();
        while(s.size<6) s.add(pool[Math.floor(Math.random()*pool.length)]);
        return {nums:[...s].sort((a,b)=>a-b),score:0};
    }
    return {nums:best,score:bestScore};
}

function getQualityBadge(score) {
    if (score>=185) return {label:'✨ S+', color:'#C084FC', bg:'rgba(192,132,252,.15)', border:'rgba(192,132,252,.35)'};
    if (score>=175) return {label:'⭐ S급', color:'#F5C842', bg:'rgba(245,200,66,.12)', border:'rgba(245,200,66,.3)'};
    if (score>=160) return {label:'🔥 A급', color:'#22C55E', bg:'rgba(34,197,94,.1)',  border:'rgba(34,197,94,.28)'};
    return              {label:'💧 B급', color:'#3B82F6', bg:'rgba(59,130,246,.1)', border:'rgba(59,130,246,.28)'};
}

const SET_LABELS = ['A','B','C','D','E'];
const SET_EMOJIS = ['🅐','🅑','🅒','🅓','🅔'];

function applySet(nums, cardEl, btnEl) {
    const arr = getHistory();
    const now = new Date();
    const pad = n=>String(n).padStart(2,'0');
    arr.unshift({id:Date.now(), date:`${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`, nums});
    setHistory(arr);
    btnEl.textContent = '✅ 저장됨';
    btnEl.style.cssText += ';border-color:rgba(34,197,94,.4);background:rgba(34,197,94,.1);color:#22C55E;pointer-events:none;';
    cardEl.style.borderColor = 'rgba(245,200,66,.4)';
    setTimeout(()=>{cardEl.style.borderColor='';}, 1200);
    if (typeof toast === 'function') toast('⭐ 번호가 저장되었습니다');
    if (typeof updateBadge === 'function') updateBadge();
}

function generateAll(excludeNums=[]) {
    const icon = document.getElementById('gen-icon');
    const wrap = document.getElementById('sets-container');
    if (icon) {
        icon.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1)';
        icon.style.transform  = 'rotate(360deg)';
        setTimeout(()=>{icon.style.transform='';icon.style.transition='';}, 560);
    }
    wrap.innerHTML = '';
    const weights = Object.keys(freqMap).length ? buildWeights(lottoData,30) : freqMap;

    Array.from({length:5}).forEach((_,i)=>{
        const {nums, score} = smartNums(excludeNums, weights);
        const sum = nums.reduce((a,b)=>a+b,0);
        const odd = nums.filter(n=>n%2!==0).length;

        /* ── 카드 ── */
        const card = document.createElement('div');
        card.className = 'set-card';
        card.style.animationDelay = (i*60)+'ms';

        /* 헤더 */
        const header = document.createElement('div');
        header.className = 'set-card-header';

        const lbl = document.createElement('div');
        lbl.className = 'set-label';
        lbl.textContent = SET_EMOJIS[i]+' 세트 '+SET_LABELS[i];

        const rightWrap = document.createElement('div');
        rightWrap.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';

        if (score>0) {
            const qb    = getQualityBadge(score);
            const badge = document.createElement('span');
            badge.style.cssText = `font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;white-space:nowrap;background:${qb.bg};border:1px solid ${qb.border};color:${qb.color};`;
            badge.textContent = qb.label;
            rightWrap.appendChild(badge);
        }

        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.textContent = '⭐ 저장';
        saveBtn.onclick = () => applySet(nums, card, saveBtn);
        rightWrap.appendChild(saveBtn);
        header.append(lbl, rightWrap);

        /* ── 볼 행 — 핵심: display:flex, flex-wrap:nowrap, 볼 크기 고정 ── */
        const ballsRow = document.createElement('div');
        ballsRow.style.cssText = [
            'display:flex',
            'flex-wrap:nowrap',       /* 절대 줄바꿈 안 함 */
            'align-items:center',
            'gap:5px',
            'overflow:hidden',
            'width:100%',
        ].join(';');

        nums.forEach(n => {
            const ball = mkBall(n, 'ball');
            /* flex-shrink:0 을 인라인으로도 보장 */
            ball.style.flexShrink = '0';
            ball.style.flexGrow   = '0';
            ballsRow.appendChild(ball);
        });

        /* 푸터 */
        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:8px;';

        const mkTag = (txt) => {
            const t = document.createElement('span');
            t.style.cssText = 'font-size:10px;color:#94A3B8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:2px 8px;border-radius:99px;white-space:nowrap;';
            t.textContent = txt;
            return t;
        };
        footer.append(mkTag('합계 '+sum), mkTag('홀'+odd+' 짝'+(6-odd)));

        card.append(header, ballsRow, footer);
        wrap.appendChild(card);
    });
}
