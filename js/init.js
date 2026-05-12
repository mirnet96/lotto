/* ══════════════════════════════════════════════════
   js/init.js — 앱 초기화 진입점
   ══════════════════════════════════════════════════ */

async function init() {
    try {
        const res = await fetch('./lotto.json');
        lottoData = await res.json();
    } catch {
        /* lotto.json 없을 때 폴백 데이터 */
        lottoData = [
            { no:1223, date:'20260509', nums:[16,18,20,32,33,39], bonus:26, stats:{ sum:158, endsum:28, ratio:{ even_odd:'4:2', low_high:'3:3' } } },
            { no:1222, date:'20260502', nums:[4,11,17,22,32,41],  bonus:34, stats:{ sum:127, endsum:17, ratio:{ even_odd:'3:3', low_high:'4:2' } } },
            { no:1221, date:'20260425', nums:[6,13,18,28,30,36],  bonus:9,  stats:{ sum:131, endsum:31, ratio:{ even_odd:'5:1', low_high:'3:3' } } },
            { no:1220, date:'20260418', nums:[2,7,14,25,38,42],   bonus:19, stats:{ sum:128, endsum:18, ratio:{ even_odd:'3:3', low_high:'3:3' } } },
            { no:1219, date:'20260411', nums:[9,12,21,29,35,44],  bonus:3,  stats:{ sum:150, endsum:20, ratio:{ even_odd:'2:4', low_high:'2:4' } } },
            { no:1218, date:'20260404', nums:[1,8,15,27,33,40],   bonus:22, stats:{ sum:124, endsum:14, ratio:{ even_odd:'3:3', low_high:'4:2' } } },
            { no:1217, date:'20260328', nums:[5,11,19,24,36,43],  bonus:30, stats:{ sum:138, endsum:28, ratio:{ even_odd:'3:3', low_high:'3:3' } } },
            { no:1216, date:'20260321', nums:[3,10,17,28,31,45],  bonus:16, stats:{ sum:134, endsum:24, ratio:{ even_odd:'2:4', low_high:'3:3' } } },
            { no:1215, date:'20260314', nums:[7,13,22,26,37,41],  bonus:5,  stats:{ sum:146, endsum:26, ratio:{ even_odd:'3:3', low_high:'3:3' } } },
            { no:1214, date:'20260307', nums:[2,9,18,23,34,42],   bonus:28, stats:{ sum:128, endsum:18, ratio:{ even_odd:'4:2', low_high:'4:2' } } },
        ];
    }

    freqMap = {};
    lottoData.forEach(d => d.nums.forEach(n => { freqMap[n] = (freqMap[n] || 0) + 1; }));
    if (lottoData.length)
        avgSum = Math.round(lottoData.reduce((a, b) => a + b.stats.sum, 0) / lottoData.length);

    generateAll();
    buildStats();
    refreshBadges();
}

init();
