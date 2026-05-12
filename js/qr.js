/* ══════════════════════════════════════════════════
    js/qr.js — 디버그 버전 (S25+ QR 파싱 문제 확인용)
    스캔된 raw 데이터를 화면에 표시해서 원인 파악
   ══════════════════════════════════════════════════ */

let camActive    = false;
let scannedNums  = [];
let _stream      = null;
let _rafId       = null;
let _detector    = null;
let _html5QrCode = null;

/* ─── 공통 유틸 ─── */
function _resetReaderEl() {
    const old = document.getElementById('reader');
    if (!old) return;
    const fresh = document.createElement('div');
    fresh.id = 'reader';
    fresh.style.cssText = 'width:100%;background:#000;';
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
}

function _setBtnStart() {
    const btn = document.getElementById('cam-toggle-btn');
    if (!btn) return;
    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200 transition-all hover:bg-blue-700';
    btn.innerHTML = '<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>';
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
    방법 A: BarcodeDetector (크롬 네이티브, S25+ 최적)
   ══════════════════════════════════════════════════ */
async function _startNative() {
    _detector = new BarcodeDetector({ formats: ['qr_code'] });

    _stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: false
    });

    const readerEl = document.getElementById('reader');
    readerEl.innerHTML = '';

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.style.cssText = 'width:100%;display:block;';
    video.srcObject = _stream;
    readerEl.appendChild(video);

    await video.play();

    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');

    const scan = async () => {
        if (!camActive) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            try {
                const barcodes = await _detector.detect(canvas);
                if (barcodes.length > 0) {
                    handleQRResult(barcodes[0].rawValue);
                    return;
                }
            } catch (_) {}
        }
        _rafId = requestAnimationFrame(scan);
    };
    _rafId = requestAnimationFrame(scan);
}

/* ══════════════════════════════════════════════════
    방법 B: html5-qrcode 폴백
   ══════════════════════════════════════════════════ */
async function _startHtml5Qrcode() {
    _resetReaderEl();
    _html5QrCode = new Html5Qrcode('reader');
    await _html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => handleQRResult(text)
    );
}

/* ══════════════════════════════════════════════════
    startCamera 진입점
   ══════════════════════════════════════════════════ */
async function startCamera() {
    _setStatus('카메라 연결 중...');
    await stopCamera(true);
    _resetReaderEl();

    const placeholder = document.getElementById('qr-placeholder');

    // 카카오 인앱 브라우저 → 외부 크롬 유도
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

    // 권한 먼저 명시적으로 요청
    try {
        const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        testStream.getTracks().forEach(t => t.stop());
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            _setStatus('카메라 권한이 거부되었습니다. 브라우저 설정 > 사이트 설정 > 카메라에서 허용해주세요.', 'red');
        } else if (err.name === 'NotFoundError') {
            _setStatus('카메라를 찾을 수 없습니다.', 'red');
        } else {
            _setStatus('카메라 오류: ' + (err.message || err.name), 'red');
        }
        return;
    }

    // 스캐너 시작
    try {
        const useNative = ('BarcodeDetector' in window);
        _setStatus(useNative ? '네이티브 스캐너 시작 중...' : 'QR 스캐너 시작 중...');

        if (useNative) {
            await _startNative();
        } else {
            await _startHtml5Qrcode();
        }

        camActive = true;
        if (placeholder) placeholder.style.display = 'none';
        _setStatus('QR코드를 카메라에 맞춰주세요', 'green');
        _setBtnStop();

    } catch (err) {
        console.error('카메라 시작 오류:', err);
        camActive = false;
        _setStatus('카메라 시작 실패: ' + (err.message || err.name), 'red');
    }
}

/* ─── stopCamera ─── */
async function stopCamera(silent = false) {
    camActive = false;

    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }

    if (_stream) {
        _stream.getTracks().forEach(t => t.stop());
        _stream = null;
    }
    _detector = null;

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

/* ══════════════════════════════════════════════════
    QR 결과 처리 — 디버그 모드
    스캔된 rawValue를 화면 + alert 로 표시
   ══════════════════════════════════════════════════ */
function handleQRResult(data) {
    if (!camActive) return;
    if (navigator.vibrate) navigator.vibrate(100);

    stopCamera();

    // ★ 디버그: 스캔된 raw 데이터를 화면에 표시
    const statusEl = document.getElementById('cam-status');
    if (statusEl) {
        statusEl.textContent = '[RAW] ' + data;
        statusEl.className = 'text-center text-[13px] text-purple-500 mb-3 min-h-[20px] break-all';
    }

    // ★ 디버그: alert 로도 표시 → 확인 후 아래 두 줄 제거
    alert('스캔 데이터:\n' + data);

    try {
        const urlParts = data.split('v=');
        if (urlParts.length < 2) throw new Error('v= 없음: ' + data);

        const qrRawNumbers = urlParts[1].split('q');
        const allNums = [];

        for (let i = 1; i < qrRawNumbers.length; i++) {
            const gameStr = qrRawNumbers[i];
            for (let j = 0; j < gameStr.length; j += 2) {
                const num = parseInt(gameStr.substring(j, j + 2), 10);
                if (num >= 1 && num <= 45) allNums.push(num);
            }
        }

        if (allNums.length === 0) throw new Error('번호 파싱 실패: ' + urlParts[1]);

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
        // ★ 디버그: 파싱 에러 상세 표시
        alert('파싱 오류:\n' + e.message);
        _setStatus('파싱 오류: ' + e.message, 'red');
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
