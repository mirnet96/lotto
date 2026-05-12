/* ══════════════════════════════════════════════════
   js/storage.js — localStorage 읽기·쓰기
   ══════════════════════════════════════════════════ */

function getHistory() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
}

function setHistory(arr) {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
    refreshBadges();
}
