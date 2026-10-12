// ════════════════════════════════════════════════════════════
// 🏆 커리어 (career.js) — 20레벨 이후의 중간 목표 + 멤버 개성 목표 + 주간 테마
//  ① 시상식 단계: 멤버의 인지도(드라마 촬영)가 150/400/700/1050/1350 이 될 때마다 상을 받고 보상 (탑스타 1500 까지 가는 길의 이정표)
//  ② 개성 목표: 멤버마다 '대표 능력' 하나가 있고, 그 능력치가 40/60/80/100 이 될 때마다 칭호와 보상
//  ③ 주간 테마: 매주 월요일에 테마가 바뀌어요. 그 주 테마 맵은 보상 ×1.5, 5번 깨면 주간 상자
// 보상은 '받기' 버튼을 눌러야 지급돼요 (놓치지 않게 더보기 메뉴에 알림 점)
// ✏️ 값 바꾸는 곳: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var IDS = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];
  var FAME_MAX = 1500;   // worldstar.js / drama.js 의 FAME_GOAL 과 같게
  // 시상식 단계 [인지도, 이름, 보상]
  var AWARDS = [
    [150, '🌱 신인상', { coin: 300000, stone: 2 }],
    [400, '⭐ 인기상', { coin: 600000, stone: 3, wish: 1 }],
    [700, '🎵 베스트 아티스트', { coin: 1000000, stone: 4, wish: 2 }],
    [1050, '🏅 대상 후보', { coin: 1500000, stone: 5, wish: 2, protect: 1 }],
    [1350, '🏆 올해의 아티스트', { coin: 2500000, stone: 8, wish: 3, protect: 2 }]
  ];
  // 멤버 개성: 대표 능력 (vocal 보컬 / dance 댄스 / act 연기 / fun 예능 / charm 매력) + 칭호 4개
  var SIG = {
    minjun: { k: 'act', titles: ['대본 읽는 청년', '믿고 보는 연기', '연기 천재', '국민 배우'] },
    sion: { k: 'vocal', titles: ['기타 소년', '무대 위의 목소리', '락 보컬리스트', '전설의 프론트맨'] },
    doyun: { k: 'charm', titles: ['학생회장', '카리스마 리더', '시선 강탈', '왕의 아우라'] },
    harin: { k: 'vocal', titles: ['새벽의 목소리', '감성 보컬', '소름 돋는 음색', '밤하늘의 디바'] },
    yuna: { k: 'fun', titles: ['봄바람 막내', '분위기 메이커', '예능 요정', '국민 예능돌'] },
    ara: { k: 'dance', titles: ['무대의 시작', '시선 집중 댄서', '퍼포먼스 퀸', '무대의 여왕'] }
  };
  var SIG_AT = [40, 60, 80, 100];
  var SIG_REWARD = [
    { coin: 200000, stone: 2 }, { coin: 400000, stone: 3, wish: 1 }, { coin: 800000, stone: 4, wish: 2 }, { coin: 1500000, stone: 6, wish: 3, protect: 1 }
  ];
  var STAT_NAME = { vocal: '보컬', dance: '댄스', act: '연기', fun: '예능', charm: '매력' };
  // 주간 테마: map = 원정 맵 id (보상 ×BONUS) / 'drama' = 드라마 촬영 횟수만 센다
  var WEEK_NEED = 5, BONUS = 1.5;
  var WEEK_REWARD = { coin: 1000000, stone: 6, wish: 3, protect: 1 };
  var THEMES = [
    { id: 'rhythm_stage', map: 'rhythm_stage', icon: '🎧', name: '음악방송 주간', tip: '음악방송 리허설장을 5번 깨요' },
    { id: 'paparazzi_run', map: 'paparazzi_run', icon: '🕵️', name: '파파라치 탈출 주간', tip: '파파라치 탈출을 5번 깨요' },
    { id: 'drama', map: null, icon: '🎬', name: '드라마 촬영 주간', tip: '드라마 촬영을 5번 해요' },
    { id: 'world_tour', map: 'world_tour', icon: '🏟️', name: '월드투어 주간', tip: '월드투어 스타디움을 5번 깨요' }
  ];
  var KEY = 'ph_career';
  var ACC = '#fbbf24';

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function $(id) { return document.getElementById(id); }
  function toast(m) { try { showBagToast(m); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
  function nameOf(cid) { try { return CHARS[cid].name.replace(/[^\u0000-\u007F가-힣\s]/g, '').trim(); } catch (e) { return cid; } }
  function load() { var o = jget(KEY, {}); o.claimed = o.claimed || {}; o.week = o.week || {}; return o; }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  // ── 진행 읽기 ──
  function fameOf(cid) {
    var d = jget('ph_drama', {}); if (d.star && d.star[cid]) return FAME_MAX;
    var p = Number(d.fame && d.fame[cid]) || 0; return Math.max(0, Math.min(FAME_MAX, Math.floor(Math.min(100, p) * FAME_MAX / 100)));
  }
  function statOf(cid, k) { var t = jget('ph_training', {}), o = (t.stat && t.stat[cid]) || {}; return typeof o[k] === 'number' ? o[k] : 10; }
  function debuted(cid) { var a = jget('ph_agency', {}); return !!((a.done && a.done[cid]) || (a.debut && a.debut[cid])); }
  function members() { return IDS.filter(function (c) { try { return !!CHARS[c]; } catch (e) { return false; } }); }

  // ── 보상 지급 ──
  function give(r) {
    var parts = [];
    try {
      if (r.coin) { coins += r.coin; parts.push('🍔 ' + fmt(r.coin)); }
      if (r.stone || r.protect) {
        var e = jget('ph_enhance', {}); e.stone = Math.floor(Number(e.stone) || 0) + (r.stone || 0); e.protect = Math.floor(Number(e.protect) || 0) + (r.protect || 0);
        localStorage.setItem('ph_enhance', JSON.stringify(e));
        if (r.stone) parts.push('🔨 강화석 ×' + r.stone); if (r.protect) parts.push('🛡️ 방지권 ×' + r.protect);
      }
      if (r.wish) { wishFragments = Math.floor(Number(wishFragments) || 0) + r.wish; localStorage.setItem('ph_wish', wishFragments); parts.push('🧩 소원의 조각 ×' + r.wish); }
      if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      if (typeof saveAll === 'function') saveAll();
    } catch (e) {}
    return parts.join(' · ');
  }
  function rewardText(r) { var p = []; if (r.coin) p.push('🍔' + (r.coin >= 10000 ? Math.round(r.coin / 10000) + '만' : r.coin)); if (r.stone) p.push('🔨' + r.stone); if (r.wish) p.push('🧩' + r.wish); if (r.protect) p.push('🛡️' + r.protect); return p.join(' '); }

  // ── 주간 테마 ──
  function weekId() { var d = new Date(), t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); return Math.floor((t - Date.UTC(2024, 0, 1)) / 86400000 / 7); }   // 2024-01-01 은 월요일
  function theme() { return THEMES[weekId() % THEMES.length]; }
  function clearsOf(id) { return Number((jget('ph_xk_clears', {}) || {})[id]) || 0; }
  function ensureWeek() {
    var o = load(), id = weekId();
    if (o.week.id !== id) { o.week = { id: id, base: clearsOf(theme().map || ''), drama: 0, claimed: 0 }; save(o); }
    return o;
  }
  function weekCount() {
    var o = ensureWeek(), th = theme();
    return th.map ? Math.max(0, clearsOf(th.map) - (o.week.base || 0)) : (o.week.drama || 0);
  }
  window.addEventListener('ph-drama-shot', function () { try { var o = ensureWeek(); o.week.drama = (o.week.drama || 0) + 1; save(o); } catch (e) {} });
  window.__weekBonus = function (mapId) { try { return theme().map === mapId ? BONUS : 1; } catch (e) { return 1; } };   // expedition-kit.js 가 부름
  function claimWeek() {
    var o = ensureWeek(); if (o.week.claimed) return; if (weekCount() < WEEK_NEED) { toast('아직 ' + (WEEK_NEED - weekCount()) + '번 더 해야 해요'); return; }
    o.week.claimed = 1; save(o); var t = give(WEEK_REWARD);
    try { if (window.pocaSfx) window.pocaSfx.play('reward'); } catch (e) {}
    toast('🎁 주간 상자! ' + t); render();
  }

  // ── 받을 수 있는 것 ──
  function claimable() {
    var o = load(), n = 0;
    members().forEach(function (c) {
      if (!debuted(c)) return;
      var cl = o.claimed[c] || { a: [], s: [] }, f = fameOf(c);
      AWARDS.forEach(function (a, i) { if (f >= a[0] && cl.a.indexOf(i) < 0) n++; });
      var sg = SIG[c]; if (sg) SIG_AT.forEach(function (v, i) { if (statOf(c, sg.k) >= v && cl.s.indexOf(i) < 0) n++; });
    });
    var w = ensureWeek(); if (!w.week.claimed && weekCount() >= WEEK_NEED) n++;
    return n;
  }
  function claim(cid, kind, i) {
    var o = load(); o.claimed[cid] = o.claimed[cid] || { a: [], s: [] };
    var cl = o.claimed[cid]; if (cl[kind].indexOf(i) >= 0) return;
    var r = kind === 'a' ? AWARDS[i][2] : SIG_REWARD[i], title = kind === 'a' ? AWARDS[i][1] : SIG[cid].titles[i];
    cl[kind].push(i); save(o); var t = give(r);
    try { if (window.pocaSfx) window.pocaSfx.play('levelup'); } catch (e) {}
    toast(nameOf(cid) + ' · ' + title + '! ' + t); render();
  }

  // ── 화면 ──
  var curTab = 'a';
  function close() { var o = $('cr-ov'); if (o) o.remove(); }
  function open() {
    close();
    var ov = document.createElement('div'); ov.id = 'cr-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:950;background:linear-gradient(160deg,#1a1a2e,#2d1b4e);overflow-y:auto;-webkit-overflow-scrolling:touch;color:#fff;font-family:\'Noto Sans KR\',sans-serif;';
    document.body.appendChild(ov); render();
  }
  function bar(p, col) { return '<div style="height:7px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:5px;"><div style="width:' + Math.round(Math.max(0, Math.min(1, p)) * 100) + '%;height:100%;background:' + col + ';"></div></div>'; }
  function render() {
    var ov = $('cr-ov'); if (!ov) return;
    var th = theme(), cnt = Math.min(WEEK_NEED, weekCount()), wk = ensureWeek().week, done = !!wk.claimed, can = !done && cnt >= WEEK_NEED;
    var weekHtml = '<div style="background:rgba(251,191,36,.12);border:1.5px solid ' + ACC + ';border-radius:16px;padding:13px 14px;margin-bottom:14px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-size:14px;font-weight:900;">' + th.icon + ' 이번 주 테마 · ' + th.name + '</div><div style="font-size:11px;color:#ffe08a;">' + (th.map ? '보상 ×' + BONUS : '') + '</div></div>' +
      '<div style="font-size:12px;color:#e9ddff;margin-top:4px;line-height:1.6;">' + th.tip + (th.map ? ' · 이 맵 보상이 <b>×' + BONUS + '</b>' : '') + '</div>' + bar(cnt / WEEK_NEED, ACC) +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:7px;"><span style="font-size:12px;font-weight:900;">' + cnt + ' / ' + WEEK_NEED + ' · 🎁 ' + rewardText(WEEK_REWARD) + '</span>' +
      '<button id="cr-week" style="border:none;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;' + (can ? 'background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;' : 'background:rgba(255,255,255,.12);color:#aaa;') + '">' + (done ? '받음 ✔' : can ? '받기' : '진행 중') + '</button></div></div>';
    var tabs = '<div style="display:flex;gap:6px;margin-bottom:12px;">' + [['a', '🏆 시상식'], ['s', '✨ 개성']].map(function (t) { return '<button data-tab="' + t[0] + '" style="flex:1;border:none;border-radius:11px;padding:10px;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;' + (curTab === t[0] ? 'background:' + ACC + ';color:#2a1a00;' : 'background:rgba(255,255,255,.1);color:#ddd;') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var o = load();
    var cards = members().map(function (c) {
      var cl = o.claimed[c] || { a: [], s: [] }, rows = '', f = fameOf(c), deb = debuted(c);
      if (curTab === 'a') {
        rows = AWARDS.map(function (a, i) {
          var ok = f >= a[0], got = cl.a.indexOf(i) >= 0;
          return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);"><div style="flex:1;"><div style="font-size:13px;font-weight:900;' + (ok ? '' : 'opacity:.55;') + '">' + a[1] + '</div><div style="font-size:10.5px;color:#c9b8e8;">인지도 ' + a[0] + ' · ' + rewardText(a[2]) + '</div></div>' + btn(c, 'a', i, ok && deb, got) + '</div>';
        }).join('');
      } else {
        var sg = SIG[c], v = sg ? statOf(c, sg.k) : 0;
        rows = sg ? SIG_AT.map(function (n, i) {
          var ok = v >= n, got = cl.s.indexOf(i) >= 0;
          return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);"><div style="flex:1;"><div style="font-size:13px;font-weight:900;' + (ok ? '' : 'opacity:.55;') + '">「' + sg.titles[i] + '」</div><div style="font-size:10.5px;color:#c9b8e8;">' + STAT_NAME[sg.k] + ' ' + n + ' · ' + rewardText(SIG_REWARD[i]) + '</div></div>' + btn(c, 's', i, ok && deb, got) + '</div>';
        }).join('') : '';
      }
      var head = curTab === 'a' ? ('인지도 ' + f + ' / ' + FAME_MAX) : (SIG[c] ? '대표 능력 · ' + STAT_NAME[SIG[c].k] + ' ' + statOf(c, SIG[c].k) : '');
      return '<div style="background:rgba(255,255,255,.07);border-radius:16px;padding:12px 14px;margin-bottom:11px;' + (deb ? '' : 'opacity:.6;') + '"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;"><span>' + esc(nameOf(c)) + (deb ? '' : ' <span style="font-size:10.5px;color:#aaa;">데뷔 후 가능</span>') + '</span><span style="font-size:11px;color:#ffe08a;">' + head + '</span></div>' +
        bar(curTab === 'a' ? f / FAME_MAX : (SIG[c] ? statOf(c, SIG[c].k) / 100 : 0), '#a78bfa') + '<div style="margin-top:6px;">' + rows + '</div></div>';
    }).join('');
    ov.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px;"><div style="font-size:18px;font-weight:900;">🏆 커리어</div>' +
      '<button id="cr-x" aria-label="닫기" style="width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:17px;font-weight:900;cursor:pointer;">✕</button></div>' +
      '<div style="padding:0 16px 90px;"><div style="font-size:12px;color:#c9b8e8;line-height:1.6;margin-bottom:12px;">활동할 때마다 시상식과 칭호가 쌓여요. 받을 수 있는 건 <b style="color:#ffe08a;">받기</b>를 눌러요.</div>' + weekHtml + tabs + cards + '</div>';
    $('cr-x').onclick = close; $('cr-week').onclick = claimWeek;
    ov.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { curTab = b.getAttribute('data-tab'); render(); }; });
    ov.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { claim(b.getAttribute('data-c'), b.getAttribute('data-k'), +b.getAttribute('data-i')); }; });
  }
  function btn(c, k, i, ok, got) {
    if (got) return '<span style="font-size:11px;color:#9ee7b5;font-weight:900;">받음 ✔</span>';
    if (!ok) return '<span style="font-size:11px;color:#8a7fb0;">🔒</span>';
    return '<button data-c="' + c + '" data-k="' + k + '" data-i="' + i + '" style="border:none;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;">받기</button>';
  }

  window.openCareer = open;
  window.__career = { open: open, claimable: claimable, theme: theme, weekCount: weekCount, claim: claim, AWARDS: AWARDS, SIG: SIG };
  ensureWeek();

  // ── 더보기 메뉴 칸 + 알림 점 ──
  function whenReady(cond, fn) { if (cond()) fn(); else setTimeout(function () { whenReady(cond, fn); }, 150); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu; if (orig.__crWrapped) return;
    var w = function () {
      var res = orig.apply(this, arguments);
      try {
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-career-tile')) {
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🏆', '커리어', ACC, 'openCareer()'));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-career-tile';
        }
      } catch (e) {}
      return res;
    };
    w.__crWrapped = true; window.openMoreMenu = w;
  });
  window.__moreAlerts = (window.__moreAlerts || []).concat([{ re: /커리어/, fn: function () { try { return claimable() > 0; } catch (e) { return false; } } }]);
})();
