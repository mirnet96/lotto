/* ══════════════════════════════════════════════════
   js/history.js — 내 번호 이력 렌더링
   ══════════════════════════════════════════════════ */

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
        db.innerHTML  = `<span class="material-symbols-rounded text-[14px]">delete</span>삭제`;
        db.onclick    = () => deleteItem(item.id);
        acts.appendChild(db);

        card.append(hdr, nums, acts);
        wrap.appendChild(card);
    });

    const cb = document.createElement('button');
    cb.className   = 'w-full mt-1.5 py-3 border border-red-200 rounded-xl text-[13px] text-red-500 cursor-pointer transition-colors hover:bg-red-50';
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
