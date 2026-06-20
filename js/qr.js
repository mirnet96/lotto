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
        const scannedLines = [];
        for (let i = 1; i < qrRawNumbers.length; i++) {
            const segment = qrRawNumbers[i];
            if (segment.length < 12) continue;
            const gameStr = segment.substring(0, 12);
            const lineNums = [];
            for (let j = 0; j < 12; j += 2) {
                const num = parseInt(gameStr.substring(j, j + 2), 10);
                if (num >= 1 && num <= 45) lineNums.push(num);
            }
            if (lineNums.length === 6) scannedLines.push(lineNums.sort((a, b) => a - b));
        }
        if (!scannedLines.length) throw new Error('번호를 읽을 수 없습니다.');

        const allNums = [...new Set(scannedLines.flat())].sort((a, b) => a - b);
        scannedNums = allNums;
        if (typeof setQRData === 'function') setQRData({ lines: scannedLines, all: allNums });

        _renderQRPanel(scannedLines, allNums);

        const statusEl = document.getElementById('cam-status');
        if (statusEl) { statusEl.textContent = `✅ ${scannedLines.length}줄 스캔 완료`; statusEl.className = 'ok'; }
        if (typeof toast === 'function') toast(`🎯 ${scannedLines.length}게임 인식`);

    } catch (e) {
        const statusEl = document.getElementById('cam-status');
        if (statusEl) { statusEl.textContent = '❌ ' + e.message; statusEl.className = 'err'; }
    }
}

/* ── QR 결과 패널: 탭 2개(전체 / 라인별) ── */
let _qrActiveTab = 'all';   /* 'all' | 'perline' */

function _renderQRPanel(lines, allNums) {
    const panel    = document.getElementById('qr-result-panel');
    const numsWrap = document.getElementById('qr-res-nums');
    if (!panel || !numsWrap) return;

    const SET_LABELS  = ['A','B','C','D','E'];
    const LINE_COLORS = ['#F5C842','#3B82F6','#EF4444','#22C55E','#A78BFA'];

    _qrActiveTab = 'all';
    numsWrap.innerHTML = '';

    /* ── 탭 2개 ── */
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';

    function mkTab(id, label) {
        const btn = document.createElement('button');
        btn.style.cssText = 'flex:1;padding:7px 0;border-radius:10px;border:1.5px solid;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .12s;';
        btn.dataset.tabId = id;
        btn.textContent = label;
        btn.onclick = () => { _qrActiveTab = id; refreshPanel(); };
        return btn;
    }
    const tabAll     = mkTab('all',     '📋 전체 제외');
    const tabPerLine = mkTab('perline', '🔢 라인별 제외');
    tabBar.append(tabAll, tabPerLine);
    numsWrap.appendChild(tabBar);

    /* ── 콘텐츠 영역 ── */
    const content = document.createElement('div');
    numsWrap.appendChild(content);

    /* ── 버튼 행 ── */
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px;';
    numsWrap.appendChild(btnRow);

    function refreshPanel() {
        /* 탭 스타일 */
        [tabAll, tabPerLine].forEach(btn => {
            const active = btn.dataset.tabId === _qrActiveTab;
            btn.style.background  = active ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.05)';
            btn.style.borderColor = active ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.12)';
            btn.style.color       = active ? '#22C55E' : '#64748B';
        });

        content.innerHTML = '';

        if (_qrActiveTab === 'all') {
            /* 전체 번호 나열 */
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';
            allNums.forEach(n => {
                const b = mkBall(n, 'mini-ball');
                b.style.flexShrink = '0';
                row.appendChild(b);
            });
            content.appendChild(row);
            const desc = document.createElement('p');
            desc.style.cssText = 'font-size:10px;color:#64748B;margin-top:6px;';
            desc.textContent = `전체 ${allNums.length}개 번호를 제외 → 5세트 동일 조건으로 생성`;
            content.appendChild(desc);
        } else {
            /* 라인별: 각 줄 번호 + 화살표 표시 */
            lines.forEach((lineNums, i) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;';

                const labelEl = document.createElement('span');
                labelEl.style.cssText = `font-size:11px;font-weight:700;color:${LINE_COLORS[i]};width:14px;flex-shrink:0;`;
                labelEl.textContent = SET_LABELS[i];

                const balls = document.createElement('div');
                balls.style.cssText = 'display:flex;gap:3px;flex-wrap:nowrap;';
                lineNums.forEach(n => {
                    const b = mkBall(n, 'mini-ball');
                    b.style.width = b.style.height = '22px';
                    b.style.fontSize = '9px';
                    b.style.flexShrink = '0';
                    balls.appendChild(b);
                });

                const arrow = document.createElement('span');
                arrow.style.cssText = 'font-size:10px;color:#475569;flex-shrink:0;';
                arrow.textContent = '→ 세트 ' + SET_LABELS[i] + ' 제외';

                row.append(labelEl, balls, arrow);
                content.appendChild(row);
            });
            const desc = document.createElement('p');
            desc.style.cssText = 'font-size:10px;color:#64748B;margin-top:4px;';
            desc.textContent = '각 줄 번호를 제외해 세트별로 따로 생성 (A줄→세트A, B줄→세트B …)';
            content.appendChild(desc);
        }

        /* 버튼 갱신 */
        btnRow.innerHTML = '';
        const applyBtn = document.createElement('button');
        applyBtn.style.cssText = 'flex:1;padding:11px 0;border-radius:12px;border:none;font-family:inherit;font-size:13px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#22C55E,#15803D);';
        applyBtn.textContent = _qrActiveTab === 'all' ? '🎰 전체 제외하고 생성' : '🔢 라인별 제외하고 생성';
        applyBtn.onclick = () => _applyAndGo(lines, allNums);

        const rescanBtn = document.createElement('button');
        rescanBtn.style.cssText = 'padding:11px 14px;border-radius:12px;border:1px solid rgba(34,197,94,.3);background:transparent;font-family:inherit;font-size:13px;font-weight:600;color:#22C55E;cursor:pointer;';
        rescanBtn.textContent = '🔄 재스캔';
        rescanBtn.onclick = resetQR;

        btnRow.append(applyBtn, rescanBtn);
    }

    refreshPanel();
    panel.classList.remove('hidden');
}

function _applyAndGo(lines, allNums) {
    if (typeof setQRData === 'function') setQRData({ lines, all: allNums, mode: _qrActiveTab });
    if (typeof switchTab === 'function') switchTab('home');
    if (_qrActiveTab === 'all') {
        if (typeof generateAll     === 'function') generateAll(allNums);
    } else {
        if (typeof generatePerLine === 'function') generatePerLine(lines);
    }
    if (typeof updateHomeBanner === 'function') updateHomeBanner();
}

function resetQR() {
    scannedNums = [];
    if (typeof setQRData === 'function') setQRData(null);
    const panel    = document.getElementById('qr-result-panel');
    const numsWrap = document.getElementById('qr-res-nums');
    if (panel)    panel.classList.add('hidden');
    if (numsWrap) numsWrap.innerHTML = '';
    if (typeof updateHomeBanner === 'function') updateHomeBanner();
    startCamera();
}
