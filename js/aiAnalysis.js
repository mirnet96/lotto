/* ══════════════════════════════════════════════════
   js/aiAnalysis.js — 운세(타로/바이오리듬/사주/관상) 공통
   "AI 심층분석" 버튼 · 전체화면 로딩 · API 호출 · 결과 렌더링

   각 운세 페이지(../js/aiAnalysis.js로 로드)에서 공용으로 씁니다.
   classic script라 window.FortuneAI 네임스페이스로 노출됩니다.
   ══════════════════════════════════════════════════ */

(function () {
  const API_URL = 'https://lotto.smart-alba.com/api/fortune/ai-analysis';

  const STYLE_ID = 'fortune-ai-styles';
  const CSS = `
    .ai-unlock-section { margin: 28px 0; text-align: center; }
    .ai-unlock-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 26px; border-radius: 999px; border: none; cursor: pointer;
      font-family: inherit; font-size: 13.5px; font-weight: 800; color: #0F1B2D;
      background: linear-gradient(135deg, #D4AF37, #9d50ff);
      box-shadow: 0 4px 20px rgba(212,175,55,.3);
    }
    .ai-unlock-btn:disabled { opacity: .6; pointer-events: none; }
    .ai-unlock-hint { margin: 8px 0 0; font-size: 11px; color: #8b93a6; }

    .ai-fullscreen-loading {
      position: fixed; inset: 0; z-index: 999; display: none;
      align-items: center; justify-content: center; flex-direction: column; gap: 18px;
      background: rgba(10, 15, 26, 0.94); backdrop-filter: blur(6px);
    }
    .ai-fullscreen-loading.is-visible { display: flex; }
    .ai-loading-spinner {
      width: 46px; height: 46px; border-radius: 50%;
      border: 3px solid rgba(212,175,55,.25); border-top-color: #D4AF37;
      animation: aiSpin 0.9s linear infinite;
    }
    @keyframes aiSpin { to { transform: rotate(360deg); } }
    .ai-loading-text {
      font-family: 'Noto Serif KR', serif; font-size: 14px; color: #ecd48a;
      text-align: center; animation: aiPulse 1.1s ease-in-out infinite; padding: 0 24px;
    }
    @keyframes aiPulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }

    .ai-result-wrap { margin-top: 24px; display: none; }
    .ai-result-wrap.is-visible { display: block; }
    .ai-result-card {
      background: linear-gradient(135deg, rgba(212,175,55,.1), rgba(157,80,255,.06));
      border: 1px solid rgba(212,175,55,.3); border-radius: 16px; padding: 22px 20px; margin-bottom: 16px;
    }
    .ai-badge {
      display: inline-block; font-size: 10.5px; font-weight: 800; letter-spacing: .08em;
      color: #0F1B2D; background: linear-gradient(135deg,#D4AF37,#9d50ff);
      padding: 3px 10px; border-radius: 999px; margin-bottom: 10px;
    }
    .ai-headline {
      font-family: 'Noto Serif KR', serif; font-size: 19px; font-weight: 700;
      color: #FAFAF7; margin: 0 0 8px; line-height: 1.4;
    }
    .ai-summary { font-size: 13px; color: #b7bfcf; line-height: 1.7; margin: 0; }

    .ai-sections { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .ai-section-card {
      background: #131f33; border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 14px 16px;
    }
    .ai-section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .ai-section-icon { font-size: 17px; }
    .ai-section-title { font-size: 13.5px; font-weight: 700; color: #ecd48a; }
    .ai-section-body { font-size: 12.5px; color: #b7bfcf; line-height: 1.7; margin: 0; }

    .ai-facts-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;
    }
    .ai-fact-chip {
      background: #131f33; border: 1px solid rgba(255,255,255,.07); border-radius: 10px;
      padding: 10px 6px; text-align: center;
    }
    .ai-fact-chip .fact-label { font-size: 9.5px; color: #5b6478; margin: 0 0 3px; }
    .ai-fact-chip .fact-value { font-size: 12px; font-weight: 700; color: #ecd48a; }

    .ai-caution, .ai-funfact {
      font-size: 12px; line-height: 1.7; color: #b7bfcf; background: #131f33;
      border: 1px solid rgba(255,255,255,.07); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px;
    }
    .ai-caution b, .ai-funfact b { color: #ecd48a; }

    .ai-numbers-block { text-align: center; margin: 18px 0; }
    .ai-numbers-label { font-size: 11.5px; color: #8b93a6; margin: 0 0 10px; }
    .ai-numbers { display: flex; justify-content: center; gap: 7px; flex-wrap: wrap; }
    .ai-ball {
      width: 34px; height: 34px; border-radius: 50%; color: #fff; font-weight: 800; font-size: 12.5px;
      display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,.35);
    }

    .ai-teaser {
      text-align: center; font-family: 'Noto Serif KR', serif; font-size: 13px; color: #9d50ff;
      background: rgba(157,80,255,.08); border: 1px solid rgba(157,80,255,.25); border-radius: 12px;
      padding: 14px; line-height: 1.7;
    }

    .ai-error-box {
      text-align: center; font-size: 12.5px; color: #f87171; background: rgba(248,113,113,.08);
      border: 1px solid rgba(248,113,113,.3); border-radius: 12px; padding: 16px; margin-top: 16px;
    }
    .ai-retry-btn {
      display: block; margin: 10px auto 0; padding: 8px 18px; border-radius: 999px;
      border: 1px solid rgba(248,113,113,.4); background: transparent; color: #f87171;
      font-size: 12px; cursor: pointer;
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function ballColorClass(n) {
    if (n <= 10) return 'linear-gradient(135deg,#FBC02D,#F59E0B)';
    if (n <= 20) return 'linear-gradient(135deg,#3B82F6,#1D4ED8)';
    if (n <= 30) return 'linear-gradient(135deg,#EF4444,#B91C1C)';
    if (n <= 40) return 'linear-gradient(135deg,#22C55E,#15803D)';
    return 'linear-gradient(135deg,#9CA3AF,#4B5563)';
  }

  /**
   * 광고 시청 자리. 지금은 광고 없이 바로 통과시킵니다.
   * 나중에 실제 리워드 광고 SDK가 정해지면 이 함수 내부만 교체하면 됩니다
   * (버튼 클릭 → 이 Promise가 resolve된 뒤에만 API를 호출하는 구조는 그대로 유지).
   */
  function watchAd() {
    // TODO: 실제 광고 SDK 연동 시 여기를 리워드 광고 호출 + 시청완료 콜백으로 교체하세요.
    // 예) return new Promise((resolve, reject) => { rewardedAd.show({ onReward: resolve, onFail: reject }); });
    return Promise.resolve();
  }

  async function fetchAnalysis(type, payload) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'AI 분석을 불러오지 못했습니다.');
    return json.data;
  }

  function showFullscreenLoading(overlayEl, messages) {
    overlayEl.classList.add('is-visible');
    const textEl = overlayEl.querySelector('.ai-loading-text');
    let step = 0;
    textEl.textContent = messages[0];
    const timer = setInterval(() => {
      step += 1;
      if (step < messages.length) textEl.textContent = messages[step];
    }, 900);
    return () => { clearInterval(timer); overlayEl.classList.remove('is-visible'); };
  }

  function renderResult(container, data) {
    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'ai-result-card';
    card.innerHTML = `
      <span class="ai-badge">✨ AI 심층분석</span>
      <p class="ai-headline">${escapeHtml(data.headline || '')}</p>
      <p class="ai-summary">${escapeHtml(data.summary || '')}</p>
    `;
    container.appendChild(card);

    if (Array.isArray(data.sections) && data.sections.length) {
      const sectionsWrap = document.createElement('div');
      sectionsWrap.className = 'ai-sections';
      data.sections.forEach((s) => {
        const el = document.createElement('div');
        el.className = 'ai-section-card';
        el.innerHTML = `
          <div class="ai-section-head">
            <span class="ai-section-icon">${escapeHtml(s.icon || '✨')}</span>
            <span class="ai-section-title">${escapeHtml(s.title || '')}</span>
          </div>
          <p class="ai-section-body">${escapeHtml(s.body || '')}</p>
        `;
        sectionsWrap.appendChild(el);
      });
      container.appendChild(sectionsWrap);
    }

    const factsGrid = document.createElement('div');
    factsGrid.className = 'ai-facts-grid';
    factsGrid.innerHTML = `
      <div class="ai-fact-chip"><p class="fact-label">행운 키워드</p><p class="fact-value">${escapeHtml(data.luckyKeyword || '-')}</p></div>
      <div class="ai-fact-chip"><p class="fact-label">행운의 색</p><p class="fact-value">${escapeHtml(data.luckyColor || '-')}</p></div>
      <div class="ai-fact-chip"><p class="fact-label">행운의 시간</p><p class="fact-value">${escapeHtml(data.luckyTime || '-')}</p></div>
    `;
    container.appendChild(factsGrid);

    if (data.cautionNote) {
      const caution = document.createElement('p');
      caution.className = 'ai-caution';
      caution.innerHTML = `<b>⚠️ 오늘의 주의</b><br>${escapeHtml(data.cautionNote)}`;
      container.appendChild(caution);
    }

    if (data.funFact) {
      const fact = document.createElement('p');
      fact.className = 'ai-funfact';
      fact.innerHTML = `<b>💡 알아두면 좋은 이야기</b><br>${escapeHtml(data.funFact)}`;
      container.appendChild(fact);
    }

    if (Array.isArray(data.numbers) && data.numbers.length) {
      const numBlock = document.createElement('div');
      numBlock.className = 'ai-numbers-block';
      const numbersHtml = data.numbers.map((n) =>
        `<span class="ai-ball" style="background:${ballColorClass(n)};">${n}</span>`
      ).join('');
      numBlock.innerHTML = `<p class="ai-numbers-label">AI가 오늘의 분석으로 제안하는 번호</p><div class="ai-numbers">${numbersHtml}</div>`;
      container.appendChild(numBlock);
    }

    if (data.tomorrowTeaser) {
      const teaser = document.createElement('p');
      teaser.className = 'ai-teaser';
      teaser.textContent = `🔮 ${data.tomorrowTeaser}`;
      container.appendChild(teaser);
    }
  }

  function renderError(container, message, onRetry) {
    container.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'ai-error-box';
    box.innerHTML = `<p style="margin:0;">${escapeHtml(message || 'AI 분석을 불러오지 못했습니다.')}</p>`;
    const retryBtn = document.createElement('button');
    retryBtn.className = 'ai-retry-btn';
    retryBtn.textContent = '다시 시도';
    retryBtn.addEventListener('click', onRetry);
    box.appendChild(retryBtn);
    container.appendChild(box);
    container.classList.add('is-visible');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  /**
   * 페이지에서 이걸 한 번 호출하면 필요한 스타일이 주입되고,
   * unlockBtn 클릭 시 광고(자리) → 전체화면 로딩 → API 호출 → 결과 렌더링까지 다 처리합니다.
   *
   * @param {Object} opts
   * @param {HTMLElement} opts.unlockBtn - "AI 심층분석 보기" 버튼
   * @param {HTMLElement} opts.overlayEl - 전체화면 로딩 오버레이 요소
   * @param {HTMLElement} opts.resultContainer - 결과를 그릴 컨테이너
   * @param {string} opts.type - tarot|biorhythm|saju|gwansang
   * @param {() => Object} opts.getPayload - 호출 시점에 payload를 만들어주는 함수
   * @param {string[]} [opts.loadingMessages]
   */
  function attach(opts) {
    injectStyles();
    const {
      unlockBtn, overlayEl, resultContainer, type, getPayload,
      loadingMessages = ['광고를 확인하는 중...', 'AI가 오늘의 기운을 분석하는 중...', '결과를 정리하는 중...'],
    } = opts;

    async function run() {
      unlockBtn.disabled = true;
      let stopLoading = null;
      try {
        await watchAd();
        stopLoading = showFullscreenLoading(overlayEl, loadingMessages);
        const data = await fetchAnalysis(type, getPayload());
        stopLoading();
        renderResult(resultContainer, data);
        resultContainer.classList.add('is-visible');
        resultContainer.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        unlockBtn.style.display = 'none';
      } catch (e) {
        if (stopLoading) stopLoading();
        renderError(resultContainer, e.message, run);
        unlockBtn.disabled = false;
      }
    }

    unlockBtn.addEventListener('click', run);
  }

  window.FortuneAI = { attach, injectStyles };
})();
