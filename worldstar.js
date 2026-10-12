// ════════════════════════════════════════════════════════════
// 🌟 월드스타 로드맵 (worldstar.js)
// 더보기 → [월드스타]. 아이돌 6명이 "월드스타"가 되기까지 어디까지 왔는지 한 화면에 모아 보여준다.
//   목표(이야기): 기획사를 일으켜 전원 월드스타가 되면 카드 세상으로 돌아갈 수 있다.
//   멤버마다 8단계 → 전부 채우면 '월드스타 선언' 가능 (선언하면 보상 코인 + 월드스타 표시)
//   [기본 4단계]
//     1) 🎤 데뷔        — 기획사 데뷔 성공 (agency.js)
//     2) ⭐ 탑스타       — 드라마 인지도 1500 (drama.js)
//     3) 🎓 실력         — 능력치 5개 합계 GOAL_SKILL 이상 (lesson.js)
//     4) 💞 인연         — 호감 단계(인연 Lv) GOAL_BOND 이상 (game.js)
//   [월드 도전 4단계 — 기본 4단계를 다 채워야 열림]
//     5) 🎬 해외 영화    — 드라마 촬영에서 '할리우드 블록버스터' 대본을 히든 카드로 시청률 13% 이상
//     6) 🌍 월드 투어    — 도쿄·파리·뉴욕 3개 도시 무대(오디션 게임)를 차례로 통과 (체력 소모)
//     7) 👑 전용 조건    — 그룹이 '국민 그룹' 이상 + 이 멤버가 초월 2단계 이상
//     8) 🌐 세계 반응    — 하루 1번 해외 상황 이벤트에서 선택해 반응 포인트 100 모으기
//   각 칸에는 "지금 하러 가기" 버튼이 붙어 해당 화면으로 바로 이동한다.
//   위쪽 "오늘의 추천"은 가장 완성에 가까운 멤버의 다음 할 일을 하나 골라 알려준다.
//   엔딩 연출은 아직 없음(정식 오픈 때) — 6/6 이 되면 안내 문구만 보여준다.
// 저장: localStorage 'ph_worldstar' { cid: 선언한 시각 } / 'ph_worldstar_prog' { cid: {film, tour, react, reactDay} }  (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// ✏️ 고치는 법: 아래 설정만 고치면 됨.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.__worldstarLoaded) return; window.__worldstarLoaded = true;

  // ════════ 설정 ════════
  var KEY = 'ph_worldstar';
  var IDS = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];
  var GOAL_FAME = 1500;       // drama.js FAME_GOAL 과 같은 값
  var GOAL_SKILL = 400;       // 능력치 5개 합계 (만점 500)
  var GOAL_BOND = 10;         // 인연 Lv (최대 20)
  var REWARD_COIN = 50000000; // 월드스타 선언 보상 (하루 수입 기준)
  var FILM_ID = 'hollywood', FILM_RATING = 13;     // 해외 영화 대본 id / 필요한 시청률(%)
  var CITIES = [ { n: '도쿄', need: 0.7, spd: 1.1 }, { n: '파리', need: 0.82, spd: 1.3 }, { n: '뉴욕', need: 0.92, spd: 1.5 } ];   // 월드 투어 도시 / 통과 점수 / 게이지 속도
  var TOUR_COST = 10, TOUR_MIN_STA = 15;           // 투어 한 번에 깎이는 체력 / 이 체력 미만이면 못 나감
  var GROUP_LV = 4;                                // 그룹 등급 (0신인 1라이징 2인기 3대세 4국민 5월드) — 4 = 국민 그룹 이상
  var REACT_GOAL = 300;                            // 세계 반응 목표 포인트
  var ACC = '#FFD700';

  // ════════ 데이터 읽기 (읽기만 함) ════════
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return (v && typeof v === 'object') ? v : d; } catch (e) { return d; } }
  function loadWS() { return jget(KEY, {}); }
  function saveWS(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name.replace(/[^\u0000-\u007F가-힣\s]/g, '').trim(); } catch (e) { return cid; } }
  function isDebut(cid) { var a = jget('ph_agency', {}); return !!((a.done && a.done[cid]) || (a.debut && a.debut[cid])); }
  function fameOf(cid) {
    var d = jget('ph_drama', {}); if (d.star && d.star[cid]) return GOAL_FAME;
    var p = Number(d.fame && d.fame[cid]) || 0; return Math.max(0, Math.min(GOAL_FAME, Math.floor(Math.min(100, p) * GOAL_FAME / 100)));
  }
  function skillOf(cid) {
    var t = jget('ph_training', {}), o = (t.stat && t.stat[cid]) || {}, sum = 0;
    ['vocal', 'dance', 'act', 'fun', 'charm'].forEach(function (k) { sum += (typeof o[k] === 'number') ? o[k] : 10; });
    return sum;
  }
  function bondOf(cid) { try { return Number(getAffectionGateLevel(cid)) || 1; } catch (e) { return 1; } }

  // ── 월드 도전 진행 저장 ──
  function loadP() { return jget('ph_worldstar_prog', {}); }
  function saveP(o) { try { localStorage.setItem('ph_worldstar_prog', JSON.stringify(o)); } catch (e) {} }
  function progOf(cid) { var o = loadP(); return o[cid] || { film: 0, tour: 0, react: 0, reactDay: '' }; }
  function setProg(cid, patch) { var o = loadP(); var c = o[cid] || { film: 0, tour: 0, react: 0, reactDay: '' }; Object.keys(patch).forEach(function (k) { c[k] = patch[k]; }); o[cid] = c; saveP(o); }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function groupLv() {
    var g = jget('ph_group', {}), f = Number(g.fame) || 0;
    try { if (window.__groupTest && g.group) return window.__groupTest.levelOf(f); } catch (e) {}
    var T = [0, 80, 240, 560, 1100, 2000], lv = 0; for (var i = 0; i < T.length; i++) if (f >= T[i]) lv = i; return g.group ? lv : -1;
  }
  function transcendOf(cid) { try { return Number(window.getTranscendStage(cid)) || 0; } catch (e) { return 0; } }

  // 한 멤버의 8단계 상태 (1~4 기본 / 5~8 월드 도전)
  function stepsOf(cid) {
    var deb = isDebut(cid), fame = fameOf(cid), sk = skillOf(cid), bd = bondOf(cid), P = progOf(cid);
    var base = [
      { k: 'debut', icon: '🎤', name: '데뷔', now: deb ? 1 : 0, goal: 1, text: deb ? '데뷔 완료' : '아직 연습생', go: '기획사', fn: 'openAgency' },
      { k: 'star', icon: '⭐', name: '탑스타', now: fame, goal: GOAL_FAME, text: fame + ' / ' + GOAL_FAME + (fame >= GOAL_FAME ? ' (탑스타)' : ''), go: '드라마 촬영', fn: 'openDrama' },
      { k: 'skill', icon: '🎓', name: '실력', now: Math.min(sk, GOAL_SKILL), goal: GOAL_SKILL, text: sk + ' / ' + GOAL_SKILL, go: '레슨 받기', fn: 'openMealSchedule' },
      { k: 'bond', icon: '💞', name: '인연', now: Math.min(bd, GOAL_BOND), goal: GOAL_BOND, text: 'Lv.' + bd + ' / Lv.' + GOAL_BOND, go: '호감작하기', fn: 'bond' }
    ];
    base.forEach(function (x) { x.done = x.now >= x.goal; x.ratio = Math.min(1, x.now / x.goal); x.world = false; });
    var baseDone = base.every(function (x) { return x.done; });
    var gl = groupLv(), tr = transcendOf(cid), exNow = (gl >= GROUP_LV ? 1 : 0) + (tr >= 2 ? 1 : 0);
    var world = [
      { k: 'film', icon: '🎬', name: '해외 영화', now: P.film ? 1 : 0, goal: 1, text: P.film ? '촬영 완료' : '드라마 촬영 → 할리우드 블록버스터 (시청률 ' + FILM_RATING + '%+)', go: '촬영하기', fn: 'openDrama' },
      { k: 'tour', icon: '🌍', name: '월드 투어', now: Math.min(P.tour || 0, CITIES.length), goal: CITIES.length, text: (P.tour || 0) + ' / ' + CITIES.length + ' 도시 (' + CITIES.map(function (c) { return c.n; }).join('·') + ')', go: '투어 가기', fn: 'tour' },
      { k: 'ex', icon: '👑', name: '전용 조건', now: exNow, goal: 2, text: (gl >= GROUP_LV ? '✔' : '✖') + ' 국민 그룹 이상 · ' + (tr >= 2 ? '✔' : '✖') + ' 초월 2단계', go: gl >= GROUP_LV ? '초월하러' : '그룹 가기', fn: gl >= GROUP_LV ? 'openEnhance' : 'openGroup' },
      { k: 'react', icon: '🌐', name: '세계 반응', now: Math.min(P.react || 0, REACT_GOAL), goal: REACT_GOAL, text: (P.react || 0) + ' / ' + REACT_GOAL + ' 포인트', go: P.reactDay === todayStr() ? '내일 또' : '반응 보기', fn: 'react' }
    ];
    world.forEach(function (x) { x.done = x.now >= x.goal; x.ratio = Math.min(1, x.now / x.goal); x.world = true; x.locked = !baseDone; });
    return base.concat(world);
  }
  function statusOf(cid) {
    var st = stepsOf(cid), done = st.filter(function (s) { return s.done; }).length;
    var ws = loadWS();
    return { cid: cid, steps: st, done: done, total: st.length, ready: done === st.length && !ws[cid], world: !!ws[cid],
      score: st.reduce(function (a, s) { return a + s.ratio; }, 0) / st.length };
  }
  function allStatus() { return IDS.filter(function (c) { try { return !!CHARS[c]; } catch (e) { return false; } }).map(statusOf); }

  // ════════ 화면 ════════
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
  function toast(msg) {
    var old = $('ws-toast'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'ws-toast';
    el.style.cssText = 'position:fixed;left:50%;top:62px;transform:translateX(-50%);z-index:1400;background:rgba(20,20,40,.96);border:1.5px solid ' + ACC + ';border-radius:14px;padding:9px 16px;color:#fff;font-size:13px;font-weight:900;max-width:86%;text-align:center;pointer-events:none;';
    el.textContent = msg; document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 2600);
  }
  function close() { var o = $('ws-ov'); if (o) o.remove(); }
  function go(fn, cid) {
    if (fn === 'tour') { openTour(cid); return; }
    if (fn === 'react') { openReact(cid); return; }
    close();
    try {
      if (fn === 'bond') { if (typeof goTo === 'function') goTo('bond'); return; }
      if (typeof window[fn] === 'function') window[fn]();
      else toast('아직 열 수 없는 화면이에요');
    } catch (e) { toast('아직 열 수 없는 화면이에요'); }
  }
  function nextStep(s) { for (var i = 0; i < s.steps.length; i++) if (!s.steps[i].done && !s.steps[i].locked) return s.steps[i]; return null; }

  function recommend(list) {
    var best = null;
    list.forEach(function (s) { if (s.world || s.ready) return; if (!best || s.score > best.score) best = s; });
    if (!best) return null;
    var st = nextStep(best);
    return st ? { cid: best.cid, step: st } : null;
  }

  function stepRow(s, cid) {
    var pct = Math.round(s.ratio * 100);
    return '<div style="display:flex;align-items:center;gap:8px;margin-top:7px;' + (s.locked ? 'opacity:.5;' : '') + '">' +
      '<div style="width:62px;font-size:12px;font-weight:900;color:' + (s.done ? ACC : '#cbd5e1') + ';white-space:nowrap;">' + s.icon + ' ' + s.name + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="height:7px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:' + (s.done ? 'linear-gradient(90deg,#FFD700,#ffb347)' : 'linear-gradient(90deg,#FF6B9D,#C084FC)') + ';"></div></div>' +
      '<div style="font-size:10px;color:#9ab;margin-top:2px;">' + esc(s.text) + '</div></div>' +
      (s.done ? '<div style="width:62px;text-align:center;font-size:11px;color:' + ACC + ';font-weight:900;">✔ 완료</div>'
        : s.locked ? '<div style="width:62px;text-align:center;font-size:10.5px;color:#7d7aa0;font-weight:900;">🔒 잠김</div>'
        : '<button data-go="' + s.fn + '" data-cid="' + cid + '" style="width:62px;border:none;border-radius:9px;padding:6px 0;font-size:10.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,.14);color:#fff;font-family:inherit;">' + s.go + '</button>') +
      '</div>';
  }

  function secHead(t) { return '<div style="margin-top:11px;font-size:11px;font-weight:900;color:#c9b8e8;border-top:1px solid rgba(255,255,255,.1);padding-top:8px;">' + t + '</div>'; }
  function card(s) {
    var face = '<div style="width:54px;height:54px;flex:0 0 auto;border-radius:50%;overflow:hidden;border:2px solid ' + (s.world ? ACC : 'rgba(255,255,255,.3)') + ';background:#2a2250;"><img src="face-' + s.cid + '.png" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;object-position:center top;"></div>';
    var tag = s.world ? '<span style="background:linear-gradient(135deg,#FFD700,#ff9f1c);color:#3a2500;border-radius:8px;padding:2px 8px;font-size:11px;font-weight:900;">🌟 월드스타</span>'
      : '<span style="background:rgba(255,255,255,.12);border-radius:8px;padding:2px 8px;font-size:11px;font-weight:800;color:#cbd5e1;">' + s.done + ' / ' + s.total + ' 단계</span>';
    var action = '';
    if (s.ready) action = '<button data-declare="' + s.cid + '" style="width:100%;margin-top:11px;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;font-family:inherit;">🌟 월드스타 선언하기!</button>';
    return '<div style="background:rgba(255,255,255,.07);border:1.5px solid ' + (s.world ? ACC : s.ready ? '#FFD700' : 'rgba(255,255,255,.1)') + ';border-radius:16px;padding:13px;margin-bottom:11px;">' +
      '<div style="display:flex;align-items:center;gap:11px;">' + face + '<div style="flex:1;"><div style="font-size:16px;font-weight:900;">' + esc(nameOf(s.cid)) + '</div><div style="margin-top:3px;">' + tag + '</div></div></div>' +
      (s.world ? '<div style="margin-top:9px;font-size:12px;color:#ffe08a;">카드 세상으로 돌아갈 준비를 마쳤어요!</div>' : secHead('기본 단계') + s.steps.filter(function (x) { return !x.world; }).map(function (x) { return stepRow(x, s.cid); }).join('') + secHead('월드 도전' + (s.steps[4].locked ? ' (기본 4단계를 채우면 열려요)' : '')) + s.steps.filter(function (x) { return x.world; }).map(function (x) { return stepRow(x, s.cid); }).join('') + action) +
      '</div>';
  }

  function render() {
    var ov = $('ws-ov'); if (!ov) return;
    var list = allStatus(), worlds = list.filter(function (s) { return s.world; }).length, total = list.length || 6;
    var rec = recommend(list), recHtml = '';
    if (rec) {
      recHtml = '<div style="background:linear-gradient(135deg,rgba(255,107,157,.22),rgba(192,132,252,.22));border:1.5px solid rgba(255,255,255,.2);border-radius:16px;padding:12px 14px;margin-bottom:14px;">' +
        '<div style="font-size:11px;font-weight:900;color:#ffd7ec;">👆 오늘의 추천</div>' +
        '<div style="font-size:14px;font-weight:900;margin:4px 0 8px;">' + esc(nameOf(rec.cid)) + ' · ' + rec.step.icon + ' ' + rec.step.name + ' (' + esc(rec.step.text) + ')</div>' +
        '<button data-go="' + rec.step.fn + '" style="border:none;border-radius:11px;padding:9px 16px;font-size:13px;font-weight:900;cursor:pointer;background:#fff;color:#7a2a6a;font-family:inherit;">' + rec.step.go + ' 가기</button></div>';
    } else if (list.some(function (s) { return s.ready; })) {
      recHtml = '<div style="background:rgba(255,215,0,.16);border:1.5px solid #FFD700;border-radius:16px;padding:12px 14px;margin-bottom:14px;font-size:13px;font-weight:900;">🌟 월드스타 선언을 할 수 있는 멤버가 있어요!</div>';
    }
    var end = worlds >= total ? '<div style="background:rgba(255,215,0,.16);border:1.5px solid #FFD700;border-radius:16px;padding:14px;margin-bottom:14px;text-align:center;font-size:13px;font-weight:900;line-height:1.6;">🎉 전원 월드스타!<br><span style="font-weight:600;color:#ffe9a8;">카드 세상으로 돌아가는 이야기는 정식 오픈 때 공개돼요.</span></div>' : '';
    ov.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px;">' +
      '<div style="font-size:18px;font-weight:900;">🌟 월드스타 로드맵</div>' +
      '<button id="ws-close" aria-label="닫기" style="width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:17px;font-weight:900;cursor:pointer;">✕</button></div>' +
      '<div style="padding:0 16px 90px;">' +
      '<div style="font-size:12px;color:#c9b8e8;line-height:1.6;margin-bottom:12px;">기획사를 일으켜 <b style="color:#ffe08a;">전원 월드스타</b>가 되면, 카드 속 세상으로 돌아갈 수 있어요. 멤버마다 기본 4단계 + 월드 도전 4단계를 채우면 월드스타 선언!</div>' +
      '<div style="background:rgba(255,255,255,.07);border-radius:16px;padding:12px 14px;margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;"><span>월드스타</span><span style="color:' + ACC + ';">' + worlds + ' / ' + total + '명</span></div>' +
      '<div style="height:10px;border-radius:6px;background:rgba(255,255,255,.12);margin-top:7px;overflow:hidden;"><div style="width:' + Math.round(worlds / total * 100) + '%;height:100%;background:linear-gradient(90deg,#FFD700,#ff9f1c);"></div></div></div>' +
      recHtml + end + list.map(card).join('') + '</div>';
    $('ws-close').onclick = close;
    ov.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-go'), b.getAttribute('data-cid') || (rec && rec.cid)); }; });
    ov.querySelectorAll('[data-declare]').forEach(function (b) { b.onclick = function () { declare(b.getAttribute('data-declare')); }; });
  }

  function declare(cid) {
    var s = statusOf(cid); if (!s.ready) return;
    var ws = loadWS(); ws[cid] = Date.now(); saveWS(ws);
    try { coins += REWARD_COIN; if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    try { if (typeof sfx === 'function') sfx('levelup'); } catch (e) {}
    try { localStorage.setItem('ph_worldstarAny', '1'); } catch (e) {}
    var o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;z-index:1500;background:radial-gradient(circle,rgba(255,215,0,.35),rgba(10,6,30,.96) 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;animation:wsIn .5s ease;';
    o.innerHTML = '<style>@keyframes wsIn{from{opacity:0}to{opacity:1}}@keyframes wsPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}</style>' +
      '<div style="font-size:64px;animation:wsPop .8s ease;">🌟</div>' +
      '<div style="font-size:26px;font-weight:900;margin-top:8px;color:#ffe08a;animation:wsPop .9s ease;">' + esc(nameOf(cid)) + ' 월드스타!</div>' +
      '<div style="font-size:13px;margin-top:10px;color:#e9ddff;line-height:1.7;">전 세계가 ' + esc(nameOf(cid)) + '의 이름을 불러요.</div>' +
      '<div style="font-size:15px;font-weight:900;margin-top:16px;color:#ffd76a;">🍔 +' + fmt(REWARD_COIN) + ' 코인</div>' +
      '<button style="margin-top:26px;border:none;border-radius:14px;padding:13px 40px;font-size:15px;font-weight:900;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;cursor:pointer;font-family:inherit;">좋아!</button>';
    o.querySelector('button').onclick = function () { o.remove(); render(); };
    document.body.appendChild(o);
  }

  function open() {
    close();
    var ov = document.createElement('div'); ov.id = 'ws-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:950;background:linear-gradient(160deg,#1a1a2e,#2d1b4e);overflow-y:auto;-webkit-overflow-scrolling:touch;color:#fff;font-family:\'Noto Sans KR\',sans-serif;';
    document.body.appendChild(ov);
    render();
  }
  // ════════ 월드 도전 ════════
  function baseDone(cid) { return stepsOf(cid).filter(function (x) { return !x.world; }).every(function (x) { return x.done; }); }
  function panel(html) {   // 로드맵 위에 얹는 작은 창
    var old = $('ws-pop'); if (old) old.remove();
    var o = document.createElement('div'); o.id = 'ws-pop';
    o.style.cssText = 'position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:18px;';
    o.innerHTML = '<div style="width:100%;max-width:340px;background:linear-gradient(160deg,#241a45,#171033);border:1.5px solid ' + ACC + ';border-radius:20px;padding:18px 16px;color:#fff;font-family:\'Noto Sans KR\',sans-serif;max-height:88vh;overflow-y:auto;">' + html + '</div>';
    document.body.appendChild(o); return o;
  }
  function popClose() { var o = $('ws-pop'); if (o) o.remove(); }
  var BTN = 'border:none;border-radius:12px;padding:11px;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit;';

  // ── 🌍 월드 투어 (오디션 게임 재활용) ──
  function staminaOf(cid) { try { var M = window.__mealTest, st = M.load(); return M.statOf(st, cid).s; } catch (e) { return 100; } }
  function spendStamina(cid, n) { try { var M = window.__mealTest, st = M.load(); var x = M.statOf(st, cid); x.s = Math.max(0, x.s - n); M.save(st); } catch (e) {} }
  function openTour(cid) {
    if (!baseDone(cid)) { toast('기본 4단계를 먼저 채워야 해요'); return; }
    var P = progOf(cid), n = P.tour || 0;
    if (n >= CITIES.length) { toast('월드 투어를 모두 마쳤어요!'); return; }
    var c = CITIES[n], sta = staminaOf(cid), can = sta >= TOUR_MIN_STA && typeof window.openAuditionShow === 'function';
    var rows = CITIES.map(function (x, i) { return '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;' + (i < n ? 'color:' + ACC + ';' : i === n ? 'font-weight:900;' : 'opacity:.5;') + '"><span>' + (i < n ? '✔ ' : i === n ? '▶ ' : '🔒 ') + x.n + ' 공연</span><span>통과 ' + Math.round(x.need * 100) + '점</span></div>'; }).join('');
    var o = panel('<div style="font-size:17px;font-weight:900;margin-bottom:4px;">🌍 월드 투어 · ' + esc(nameOf(cid)) + '</div>' +
      '<div style="font-size:12px;color:#c9b8e8;line-height:1.6;margin-bottom:8px;">도시마다 오디션 무대를 직접 해내면 다음 도시가 열려요. 공연 한 번에 체력 ' + TOUR_COST + '이 줄어요.</div>' + rows +
      '<div style="font-size:12px;margin:8px 0;color:' + (can ? '#9ee7b5' : '#ff9aa8') + ';">체력 ' + sta + (can ? '' : ' (' + TOUR_MIN_STA + ' 이상이어야 해요 · 스케줄·식사에서 회복)') + '</div>' +
      '<div style="display:flex;gap:8px;"><button id="ws-tgo" style="' + BTN + 'flex:2;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;' + (can ? '' : 'opacity:.4;') + '">' + c.n + ' 공연 시작!</button><button id="ws-tx" style="' + BTN + 'flex:1;background:rgba(255,255,255,.12);color:#fff;">닫기</button></div>');
    o.querySelector('#ws-tx').onclick = popClose;
    o.querySelector('#ws-tgo').onclick = function () {
      if (!can) { toast(sta < TOUR_MIN_STA ? '체력이 모자라요' : '무대를 열 수 없어요'); return; }
      popClose(); var over = false;
      window.openAuditionShow({ cid: cid, embed: true, title: '🌍 월드 투어 · ' + c.n, gaugeMul: c.spd, onCancel: function () { render(); } }, function (perf, info) {
        if (over) return; over = true;
        spendStamina(cid, TOUR_COST);
        var ok = perf != null && perf >= c.need, pct = Math.round((perf || 0) * 100);
        if (ok) { setProg(cid, { tour: n + 1 }); toast('🌍 ' + c.n + ' 공연 성공! (' + pct + '점)'); try { if (typeof sfx === 'function') sfx('levelup'); } catch (e) {} }
        else toast('아쉬워요… ' + pct + '점 · ' + Math.round(c.need * 100) + '점이 필요해요');
        render();
      });
    };
  }

  // ── 🌐 세계 반응 (하루 1번 선택 이벤트) ──
  var REACT = [
    { h: '해외 토크쇼 생방송. 진행자가 갑자기 "한국어로 한 마디 해줄래요?" 하고 묻는다.', o: [
      ['미리 외운 인사를 차분히 말한다', null, '무난하게 인사를 마쳤어요.'],
      ['즉석 애교로 분위기를 띄운다', 'fun', '스튜디오가 웃음바다! 클립이 해외 SNS에 퍼졌어요.', '어색한 침묵… 그래도 박수는 받았어요.'],
      ['눈빛 하나로 카메라를 사로잡는다', 'charm', '캡처가 순식간에 퍼졌어요. "저 사람 누구야?"', '카메라가 다른 곳을 비춰 버렸어요.']] },
    { h: '현지 거리에서 팬 수백 명이 갑자기 몰려들었다.', o: [
      ['경호원 사이로 손만 흔들어 준다', null, '안전하게 지나갔지만 조금 아쉬워하는 팬들이 보여요.'],
      ['즉석 버스킹을 시작한다', 'vocal', '거리 전체가 떼창! 영상이 하룻밤에 수백만 조회!', '음향이 없어서 목소리가 묻혔어요.'],
      ['사인회를 열고 한 명씩 눈을 맞춘다', 'charm', '"진짜 다정하다"는 후기가 쏟아졌어요.', '줄이 너무 길어져 일정이 틀어졌어요.']] },
    { h: '시상식 레드카펫. 현지 기자가 마이크를 들이민다. "오늘 입은 옷의 의미는?"', o: [
      ['정중하게 의상 이야기를 한다', null, '깔끔한 답변이라는 평이 나왔어요.'],
      ['위트 있게 받아친다', 'fun', '기자가 크게 웃었고 인터뷰가 화제가 됐어요.', '농담이 번역에서 길을 잃었어요.'],
      ['즉석 포즈로 포토월을 장악한다', 'dance', '포토월 사진이 뉴스 메인을 장식했어요!', '포즈가 어색해서 사진이 흐려졌어요.']] },
    { h: '현지 라디오 생방송. DJ가 "지금 한 곡만 불러줄 수 있어요?" 하고 부탁한다.', o: [
      ['사양하고 다음 곡 소개를 한다', null, '프로답다는 반응이에요.'],
      ['노래를 생으로 부른다', 'vocal', '댓글창이 "소름…" 으로 가득! 음원 문의가 폭주했어요.', '긴장해서 음이 흔들렸지만 응원은 받았어요.'],
      ['춤 한 소절을 곁들인다', 'dance', '라디오인데 영상이 돌았어요. 퍼포먼스가 화제예요!', '마이크 줄에 걸릴 뻔했어요.']] },
    { h: '해외 팬들이 #따라해보기 챌린지를 요청했다.', o: [
      ['공식 영상을 올려 준다', null, '무난한 참여로 팬들이 좋아해요.'],
      ['챌린지를 직접 창작해서 올린다', 'fun', '새 챌린지가 전 세계로 번졌어요!', '아이디어가 어렵다는 반응이 있었어요.'],
      ['안무를 완벽하게 소화해 올린다', 'dance', '"원조보다 낫다"는 극찬이 이어졌어요.', '박자가 조금 어긋나 조회가 아쉬웠어요.']] },
    { h: '현지 요리 프로그램 게스트로 초대받았다. 처음 보는 재료가 가득하다.', o: [
      ['셰프의 말을 얌전히 따라 한다', null, '평범하지만 따뜻한 방송이었어요.'],
      ['엉뚱한 조합에 도전한다', 'fun', '결과물이 의외로 맛있어서 레시피가 화제!', '맛이 이상했지만 표정이 웃겨서 짤이 됐어요.'],
      ['요리하며 연기하듯 설명한다', 'act', '"배우 같다"며 캡처가 퍼졌어요.', '대사가 꼬여 NG가 났어요.']] },
    { h: '팬이 외국어로 쓴 긴 편지를 건넸다. 눈물이 맺혀 있다.', o: [
      ['고맙다고 짧게 인사한다', null, '조용한 감동이 번졌어요.'],
      ['편지를 그 자리에서 낭독하고 답한다', 'act', '낭독 영상이 눈물바다! 전 세계가 박수쳤어요.', '발음이 꼬였지만 진심은 전해졌어요.'],
      ['안아주며 노래 한 구절을 불러 준다', 'vocal', '그 장면이 올해의 팬서비스로 뽑혔어요!', '긴장해서 목이 잠겼지만 팬이 함께 불렀어요.']] },
    { h: '공항 입국장. 해외 취재진과 팬 수백 명이 기다린다.', o: [
      ['손만 흔들며 빠르게 이동한다', null, '무사히 이동했어요. 사진은 조금 흐렸네요.'],
      ['멈춰 서서 현지어로 인사한다', 'fun', '"현지어 인사 대박"이 실시간 검색어에 올랐어요.', '발음이 어색했지만 웃음이 터졌어요.'],
      ['런웨이처럼 걸으며 포즈를 취한다', 'charm', '공항 패션 사진이 매거진에 실렸어요!', '캐리어에 걸려서 휘청했어요.']] }
  ];
  function statVal(cid, k) {
    var t = jget('ph_training', {}), o = (t.stat && t.stat[cid]) || {};
    return typeof o[k] === 'number' ? o[k] : 10;
  }
  var STAT_NAME = { fun: '예능', charm: '매력', vocal: '보컬', dance: '댄스', act: '연기' };
  function openReact(cid) {
    if (!baseDone(cid)) { toast('기본 4단계를 먼저 채워야 해요'); return; }
    var P = progOf(cid);
    if ((P.react || 0) >= REACT_GOAL) { toast('세계 반응을 모두 채웠어요!'); return; }
    if (P.reactDay === todayStr()) { toast('오늘의 해외 반응은 이미 봤어요. 내일 또 와요!'); return; }
    var ev = REACT[Math.floor(Math.random() * REACT.length)];
    var btns = ev.o.map(function (x, i) {
      var tag = x[1] ? '<span style="font-size:10.5px;opacity:.8;">' + STAT_NAME[x[1]] + ' ' + statVal(cid, x[1]) + ' · 성공률 ' + Math.round(chance(cid, x[1]) * 100) + '%</span>' : '<span style="font-size:10.5px;opacity:.8;">안전 · +8</span>';
      return '<button data-i="' + i + '" style="' + BTN + 'width:100%;text-align:left;margin-top:8px;background:rgba(255,255,255,.1);color:#fff;"><div>' + esc(x[0]) + '</div>' + tag + '</button>';
    }).join('');
    var o = panel('<div style="font-size:12px;font-weight:900;color:#ffd7ec;">🌐 오늘의 세계 반응 · ' + esc(nameOf(cid)) + '</div>' +
      '<div style="font-size:14px;font-weight:900;line-height:1.55;margin:7px 0 4px;">' + esc(ev.h) + '</div>' + btns +
      '<button id="ws-rx" style="' + BTN + 'width:100%;margin-top:10px;background:transparent;color:#aaa;">나중에 할래요</button>');
    o.querySelector('#ws-rx').onclick = popClose;
    o.querySelectorAll('[data-i]').forEach(function (b) {
      b.onclick = function () {
        var x = ev.o[+b.getAttribute('data-i')], pts, txt;
        if (!x[1]) { pts = 8; txt = x[2]; }
        else if (Math.random() < chance(cid, x[1])) { pts = 25; txt = x[2]; }
        else { pts = 0; txt = x[3]; }
        var now = Math.min(REACT_GOAL, (progOf(cid).react || 0) + pts);
        setProg(cid, { react: now, reactDay: todayStr() });
        var o2 = panel('<div style="text-align:center;"><div style="font-size:34px;">' + (pts >= 25 ? '🌟' : pts >= 8 ? '🙂' : '😅') + '</div>' +
          '<div style="font-size:14px;font-weight:900;line-height:1.6;margin:8px 0;">' + esc(txt) + '</div>' +
          '<div style="font-size:15px;font-weight:900;color:' + ACC + ';">세계 반응 +' + pts + ' (' + now + ' / ' + REACT_GOAL + ')</div>' +
          '<button id="ws-ok" style="' + BTN + 'width:100%;margin-top:14px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;">확인</button></div>');
        o2.querySelector('#ws-ok').onclick = function () { popClose(); render(); };
      };
    });
  }
  function chance(cid, k) { return Math.max(0.2, Math.min(0.75, 0.15 + 0.6 * (statVal(cid, k) / 100))); }

  // ── 🎬 해외 영화: 드라마 촬영 대본 추가 + 결과 감지 ──
  function addFilmScript() {
    var T = window.__dramaTest;
    if (!T || !T.SCRIPTS) { setTimeout(addFilmScript, 300); return; }
    if (T.SCRIPTS.some(function (x) { return x.id === FILM_ID; })) return;
    T.SCRIPTS.push({ id: FILM_ID, title: '할리우드 블록버스터', genre: '액션', cast: 1,
      desc: '🌟 월드스타 도전 · 해외 대작 영화 촬영! 히든 카드로 시청률 ' + FILM_RATING + '% 이상이면 성공',
      ev: [
        { t: 4, type: 'tap', line: 'Let\'s go. 시간이 없어.' },
        { t: 8, type: 'choice', cue: '(폭발 직전의 다리 위에서)', o: { plain: '지금 건너면 돼.', emotional: '약속해, 돌아올게.', funny: '보험은 들어 놨겠지?' } },
        { t: 14, type: 'tap', line: '이 도시를 지켜야 해.' },
        { t: 18, type: 'chance', kind: 'action', line: '(헬기가 급강하한다)' },
        { t: 24, type: 'choice', cue: '(무전기 너머로 들리는 목소리)', o: { plain: '작전대로 간다.', emotional: '너만은 꼭 살아.', funny: '이건 대본에 없었는데.' } },
        { t: 30, type: 'tap', line: '마지막 열쇠는 내가 가졌어.' },
        { t: 34, type: 'chance', kind: 'emotion', line: '(오랜 동료와 마주한다)' },
        { t: 40, type: 'choice', cue: '(손을 내밀며)', o: { plain: '같이 가자.', emotional: '네가 있어서 여기까지 왔어.', funny: '팝콘은 내가 살게.' } },
        { t: 46, type: 'tap', line: '카운트다운이 시작됐어!' },
        { t: 50, type: 'chance', kind: 'action', line: '(마지막 액션 시퀀스)' },
        { t: 55, type: 'choice', cue: '(엔딩 대사)', o: { plain: 'It\'s over.', emotional: '세상이 널 기억할 거야.', funny: '속편은 없는 걸로 하자.' } }
      ] });
  }
  addFilmScript();
  window.addEventListener('ph-drama-shot', function (e) {
    try {
      var d = e.detail || {};
      if (d.script !== FILM_ID || !d.hid || !(d.r >= FILM_RATING) || !d.ch) return;
      if (!baseDone(d.ch) || progOf(d.ch).film) return;
      setProg(d.ch, { film: 1 });
      setTimeout(function () { toast('🎬 해외 영화 촬영 성공! 월드스타 로드맵에 반영됐어요'); }, 600);
    } catch (err) {}
  });

  window.openWorldStar = open;
  window.__worldstar = { status: statusOf, all: allStatus, declare: declare, openTour: openTour, openReact: openReact, setProg: setProg, GOAL: { fame: GOAL_FAME, skill: GOAL_SKILL, bond: GOAL_BOND } };

  // ── 더보기 메뉴 타일 + 알림 점 (선언할 수 있는 멤버가 있을 때) ──
  function whenReady(cond, fn) { if (cond()) fn(); else setTimeout(function () { whenReady(cond, fn); }, 150); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu;
    if (orig.__wsWrapped) return;
    var w = function () {
      var res = orig.apply(this, arguments);
      try {
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-worldstar-tile')) {
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🌟', '월드스타', ACC, 'openWorldStar()'));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-worldstar-tile';
        }
      } catch (e) {}
      return res;
    };
    w.__wsWrapped = true; window.openMoreMenu = w;
  });
  window.__moreAlerts = (window.__moreAlerts || []).concat([{ re: /월드스타/, fn: function () { try { return allStatus().some(function (s) { return s.ready; }); } catch (e) { return false; } } }]);
})();
