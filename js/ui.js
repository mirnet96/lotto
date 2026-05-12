/* ══════════════════════════════════════════════════
   js/ui.js — 공통 UI 헬퍼
   · 공 색상/생성
   · 토스트
   · 탭 전환
   · 배지
   ══════════════════════════════════════════════════ */

/* ── 공 색상 ── */
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

/* ── 공 생성 ── */
function mkBall(n, size = 'ball', delay = 0) {
    const d = document.createElement('div');
    const baseMap = {
        'ball':           'relative overflow-hidden rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
        'mini-ball':      'relative overflow-hidden rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
        'freq-mini-ball': 'relative overflow-hidden rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
    };
    d.className = `${size} ${bCls(n)} ${baseMap[size] || ''}`;
    if (size === 'ball') {
        d.style.width    = 'var(--ball-size)';
        d.style.height   = 'var(--ball-size)';
        d.style.fontSize = 'var(--ball-font)';
        d.classList.add('anim');
        if (delay) d.style.animationDelay = delay + 'ms';
    }
    d.textContent = n;
    return d;
}

/* ── 토스트 ── */
let toastTimer;
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ── 배지 ── */
function refreshBadges() {
    const n = getHistory().length;
    ['pc-badge', 'mob-badge'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (n > 0) { el.textContent = n > 99 ? '99+' : n; el.classList.remove('hidden'); }
        else el.classList.add('hidden');
    });
}

/* ── 탭 전환 ── */
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
