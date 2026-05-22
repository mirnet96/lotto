/* ══════════════════════════════════════════════════
   js/ui.js — 공통 UI (볼 · 토스트 · 탭 · 배지)
              다크 테마 완전 적용
   ══════════════════════════════════════════════════ */

/* ── 볼 색상 헬퍼 ── */
function bHex(n) {
    if (n <= 10)  return 'linear-gradient(135deg,#FBC02D,#F59E0B)'; // 노랑
    if (n <= 20)  return 'linear-gradient(135deg,#3B82F6,#1D4ED8)'; // 파랑
    if (n <= 30)  return 'linear-gradient(135deg,#EF4444,#B91C1C)'; // 빨강
    if (n <= 40)  return 'linear-gradient(135deg,#22C55E,#15803D)'; // 초록
    return              'linear-gradient(135deg,#9CA3AF,#4B5563)';  // 회색
}

function bClass(n) {
    if (n <= 10)  return 'b-y';
    if (n <= 20)  return 'b-b';
    if (n <= 30)  return 'b-r';
    if (n <= 40)  return 'b-gr';
    return              'b-gry';
}

/* ── 볼 DOM 생성 ── */
function mkBall(num, cls = 'ball') {
    const el = document.createElement('div');
    el.className = cls + ' ' + bClass(num);
    el.textContent = num;
    return el;
}

/* ── 토스트 ── */
let _toastTimer = null;
function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ── 탭 전환 ── */
function switchTab(name) {
    /* 페이지 전환 */
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    if (page) page.classList.add('active');

    /* 탭 버튼 active 상태 */
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    /* PC 상단 네비 */
    const tnBtn = document.getElementById('tn-' + name);
    if (tnBtn) tnBtn.classList.add('active');

    /* 모바일 하단 네비 */
    const bnBtn = document.getElementById('bn-' + name);
    if (bnBtn) bnBtn.classList.add('active');

    /* 탭별 후처리 */
    if (name === 'stats'     && typeof buildStats      === 'function') buildStats();
    if (name === 'myhistory' && typeof renderMyHistory === 'function') renderMyHistory();

    /* 스크롤 상단 이동 */
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── 배지 업데이트 ── */
function updateBadge() {
    const count   = (typeof getHistory === 'function') ? getHistory().length : 0;
    const mobBadge = document.getElementById('mob-badge');
    const pcBadge  = document.getElementById('pc-badge');

    if (mobBadge) {
        mobBadge.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
        mobBadge.classList.toggle('show', count > 0);
    }
    if (pcBadge) {
        pcBadge.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
        pcBadge.classList.toggle('show', count > 0);
    }
}

