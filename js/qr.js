/* ══════════════════════════════════════════════════
    js/qr.js — QR 카메라 스캔 (html5-qrcode)
    
    최신 기기(갤럭시 S25+ 등) 대응 업데이트:
    · 비디오 해상도 ideal 1280x720 제한 (연산 부하 감소)
    · qrbox 크기 조정 (초점 거리 확보 유도)
    · facingMode environment 강제 및 에러 핸들링 강화
   ══════════════════════════════════════════════════ */

let html5QrCode = null;
let camActive   = false;
let scannedNums = [];

/* reader div를 새 div로 교체 — 라이브러리 내부 잔여 상태 완전 제거 */
function _resetReaderEl() {
    const old = document.getElementById('reader');
    if (!old) return;
    const fresh = document.createElement('div');
    fresh.id = 'reader';
    // 라이브러리 스타일 초기화 방지
    fresh.style.width = "100%";
    old.parentNode.replaceChild(fresh, old);
}

async function toggleCamera() {
    camActive ? await stopCamera() : await startCamera();
}

async function startCamera() {
    const statusEl    = document.getElementById('cam-status');
    const btn         = document.getElementById('cam-toggle-btn');
    const placeholder = document.getElementById('qr-placeholder');

    statusEl.textContent = '카메라를 초기화 중입니다...';
    statusEl.className   = 'text-center text-[13px] text-slate-400 mb-3 min-h-[20px]';

    /* 기존 인스턴스 정리 */
    if (html5QrCode) {
        try { if (camActive) await html5QrCode.stop(); } catch (_) {}
        try { await html5QrCode.clear(); } catch (_) {}
        html5QrCode = null;
        camActive   = false;
    }

    _resetReaderEl();

    try {
        const vw = Math.min(window.innerWidth, 560);
        // S25+ 초점 거리를 위해 박스 크기를 약간 줄임 (멀리서 찍게 유도)
        const boxSize = Math.floor(vw * 0.65);

        html5QrCode = new Html5Qrcode('reader', { verbose: false });

        const config = {
            fps: 20, // 인식 속도 향상
            qrbox: { width: boxSize, height: boxSize },
            aspectRatio: 1.0,
            // [핵심] S25+ 고해상도 부하 방지: 720p급으로 제한하여 연산 속도 확보
            videoConstraints: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            disableFlip: false,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        };

        await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => handleQRResult(decodedText)
        );

        camActive = true;
        placeholder.style.display = 'none';
        document.getElementById('reader').style.display = 'block';

        statusEl.textContent = 'QR코드를 사각형 안에 비춰주세요';
        statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
        
        btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-500 cursor-pointer mb-3 transition-all';
        btn.innerHTML = '<span class="material-symbols-rounded">stop_circle</span><span>카메라 중지</span>';

    } catch (err) {
        console.error('startCamera 실패:', err);
        let errorMsg = '카메라를 시작할 수 없습니다.';
        
        // 카카오톡 브라우저 권한 특성 대응
        if (navigator.userAgent.indexOf('KAKAOTALK') > -1) {
            errorMsg = '카카오톡 브라우저에서는 카메라가 차단될 수 있습니다. 우측 하단 [다른 브라우저로 열기]를 이용해 주세요.';
        } else if (err.name === 'NotAllowedError') {
            errorMsg = '카메라 권한이 거부되었습니다. 설정에서 권한을 허용해 주세요.';
        }

        statusEl.textContent = errorMsg;
        statusEl.className   = 'text-center text-[13px] text-red-500 mb-3 min-h-[20px] px-4';
        
        if (html5QrCode) {
            try { await html5QrCode.clear(); } catch (_) {}
        }
        html5QrCode = null;
        camActive   = false;
    }
}

async function stopCamera() {
    const btn         = document.getElementById('cam-toggle-btn');
    const statusEl    = document.getElementById('cam-status');
    const placeholder = document.getElementById('qr-placeholder');

    if (html5QrCode) {
        try { 
            if (camActive) await html5QrCode.stop(); 
        } catch (e) { 
            console.warn('stop 실패:', e); 
        }
        try { await html5QrCode.clear(); } catch (e) { console.warn('clear 실패:', e); }
        html5QrCode = null;
    }
    camActive = false;

    _resetReaderEl();
    document.getElementById('reader').style.display = 'none';
    placeholder.style.display = 'flex';

    if (statusEl) statusEl.textContent = '';
    btn.className = 'cam-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[15px] font-bold text-white cursor-pointer mb-3 shadow-md shadow-blue-200 transition-all hover:bg-blue-700';
    btn.innerHTML = '<span class="material-symbols-rounded">photo_camera</span><span>카메라 시작하기</span>';
}

function handleQRResult(data) {
    if (navigator.vibrate) navigator.vibrate(100);

    /* 스캔 콜백 중복 실행 방지 */
    if (!camActive) return;
    stopCamera();

    // 로또 QR URL 파싱 로직
    const urlParts = data.split('v=');
    if (urlParts.length < 2) { 
        showQRError('올바른 로또 QR 형식이 아닙니다.'); 
        return; 
    }

    const qrRawNumbers = urlParts[1].split('q');
    const allNums = [];
    
    // 첫 번째 세트(qrRawNumbers[0])는 회차 정보이므로 i=1부터 게임 데이터
    for (let i = 1; i < qrRawNumbers.length; i++) {
        const gameStr = qrRawNumbers[i];
        for (let j = 0; j < gameStr.length; j += 2) {
            const numPart = gameStr.substring(j, j + 2);
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num >= 1 && num <= 45) {
                allNums.push(num);
            }
        }
    }
    
    if (!allNums.length) { 
        showQRError('유효한 번호를 찾지 못했습니다.'); 
        return; 
    }

    // 중복 제거 및 정렬
    scannedNums = [...new Set(allNums)].sort((a, b) => a - b);

    const panel    = document.getElementById('qr-result-panel');
    const numsWrap = document.getElementById('qr-res-nums');
    const statusEl = document.getElementById('cam-status');

    numsWrap.innerHTML = '';
    scannedNums.forEach(n => {
        if (typeof mkBall === 'function') {
            numsWrap.appendChild(mkBall(n, 'mini-ball'));
        }
    });

    panel.classList.remove('hidden');
    statusEl.textContent = `${scannedNums.length}개 번호 스캔 완료`;
    statusEl.className   = 'text-center text-[13px] text-green-600 mb-3 min-h-[20px]';
    
    if (typeof toast === 'function') {
        toast(`${scannedNums.length}개 번호 인식됨`);
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
    if (typeof toast === 'function') toast('스캔된 번호 제외 후 생성 완료');
}

function resetQR() {
    scannedNums = [];
    const panel = document.getElementById('qr-result-panel');
    if (panel) panel.classList.add('hidden');
    document.getElementById('cam-status').textContent = '';
    startCamera();
}
