/* ══════════════════════════════════════════════════
    js/qr.js — 범용 기기 대응 버전 (S8 ~ S25+)
    - 구형 기기의 MediaConstraints 호환성 해결
    - 최신 기기의 렌즈 선택 및 초점 로직 포함
   ══════════════════════════════════════════════════ */

let camActive   = false;
let scannedNums = [];
let _codeReader = null;

/* ─── 공통 유틸 ─── */
function _resetReaderEl() {
    const old = document.getElementById('reader');
    if (!old) return;
    const fresh = document.createElement('div');
    fresh.id = 'reader';
    fresh.style.cssText = 'width:100%;background:#000;position:relative;overflow:hidden;border-radius:12px;aspect-ratio: 1/1;';
    old.parentNode.replaceChild(fresh, old);
}

function _setStatus(msg, color = 'slate') {
    const el = document.getElementById('cam-status');
    if (!el) return;
    el.textContent = msg;
    const colorMap = { 'slate': 'text-slate-500', 'red': 'text-red-500', 'green': 'text-green-500', 'blue': 'text-blue-500' };
    el.className = `text-center text-[13px] ${colorMap[color] || 'text-slate-500'} mb-3 min-h-[20px] font-medium`;
}

function _setBtnStop() {
    const btn = document.getElementById('cam-toggle-btn');
    if (!btn) return;
    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-500 cursor-pointer mb-3';
    btn.innerHTML = '<span class="material-symbols-rounded">stop_circle</span><span>카메라 중지</span>';
    btn.onclick = toggleCamera;
}

function _setBtnStart() {
    const btn = document.getElementById('cam-toggle-btn');
    if (!btn) return;
    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200';
    btn.innerHTML = '<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>';
    btn.onclick = toggleCamera;
}

function _isKakaoInApp() { return /kakaotalk/i.test(navigator.userAgent); }
function _openExternal() { location.href = 'intent://' + location.href.replace(/https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end'; }

async function toggleCamera() { camActive ? await stopCamera() : await startCamera(); }

/* ══════════════════════════════════════════════════
    startCamera — S8/S25+ 통합 호환 로직
   ══════════════════════════════════════════════════ */
async function startCamera() {
    _setStatus('카메라 초기화 중...', 'blue');
    await stopCamera(true);
    _resetReaderEl();

    if (_isKakaoInApp()) {
        _setStatus('크롬 브라우저를 사용해주세요.', 'red');
        _setBtnStart(); // 버튼 복구
        return;
    }

    try {
        const readerEl = document.getElementById('reader');
        const video = document.createElement('video');
        video.id = 'qr-video';
        video.setAttribute('playsinline', 'true'); // iOS/구형 안드로이드 필수
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        readerEl.appendChild(video);

        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.QR_CODE]);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

        _codeReader = new ZXing.BrowserMultiFormatReader(hints);

        // 1. 카메라 장치 목록 가져오기
        const devices = await _codeReader.listVideoInputDevices();
        if (!devices || devices.length === 0) throw new Error('NotFoundError');

        // 2. 최적의 후면 카메라(광각) 찾기
        let selectedDeviceId = devices[devices.length - 1].deviceId; // 기본값은 마지막 장치
        for (const device of devices) {
            const label = device.label.toLowerCase();
            if ((label.includes('back') || label.includes('rear') || label.includes('wide')) && !label.includes('ultra')) {
                selectedDeviceId = device.deviceId;
                break;
            }
        }

        // 3. 비디오 제약 조건 설정 (S8 호환성을 위해 구조 단순화)
        const constraints = {
            video: {
                deviceId: { exact: selectedDeviceId },
                facingMode: 'environment'
            }
        };

        // 4. S25+를 위한 고성능 옵션은 나중에 지원 여부 확인 후 추가 적용 가능하지만, 
        // 기본적으로 decodeFromVideoDevice가 S8에서 더 안정적입니다.
        camActive = true;
        document.getElementById('qr-placeholder').style.display = 'none';
        _setStatus('QR코드를 비춰주세요', 'green');
        _setBtnStop();

        // 5. 스캔 시작
        await _codeReader.decodeFromVideoDevice(selectedDeviceId, 'qr-video', (result, err) => {
            if (result && camActive) {
                if (navigator.vibrate) navigator.vibrate(100);
                handleQRResult(result.getText());
            }
        });

    } catch (err) {
        console.error('QR Start Error:', err);
        camActive = false;
        let errMsg = '카메라 연결 실패';
        if (err.name === 'NotAllowedError') errMsg = '카메라 권한을 허용해주세요.';
        else if (err.name === 'NotFoundError') errMsg = '카메라를 찾을 수 없습니다.';
        _setStatus(errMsg, 'red');
        _setBtnStart();
    }
}

async function stopCamera(silent = false) {
    camActive = false;
    if (_codeReader) {
        try { _codeReader.reset(); } catch (e) {}
        _codeReader = null;
    }
    if (!silent) {
        _resetReaderEl();
        document.getElementById('qr-placeholder').style.display = 'flex';
        _setStatus('');
        _setBtnStart();
    }
}

function handleQRResult(data) {
    if (!camActive || !data.includes('v=')) return;
    camActive = false;
    stopCamera();

    try {
        const queryStr = data.split('v=')[1];
        const games = queryStr.split('q');
        let allNums = [];

        games.forEach((game, idx) => {
            let numPart = (idx === 0) ? game.substring(4) : game;
            for (let i = 0; i < numPart.length; i += 2) {
                const n = parseInt(numPart.substring(i, i + 2), 10);
                if (n >= 1 && n <= 45) allNums.push(n);
            }
        });

        scannedNums = [...new Set(allNums)].sort((a, b) => a - b);
        document.getElementById('qr-res-nums').innerHTML = '';
        scannedNums.forEach(n => {
            if (typeof mkBall === 'function') document.getElementById('qr-res-nums').appendChild(mkBall(n, 'mini-ball'));
        });

        document.getElementById('qr-result-panel').classList.remove('hidden');
        _setStatus('스캔 성공!', 'green');
        if (typeof toast === 'function') toast('번호 인식 완료');
    } catch (e) {
        _setStatus('인식 오류', 'red');
        startCamera(); // 재시도
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
    startCamera();
}
