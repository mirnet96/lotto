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
        /* ── 라인별(게임별) 파싱 ── */
        const scannedLines = [];   /* [ [n,n,n,n,n,n], ... ]  최대 5줄 */
        for (let i = 1; i < qrRawNumbers.length; i++) {
            const segment = qrRawNumbers[i];
            if (segment.length < 12) continue;
            const gameStr = segment.substring(0, 12);
            const lineNums = [];
            for (let j = 0; j < 12; j += 2) {
                const num = parseInt(gameStr.substring(j, j + 2), 10);
                if (num >= 1 && num <= 45) lineNums.push(num);
            }
            if (lineNums.length === 6) scannedLines.push(lineNums.sort((a,b)=>a-b));
        }
        if (!scannedLines.length) throw new Error('번호를 읽을 수 없습니다.');

        /* 전체 합집합 */
        const allNums = [...new Set(scannedLines.flat())].sort((a,b)=>a-b);
        scannedNums = allNums;

        /* sessionStorage 저장 */
        if (typeof setQRData === 'function') setQRData({ lines: scannedLines, all: allNums });

        /* ── 결과 패널 렌더링 ── */
        _renderQRPanel(scannedLines, allNums);

        const statusEl = document.getElementById('cam-status');
        if (statusEl) { statusEl.textContent = `✅ ${scannedLines.length}줄 / ${allNums.length}개 번호 스캔 완료`; statusEl.className = 'ok'; }
        if (typeof toast === 'function') toast(`🎯 ${scannedLines.length}게임 인식`);

    } catch (e) {
        const statusEl = document.getElementById('cam-status');
        if (statusEl) { statusEl.textContent = '❌ ' + e.message; statusEl.className = 'err'; }
    }
}

/* ── QR 결과 패널 렌더링 ── */
function _renderQRPanel(lines, allNums) {
    const panel    = document.getElementById('qr-result-panel');
    const numsWrap = document.getElementById('qr-res-nums');
    if (!panel || !numsWrap) return;

    const SET_LABELS = ['A','B','C','D','E'];
    const LABEL_COLORS = ['#F5C842','#3B82F6','#EF4444','#22C55E','#A78BFA'];

    numsWrap.innerHTML = '';

    /* ── 제외 방식 탭 ── */
    const tabWrap = document.createElement('div');
    tabWrap.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';

    const tabs = [{ id:'all', label:'전체 제외' }, ...lines.map((_,i)=>({ id:'line'+i, label: SET_LABELS[i]+'열 제외' }))];
    let activeTab = 'all';

    function renderTabContent() {
        content.innerHTML = '';
        if (activeTab === 'all') {
            /* 전체 번호 표시 */
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;';
            allNums.forEach(n => {
                const b = mkBall(n, 'mini-ball');
                b.style.flexShrink = '0'; row.appendChild(b);
            });
            content.appendChild(row);
            const desc = document.createElement('div');
            desc.style.cssText = 'font-size:10px;color:#64748B;margin-top:4px;';
            desc.textContent = `스캔된 전체 ${allNums.length}개 번호를 제외하고 5세트 생성`;
            content.appendChild(desc);
        } else {
            /* 특정 라인 */
            const idx = parseInt(activeTab.replace('line',''));
            const lineNums = lines[idx];
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;';
            lineNums.forEach(n => {
                const b = mkBall(n, 'mini-ball');
                b.style.flexShrink = '0'; row.appendChild(b);
            });
            content.appendChild(row);
            const desc = document.createElement('div');
            desc.style.cssText = 'font-size:10px;color:#64748B;margin-top:4px;';
            desc.textContent = `${SET_LABELS[idx]}열 ${lineNums.length}개 번호를 제외하고 5세트 생성`;
            content.appendChild(desc);
        }

        /* 탭 버튼 색상 갱신 */
        tabWrap.querySelectorAll('.qr-tab').forEach(btn => {
            const isActive = btn.dataset.tab === activeTab;
            btn.style.background = isActive ? 'rgba(34,197,94,.22)' : 'rgba(255,255,255,.05)';
            btn.style.borderColor = isActive ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.1)';
            btn.style.color = isActive ? '#22C55E' : '#94A3B8';
            btn.style.fontWeight = isActive ? '700' : '500';
        });

        /* 실행 버튼 텍스트 */
        const applyBtn = panel.querySelector('#qr-apply-btn');
        if (applyBtn) {
            applyBtn.textContent = activeTab === 'all'
                ? `🎰 전체 제외하고 생성`
                : `🎯 ${SET_LABELS[parseInt(activeTab.replace('line',''))]}열 제외하고 생성`;
        }
    }

    tabs.forEach((t, ti) => {
        const btn = document.createElement('button');
        btn.className = 'qr-tab';
        btn.dataset.tab = t.id;
        btn.style.cssText = [
            'padding:5px 10px','border-radius:99px','border:1.5px solid rgba(255,255,255,.1)',
            'background:rgba(255,255,255,.05)','color:#94A3B8',
            'font-family:inherit','font-size:11px','font-weight:500','cursor:pointer',
            'white-space:nowrap','transition:all .12s',
        ].join(';');
        if (ti > 0) {
            /* 라인 탭에 색상 점 */
            btn.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LABEL_COLORS[ti-1]};margin-right:4px;vertical-align:middle;"></span>${t.label}`;
        } else {
            btn.textContent = t.label;
        }
        btn.onclick = () => { activeTab = t.id; renderTabContent(); };
        tabWrap.appendChild(btn);
    });
    numsWrap.appendChild(tabWrap);

    /* 콘텐츠 영역 */
    const content = document.createElement('div');
    numsWrap.appendChild(content);

    renderTabContent();

    /* ── 버튼 재구성 ── */
    const btnRow = panel.querySelector('.qr-btn-row');
    if (btnRow) {
        btnRow.innerHTML = '';
        const applyBtn = document.createElement('button');
        applyBtn.id = 'qr-apply-btn';
        applyBtn.style.cssText = [
            'flex:1','padding:10px 0','border-radius:12px','border:none',
            'font-family:inherit','font-size:13px','font-weight:700','color:#fff','cursor:pointer',
            'background:linear-gradient(135deg,#22C55E,#15803D)',
            'display:flex','align-items:center','justify-content:center','gap:4px',
        ].join(';');
        applyBtn.textContent = '🎰 전체 제외하고 생성';
        applyBtn.onclick = () => applyQRExclude(activeTab, lines);

        const rescanBtn = document.createElement('button');
        rescanBtn.style.cssText = [
            'padding:10px 14px','border-radius:12px',
            'border:1px solid rgba(34,197,94,.3)','background:transparent',
            'font-family:inherit','font-size:13px','font-weight:600','color:#22C55E','cursor:pointer',
        ].join(';');
        rescanBtn.textContent = '🔄 재스캔';
        rescanBtn.onclick = () => resetQR();

        btnRow.append(applyBtn, rescanBtn);
        /* activeTab을 클로저로 참조하도록 renderTabContent 내에서도 갱신 */
    }

    panel.classList.remove('hidden');
}

/* ── 제외 적용 ── */
function applyQRExclude(tabId, lines) {
    /* tabId, lines 가 없으면 sessionStorage에서 복원 */
    if (!tabId || !lines) {
        const d = typeof getQRData === 'function' ? getQRData() : null;
        if (!d) return;
        lines  = d.lines || [];
        tabId  = 'all';
    }
    let excludeNums;
    if (tabId === 'all') {
        excludeNums = [...new Set(lines.flat())].sort((a,b)=>a-b);
    } else {
        const idx = parseInt(tabId.replace('line',''));
        excludeNums = lines[idx] || [];
    }
    if (typeof setQRData === 'function') {
        const all = [...new Set(lines.flat())].sort((a,b)=>a-b);
        setQRData({ lines, all, activeTab: tabId });
    }
    if (typeof switchTab       === 'function') switchTab('home');
    if (typeof generateAll     === 'function') generateAll(excludeNums);
    if (typeof updateHomeBanner === 'function') updateHomeBanner();
}

function resetQR() {
    scannedNums = [];
    if (typeof setQRData === 'function') setQRData(null);
    const panel = document.getElementById('qr-result-panel');
    const numsWrap = document.getElementById('qr-res-nums');
    if (panel) panel.classList.add('hidden');
    if (numsWrap) numsWrap.innerHTML = '';
    if (typeof updateHomeBanner === 'function') updateHomeBanner();
    startCamera();
}
