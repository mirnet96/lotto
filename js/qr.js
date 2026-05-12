/* ══════════════════════════════════════════════════
    js/qr.js — S25+ 최적화 최종 버전
    
    주요 수정 사항:
    1. 해상도를 640x480으로 낮춰 분석 속도 극대화 (S25+ 연산 부하 해결)
    2. qrbox를 고정 픽셀(250px)로 설정하여 멀리서 찍도록 유도 (초점 문제 해결)
    3. 인스턴스 생성 시 에러 핸들링 및 초기화 로직 강화
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
    fresh.style.backgroundColor = "#000"; // 검은 배경 추가
    old.parentNode.replaceChild(fresh, old);
}

async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const btn         = document.getElementById('cam-toggle-btn');
    const placeholder = document.getElementById('qr-placeholder');

    statusEl.textContent = '카메라 연결 중...';

    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (_) {}
        try { await html5QrCode.clear(); } catch (_) {}
        html5QrCode = null;
    }

    _resetReaderEl();

    try {
        // S25+ 등 고사양 기기에서 연산 속도를 높이기 위해 640x480 해상도 강제
        const config = {
            fps: 20, 
            qrbox: { width: 250, height: 250 }, // 고정 크기로 멀리서 찍게 유도
            aspectRatio: 1.0,
            videoConstraints: {
                facingMode: "environment",
                width: { ideal: 640 }, 
                height: { ideal: 480 }
            },
            disableFlip: false,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        };

        html5QrCode = new Html5Qrcode('reader');

        await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => handleQRResult(decodedText)
        );

        camActive = true;
        placeholder.style.display = 'none';
        document.getElementById('reader').style.display = 'block';

        statusEl.textContent = 'QR코드를 멀리서 천천히 맞춰주세요';
        statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
        
        btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-500 cursor-pointer mb-3 transition-all';
        btn.innerHTML = '<span class="material-symbols-rounded">stop_circle</span><span>카메라 중지</span>';

    } catch (err) {
        console.error('S25+ Start Error:', err);
        statusEl.textContent = '카메라 시작 실패. 권한 혹은 브라우저 설정을 확인하세요.';
        statusEl.className   = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
        camActive = false;
    }
}

async function stopCamera() {
    const btn         = document.getElementById('cam-toggle-btn');
    const statusEl    = document.getElementById('cam-status');
    const placeholder = document.getElementById('qr-placeholder');

    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (e) {}
        try { await html5QrCode.clear(); } catch (e) {}
        html5QrCode = null;
    }
    camActive = false;

    _resetReaderEl();
    document.getElementById('reader').style.display = 'none';
    placeholder.style.display = 'flex';

    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200 transition-all hover:bg-blue-700';
    btn.innerHTML = '<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>';
}

function handleQRResult(data) {
    if (!camActive) return;
    
    // 진동 알림
    if (navigator.vibrate) navigator.vibrate(100);
    
    stopCamera();

    // 로또 QR 데이터 추출
    try {
        const urlParts = data.split('v=');
        if (urlParts.length < 2) throw new Error();

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
        document.getElementById('cam-status').textContent = scannedNums.length + '개 번호 스캔 완료';
        if (typeof toast === 'function') toast(scannedNums.length + '개 번호 인식');

    } catch (e) {
        showQRError('로또 QR 형식이 아닙니다.');
    }
}

function showQRError(msg) {
    const statusEl = document.getElementById('cam-status');
    statusEl.textContent = msg;
    statusEl.className   = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px]';
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
