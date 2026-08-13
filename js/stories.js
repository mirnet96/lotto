/* ══════════════════════════════════════════════════
   js/stories.js — 최신 이야기(로또 잡학·역사) 위젯 API 연동 (홈 화면)
   GET https://lotto.smart-alba.com/api/stories/latest
   ══════════════════════════════════════════════════ */

const STORIES_LATEST_API = 'https://lotto.smart-alba.com/api/stories/latest';
const STORIES_DETAIL_BASE = 'https://lotto.smart-alba.com/stories/';

const CATEGORY_LABELS = {
    world_lottery: '세계의 복권',
    history_myth: '역사 속 이야기',
};

async function loadLatestStories() {
    const widget = document.getElementById('stories-widget');
    const listEl = document.getElementById('stories-list');
    if (!widget || !listEl) return;

    try {
        const res = await fetch(STORIES_LATEST_API);
        const json = await res.json();
        const stories = json.data ?? json; // 리소스 컬렉션이 data로 감싸져 오거나 배열 그대로 올 수 있어 둘 다 대응

        if (!Array.isArray(stories) || stories.length === 0) {
            widget.style.display = 'none';
            return;
        }

        listEl.innerHTML = '';
        stories.slice(0, 5).forEach((story) => {
            listEl.appendChild(renderStoryCard(story));
        });

        widget.style.display = 'block';
    } catch (e) {
        console.warn('최신 이야기를 불러오지 못했습니다.', e);
        widget.style.display = 'none';
    }
}

function renderStoryCard(story) {
    const a = document.createElement('a');
    a.href = STORIES_DETAIL_BASE + encodeURIComponent(story.slug ?? '');
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.cssText = 'display:flex;gap:10px;align-items:center;background:#1A2744;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:10px 12px;text-decoration:none;color:inherit;';

    const categoryLabel = CATEGORY_LABELS[story.category] ?? '이야기';
    const title = story.title ?? '';
    const summary = story.summary ?? '';

    const hasImage = !!story.hero_image_url;
    a.innerHTML = `
        ${hasImage
            ? `<img src="${escapeHtml(story.hero_image_url)}" alt="" style="width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#0F172A;">`
            : `<div style="width:52px;height:52px;border-radius:8px;flex-shrink:0;background:linear-gradient(135deg,rgba(245,200,66,.15),rgba(59,130,246,.1));display:flex;align-items:center;justify-content:center;font-size:20px;">📖</div>`
        }
        <div style="min-width:0;flex:1;">
            <p style="font-size:9.5px;color:#F5C842;font-weight:700;margin:0 0 2px;">${escapeHtml(categoryLabel)}</p>
            <p style="font-size:12.5px;color:#E2E8F0;font-weight:600;margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title)}</p>
            <p style="font-size:11px;color:#64748B;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(summary)}</p>
        </div>
        <span class="material-symbols-rounded" style="font-size:16px;color:#64748B;flex-shrink:0;">chevron_right</span>
    `;
    return a;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadLatestStories);
