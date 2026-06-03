/* ══════════════════════════════════════════════════
   js/state.js — 전역 상태 (모든 모듈이 공유)
   ══════════════════════════════════════════════════ */

const LS_KEY  = 'lotto_my_history_v1';
const QR_KEY  = 'lotto_qr_exclude_v1';   // sessionStorage 키

let lottoData = [];
let avgSum    = 137;
let freqMap   = {};

/* QR 제외번호 — 탭 새로고침 후에도 세션 동안 유지 */
function getQRExclude() {
    try { return JSON.parse(sessionStorage.getItem(QR_KEY) || '[]'); }
    catch { return []; }
}
function setQRExclude(arr) {
    if (arr && arr.length)
        sessionStorage.setItem(QR_KEY, JSON.stringify(arr));
    else
        sessionStorage.removeItem(QR_KEY);
}

