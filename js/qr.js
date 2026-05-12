/* ══════════════════════════════════════════════════
   js/qr.js — QR 카메라 스캔 (html5-qrcode)
   ══════════════════════════════════════════════════ */

let html5QrCode = null;
let camActive   = false;
let scannedNums = [];

async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const btn         = document.getElementById('cam-toggle-btn');
    const placeholder = document.getElementById('qr-placeholder');
    const readerEl    = document.getElementById('reader');

    statusEl.textContent = '카메라 준비 중...';
    statusEl.className   = 'text-center text-[13px] text-slate-400 mb-3 min-h-[20px]';

    try {
        /* 이전 인스턴스 완전 정리 */
        if (html5QrCode) {
            try {
                if (camActive) await html5QrCode.stop();
                await html5QrCode.clear();
            } catch (_) { /* 무시 */ }
            html5QrCode = null;
            camActive   = false;
        }

        /* reader div 초기화 (이전 video/canvas 제거) */
        readerEl.innerHTML = '';

        html5QrCode = new Html5Qrcode('reader');
        await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            (decodedText) => handleQRResult(decodedText)
        );

        camActive = true;
        placeholder.style.display = 'none';
        readerEl.style.display    = 'block';
        statusEl.textContent = 'QR코드를 사각형 안에 맞춰주세요';
        statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
        btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-500 cursor-pointer mb-3 transition-all';
        btn.innerHTML = `<span class="material-symbols-rounded">stop_circle</span><span>카메라 중지</span>`;
    } catch (err) {
        console.error(err);
        statusEl.textContent = '카메라를 시작할 수 없습니다. 권한을 확인해 주세요.';
        statusEl.className   = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
        if (html5QrCode) {
            try { await html5QrCode.clear(); } catch (_) {}
            html5QrCode = null;
        }
        camActive = false;
    }
}

async function stopCamera() {
    const btn         = document.getElementById('cam-toggle-btn');
    const statusEl    = document.getElementById('cam-status');
    const placeholder = document.getElementById('qr-placeholder');
    const readerEl    = document.getElementById('reader');

    if (html5QrCode) {
        try {
            if (camActive) await html5QrCode.stop();
            await html5QrCode.clear();
        } catch (err) { console.error('카메라 중지 실패', err); }
        html5QrCode = null;
    }
    camActive = false;

    readerEl.innerHTML        = '';
    readerEl.style.display    = 'none';
    placeholder.style.display = 'flex';
    statusEl.textContent      = '';
    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200 transition-all hover:bg-blue-700';
    btn.innerHTML = `<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>`;
}

function handleQRResult(data) {
    if (navigator.vibrate) navigator.vibrate(100);
    stopCamera();

    const urlParts = data.split('v=');
    if (urlParts.length < 2) { showQRError('올바른 로또 QR 형식이 아닙니다.'); return; }

    const qrRawNumbers = urlParts[1].split('q');
    let allNums = [];
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
    statusEl.textContent = `${scannedNums.length}개 번호 스캔 완료`;
    statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
    toast(`${scannedNums.length}개 번호 인식됨`);
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
