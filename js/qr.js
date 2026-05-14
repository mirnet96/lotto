/* ══════════════════════════════════════════════════
    js/qr.js — ZXing 라이브러리 사용
    
    ZXing: Google 제작 바코드 디코더
    - jsQR 대비 인식률 대폭 향상
    - 저조도, 기울어짐, 고해상도 모두 대응
    - S8+ / S25+ 세로/가로 해상도 무관
   ══════════════════════════════════════════════════ */

let camActive   = false;
let scannedNums = [];
let _codeReader = null;
let _stream     = null;

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
function _isKakaoInApp() {
    return /kakaotalk/i.test(navigator.userAgent);
}

function _openExternal() {
    const url = location.href;
    location.href = 'intent://' + url.replace(/https?:\/\//, '')
        + '#Intent;scheme=https;package=com.android.chrome;end';
}

/* ─── 토글 ─── */
async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

/* ══════════════════════════════════════════════════
    startCamera — ZXing BrowserMultiFormatReader
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
        /* ── video 엘리먼트 생성 ── */
        const readerEl = document.getElementById('reader');
        readerEl.innerHTML = '';

        const video = document.createElement('video');
        video.id = 'qr-video';
        video.setAttribute('playsinline', '');
        video.style.cssText = 'width:100%;display:block;';
        readerEl.appendChild(video);

        /* ── ZXing 스캐너 초기화 ── */
        const hints = new Map();
        const formats = [ZXing.BarcodeFormat.QR_CODE];
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

        _codeReader = new ZXing.BrowserMultiFormatReader(hints);

        /* ── 후면 카메라 선택 ── */
        const devices = await _codeReader.listVideoInputDevices();
        let deviceId = undefined;
        if (devices && devices.length > 0) {
            // 마지막 카메라가 보통 후면
            deviceId = devices[devices.length - 1].deviceId;
            for (const d of devices) {
                const label = (d.label || '').toLowerCase();
                if (label.includes('back') || label.includes('rear') || label.includes('후면') || label.includes('environment')) {
                    deviceId = d.deviceId;
                    break;
                }
            }
        }

        camActive = true;
        if (placeholder) placeholder.style.display = 'none';
        _setStatus('QR코드를 화면 중앙에 맞춰주세요', 'green');
        _setBtnStop();

        /* ── 스캔 시작 ── */
        await _codeReader.decodeFromVideoDevice(
            deviceId,
            'qr-video',
            (result, err) => {
                if (result && camActive) {
                    if (navigator.vibrate) navigator.vibrate([100, 50, 300]);
                    handleQRResult(result.getText());
                }
                // err는 인식 안 됐을 때 매 프레임 발생하므로 무시
            }
        );

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

    if (_codeReader) {
        try { _codeReader.reset(); } catch (_) {}
        _codeReader = null;
    }

    if (_stream) {
        _stream.getTracks().forEach(t => t.stop());
        _stream = null;
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
    camActive = false; // 중복 처리 방지
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
