/* ══════════════════════════════════════════════════
    js/qr.js — 원본 복귀 + S25+ 패치 + 재스캔 초기화 수정
   ══════════════════════════════════════════════════ */

let html5QrCode = null;
let camActive   = false;
let scannedNums = [];

function _resetReaderEl() {
    const old = document.getElementById('reader');
    if (!old) return;
    const fresh = document.createElement('div');
    fresh.id = 'reader';
    fresh.style.width = "100%";
    fresh.style.backgroundColor = "#000";
    old.parentNode.replaceChild(fresh, old);
}

async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

/* ── S25+ 멀티카메라: camera2 번호 가장 작은 후면 선택 ── */
async function _getBackCameraId() {
    try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) return null;

        const backCams = cameras.filter(c =>
            (c.label || '').toLowerCase().includes('back')
        );
        if (backCams.length === 0) return null;
        if (backCams.length === 1) return backCams[0].id;

        let best    = backCams[0];
        let bestNum = Infinity;
        for (const c of backCams) {
            const m = (c.label || '').match(/camera2\s+(\d+)/i);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n < bestNum) { bestNum = n; best = c; }
            }
        }
        return best.id;
    } catch (_) {
        return null;
    }
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const btn         = document.getElementById('cam-toggle-btn');
    const placeholder = document.getElementById('qr-placeholder');

    /* ── 재스캔 시 이전 결과 완전 초기화 ── */
    scannedNums = [];
    document.getElementById('qr-result-panel').classList.add('hidden');
    document.getElementById('qr-res-nums').innerHTML = '';

    statusEl.textContent = '카메라 연결 중...';
    statusEl.className   = 'text-center text-[13px] text-slate-400 mb-3 min-h-[20px]';

    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (_) {}
        try { await html5QrCode.clear(); } catch (_) {}
        html5QrCode = null;
    }
    camActive = false;

    _resetReaderEl();

    try {
        html5QrCode = new Html5Qrcode('reader');

        const cameraId = await _getBackCameraId();

        if (cameraId) {
            await html5QrCode.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    disableFlip: false
                },
                (decodedText) => handleQRResult(decodedText)
            );
        } else {
            await html5QrCode.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    disableFlip: false
                },
                (decodedText) => handleQRResult(decodedText)
            );
        }

        camActive = true;
        placeholder.style.display = 'none';
        document.getElementById('reader').style.display = 'block';

        statusEl.textContent = 'QR코드를 화면 중앙에 맞춰주세요';
        statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';

        btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-500 cursor-pointer mb-3 transition-all';
        btn.innerHTML = '<span class="material-symbols-rounded">stop_circle</span><span>카메라 중지</span>';

    } catch (err) {
        console.error('카메라 오류:', err);
        statusEl.textContent = '카메라 시작 실패: ' + (err.message || err.name);
        statusEl.className   = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
        camActive = false;
    }
}

async function stopCamera() {
    const btn         = document.getElementById('cam-toggle-btn');
    const statusEl    = document.getElementById('cam-status');
    const placeholder = document.getElementById('qr-placeholder');

    camActive = false;

    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch (e) {}
        try { await html5QrCode.clear(); } catch (e) {}
        html5QrCode = null;
    }

    _resetReaderEl();
    document.getElementById('reader').style.display = 'none';
    placeholder.style.display = 'flex';

    statusEl.textContent = '';
    statusEl.className   = 'text-center text-[13px] text-slate-400 mb-3 min-h-[20px]';

    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200 transition-all hover:bg-blue-700';
    btn.innerHTML = '<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>';
}

function handleQRResult(data) {
    if (!camActive) return;
    camActive = false;

    if (navigator.vibrate) navigator.vibrate([100, 50, 300]);

    stopCamera();

    try {
        const urlParts = data.split('v=');
        if (urlParts.length < 2) throw new Error('로또 QR 형식이 아닙니다.');

        const qrRawNumbers = urlParts[1].split('q');
        const allNums = [];

        for (let i = 1; i < qrRawNumbers.length; i++) {
            const gameStr = qrRawNumbers[i];
            for (let j = 0; j < gameStr.length; j += 2) {
                const num = parseInt(gameStr.substring(j, j + 2), 10);
                if (num >= 1 && num <= 45) allNums.push(num);
            }
        }

        scannedNums = [...new Set(allNums)].sort((a, b) => a - b);

        const panel    = document.getElementById('qr-result-panel');
        const numsWrap = document.getElementById('qr-res-nums');

        numsWrap.innerHTML = '';
        scannedNums.forEach(n => {
            if (typeof mkBall === 'function') numsWrap.appendChild(mkBall(n, 'mini-ball'));
        });

        panel.classList.remove('hidden');

        const statusEl = document.getElementById('cam-status');
        statusEl.textContent = scannedNums.length + '개 번호 스캔 완료';
        statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';

        if (typeof toast === 'function') toast(scannedNums.length + '개 번호 인식');

    } catch (e) {
        const statusEl = document.getElementById('cam-status');
        statusEl.textContent = e.message;
        statusEl.className   = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
    }
}

function applyQRExclude() {
    if (!scannedNums.length) return;
    if (typeof switchTab === 'function') switchTab('home');
    if (typeof generateAll === 'function') generateAll(scannedNums);
}

function resetQR() {
    scannedNums = [];
    document.getElementById('qr-result-panel').classList.add('hidden');
    document.getElementById('qr-res-nums').innerHTML = '';
    startCamera();
}
