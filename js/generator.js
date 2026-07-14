/* ══════════════════════════════════════════════════
   js/generator.js
   모드: stat(통계) | random(완전랜덤) | fortune(운세) | custom(조건설정)
   연출: 볼 하나씩 공개 + 파티클 + 랜덤 멘트
   ══════════════════════════════════════════════════ */

/* ── 현재 선택 모드 ── */
let currentMode = 'stat';
let customOpts  = { oddMin:2, oddMax:4, sumMin:100, sumMax:176, lowMin:2, lowMax:4 };

/* ── 운세 멘트 (랜덤) ── */
const FORTUNE_MSG = [
    ['🌙','오늘 달빛이 당신의 손을 이끕니다'],
    ['⚡','번개처럼 강렬한 기운이 느껴집니다'],
    ['🌊','물처럼 흐르는 행운이 찾아옵니다'],
    ['🔥','뜨거운 열정이 행운을 부릅니다'],
    ['🌸','봄꽃처럼 피어나는 운세입니다'],
    ['🌈','무지개 끝에 황금이 기다립니다'],
    ['⭐','별이 당신의 번호를 속삭입니다'],
    ['🍀','네잎 클로버의 기운이 가득합니다'],
    ['🦋','나비가 날아든 날, 행운이 따릅니다'],
    ['🌺','오늘은 특별한 숫자가 빛납니다'],
];

/* 랜덤 승리 멘트 */
const WIN_MSGS = [
    '💰 이번엔 진짜 될 것 같아요!',
    '🎯 통계가 이 조합을 원하고 있어요',
    '✨ 오늘 운이 넘치는 느낌!',
    '🍀 행운의 번호가 탄생했습니다',
    '🔥 이 조합... 심상치 않은데요?',
    '⭐ 별자리가 이 숫자를 가리킵니다',
    '🎰 잭팟의 향기가 납니다',
    '🌈 무지개 너머 당신의 번호예요',
    '💫 우주가 선택한 조합입니다',
    '🎱 완벽한 조합이 완성됐어요!',
];

/* ── 통계 함수들 ── */
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

/* ── 완전 랜덤 ── */
function randomNums(excludeNums=[]) {
    const exclude = new Set(excludeNums);
    const pool = Array.from({length:45},(_,i)=>i+1).filter(n=>!exclude.has(n));
    const s = new Set();
    while (s.size < 6) s.add(pool[Math.floor(Math.random()*pool.length)]);
    return { nums: [...s].sort((a,b)=>a-b), score: 0 };
}

/* ── 운세 기반 (날짜 시드 + 약한 가중치) ── */
function fortuneNums(excludeNums=[]) {
    const today = new Date();
    // 날짜 기반 시드로 숫자 편향
    const seed = today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate();
    const lucky = [(seed % 45)+1, (seed*7 % 45)+1, (seed*13 % 45)+1];
    const exclude = new Set(excludeNums);
    const pool = Array.from({length:45},(_,i)=>i+1).filter(n=>!exclude.has(n));
    const weights = {};
    pool.forEach(n => {
        weights[n] = lucky.includes(n) ? 5 : 1;
    });
    return smartNums(excludeNums, weights);
}

/* ── 조건 기반 ── */
function customNums(excludeNums=[], opts=customOpts) {
    const exclude = new Set(excludeNums);
    const pool = Array.from({length:45},(_,i)=>i+1).filter(n=>!exclude.has(n));
    for (let t=0;t<2000;t++){
        const s=new Set();
        while(s.size<6) s.add(pool[Math.floor(Math.random()*pool.length)]);
        const arr=[...s].sort((a,b)=>a-b);
        const sum = arr.reduce((a,b)=>a+b,0);
        const odd = arr.filter(n=>n%2!==0).length;
        const low = arr.filter(n=>n<=23).length;
        if (sum<opts.sumMin||sum>opts.sumMax) continue;
        if (odd<opts.oddMin||odd>opts.oddMax) continue;
        if (low<opts.lowMin||low>opts.lowMax) continue;
        return {nums:arr, score:scoreNums(arr,freqMap)};
    }
    return smartNums(excludeNums); // fallback
}

/* ── 뱃지 ── */
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

/* ══ 볼 공개 애니메이션 ══ */
function revealBalls(ballsRow, nums, onDone) {
    const delay = 220;   // 볼 하나씩 간격 ms
    ballsRow.innerHTML = '';

    // 먼저 ? 플레이스홀더 6개
    const placeholders = nums.map((n, i) => {
        const ph = document.createElement('div');
        ph.style.cssText = [
            `width:clamp(32px,calc((100vw - 120px)/6),42px)`,
            `height:clamp(32px,calc((100vw - 120px)/6),42px)`,
            'border-radius:50%',
            'display:flex','align-items:center','justify-content:center',
            'font-size:clamp(11px,3vw,14px)','font-weight:900','color:#475569',
            'background:rgba(255,255,255,.07)',
            'border:2px dashed rgba(255,255,255,.15)',
            'flex-shrink:0','transition:all .3s',
        ].join(';');
        ph.textContent = '?';
        ballsRow.appendChild(ph);
        return ph;
    });

    nums.forEach((n, i) => {
        setTimeout(() => {
            const ball = mkBall(n, 'ball');
            ball.style.flexShrink = '0';
            ball.style.flexGrow   = '0';
            ball.style.opacity    = '0';
            ball.style.transform  = 'scale(0.3) translateY(-20px)';
            ball.style.transition = 'all 0.35s cubic-bezier(.36,1.6,.26,.9)';
            placeholders[i].replaceWith(ball);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    ball.style.opacity   = '1';
                    ball.style.transform = 'scale(1) translateY(0)';
                });
            });
            if (i === nums.length - 1) setTimeout(onDone, 350);
        }, i * delay);
    });
}

/* ══ 파티클 이펙트 ══ */
function spawnParticles(anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#F5C842','#3B82F6','#EF4444','#22C55E','#C084FC','#F97316'];
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        const angle = (Math.PI * 2 * i) / 18;
        const dist  = 60 + Math.random() * 60;
        const size  = 5 + Math.random() * 6;
        p.style.cssText = [
            'position:fixed','pointer-events:none','z-index:9999',
            `left:${cx}px`,`top:${cy}px`,
            `width:${size}px`,`height:${size}px`,
            'border-radius:50%',
            `background:${colors[i % colors.length]}`,
            'transition:all 0.7s cubic-bezier(.2,.8,.3,1)',
            'opacity:1',
        ].join(';');
        document.body.appendChild(p);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                p.style.left    = `${cx + Math.cos(angle)*dist}px`;
                p.style.top     = `${cy + Math.sin(angle)*dist}px`;
                p.style.opacity = '0';
                p.style.transform = 'scale(0)';
            });
        });
        setTimeout(() => p.remove(), 750);
    }
}

/* ══ 모드별 인사이트 태그 ══ */
function getModeTag(mode, score, nums) {
    const sum = nums.reduce((a,b)=>a+b,0);
    const odd = nums.filter(n=>n%2!==0).length;
    if (mode === 'stat') {
        const qb = getQualityBadge(score);
        return { text: qb.label, color: qb.color, bg: qb.bg, border: qb.border };
    }
    if (mode === 'random')  return { text:'🎲 완전랜덤', color:'#94A3B8', bg:'rgba(148,163,184,.1)', border:'rgba(148,163,184,.25)' };
    if (mode === 'fortune') {
        const fm = FORTUNE_MSG[Math.floor(Math.random()*FORTUNE_MSG.length)];
        return { text: fm[0]+' 운세', color:'#C084FC', bg:'rgba(192,132,252,.12)', border:'rgba(192,132,252,.3)' };
    }
    if (mode === 'custom')  return { text:`⚙️ 합${sum} 홀${odd}`, color:'#F97316', bg:'rgba(249,115,22,.1)', border:'rgba(249,115,22,.28)' };
    return { text:'', color:'', bg:'', border:'' };
}

/* ══ 메인 생성 함수 ══ */
function generateAll(excludeNums=[], mode=null) {
    mode = mode || currentMode;

    const icon = document.getElementById('gen-icon');
    const wrap = document.getElementById('sets-container');
    if (icon) {
        icon.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1)';
        icon.style.transform  = 'rotate(360deg)';
        setTimeout(()=>{icon.style.transform='';icon.style.transition='';}, 560);
    }
    wrap.innerHTML = '';

    const weights = Object.keys(freqMap).length ? buildWeights(lottoData,30) : freqMap;

    /* 운세 모드: 오늘의 멘트 */
    if (mode === 'fortune') {
        const fm = FORTUNE_MSG[new Date().getDate() % FORTUNE_MSG.length];
        const msg = document.createElement('div');
        msg.style.cssText = 'text-align:center;padding:10px 0 14px;font-size:13px;color:#C084FC;animation:fadeIn .3s ease;';
        msg.textContent = fm[0] + ' ' + fm[1];
        wrap.appendChild(msg);
    }

    /* 5세트 생성 */
    const sets = Array.from({length:5}).map(() => {
        if (mode === 'random')  return randomNums(excludeNums);
        if (mode === 'fortune') return fortuneNums(excludeNums);
        if (mode === 'custom')  return customNums(excludeNums, customOpts);
        return smartNums(excludeNums, weights);
    });

    sets.forEach(({nums, score}, i) => {
        const sum = nums.reduce((a,b)=>a+b,0);
        const odd = nums.filter(n=>n%2!==0).length;

        const card = document.createElement('div');
        card.className = 'set-card';
        card.style.animationDelay = (i*50)+'ms';

        /* 헤더 */
        const header = document.createElement('div');
        header.className = 'set-card-header';

        const lbl = document.createElement('div');
        lbl.className = 'set-label';
        lbl.textContent = SET_EMOJIS[i]+' 세트 '+SET_LABELS[i];

        const rightWrap = document.createElement('div');
        rightWrap.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';

        const mt = getModeTag(mode, score, nums);
        if (mt.text) {
            const badge = document.createElement('span');
            badge.style.cssText = `font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;white-space:nowrap;background:${mt.bg};border:1px solid ${mt.border};color:${mt.color};`;
            badge.textContent = mt.text;
            rightWrap.appendChild(badge);
        }

        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.textContent = '⭐ 저장';
        saveBtn.onclick = () => applySet(nums, card, saveBtn);
        rightWrap.appendChild(saveBtn);
        header.append(lbl, rightWrap);

        /* 볼 행 */
        const ballsRow = document.createElement('div');
        ballsRow.style.cssText = 'display:flex;flex-wrap:nowrap;align-items:center;gap:clamp(3px,1.2vw,6px);overflow:visible;width:100%;min-width:0;';

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

        /* 볼 순차 공개 연출 */
        setTimeout(() => {
            revealBalls(ballsRow, nums, () => {
                if (i === 4) {
                    /* 마지막 세트 완료 → 파티클 + 멘트 */
                    spawnParticles(ballsRow);
                    const winMsg = WIN_MSGS[Math.floor(Math.random()*WIN_MSGS.length)];
                    if (typeof toast === 'function') toast(winMsg);
                }
            });
        }, i * 120);
    });
}
