/* ══════════════════════════════════════════════════
   js/dateInputHelpers.js — 생년월일/태어난 시 "직접 입력" 공용 유틸
   네이티브 date/time picker 대신 텍스트 입력을 쓰기 위한 자동 포맷팅 +
   유효성 검사. window.DateInputHelpers로 노출되어 classic script와
   <script type="module"> 양쪽에서 모두 window.DateInputHelpers로 접근 가능합니다.
   ══════════════════════════════════════════════════ */

(function () {
  /** 숫자만 입력받아 타이핑하는 대로 YYYY-MM-DD 형태로 자동 포맷 */
  function formatDateTyping(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  }

  /** 숫자만 입력받아 타이핑하는 대로 HH:MM 형태로 자동 포맷 */
  function formatTimeTyping(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  function isValidDateStr(str) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const [y, m, d] = str.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(`${str}T00:00:00`);
    return !isNaN(dt.getTime()) && dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
  }

  function isValidTimeStr(str) {
    if (!/^\d{2}:\d{2}$/.test(str)) return false;
    const [h, m] = str.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  /** "시"만 입력받는 버전 (0~23). 콜론 입력이 번거롭다는 피드백으로 분/시각 대신 시(hour)만 씁니다. */
  function formatHourTyping(raw) {
    return raw.replace(/\D/g, '').slice(0, 2);
  }

  function isValidHourStr(str) {
    if (!/^\d{1,2}$/.test(str)) return false;
    const h = Number(str);
    return h >= 0 && h <= 23;
  }

  /**
   * 예전에 "14:30"(시:분) 형식으로 저장됐던 값도 호환해서 시(hour)만 뽑아냅니다.
   * "14", "14:30", "14시" 등 앞쪽 숫자 1~2자리를 읽어 0~23 범위인지 확인합니다.
   * 파싱 실패하거나 범위를 벗어나면 null을 반환합니다.
   */
  function parseHourLoose(str) {
    if (str === null || str === undefined || str === '') return null;
    const match = String(str).match(/^(\d{1,2})/);
    if (!match) return null;
    const h = Number(match[1]);
    return (h >= 0 && h <= 23) ? h : null;
  }

  /** input[type=text] 요소에 자동 포맷팅을 붙임 (YYYY-MM-DD) */
  function attachDateInput(el) {
    if (!el) return;
    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('maxlength', '10');
    if (!el.placeholder) el.placeholder = '1996-05-20';
    el.addEventListener('input', () => {
      const pos = el.selectionStart ?? el.value.length;
      const before = el.value.length;
      el.value = formatDateTyping(el.value);
      const after = el.value.length;
      const newPos = Math.max(0, pos + (after - before));
      try { el.setSelectionRange(newPos, newPos); } catch (e) { /* 일부 브라우저 무시 */ }
    });
  }

  /** input[type=text] 요소에 자동 포맷팅을 붙임 (HH:MM) */
  function attachTimeInput(el) {
    if (!el) return;
    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('maxlength', '5');
    if (!el.placeholder) el.placeholder = '14:30';
    el.addEventListener('input', () => {
      const pos = el.selectionStart ?? el.value.length;
      const before = el.value.length;
      el.value = formatTimeTyping(el.value);
      const after = el.value.length;
      const newPos = Math.max(0, pos + (after - before));
      try { el.setSelectionRange(newPos, newPos); } catch (e) { /* 일부 브라우저 무시 */ }
    });
  }

  /** input[type=text] 요소에 "시"만 입력받도록 붙임 (0~23, 콜론 없음) */
  function attachHourInput(el) {
    if (!el) return;
    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('maxlength', '2');
    if (!el.placeholder) el.placeholder = '14';
    el.addEventListener('input', () => {
      el.value = formatHourTyping(el.value);
    });
  }

  window.DateInputHelpers = {
    formatDateTyping,
    formatTimeTyping,
    formatHourTyping,
    isValidDateStr,
    isValidTimeStr,
    isValidHourStr,
    parseHourLoose,
    attachDateInput,
    attachTimeInput,
    attachHourInput,
  };
})();
