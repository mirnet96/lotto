/* ══════════════════════════════════════════════════
    js/qr.js — ZXing 라이브러리 최적화 버전
    - S25+, iPhone 등 최신 기기 다중 렌즈 대응
    - 고해상도 초점 문제 해결 (Continuous Focus)
    - 로또 QR 전용 파싱 로직 강화
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
    // 최신폰 대응: 비디오가 일그러지지 않도록 relative 유지 및 최소 높이 설정
    fresh.style.cssText = 'width:100%;background:#000;position:relative;overflow:hidden;border-radius:12px;aspect-ratio: 1 / 1;';
    old.parentNode.replaceChild(fresh, old);
}

function _setStatus(msg, color = 'slate') {
    const el = document.getElementById('cam-status');
    if (!el) return;
    el.textContent = msg;
    // 테일윈드 색상 클래스 대응
    const colorMap = {
        'slate': 'text-slate-500',
        'red': 'text-red-500',
        'green': 'text-green-500',
        'blue': 'text-blue-500'
    };
    el.className = `text-center text-[13px] ${colorMap[color] || 'text-slate-500'} mb-3 min-h-[20px] font-medium`;
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

/* ─── 브라우저 감지 ─── */
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
    startCamera — 최신 기기(S25+) 최적화 로직
   ══════════════════════════════════════════════════ */
async function startCamera() {
    _setStatus('카메라 준비 중...', 'blue');
    await stopCamera(true);
    _resetReaderEl();

    const placeholder = document.getElementById('qr-placeholder');

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
        const readerEl = document.getElementById('reader');
        const video = document.createElement('video');
        video.id = 'qr-video';
        video.setAttribute('playsinline', '');
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        readerEl.appendChild(video);

        /* ── ZXing 힌트 설정 (QR 전용 및 정밀 스캔) ── */
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.QR_CODE]);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

        _codeReader = new ZXing.BrowserMultiFormatReader(hints);

        /* ── 최신 기기(S25+) 광각 렌즈 타겟팅 ── */
        const devices = await _codeReader.listVideoInputDevices();
        let selectedDeviceId = undefined;

        if (devices && devices.length > 0) {
            // S25+ 등 다중 렌즈 기기에서 'Main' 혹은 'Wide' 렌즈 찾기
            const backCamera = devices.find(d => {
                const label = d.label.toLowerCase();
                return (label.includes('back') || label.includes('rear') || label.includes('wide')) && !label.includes('ultra');
            });
            selectedDeviceId = backCamera ? backCamera.deviceId : devices[devices.length - 1].deviceId;
        }

        /* ── 비디오 제약 조건 (초점 및 해상도) ── */
        const constraints = {
            video: {
                deviceId: selectedDeviceId,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment',
                focusMode: 'continuous' // 지속적 초점 모드
            }
        };

        camActive = true;
        if (placeholder) placeholder.style.display = 'none';
        _setStatus('QR코드를 박스 중앙에 맞춰주세요', 'green');
        _setBtnStop();

        /* ── 스캔 시작 ── */
        await _codeReader.decodeFromConstraints(
            constraints,
            'qr-video',
            (result, err) => {
                if (result && camActive) {
                    if (navigator.vibrate) navigator.vibrate(200);
                    handleQRResult(result.getText());
                }
                // err는 매 프레임 발생하므로 무시
            }
        );

    } catch (err) {
        console.error('Camera Error:', err);
        camActive = false;
        if (err.name === 'NotAllowedError') {
            _setStatus('카메라 권한이 거부되었습니다.', 'red');
        } else {
            _setStatus('카메라를 시작할 수 없습니다.', 'red');
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

    if (!silent) {
        _resetReaderEl();
        const placeholder = document.getElementById('qr-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
        _setStatus('');
        _setBtnStart();
    }
}

/* ─── 로또 QR 결과 처리 (파싱 로직 강화) ─── */
function handleQRResult(data) {
    if (!camActive || !data.includes('v=')) return;
    
    // 로또 QR 여부 1차 검증
    if (!data.includes('dhlottery.co.kr')) {
        _setStatus('동행복권 QR이 아닙니다.', 'red');
        return;
    }

    camActive = false; 
    stopCamera();

    try {
        const queryStr = data.split('v=')[1];
        const games = queryStr.split('q');
        let allNums = [];

        games.forEach((game, idx) => {
            // 첫 덩어리는 회차 4자리 포함 (예: 1123010203040506)
            let numPart = (idx === 0) ? game.substring(4) : game;
            
            for (let i = 0; i < numPart.length; i += 2) {
                const n = parseInt(numPart.substring(i, i + 2), 10);
                if (n >= 1 && n <= 45) allNums.push(n);
            }
        });

        if (allNums.length === 0) throw new Error('번호 추출 실패');

        scannedNums = [...new Set(allNums)].sort((a, b) => a - b);

        const panel    = document.getElementById('qr-result-panel');
        const numsWrap = document.getElementById('qr-res-nums');

        if (numsWrap) {
            numsWrap.innerHTML = '';
            scannedNums.forEach(n => {
                if (typeof mkBall === 'function') numsWrap.appendChild(mkBall(n, 'mini-ball'));
            });
        }

        panel.classList.remove('hidden');
        _setStatus(`${scannedNums.length}개 번호 스캔 완료`, 'green');
        if (typeof toast === 'function') toast('번호가 인식되었습니다.');

    } catch (e) {
        _setStatus('QR 코드 인식 오류', 'red');
        console.error(e);
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
