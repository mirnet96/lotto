/* ══════════════════════════════════════════════════
   js/state.js — 전역 상태 (모든 모듈이 공유)
   ══════════════════════════════════════════════════ */

const LS_KEY  = 'lotto_my_history_v1';
const QR_KEY  = 'lotto_qr_exclude_v1';   // sessionStorage 키

let lottoData = [];
let avgSum    = 137;
let freqMap   = {};

/* ── QR 스캔 결과 ──
   scannedLines: [ [n,n,n,n,n,n], [n,...], ... ]  각 게임줄별 6개
   scannedNums : 전체 합집합 (기존 호환용)
*/
function getQRData() {
    try { return JSON.parse(sessionStorage.getItem(QR_KEY) || 'null'); }
    catch { return null; }
}
function setQRData(obj) {   /* obj = { lines, all } | null */
    if (obj && obj.all && obj.all.length)
        sessionStorage.setItem(QR_KEY, JSON.stringify(obj));
    else
        sessionStorage.removeItem(QR_KEY);
}
/* 하위 호환 — 전체 제외번호만 필요한 곳 */
function getQRExclude() {
    const d = getQRData();
    return d ? d.all : [];
}
function setQRExclude(arr) {
    if (!arr || !arr.length) { sessionStorage.removeItem(QR_KEY); return; }
    setQRData({ lines: [], all: arr });
}
