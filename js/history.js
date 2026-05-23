/* ══════════════════════════════════════════════════
   js/history.js — 볼 한줄 고정
   ══════════════════════════════════════════════════ */

function renderMyHistory() {
    const wrap = document.getElementById('my-wrap');
    const arr  = getHistory();
    wrap.innerHTML = '';

    if (!arr.length) {
        wrap.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#94A3B8;">
                <div style="font-size:52px;margin-bottom:12px;">🎱</div>
                <p style="font-size:14px;">저장된 번호가 없어요</p>
                <small style="font-size:12px;color:#64748B;margin-top:6px;display:block;">
                    홈에서 ⭐ 버튼으로 마음에 드는 번호를 저장해 보세요
                </small>
            </div>`;
        return;
    }

    /* 상단 요약 */
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-size:13px;color:#94A3B8;';
    bar.innerHTML = `총 <strong style="color:#F5C842;margin:0 3px;">${arr.length}</strong>세트 저장됨`;
    wrap.appendChild(bar);

    /* 날짜별 그룹 */
    const groups = {};
    arr.forEach(item => {
        const key = item.date.split(' ')[0];
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    Object.entries(groups).forEach(([dateKey, items]) => {
        const group = document.createElement('div');
        group.style.marginBottom = '18px';

        /* 날짜 레이블 */
        const dateLabel = document.createElement('div');
        dateLabel.style.cssText = `
            display:flex; align-items:center; gap:6px;
            font-size:11px; font-weight:700; color:#64748B;
            letter-spacing:.8px; text-transform:uppercase;
            margin-bottom:8px;`;
        dateLabel.innerHTML = `📅 ${dateKey} <span style="flex:1;height:1px;background:rgba(255,255,255,.06);display:inline-block;"></span>`;
        group.appendChild(dateLabel);

        items.forEach(item => {
            const card = document.createElement('div');
            card.id = 'mi-' + item.id;
            card.style.cssText = `
                background:#1A2744;
                border:1px solid rgba(255,255,255,.07);
                border-radius:14px; padding:12px 14px;
                margin-bottom:8px;
                display:flex; align-items:center; gap:10px;
                transition:opacity .18s, transform .18s;`;

            /* ── 볼 행 — flex nowrap 인라인 강제 ── */
            const balls = document.createElement('div');
            balls.style.cssText = [
                'display:flex',
                'flex-wrap:nowrap',
                'align-items:center',
                'gap:4px',
                'flex:1',
                'overflow:hidden',
            ].join(';');
            item.nums.forEach(n => {
                const ball = mkBall(n, 'mini-ball');
                ball.style.flexShrink = '0';
                ball.style.flexGrow   = '0';
                balls.appendChild(ball);
            });

            /* 메타 */
            const meta = document.createElement('div');
            meta.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;';

            const sumTag = document.createElement('span');
            sumTag.style.cssText = `
                font-size:10px; padding:2px 8px; border-radius:99px;
                white-space:nowrap; font-weight:700;
                background:rgba(245,200,66,.1);
                border:1px solid rgba(245,200,66,.25);
                color:#F5C842;`;
            sumTag.textContent = '합 ' + item.nums.reduce((a,b)=>a+b,0);

            const timeTag = document.createElement('span');
            timeTag.style.cssText = 'font-size:9.5px;color:#64748B;';
            timeTag.textContent = item.date.split(' ')[1] || '';

            meta.append(sumTag, timeTag);

            /* 삭제 버튼 */
            const delBtn = document.createElement('button');
            delBtn.style.cssText = `
                width:30px; height:30px; border-radius:8px;
                border:1px solid rgba(255,255,255,.08);
                background:transparent; color:#64748B;
                font-size:15px; cursor:pointer;
                display:flex; align-items:center; justify-content:center;
                flex-shrink:0; transition:all .12s;`;
            delBtn.textContent = '🗑️';
            delBtn.onmouseover = () => { delBtn.style.background='rgba(239,68,68,.12)'; delBtn.style.color='#EF4444'; };
            delBtn.onmouseout  = () => { delBtn.style.background='transparent'; delBtn.style.color='#64748B'; };
            delBtn.onclick = () => deleteItem(item.id);

            card.append(balls, meta, delBtn);
            group.appendChild(card);
        });

        wrap.appendChild(group);
    });

    /* 전체 삭제 버튼 */
    const clearBtn = document.createElement('button');
    clearBtn.style.cssText = `
        width:100%; margin-top:6px; padding:13px 0;
        border-radius:14px;
        border:1.5px solid rgba(239,68,68,.25);
        background:rgba(239,68,68,.06);
        color:#EF4444; font-family:inherit;
        font-size:13px; font-weight:700; cursor:pointer;
        display:flex; align-items:center; justify-content:center; gap:6px;
        transition:background .15s;`;
    clearBtn.innerHTML = '🗑️ 전체 삭제';
    clearBtn.onmouseover = () => { clearBtn.style.background='rgba(239,68,68,.14)'; };
    clearBtn.onmouseout  = () => { clearBtn.style.background='rgba(239,68,68,.06)'; };
    clearBtn.onclick = () => {
        if (confirm('저장된 번호를 모두 삭제할까요?')) {
            setHistory([]);
            renderMyHistory();
            if (typeof updateBadge === 'function') updateBadge();
        }
    };
    wrap.appendChild(clearBtn);
}

function deleteItem(id) {
    const el = document.getElementById('mi-' + id);
    if (!el) return;
    el.style.opacity   = '0';
    el.style.transform = 'translateX(16px)';
    setTimeout(() => {
        setHistory(getHistory().filter(x => x.id !== id));
        renderMyHistory();
        if (typeof updateBadge === 'function') updateBadge();
    }, 200);
}
