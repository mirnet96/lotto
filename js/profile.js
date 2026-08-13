/* ══════════════════════════════════════════════════
   js/profile.js — 내 정보 (닉네임/생년월일/태어난 시/사진)
   전부 이 기기의 localStorage에만 저장됩니다 (서버 전송 없음)
   ══════════════════════════════════════════════════ */

const PROFILE_KEY = 'lotto_my_profile_v1';

function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); }
    catch { return {}; }
}

function setProfile(obj) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(obj));
}

/* 사진을 캔버스로 축소·압축해서 dataURL로 변환 (localStorage 용량 절약) */
function compressPhoto(file, maxSize = 240, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderProfilePhoto(dataUrl) {
    const preview = document.getElementById('profile-photo-preview');
    const removeBtn = document.getElementById('profile-photo-remove');
    if (!preview) return;

    if (dataUrl) {
        preview.innerHTML = `<img src="${dataUrl}" alt="내 사진" style="width:100%;height:100%;object-fit:cover;">`;
        if (removeBtn) { removeBtn.style.display = 'flex'; }
    } else {
        preview.innerHTML = `<span class="material-symbols-rounded text-[36px] text-slate-500">face</span>`;
        if (removeBtn) { removeBtn.style.display = 'none'; }
    }
}

function loadProfileForm() {
    const p = getProfile();
    const nickname = document.getElementById('profile-nickname');
    const birthdate = document.getElementById('profile-birthdate');
    const birthtime = document.getElementById('profile-birthtime');

    if (nickname) nickname.value = p.nickname || '';
    if (birthdate) birthdate.value = p.birthdate || '';
    if (birthtime) birthtime.value = (window.DateInputHelpers?.parseHourLoose(p.birthtime)) ?? '';
    setToggleActive('calendar', p.calendarType || 'solar');
    setToggleActive('gender', p.gender || '');
    renderProfilePhoto(p.photo || null);
    renderSavedNumbersPreview();
}

/* 성별/양력·음력처럼 두 버튼 중 하나를 고르는 토글의 활성 상태를 갱신 */
function setToggleActive(group, value) {
    document.querySelectorAll(`.${group}-toggle-btn`).forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === value);
    });
}

function saveProfileForm() {
    const p = getProfile();
    const nickname = document.getElementById('profile-nickname')?.value.trim() || '';
    const birthdateRaw = document.getElementById('profile-birthdate')?.value.trim() || '';
    const birthtimeRaw = document.getElementById('profile-birthtime')?.value.trim() || '';
    const H = window.DateInputHelpers;

    if (birthdateRaw && H && !H.isValidDateStr(birthdateRaw)) {
        if (typeof toast === 'function') toast('생년월일 형식을 확인해주세요 (예: 1996-05-20)');
        return;
    }
    if (birthtimeRaw && H && !H.isValidHourStr(birthtimeRaw)) {
        if (typeof toast === 'function') toast('태어난 시는 0~23 사이 숫자로 입력해주세요 (예: 14)');
        return;
    }

    p.nickname = nickname;
    p.birthdate = birthdateRaw;
    p.birthtime = birthtimeRaw;
    p.calendarType = document.querySelector('.calendar-toggle-btn.active')?.dataset.value || 'solar';
    p.gender = document.querySelector('.gender-toggle-btn.active')?.dataset.value || '';
    setProfile(p);
    if (typeof toast === 'function') toast('🪪 내 정보가 저장되었습니다');
}

/* 저장된 번호 중 최근 3세트만 미리보기로 보여줌 (전체는 "내 번호" 탭에서) */
function renderSavedNumbersPreview() {
    const wrap = document.getElementById('profile-saved-preview');
    if (!wrap) return;

    const arr = (typeof getHistory === 'function') ? getHistory() : [];
    if (!arr.length) {
        wrap.innerHTML = `<p class="text-[12px] text-slate-500 text-center py-3">아직 저장된 번호가 없어요</p>`;
        return;
    }

    wrap.innerHTML = '';
    arr.slice(0, 3).forEach((item) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;';

        const balls = document.createElement('div');
        balls.style.cssText = 'display:flex;gap:4px;flex:1;overflow:hidden;';
        item.nums.forEach((n) => {
            const ball = mkBall(n, 'mini-ball');
            ball.style.width = '26px';
            ball.style.height = '26px';
            ball.style.fontSize = '10px';
            ball.style.flexShrink = '0';
            balls.appendChild(ball);
        });

        const dateTag = document.createElement('span');
        dateTag.style.cssText = 'font-size:9.5px;color:#64748B;flex-shrink:0;';
        dateTag.textContent = item.date.split(' ')[0];

        row.append(balls, dateTag);
        wrap.appendChild(row);
    });

    if (arr.length > 3) {
        const more = document.createElement('p');
        more.style.cssText = 'font-size:11px;color:#64748B;text-align:center;margin-top:4px;';
        more.textContent = `외 ${arr.length - 3}세트 더 있음`;
        wrap.appendChild(more);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const photoInput = document.getElementById('profile-photo-input');
    const removeBtn = document.getElementById('profile-photo-remove');
    const saveBtn = document.getElementById('profile-save-btn');
    const birthdateInput = document.getElementById('profile-birthdate');
    const birthtimeInput = document.getElementById('profile-birthtime');

    if (window.DateInputHelpers) {
        window.DateInputHelpers.attachDateInput(birthdateInput);
        window.DateInputHelpers.attachHourInput(birthtimeInput);
    }

    document.querySelectorAll('.calendar-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => setToggleActive('calendar', btn.dataset.value));
    });
    document.querySelectorAll('.gender-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => setToggleActive('gender', btn.dataset.value));
    });

    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const dataUrl = await compressPhoto(file);
                const p = getProfile();
                p.photo = dataUrl;
                setProfile(p);
                renderProfilePhoto(dataUrl);
                if (typeof toast === 'function') toast('📷 사진이 등록되었습니다');
            } catch (err) {
                if (typeof toast === 'function') toast('사진을 불러오지 못했어요');
            }
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const p = getProfile();
            delete p.photo;
            setProfile(p);
            renderProfilePhoto(null);
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveProfileForm);
    }
});
