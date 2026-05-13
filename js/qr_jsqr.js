/* ══════════════════════════════════════════════════
    js/qr.js — jsQR + getUserMedia 직접 구현
    디버그: QR 감지 시 alert 표시
   ══════════════════════════════════════════════════ */

let camActive   = false;
let scannedNums = [];
let _stream     = null;
let _rafId      = null;
let _video      = null;
let _canvas     = null;
let _ctx        = null;
let _detected   = false; // 중복 처리 방지 (단순 boolean)

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
    startCamera
   ══════════════════════════════════════════════════ */
async function startCamera() {
    _setStatus('카메라 연결 중...');
    await stopCamera(true);
    _resetReaderEl();
    _detected = false;

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
        _stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width:  { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        const readerEl = document.getElementById('reader');
        readerEl.innerHTML = '';

        _video = document.createElement('video');
        _video.setAttribute('playsinline', '');
        _video.setAttribute('autoplay', '');
        _video.setAttribute('muted', '');
        _video.style.cssText = 'width:100%;display:block;';
        _video.srcObject = _stream;
        readerEl.appendChild(_video);

        _canvas = document.createElement('canvas');
        _ctx    = _canvas.getContext('2d', { willReadFrequently: true });

        await _video.play();

        camActive = true;
        if (placeholder) placeholder.style.display = 'none';

        _setStatus('QR코드를 화면 중앙에 맞춰주세요', 'green');
        _setBtnStop();

        _rafId = requestAnimationFrame(_scanLoop);

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

/* ══════════════════════════════════════════════════
    jsQR 스캔 루프
   ══════════════════════════════════════════════════ */
function _scanLoop() {
    if (_detected) return;
    if (!_video || !_canvas || !_ctx) return;

    if (_video.readyState === _video.HAVE_ENOUGH_DATA) {
        const vw = _video.videoWidth;
        const vh = _video.videoHeight;

        if (vw > 0 && vh > 0) {
            const maxSize = 640;
            const scale   = maxSize / Math.max(vw, vh);
            const cw      = Math.round(vw * scale);
            const ch      = Math.round(vh * scale);

            _canvas.width  = cw;
            _canvas.height = ch;
            _ctx.drawImage(_video, 0, 0, cw, ch);

            const imageData = _ctx.getImageData(0, 0, cw, ch);
            const code = jsQR(imageData.data, cw, ch, {
                inversionAttempts: 'dontInvert'
            });

            if (code && code.data) {
                _detected = true;
                // ★ 진동: 짧게-멈춤-길게 패턴으로 구분
                if (navigator.vibrate) navigator.vibrate([100, 50, 300]);
                // ★ 디버그: raw 데이터 확인
                alert('QR 감지!\nRAW: ' + code.data);
                handleQRResult(code.data);
                return;
            }
        }
    }

    _rafId = requestAnimationFrame(_scanLoop);
}

/* ─── stopCamera ─── */
async function stopCamera(silent = false) {
    camActive = false;

    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }

    if (_stream) {
        _stream.getTracks().forEach(t => t.stop());
        _stream = null;
    }

    _video  = null;
    _canvas = null;
    _ctx    = null;

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
    _detected = false;
    document.getElementById('qr-result-panel').classList.add('hidden');
    startCamera();
}
