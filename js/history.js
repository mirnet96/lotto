/* ══════════════════════════════════════════════════
   js/history.js — 다크 테마 완전 적용
   ══════════════════════════════════════════════════ */

function renderMyHistory() {
    const wrap = document.getElementById('my-wrap');
    const arr  = getHistory();
    wrap.innerHTML = '';

    if (!arr.length) {
        wrap.innerHTML = `
            <div class="my-empty">
                <span class="big-emoji">🎱</span>
                <p>저장된 번호가 없어요</p>
                <small style="font-size:12px;color:var(--text3);margin-top:6px;display:block;">
                    홈에서 ⭐ 버튼으로 마음에 드는 번호를 저장해 보세요
                </small>
            </div>`;
        return;
    }

    /* 상단 요약 바 */
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    bar.innerHTML = `
        <span style="font-size:13px;color:var(--text2);">
            총 <strong style="color:var(--gold);">${arr.length}세트</strong> 저장됨
        </span>`;
    wrap.appendChild(bar);

    /* 날짜별 그룹핑 */
    const groups = {};
    arr.forEach(item => {
        const dateKey = item.date.split(' ')[0]; // "2026.05.23"
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
    });

    Object.entries(groups).forEach(([dateKey, items]) => {
        const group = document.createElement('div');
        group.className = 'my-date-group';

        /* 날짜 레이블 */
        const dateLabel = document.createElement('div');
        dateLabel.className = 'my-date-label';
        dateLabel.innerHTML = `📅 ${dateKey}`;
        group.appendChild(dateLabel);

        /* 세트 카드들 */
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'my-set-card';
            card.id = 'mi-' + item.id;

            /* 볼 */
            const balls = document.createElement('div');
            balls.className = 'my-set-balls';
            item.nums.forEach(n => balls.appendChild(mkBall(n, 'mini-ball')));

            /* 메타 (합계 + 시간) */
            const meta = document.createElement('div');
            meta.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;';

            const sumTag = document.createElement('span');
            sumTag.style.cssText = `font-size:10px;padding:2px 8px;border-radius:99px;white-space:nowrap;
                background:rgba(245,200,66,.1);border:1px solid rgba(245,200,66,.25);color:var(--gold);font-weight:700;`;
            sumTag.textContent = '합 ' + item.nums.reduce((a, b) => a + b, 0);

            const timeTag = document.createElement('span');
            timeTag.style.cssText = 'font-size:9.5px;color:var(--text3);';
            timeTag.textContent = item.date.split(' ')[1] || '';

            meta.append(sumTag, timeTag);

            /* 삭제 버튼 */
            const delBtn = document.createElement('button');
            delBtn.className = 'my-del-btn';
            delBtn.innerHTML = '🗑️';
            delBtn.title     = '삭제';
            delBtn.onclick   = () => deleteItem(item.id);

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
        color:var(--red); font-family:inherit;
        font-size:13px; font-weight:700; cursor:pointer;
        display:flex; align-items:center; justify-content:center; gap:6px;
        transition:background .15s;
    `;
    clearBtn.innerHTML = '🗑️ 전체 삭제';
    clearBtn.onmouseover = () => { clearBtn.style.background = 'rgba(239,68,68,.14)'; };
    clearBtn.onmouseout  = () => { clearBtn.style.background = 'rgba(239,68,68,.06)'; };
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
    el.style.transition = 'opacity .18s, transform .18s';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(16px)';
    setTimeout(() => {
        setHistory(getHistory().filter(x => x.id !== id));
        renderMyHistory();
        if (typeof updateBadge === 'function') updateBadge();
    }, 200);
}

