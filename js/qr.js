/* ══════════════════════════════════════════════════
   js/qr.js — S25+ 멀티카메라 + 인식률 최대화
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
    fresh.style.cssText = 'width:100%;height:100%;background:#060D1A;';
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
        <div style="margin-bottom:10px;">
            <div style="font-size:10px;color:#64748B;font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:5px;padding-left:2px;">
                📷 카메라 선택
            </div>
            <div style="display:flex;align-items:center;gap:8px;background:#1A2744;border:1.5px solid rgba(255,255,255,.09);border-radius:13px;padding:10px 14px;">
                <span style="font-size:16px;flex-shrink:0;">🎥</span>
                <select id="cam-select"
                    style="flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:13px;color:#F1F5F9;cursor:pointer;"
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

/* ── 뷰파인더 실제 크기 기반 qrbox 계산 ── */
function _calcQrbox() {
    const vf = document.querySelector('.viewfinder');
    if (!vf) return { width: 280, height: 280 };
    const w = vf.clientWidth  || 300;
    const h = vf.clientHeight || 300;
    /* 짧은 변의 85%를 스캔 영역으로 */
    const size = Math.floor(Math.min(w, h) * 0.85);
    return { width: size, height: size };
}

/* ══════════════ 시작 / 정지 ══════════════ */
async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

/* 버튼 UI 상태 업데이트 */
function _setBtnState(isActive) {
    const btn = document.getElementById('cam-toggle-btn');
    if (!btn) return;
    if (isActive) {
        btn.style.cssText = [
            'width:100%','display:flex','align-items:center','justify-content:center',
            'gap:8px','padding:14px 0','border-radius:16px','cursor:pointer',
            'font-family:inherit','font-size:14px','font-weight:700',
            'border:1.5px solid rgba(239,68,68,.4)',
            'background:rgba(239,68,68,.12)','color:#EF4444',
            'margin-bottom:10px','transition:background .12s',
        ].join(';');
        btn.innerHTML = '<span style="font-size:18px;">⏹️</span><span>카메라 중지</span>';
    } else {
        btn.style.cssText = [
            'width:100%','display:flex','align-items:center','justify-content:center',
            'gap:8px','padding:14px 0','border-radius:16px','cursor:pointer',
            'font-family:inherit','font-size:14px','font-weight:700',
            'border:none','color:#fff',
            'background:linear-gradient(135deg,#3B82F6,#1D4ED8)',
            'box-shadow:0 4px 18px rgba(59,130,246,.3)',
            'margin-bottom:10px','transition:transform .12s',
        ].join(';');
        btn.innerHTML = '<span style="font-size:18px;">📷</span><span>카메라 시작하기</span>';
    }
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const placeholder = document.getElementById('qr-placeholder');
    const guide       = document.getElementById('scan-guide');
    const resultPanel = document.getElementById('qr-result-panel');

    scannedNums = [];
    if (resultPanel) resultPanel.classList.add('hidden');
    document.getElementById('qr-res-nums').innerHTML = '';

    if (statusEl) { statusEl.textContent = '⏳ 카메라 연결 중...'; statusEl.className = ''; }

    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (_) {}
        try { await html5QrCode.clear(); }              catch (_) {}
        html5QrCode = null;
    }
    camActive = false;
    _resetReaderEl();
    await _renderCameraSelector();

    /* 뷰파인더 크기 기반 qrbox — 인식률 최대화 */
    const qrbox   = _calcQrbox();
    const config  = { fps: 15, qrbox, disableFlip: false, aspectRatio: 1.0 };
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
        if (placeholder) placeholder.style.display = 'none';
        document.getElementById('reader').style.display = 'block';
        if (guide) guide.classList.add('active');

        if (statusEl) { statusEl.textContent = '🟢 QR코드를 화면 중앙에 맞춰주세요'; statusEl.className = 'ok'; }
        _setBtnState(true);

    } catch (err) {
        console.error('카메라 오류:', err);
        localStorage.removeItem(CAM_STORAGE_KEY);
        if (statusEl) { statusEl.textContent = '❌ 카메라 시작 실패: ' + (err.message || err.name); statusEl.className = 'err'; }
        camActive = false;
        _setBtnState(false);
    }
}

async function stopCamera() {
    const placeholder = document.getElementById('qr-placeholder');
    const guide       = document.getElementById('scan-guide');
    const statusEl    = document.getElementById('cam-status');

    camActive = false;

    if (html5QrCode) {
        try { await html5QrCode.stop(); }  catch (_) {}
        try { await html5QrCode.clear(); } catch (_) {}
        html5QrCode = null;
    }

    _resetReaderEl();
    document.getElementById('reader').style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (guide) guide.classList.remove('active');
    if (statusEl) { statusEl.textContent = ''; statusEl.className = ''; }
    _setBtnState(false);
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
        const allNums = [];
        /* q 다음 정확히 앞 12자리(2자리×6개)만 로또번호
           마지막 세그먼트 뒤에 쓰레기값이 붙어도 무시 */
        for (let i = 1; i < qrRawNumbers.length; i++) {
            const segment = qrRawNumbers[i];
            if (segment.length < 12) continue;
            const gameStr = segment.substring(0, 12);
            for (let j = 0; j < 12; j += 2) {
                const num = parseInt(gameStr.substring(j, j + 2), 10);
                if (num >= 1 && num <= 45) allNums.push(num);
            }
        }



        scannedNums = [...new Set(allNums)].sort((a, b) => a - b);


        const panel    = document.getElementById('qr-result-panel');
        const numsWrap = document.getElementById('qr-res-nums');
        numsWrap.innerHTML = '';
        scannedNums.forEach(n => {
            if (typeof mkBall === 'function') {
                const b = mkBall(n, 'mini-ball');
                b.style.flexShrink = '0';
                numsWrap.appendChild(b);
            }
        });
        panel.classList.remove('hidden');

        const statusEl = document.getElementById('cam-status');
        if (statusEl) { statusEl.textContent = `✅ ${scannedNums.length}개 번호 스캔 완료`; statusEl.className = 'ok'; }
        if (typeof toast === 'function') toast(`🎯 ${scannedNums.length}개 번호 인식`);

    } catch (e) {
        const statusEl = document.getElementById('cam-status');
        if (statusEl) { statusEl.textContent = '❌ ' + e.message; statusEl.className = 'err'; }
    }
}

function applyQRExclude() {
    if (!scannedNums.length) return;
    if (typeof switchTab   === 'function') switchTab('home');
    if (typeof generateAll === 'function') generateAll(scannedNums);
}

function resetQR() {
    scannedNums = [];
    document.getElementById('qr-result-panel').classList.add('hidden');
    document.getElementById('qr-res-nums').innerHTML = '';
    startCamera();
}
