/* ══════════════════════════════════════════════════
   js/qr.js — QR 카메라 스캔 (html5-qrcode)

   핵심 구조:
   · html5-qrcode는 clear() 후 동일 id div 재사용 불가
     → stopCamera 시 reader div 자체를 새 div로 교체
   · 인식률: fps 15, qrbox 화면 70%, aspectRatio 제거
   ══════════════════════════════════════════════════ */

let html5QrCode = null;
let camActive   = false;
let scannedNums = [];

/* reader div를 새 div로 교체 — 라이브러리 내부 잔여 상태 완전 제거 */
function _resetReaderEl() {
    const old = document.getElementById('reader');
    if (!old) return;
    const fresh = document.createElement('div');
    fresh.id = 'reader';
    old.parentNode.replaceChild(fresh, old);
}

async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const btn         = document.getElementById('cam-toggle-btn');
    const placeholder = document.getElementById('qr-placeholder');

    statusEl.textContent = '카메라 준비 중...';
    statusEl.className   = 'text-center text-[13px] text-slate-400 mb-3 min-h-[20px]';

    /* 혹시 남은 인스턴스 정리 */
    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (_) {}
        try { await html5QrCode.clear(); }              catch (_) {}
        html5QrCode = null;
        camActive   = false;
    }

    /* reader div 교체 (라이브러리 내부 DOM 잔여물 완전 제거) */
    _resetReaderEl();

    try {
        /* 뷰포트 기준 qrbox 크기 계산 */
        const vw      = Math.min(window.innerWidth, 560);
        const boxSize = Math.floor(vw * 0.70);

        html5QrCode = new Html5Qrcode('reader', { verbose: false });

        await html5QrCode.start(
            { facingMode: 'environment' },
            {
                fps: 15,
                qrbox: { width: boxSize, height: boxSize },
                disableFlip: false,
                formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
            },
            (decodedText) => handleQRResult(decodedText)
        );

        camActive = true;
        placeholder.style.display = 'none';
        document.getElementById('reader').style.display = 'block';

        statusEl.textContent = 'QR코드를 사각형 안에 맞춰주세요';
        statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
        btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-500 cursor-pointer mb-3 transition-all';
        btn.innerHTML = '<span class="material-symbols-rounded">stop_circle</span><span>카메라 중지</span>';

    } catch (err) {
        console.error('startCamera 실패:', err);
        statusEl.textContent = '카메라를 시작할 수 없습니다. 권한을 확인해 주세요.';
        statusEl.className   = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
        try { if (html5QrCode) await html5QrCode.clear(); } catch (_) {}
        html5QrCode = null;
        camActive   = false;
    }
}

async function stopCamera() {
    const btn         = document.getElementById('cam-toggle-btn');
    const statusEl    = document.getElementById('cam-status');
    const placeholder = document.getElementById('qr-placeholder');

    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (e) { console.warn('stop 실패:', e); }
        try { await html5QrCode.clear(); }              catch (e) { console.warn('clear 실패:', e); }
        html5QrCode = null;
    }
    camActive = false;

    /* reader div 교체 — 다음 startCamera를 위해 깨끗한 div 준비 */
    _resetReaderEl();
    document.getElementById('reader').style.display = 'none';
    placeholder.style.display = 'flex';

    if (statusEl) statusEl.textContent = '';
    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200 transition-all hover:bg-blue-700';
    btn.innerHTML = '<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>';
}

function handleQRResult(data) {
    if (navigator.vibrate) navigator.vibrate(100);

    /* 스캔 콜백 중복 발화 방지 */
    if (!camActive) return;
    stopCamera();

    const urlParts = data.split('v=');
    if (urlParts.length < 2) { showQRError('올바른 로또 QR 형식이 아닙니다.'); return; }

    const qrRawNumbers = urlParts[1].split('q');
    const allNums = [];
    for (let i = 1; i < qrRawNumbers.length; i++) {
        const gameStr = qrRawNumbers[i];
        for (let j = 0; j < gameStr.length; j += 2) {
            const num = parseInt(gameStr.substring(j, j + 2), 10);
            if (num >= 1 && num <= 45) allNums.push(num);
        }
    }
    if (!allNums.length) { showQRError('유효한 번호를 찾지 못했습니다.'); return; }

    scannedNums = [...new Set(allNums)].sort((a, b) => a - b);

    const panel    = document.getElementById('qr-result-panel');
    const numsWrap = document.getElementById('qr-res-nums');
    const statusEl = document.getElementById('cam-status');

    numsWrap.innerHTML = '';
    scannedNums.forEach(n => numsWrap.appendChild(mkBall(n, 'mini-ball')));
    panel.classList.remove('hidden');
    statusEl.textContent = scannedNums.length + '개 번호 스캔 완료';
    statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
    toast(scannedNums.length + '개 번호 인식됨');
}

function showQRError(msg) {
    const statusEl = document.getElementById('cam-status');
    statusEl.textContent = msg;
    statusEl.className   = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
}

function applyQRExclude() {
    if (!scannedNums.length) return;
    switchTab('home');
    generateAll(scannedNums);
    toast('스캔된 번호 제외 후 생성 완료');
}

function resetQR() {
    scannedNums = [];
    document.getElementById('qr-result-panel').classList.add('hidden');
    document.getElementById('cam-status').textContent = '';
    startCamera();
}
