/* ══════════════════════════════════════════════════
    js/qr.js — html5-qrcode 2.3.4
    S25+ 멀티카메라: camera2 번호 가장 작은 후면 선택
   ══════════════════════════════════════════════════ */

let camActive    = false;
let scannedNums  = [];
let _html5QrCode = null;

/* ─── 공통 유틸 ─── */
function _resetReaderEl() {
    const old = document.getElementById('reader');
    if (!old) return;
    const fresh = document.createElement('div');
    fresh.id = 'reader';
    fresh.style.cssText = 'width:100%;background:#000;position:relative;';
    old.parentNode.replaceChild(fresh, old);
}

function _setStatus(msg, color = 'slate') {
    const el = document.getElementById('cam-status');
    if (!el) return;
    el.textContent = msg;
    el.className = `text-center text-[13px] text-${color}-500 mb-3 min-h-[20px]`;
}

function _setBtnStop() {
    const btn = document.getElementById('cam-toggle-btn');
    if (!btn) return;
    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-500 cursor-pointer mb-3 transition-all';
    btn.innerHTML = '<span class="material-symbols-rounded">stop_circle</span><span>카메라 중지</span>';
    btn.onclick = toggleCamera;
}

function _setBtnStart() {
    const btn = document.getElementById('cam-toggle-btn');
    if (!btn) return;
    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200 transition-all hover:bg-blue-700';
    btn.innerHTML = '<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>';
    btn.onclick = toggleCamera;
}

/* ─── 카카오 인앱 브라우저 감지 ─── */
// S25+ 크롬 UA에도 kakaotalk이 포함될 수 있어서
// 카카오 인앱브라우저 전용 키워드로 정확히 감지
function _isKakaoInApp() {
    const ua = navigator.userAgent;
    // KAKAOTALK 앱 내 WebView는 'KAKAOTALK' 대문자 포함
    // 삼성 크롬은 포함 안 함
    return /KAKAOTALK/i.test(ua) && !/Chrome\/[0-9]/.test(ua);
}

function _openExternal() {
    const url = location.href;
    location.href = 'intent://' + url.replace(/https?:\/\//, '')
        + '#Intent;scheme=https;package=com.android.chrome;end';
}

/* ══════════════════════════════════════════════════
    후면 기본 카메라 선택
    
    S25+ 카메라 구조:
    - "camera2 N, facing back" 에서 N이 가장 작은 것 = 기본 1x
    - "camera2 0, facing back" → 기본 후면
    - "camera2 2, facing back" → 광각 또는 망원
    
    선택 우선순위:
    1. "facing back" + camera2 번호가 가장 작은 것
    2. "back"/"rear" 키워드 포함된 것
    3. 전면 제외 첫 번째
   ══════════════════════════════════════════════════ */
function _selectCamera(cameras) {
    if (!cameras || cameras.length === 0) return null;

    const backCams = cameras.filter(c => {
        const label = (c.label || '').toLowerCase();
        return label.includes('facing back') || label.includes('back') ||
               label.includes('rear') || label.includes('후면');
    });

    if (backCams.length === 0) {
        // 후면 없으면 전면 제외 첫 번째
        const nonFront = cameras.find(c => {
            const label = (c.label || '').toLowerCase();
            return !label.includes('front') && !label.includes('전면') && !label.includes('user');
        });
        return nonFront ? nonFront.id : cameras[0].id;
    }

    if (backCams.length === 1) return backCams[0].id;

    // 후면이 여러 개면 → camera2 N 에서 N이 가장 작은 것 선택
    let bestCam  = backCams[0];
    let bestNum  = Infinity;

    for (const c of backCams) {
        const match = (c.label || '').match(/camera2\s+(\d+)/i);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num < bestNum) {
                bestNum = num;
                bestCam = c;
            }
        }
    }

    return bestCam.id;
}

/* ─── 토글 ─── */
async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

/* ══════════════════════════════════════════════════
    startCamera
   ══════════════════════════════════════════════════ */
async function startCamera() {
    _setStatus('카메라 연결 중...');
    await stopCamera(true);
    _resetReaderEl();

    const placeholder = document.getElementById('qr-placeholder');

    /* ── 카카오 인앱 브라우저 → 크롬으로 유도 ── */
    if (_isKakaoInApp()) {
        _setStatus('카카오 브라우저에서는 카메라가 제한됩니다.', 'red');
        const btn = document.getElementById('cam-toggle-btn');
        if (btn) {
            btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-orange-500 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md transition-all hover:bg-orange-600';
            btn.innerHTML = '<span class="material-symbols-rounded">open_in_new</span><span>크롬으로 열기</span>';
            btn.onclick = _openExternal;
        }
        return;
    }

    try {
        const cameras  = await Html5Qrcode.getCameras();
        const cameraId = _selectCamera(cameras);

        if (!cameraId) {
            _setStatus('카메라를 찾을 수 없습니다.', 'red');
            return;
        }

        const selected = cameras.find(c => c.id === cameraId);
        _setStatus('카메라: ' + (selected ? selected.label.substring(0, 30) : ''), 'slate');

        _html5QrCode = new Html5Qrcode('reader');

        alert('선택카메라: ' + (selected ? selected.label : cameraId));

        await _html5QrCode.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                disableFlip: false
            },
            (decodedText) => handleQRResult(decodedText)
        );

        camActive = true;
        if (placeholder) placeholder.style.display = 'none';
        document.getElementById('reader').style.display = 'block';

        _setStatus('QR코드를 화면 중앙에 맞춰주세요', 'green');
        _setBtnStop();

    } catch (err) {
        console.error('카메라 시작 오류:', err);
        camActive = false;

        if (err.name === 'NotAllowedError') {
            _setStatus('카메라 권한이 거부되었습니다. 브라우저 설정 > 사이트 설정 > 카메라에서 허용해주세요.', 'red');
        } else if (err.name === 'NotFoundError') {
            _setStatus('카메라를 찾을 수 없습니다.', 'red');
        } else {
            _setStatus('카메라 시작 실패: ' + (err.message || err.name), 'red');
        }
    }
}

/* ─── stopCamera ─── */
async function stopCamera(silent = false) {
    camActive = false;

    if (_html5QrCode) {
        try { await _html5QrCode.stop(); } catch (_) {}
        try { await _html5QrCode.clear(); } catch (_) {}
        _html5QrCode = null;
    }

    if (!silent) {
        _resetReaderEl();
        const placeholder = document.getElementById('qr-placeholder');
        const reader      = document.getElementById('reader');
        if (reader)      reader.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
        _setStatus('');
        _setBtnStart();
    }
}

/* ─── QR 결과 처리 ─── */
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

        if (allNums.length === 0) throw new Error('번호를 읽을 수 없습니다.');

        scannedNums = [...new Set(allNums)].sort((a, b) => a - b);

        const panel    = document.getElementById('qr-result-panel');
        const numsWrap = document.getElementById('qr-res-nums');

        numsWrap.innerHTML = '';
        scannedNums.forEach(n => {
            if (typeof mkBall === 'function') numsWrap.appendChild(mkBall(n, 'mini-ball'));
        });

        panel.classList.remove('hidden');
        _setStatus(scannedNums.length + '개 번호 스캔 완료', 'green');
        if (typeof toast === 'function') toast(scannedNums.length + '개 번호 인식');

    } catch (e) {
        _setStatus(e.message, 'red');
    }
}

/* ─── 외부 연동 ─── */
function applyQRExclude() {
    if (!scannedNums.length) return;
    if (typeof switchTab === 'function') switchTab('home');
    if (typeof generateAll === 'function') generateAll(scannedNums);
}

function resetQR() {
    scannedNums = [];
    document.getElementById('qr-result-panel').classList.add('hidden');
    startCamera();
}
