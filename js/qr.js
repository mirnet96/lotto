/* ══════════════════════════════════════════════════
    js/qr.js — 카메라 수동 선택 + 자동 시도 병행
   ══════════════════════════════════════════════════ */

let html5QrCode = null;
let camActive   = false;
let scannedNums = [];
let cameraList  = [];

const CAM_STORAGE_KEY = 'lotto_working_camera_id';

/* ── reader DOM 초기화 ── */
function _resetReaderEl() {
    const old = document.getElementById('reader');
    if (!old) return;
    const fresh = document.createElement('div');
    fresh.id    = 'reader';
    fresh.style.width           = '100%';
    fresh.style.backgroundColor = '#000';
    old.parentNode.replaceChild(fresh, old);
}

/* ── 카메라 선택 드롭다운 렌더링 ── */
async function _renderCameraSelector() {
    const wrap = document.getElementById('cam-selector-wrap');
    if (!wrap) return;

    try {
        cameraList = await Html5Qrcode.getCameras();
    } catch (_) {
        cameraList = [];
    }

    if (!cameraList || cameraList.length <= 1) {
        wrap.innerHTML = '';   // 카메라 1개 이하면 숨김
        return;
    }

    const savedId = localStorage.getItem(CAM_STORAGE_KEY);

    let options = cameraList.map((c, i) => {
        const label    = c.label || `카메라 ${i + 1}`;
        const selected = c.id === savedId ? 'selected' : '';
        return `<option value="${c.id}" ${selected}>${label}</option>`;
    }).join('');

    wrap.innerHTML = `
        <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 mb-2.5 shadow-card">
            <span class="material-symbols-rounded text-[18px] text-slate-400 flex-shrink-0">videocam</span>
            <select id="cam-select"
                class="flex-1 bg-transparent text-[13px] text-slate-700 outline-none cursor-pointer"
                onchange="onCameraChange(this.value)">
                ${options}
            </select>
        </div>`;

    /* 저장된 값 없으면 후면 카메라 자동 선택 */
    if (!savedId) {
        const backCam = cameraList.find(c =>
            (c.label || '').toLowerCase().match(/back|rear|후면|environment/)
        );
        if (backCam) {
            document.getElementById('cam-select').value = backCam.id;
        }
    }
}

/* 드롭다운 변경 시: 카메라 재시작 */
async function onCameraChange(newId) {
    localStorage.setItem(CAM_STORAGE_KEY, newId);
    if (camActive) {
        await stopCamera();
        await startCamera();
    }
}

/* ── 선택된 카메라 ID 반환 ── */
function _getSelectedCameraId() {
    const sel = document.getElementById('cam-select');
    if (sel && sel.value) return sel.value;
    return localStorage.getItem(CAM_STORAGE_KEY) || null;
}

/* ── 후면 카메라 후보 순서 정렬 ── */
function _getSortedBackList() {
    if (!cameraList.length) return [];

    const savedId = _getSelectedCameraId();
    const saved   = cameraList.find(c => c.id === savedId);

    const backCams = cameraList.filter(c =>
        (c.label || '').toLowerCase().match(/back|rear|후면/)
    );

    backCams.sort((a, b) => {
        const ma = (a.label || '').match(/camera2\s+(\d+)/i);
        const mb = (b.label || '').match(/camera2\s+(\d+)/i);
        return (ma ? parseInt(ma[1]) : 999) - (mb ? parseInt(mb[1]) : 999);
    });

    if (saved) {
        const rest = backCams.filter(c => c.id !== saved.id);
        return [saved, ...rest];
    }
    return backCams.length > 0 ? backCams : cameraList;
}

/* ══════════════ 카메라 시작/정지 ══════════════ */
async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const btn         = document.getElementById('cam-toggle-btn');
    const placeholder = document.getElementById('qr-placeholder');

    /* 이전 결과 초기화 */
    scannedNums = [];
    document.getElementById('qr-result-panel').classList.add('hidden');
    document.getElementById('qr-res-nums').innerHTML = '';

    statusEl.textContent = '카메라 연결 중...';
    statusEl.className   = 'text-center text-[13px] text-slate-400 mb-3 min-h-[20px]';

    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (_) {}
        try { await html5QrCode.clear(); }              catch (_) {}
        html5QrCode = null;
    }
    camActive = false;

    _resetReaderEl();

    /* 카메라 목록 렌더 (최초 1회) */
    await _renderCameraSelector();

    const config    = { fps: 10, qrbox: { width: 250, height: 250 }, disableFlip: false };
    const onSuccess = (decodedText) => handleQRResult(decodedText);

    try {
        html5QrCode = new Html5Qrcode('reader');

        const selectedId = _getSelectedCameraId();
        let started      = false;

        /* 1순위: 드롭다운에서 선택한 카메라 */
        if (selectedId) {
            try {
                await html5QrCode.start(
                    { deviceId: { exact: selectedId } },
                    config, onSuccess
                );
                localStorage.setItem(CAM_STORAGE_KEY, selectedId);
                started = true;
            } catch (_) {}
        }

        /* 2순위: 후면 카메라 순차 시도 */
        if (!started) {
            for (const cam of _getSortedBackList()) {
                if (cam.id === selectedId) continue;  // 이미 시도함
                try {
                    await html5QrCode.start(
                        { deviceId: { exact: cam.id } },
                        config, onSuccess
                    );
                    localStorage.setItem(CAM_STORAGE_KEY, cam.id);
                    /* 성공한 카메라를 드롭다운에도 반영 */
                    const sel = document.getElementById('cam-select');
                    if (sel) sel.value = cam.id;
                    started = true;
                    break;
                } catch (_) {}
            }
        }

        /* 3순위: facingMode 폴백 */
        if (!started) {
            await html5QrCode.start(
                { facingMode: 'environment' },
                config, onSuccess
            );
            started = true;
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
        localStorage.removeItem(CAM_STORAGE_KEY);
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
        try { await html5QrCode.stop(); } catch (_) {}
        try { await html5QrCode.clear(); } catch (_) {}
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

/* ══════════════ QR 결과 처리 ══════════════ */
function handleQRResult(data) {
    if (!camActive) return;
    camActive = false;

    if (navigator.vibrate) navigator.vibrate([100, 50, 300]);
    stopCamera();

    try {
        const urlParts = data.split('v=');
        if (urlParts.length < 2) throw new Error('로또 QR 형식이 아닙니다.');

        const qrRawNumbers = urlParts[1].split('q');
        const allNums      = [];

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
