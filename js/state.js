/* ══════════════════════════════════════════════════
   js/state.js — 전역 상태 (모든 모듈이 공유)
   ══════════════════════════════════════════════════ */

const LS_KEY = 'lotto_my_history_v1';
const QR_KEY = 'lotto_qr_exclude_v1';

let lottoData = [];
let avgSum    = 137;
let freqMap   = {};

/* QR 스캔 결과 저장 구조
   { lines: [[n,n,n,n,n,n], ...], all: [n,...] }
*/
function getQRData() {
    try { return JSON.parse(sessionStorage.getItem(QR_KEY) || 'null'); }
    catch { return null; }
}
function setQRData(obj) {
    if (obj && obj.all && obj.all.length)
        sessionStorage.setItem(QR_KEY, JSON.stringify(obj));
    else
        sessionStorage.removeItem(QR_KEY);
}
function getQRExclude() {
    const d = getQRData();
    return d ? d.all : [];
}
