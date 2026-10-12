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
  // 멤버 특기: 매일 '특기 활동'을 하면 경험치가 쌓이고, 단계마다 칭호와 보상 (하루 멤버당 TAL_DAY 번, 체력 TAL_COST)
  var TAL_COST = 10, TAL_DAY = 3, TAL_BIG = 0.25;   // 활동 체력 / 하루 횟수 / 대성공(경험치 2배) 확률
  var TAL_AT = [10, 30, 60, 100];                    // 단계별 필요 경험치
  var SIG_REWARD = [{ coin: 200000, stone: 2 }, { coin: 400000, stone: 3, wish: 1 }, { coin: 800000, stone: 4, wish: 2 }, { coin: 1500000, stone: 6, wish: 3, protect: 1 }];   // 단계별 보상
  var TALENT = {
    minjun: { icon: '🧠', name: '독서 퀴즈', titles: ['책벌레', '암기의 달인', '퀴즈 토너먼트 우승', '걸어 다니는 도서관'],
      lines: ['도서관에서 새 책 세 권을 독파했어요.', '퀴즈 앱 연속 정답 기록을 세웠어요.', '모르는 단어를 하나도 안 남기고 정리했어요.', '친구들 퀴즈 대결에서 압승했어요.', '필기 노트가 교과서보다 두꺼워졌어요.'] },
    sion: { icon: '🎸', name: '기타', titles: ['통기타 소년', '손가락이 춤춰요', '즉흥 연주 장인', '기타의 신'],
      lines: ['어려운 코드 진행을 드디어 한 번에 쳤어요.', '새벽 연습실에서 즉흥 연주를 녹음했어요.', '줄을 새로 갈고 소리가 달라졌어요.', '거리 공연에서 박수를 받았어요.', '손끝에 굳은살이 단단하게 박였어요.'] },
    doyun: { icon: '🏊', name: '수영', titles: ['물 만난 학생회장', '자유형 에이스', '접영 스타', '수영 국가대표급'],
      lines: ['아침 수영으로 기록을 2초 줄였어요.', '접영 폼이 완벽하다는 말을 들었어요.', '친구들과 수영 시합에서 1등 했어요.', '턴 동작이 눈에 띄게 깔끔해졌어요.', '쉬지 않고 열 바퀴를 돌았어요.'] },
    harin: { icon: '🎼', name: '작곡', titles: ['새벽의 작곡가', '멜로디 수집가', '히트곡 메이커', '밤하늘의 작사가'],
      lines: ['새벽에 떠오른 멜로디를 급하게 적어 뒀어요.', '가사 한 줄이 마음에 쏙 들게 나왔어요.', '데모 곡을 끝까지 완성했어요.', '코드 진행을 바꿨더니 분위기가 확 달라졌어요.', '노트가 악보와 가사로 가득 찼어요.'] },
    yuna: { icon: '💐', name: '꽃꽂이', titles: ['꽃집 막내', '꽃꽂이 장인', '플로리스트 요정', '꽃의 마법사'],
      lines: ['색 조합이 예쁘다고 칭찬받았어요.', '새로운 꽃다발 디자인을 만들었어요.', '시든 꽃도 살려서 화병에 꽂았어요.', '리본 묶는 솜씨가 늘었어요.', '꽃집 손님이 단골이 되었어요.'] },
    ara: { icon: '🎮', name: '게임', titles: ['취미 게이머', '랭킹 상위권', '프로게이머 못지않게', '전설의 게임 퀸'],
      lines: ['랭크전에서 연승을 이어 갔어요.', '어려운 보스를 노데미지로 잡았어요.', '새 캐릭터 콤보를 완벽하게 익혔어요.', '게임 친구들이 아라를 팀에 넣고 싶어 해요.', '새벽까지 하지는 않았어요. (진짜예요)'] }
  };
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
  function load() { var o = jget(KEY, {}); o.claimed = o.claimed || {}; o.week = o.week || {}; o.talent = o.talent || {}; return o; }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  // ── 진행 읽기 ──
  function fameOf(cid) {
    var d = jget('ph_drama', {}); if (d.star && d.star[cid]) return FAME_MAX;
    var p = Number(d.fame && d.fame[cid]) || 0; return Math.max(0, Math.min(FAME_MAX, Math.floor(Math.min(100, p) * FAME_MAX / 100)));
  }
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
      var xp = ((o.talent[c] || {}).xp) || 0; TAL_AT.forEach(function (v, i) { if (xp >= v && cl.s.indexOf(i) < 0) n++; });
    });
    var w = ensureWeek(); if (!w.week.claimed && weekCount() >= WEEK_NEED) n++;
    return n;
  }
  function claim(cid, kind, i) {
    var o = load(); o.claimed[cid] = o.claimed[cid] || { a: [], s: [] };
    var cl = o.claimed[cid]; if (cl[kind].indexOf(i) >= 0) return;
    var r = kind === 'a' ? AWARDS[i][2] : SIG_REWARD[i], title = kind === 'a' ? AWARDS[i][1] : TALENT[cid].titles[i];
    cl[kind].push(i); save(o); var t = give(r);
    try { if (window.pocaSfx) window.pocaSfx.play('levelup'); } catch (e) {}
    toast(nameOf(cid) + ' · ' + title + '! ' + t); render();
  }

  // ── 특기 연습 ──
  function today() { try { return new Date().toLocaleDateString('sv'); } catch (e) { return String(Math.floor(Date.now() / 86400000)); } }
  function practice(cid) {
    var o = load(), T = o.talent[cid] = o.talent[cid] || { xp: 0, d: '', n: 0 };
    if (!debuted(cid)) { toast('데뷔한 멤버만 특기를 연습할 수 있어요'); return; }
    if (T.d !== today()) { T.d = today(); T.n = 0; }
    if (T.n >= TAL_DAY) { toast('오늘은 충분히 했어요. 내일 또 해요!'); return; }
    var sta = 0; try { sta = Number(stamina) || 0; } catch (e) {}
    if (sta < TAL_COST) { toast('체력이 부족해요! ⚡' + TAL_COST + ' 필요'); return; }
    try { stamina -= TAL_COST; if (typeof saveStamina === 'function') saveStamina(); if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    var tl = TALENT[cid], big = Math.random() < TAL_BIG, gain = big ? 2 : 1;
    T.n++; T.xp = (T.xp || 0) + gain; save(o);
    var line = tl.lines[Math.floor(Math.random() * tl.lines.length)];
    try { if (window.pocaSfx) window.pocaSfx.play(big ? 'levelup' : 'pop'); } catch (e) {}
    toast((big ? '🌟 대성공! ' : '') + nameOf(cid) + ' · ' + tl.icon + ' ' + line + ' (경험치 +' + gain + ')'); render();
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
    var tabs = '<div style="display:flex;gap:6px;margin-bottom:12px;">' + [['a', '🏆 시상식'], ['s', '✨ 특기']].map(function (t) { return '<button data-tab="' + t[0] + '" style="flex:1;border:none;border-radius:11px;padding:10px;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;' + (curTab === t[0] ? 'background:' + ACC + ';color:#2a1a00;' : 'background:rgba(255,255,255,.1);color:#ddd;') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var o = load();
    var cards = members().map(function (c) {
      var cl = o.claimed[c] || { a: [], s: [] }, rows = '', f = fameOf(c), deb = debuted(c);
      if (curTab === 'a') {
        rows = AWARDS.map(function (a, i) {
          var ok = f >= a[0], got = cl.a.indexOf(i) >= 0;
          return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);"><div style="flex:1;"><div style="font-size:13px;font-weight:900;' + (ok ? '' : 'opacity:.55;') + '">' + a[1] + '</div><div style="font-size:10.5px;color:#c9b8e8;">인지도 ' + a[0] + ' · ' + rewardText(a[2]) + '</div></div>' + btn(c, 'a', i, ok && deb, got) + '</div>';
        }).join('');
      } else {
        var tl = TALENT[c], T = (o.talent[c] || {}), xp = T.xp || 0, used = T.d === today() ? (T.n || 0) : 0;
        rows = '<div style="display:flex;align-items:center;gap:8px;padding:4px 0 8px;"><div style="flex:1;font-size:11.5px;color:#d9ccff;line-height:1.5;">' + tl.icon + ' ' + tl.name + ' 연습 · 오늘 ' + used + ' / ' + TAL_DAY + '번 · ⚡' + TAL_COST + '</div>' +
          '<button data-act="' + c + '" style="border:none;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;' + (deb && used < TAL_DAY ? 'background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff;' : 'background:rgba(255,255,255,.12);color:#999;') + '">' + (used >= TAL_DAY ? '내일 또' : '연습하기') + '</button></div>' +
          TAL_AT.map(function (n, i) {
            var ok = xp >= n, got = cl.s.indexOf(i) >= 0;
            return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);"><div style="flex:1;"><div style="font-size:13px;font-weight:900;' + (ok ? '' : 'opacity:.55;') + '">「' + tl.titles[i] + '」</div><div style="font-size:10.5px;color:#c9b8e8;">경험치 ' + n + ' · ' + rewardText(SIG_REWARD[i]) + '</div></div>' + btn(c, 's', i, ok && deb, got) + '</div>';
          }).join('');
      }
      var head = curTab === 'a' ? ('인지도 ' + f + ' / ' + FAME_MAX) : (TALENT[c].icon + ' ' + TALENT[c].name + ' · 경험치 ' + (((o.talent[c] || {}).xp) || 0) + ' / ' + TAL_AT[TAL_AT.length - 1]);
      return '<div style="background:rgba(255,255,255,.07);border-radius:16px;padding:12px 14px;margin-bottom:11px;' + (deb ? '' : 'opacity:.6;') + '"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;"><span>' + esc(nameOf(c)) + (deb ? '' : ' <span style="font-size:10.5px;color:#aaa;">데뷔 후 가능</span>') + '</span><span style="font-size:11px;color:#ffe08a;">' + head + '</span></div>' +
        bar(curTab === 'a' ? f / FAME_MAX : (((o.talent[c] || {}).xp) || 0) / TAL_AT[TAL_AT.length - 1], '#a78bfa') + '<div style="margin-top:6px;">' + rows + '</div></div>';
    }).join('');
    ov.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px;"><div style="font-size:18px;font-weight:900;">🏆 커리어</div>' +
      '<button id="cr-x" aria-label="닫기" style="width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:17px;font-weight:900;cursor:pointer;">✕</button></div>' +
      '<div style="padding:0 16px 90px;"><div style="font-size:12px;color:#c9b8e8;line-height:1.6;margin-bottom:12px;">활동할 때마다 시상식과 칭호가 쌓여요. 받을 수 있는 건 <b style="color:#ffe08a;">받기</b>를 눌러요.</div>' + weekHtml + tabs + cards + '</div>';
    $('cr-x').onclick = close; $('cr-week').onclick = claimWeek;
    ov.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { curTab = b.getAttribute('data-tab'); render(); }; });
    ov.querySelectorAll('[data-act]').forEach(function (b) { b.onclick = function () { practice(b.getAttribute('data-act')); }; });
    ov.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { claim(b.getAttribute('data-c'), b.getAttribute('data-k'), +b.getAttribute('data-i')); }; });
  }
  function btn(c, k, i, ok, got) {
    if (got) return '<span style="font-size:11px;color:#9ee7b5;font-weight:900;">받음 ✔</span>';
    if (!ok) return '<span style="font-size:11px;color:#8a7fb0;">🔒</span>';
    return '<button data-c="' + c + '" data-k="' + k + '" data-i="' + i + '" style="border:none;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;">받기</button>';
  }

  window.openCareer = open;
  window.__career = { open: open, claimable: claimable, theme: theme, weekCount: weekCount, claim: claim, AWARDS: AWARDS, TALENT: TALENT, practice: practice };
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
