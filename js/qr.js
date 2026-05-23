/* ══════════════════════════════════════════════════
    js/qr.js — 다크 테마 + S25+ 멀티카메라 수동 선택
   ══════════════════════════════════════════════════ */

let html5QrCode = null;
let camActive   = false;
let scannedNums = [];
let cameraList  = [];

const CAM_STORAGE_KEY = 'lotto_working_camera_id';

function _resetReaderEl() {
    const old = document.getElementById('reader');
    if (!old) return;
    const fresh = document.createElement('div');
    fresh.id    = 'reader';
    fresh.style.width = '100%';
    fresh.style.backgroundColor = '#060D1A';
    old.parentNode.replaceChild(fresh, old);
}

function _camEmoji(label) {
    const l = (label || '').toLowerCase();
    if (l.includes('front') || l.includes('전면') || l.includes('user')) return '🤳';
    if (l.includes('tele')  || l.includes('망원'))                        return '🔭';
    if (l.includes('wide')  || l.includes('ultra') || l.includes('초광각')) return '🌐';
    return '📸';
}

async function _renderCameraSelector() {
    const wrap = document.getElementById('cam-selector-wrap');
    if (!wrap) return;

    try { cameraList = await Html5Qrcode.getCameras(); }
    catch (_) { cameraList = []; }

    if (!cameraList || cameraList.length <= 1) { wrap.innerHTML = ''; return; }

    const savedId = localStorage.getItem(CAM_STORAGE_KEY);
    const options = cameraList.map((c, i) => {
        const label    = c.label || `카메라 ${i + 1}`;
        const emoji    = _camEmoji(label);
        const selected = c.id === savedId ? 'selected' : '';
        return `<option value="${c.id}" ${selected}>${emoji} ${label}</option>`;
    }).join('');

    wrap.innerHTML = `
        <div style="margin-bottom:12px;">
            <div class="cam-selector-label">📷 카메라 선택</div>
            <div class="cam-selector-inner">
                <span style="font-size:18px;flex-shrink:0;">🎥</span>
                <select id="cam-select"
                    style="flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:13px;color:var(--text);cursor:pointer;"
                    onchange="onCameraChange(this.value)">
                    ${options}
                </select>
            </div>
        </div>`;

    if (!savedId) {
        const backCam = cameraList.find(c =>
            (c.label || '').toLowerCase().match(/back|rear|후면|environment/)
        );
        if (backCam) {
            const sel = document.getElementById('cam-select');
            if (sel) sel.value = backCam.id;
        }
    }
}

async function onCameraChange(newId) {
    localStorage.setItem(CAM_STORAGE_KEY, newId);
    if (camActive) { await stopCamera(); await startCamera(); }
}

function _getSelectedCameraId() {
    const sel = document.getElementById('cam-select');
    if (sel && sel.value) return sel.value;
    return localStorage.getItem(CAM_STORAGE_KEY) || null;
}

function _getSortedBackList() {
    if (!cameraList.length) return [];
    const savedId  = _getSelectedCameraId();
    const saved    = cameraList.find(c => c.id === savedId);
    const backCams = cameraList.filter(c =>
        (c.label || '').toLowerCase().match(/back|rear|후면/)
    );
    backCams.sort((a, b) => {
        const ma = (a.label || '').match(/camera2\s+(\d+)/i);
        const mb = (b.label || '').match(/camera2\s+(\d+)/i);
        return (ma ? parseInt(ma[1]) : 999) - (mb ? parseInt(mb[1]) : 999);
    });
    if (saved) return [saved, ...backCams.filter(c => c.id !== saved.id)];
    return backCams.length > 0 ? backCams : cameraList;
}

/* ═══ 시작 / 정지 ═══ */
async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const btn         = document.getElementById('cam-toggle-btn');
    const placeholder = document.getElementById('qr-placeholder');
    const guide       = document.getElementById('scan-guide');
    const resultPanel = document.getElementById('qr-result-panel');

    scannedNums = [];
    if (resultPanel) resultPanel.style.display = 'none';
    document.getElementById('qr-res-nums').innerHTML = '';

    statusEl.textContent = '⏳ 카메라 연결 중...';
    statusEl.className   = '';

    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (_) {}
        try { await html5QrCode.clear(); }              catch (_) {}
        html5QrCode = null;
    }
    camActive = false;
    _resetReaderEl();

    await _renderCameraSelector();

    const config    = { fps: 10, qrbox: { width: 220, height: 220 }, disableFlip: false };
    const onSuccess = (decodedText) => handleQRResult(decodedText);

    try {
        html5QrCode      = new Html5Qrcode('reader');
        const selectedId = _getSelectedCameraId();
        let started      = false;

        if (selectedId) {
            try {
                await html5QrCode.start({ deviceId: { exact: selectedId } }, config, onSuccess);
                localStorage.setItem(CAM_STORAGE_KEY, selectedId);
                started = true;
            } catch (_) {}
        }

        if (!started) {
            for (const cam of _getSortedBackList()) {
                if (cam.id === selectedId) continue;
                try {
                    await html5QrCode.start({ deviceId: { exact: cam.id } }, config, onSuccess);
                    localStorage.setItem(CAM_STORAGE_KEY, cam.id);
                    const sel = document.getElementById('cam-select');
                    if (sel) sel.value = cam.id;
                    started = true; break;
                } catch (_) {}
            }
        }

        if (!started) {
            await html5QrCode.start({ facingMode: 'environment' }, config, onSuccess);
        }

        camActive = true;
        placeholder.style.display = 'none';
        document.getElementById('reader').style.display = 'block';
        if (guide) guide.classList.add('active');

        statusEl.textContent = '🟢 QR코드를 네모 안에 맞춰주세요';
        statusEl.className   = 'ok';

        btn.className = 'btn-cam-stop';
        btn.innerHTML = '<span style="font-size:20px">⏹️</span><span>카메라 중지</span>';

    } catch (err) {
        console.error('카메라 오류:', err);
        localStorage.removeItem(CAM_STORAGE_KEY);
        statusEl.textContent = '❌ 카메라 시작 실패: ' + (err.message || err.name);
        statusEl.className   = 'err';
        camActive = false;
    }
}

async function stopCamera() {
    const btn         = document.getElementById('cam-toggle-btn');
    const statusEl    = document.getElementById('cam-status');
    const placeholder = document.getElementById('qr-placeholder');
    const guide       = document.getElementById('scan-guide');

    camActive = false;

    if (html5QrCode) {
        try { await html5QrCode.stop(); }  catch (_) {}
        try { await html5QrCode.clear(); } catch (_) {}
        html5QrCode = null;
    }

    _resetReaderEl();
    document.getElementById('reader').style.display = 'none';
    placeholder.style.display = 'flex';
    if (guide) guide.classList.remove('active');

    statusEl.textContent = '';
    statusEl.className   = '';

    btn.className = 'btn-cam-start';
    btn.innerHTML = '<span style="font-size:20px">📷</span><span>카메라 시작하기</span>';
}

/* ═══ QR 결과 ═══ */
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
        panel.style.display = 'block';

        const statusEl = document.getElementById('cam-status');
        statusEl.textContent = `✅ ${scannedNums.length}개 번호 스캔 완료`;
        statusEl.className   = 'ok';

        if (typeof toast === 'function') toast(`🎯 ${scannedNums.length}개 번호 인식`);

    } catch (e) {
        const statusEl = document.getElementById('cam-status');
        statusEl.textContent = '❌ ' + e.message;
        statusEl.className   = 'err';
    }
}

function applyQRExclude() {
    if (!scannedNums.length) return;
    if (typeof switchTab   === 'function') switchTab('home');
    if (typeof generateAll === 'function') generateAll(scannedNums);
}

function resetQR() {
    scannedNums = [];
    document.getElementById('qr-result-panel').style.display = 'none';
    document.getElementById('qr-res-nums').innerHTML = '';
    startCamera();
}
