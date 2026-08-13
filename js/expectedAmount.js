/* ══════════════════════════════════════════════════
   js/expectedAmount.js — 1등 예상 당첨금 API 연동 (홈 화면)
   GET https://lotto.smart-alba.com/api/lotto/expected-amount
   ══════════════════════════════════════════════════ */

const EXPECTED_AMOUNT_API = 'https://lotto.smart-alba.com/api/lotto/expected-amount';

async function loadExpectedAmount() {
    const card = document.getElementById('expected-amount-card');
    const valueEl = document.getElementById('expected-amount-value');
    if (!card || !valueEl) return;

    try {
        const res = await fetch(EXPECTED_AMOUNT_API);
        const json = await res.json();

        if (!json.success || !json.data) {
            throw new Error(json.message || '예상 당첨금 응답이 올바르지 않습니다.');
        }

        const amount = extractAmount(json.data);
        if (amount == null) {
            // 백엔드 응답 필드명이 여기서 시도한 것과 다를 수 있습니다.
            // 콘솔에서 실제 구조를 확인하고 extractAmount()의 후보 필드를 추가해주세요.
            console.warn('예상 당첨금 필드를 찾지 못했습니다. 실제 응답:', json.data);
            card.style.display = 'none';
            return;
        }

        valueEl.textContent = formatKoreanWon(amount);
        card.style.display = 'block';
    } catch (e) {
        console.warn('예상 당첨금을 불러오지 못했습니다.', e);
        card.style.display = 'none';
    }
}

/** 백엔드 응답에서 흔히 쓰일 만한 필드명 후보들을 순서대로 시도 */
function extractAmount(data) {
    const candidates = [
        'amount', 'expected_amount', 'expectedAmount',
        'first_prize_amount', 'firstPrizeAmount', 'total_amount',
    ];
    for (const key of candidates) {
        if (typeof data[key] === 'number') return data[key];
        if (typeof data[key] === 'string' && !isNaN(Number(data[key]))) return Number(data[key]);
    }
    return null;
}

/** 숫자를 "약 OO억 OO만원" 형식으로 표시 */
function formatKoreanWon(amount) {
    const n = Math.round(amount);
    const eok = Math.floor(n / 100000000);
    const man = Math.floor((n % 100000000) / 10000);

    if (eok > 0) {
        return man > 0 ? `약 ${eok}억 ${man.toLocaleString()}만원` : `약 ${eok}억원`;
    }
    if (man > 0) return `약 ${man.toLocaleString()}만원`;
    return `${n.toLocaleString()}원`;
}

document.addEventListener('DOMContentLoaded', loadExpectedAmount);
