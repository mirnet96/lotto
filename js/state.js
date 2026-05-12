/* ══════════════════════════════════════════════════
   js/state.js — 전역 상태 (모든 모듈이 공유)
   ══════════════════════════════════════════════════ */

const LS_KEY = 'lotto_my_history_v1';

let lottoData = [];
let avgSum    = 137;
let freqMap   = {};
