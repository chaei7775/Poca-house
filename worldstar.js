// ════════════════════════════════════════════════════════════
// 🌟 월드스타 로드맵 (worldstar.js)
// 더보기 → [월드스타]. 아이돌 6명이 "월드스타"가 되기까지 어디까지 왔는지 한 화면에 모아 보여준다.
//   목표(이야기): 기획사를 일으켜 전원 월드스타가 되면 카드 세상으로 돌아갈 수 있다.
//   멤버마다 4단계 → 전부 채우면 '월드스타 선언' 가능 (선언하면 보상 코인 + 월드스타 표시)
//     1) 🎤 데뷔        — 기획사 데뷔 성공 (agency.js)
//     2) ⭐ 탑스타       — 드라마 인지도 400 (drama.js)
//     3) 🎓 실력         — 능력치 5개 합계 GOAL_SKILL 이상 (lesson.js)
//     4) 💞 인연         — 호감 단계(인연 Lv) GOAL_BOND 이상 (game.js)
//   각 칸에는 "지금 하러 가기" 버튼이 붙어 해당 화면으로 바로 이동한다.
//   위쪽 "오늘의 추천"은 가장 완성에 가까운 멤버의 다음 할 일을 하나 골라 알려준다.
//   엔딩 연출은 아직 없음(정식 오픈 때) — 6/6 이 되면 안내 문구만 보여준다.
// 저장: localStorage 'ph_worldstar' { cid: 선언한 시각 }  (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// ✏️ 고치는 법: 아래 설정만 고치면 됨.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.__worldstarLoaded) return; window.__worldstarLoaded = true;

  // ════════ 설정 ════════
  var KEY = 'ph_worldstar';
  var IDS = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];
  var GOAL_FAME = 400;        // drama.js FAME_GOAL 과 같은 값
  var GOAL_SKILL = 400;       // 능력치 5개 합계 (만점 500)
  var GOAL_BOND = 10;         // 인연 Lv (최대 20)
  var REWARD_COIN = 50000000; // 월드스타 선언 보상 (하루 수입 기준)
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

  // 한 멤버의 4단계 상태
  function stepsOf(cid) {
    var deb = isDebut(cid), fame = fameOf(cid), sk = skillOf(cid), bd = bondOf(cid);
    return [
      { k: 'debut', icon: '🎤', name: '데뷔', now: deb ? 1 : 0, goal: 1, text: deb ? '데뷔 완료' : '아직 연습생', go: '기획사', fn: 'openAgency' },
      { k: 'star', icon: '⭐', name: '탑스타', now: fame, goal: GOAL_FAME, text: fame + ' / ' + GOAL_FAME + (fame >= GOAL_FAME ? ' (탑스타)' : ''), go: '드라마 촬영', fn: 'openDrama' },
      { k: 'skill', icon: '🎓', name: '실력', now: Math.min(sk, GOAL_SKILL), goal: GOAL_SKILL, text: sk + ' / ' + GOAL_SKILL, go: '레슨 받기', fn: 'openMealSchedule' },
      { k: 'bond', icon: '💞', name: '인연', now: Math.min(bd, GOAL_BOND), goal: GOAL_BOND, text: 'Lv.' + bd + ' / Lv.' + GOAL_BOND, go: '호감작하기', fn: 'bond' }
    ].map(function (s) { s.done = s.now >= s.goal; s.ratio = Math.min(1, s.now / s.goal); return s; });
  }
  function statusOf(cid) {
    var st = stepsOf(cid), done = st.filter(function (s) { return s.done; }).length;
    var ws = loadWS();
    return { cid: cid, steps: st, done: done, ready: done === st.length && !ws[cid], world: !!ws[cid],
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
  function go(fn) {
    close();
    try {
      if (fn === 'bond') { if (typeof goTo === 'function') goTo('bond'); return; }
      if (typeof window[fn] === 'function') window[fn]();
      else toast('아직 열 수 없는 화면이에요');
    } catch (e) { toast('아직 열 수 없는 화면이에요'); }
  }
  function nextStep(s) { for (var i = 0; i < s.steps.length; i++) if (!s.steps[i].done) return s.steps[i]; return null; }

  function recommend(list) {
    var best = null;
    list.forEach(function (s) { if (s.world || s.ready) return; if (!best || s.score > best.score) best = s; });
    if (!best) return null;
    var st = nextStep(best);
    return st ? { cid: best.cid, step: st } : null;
  }

  function stepRow(s, cid) {
    var pct = Math.round(s.ratio * 100);
    return '<div style="display:flex;align-items:center;gap:8px;margin-top:7px;">' +
      '<div style="width:62px;font-size:12px;font-weight:900;color:' + (s.done ? ACC : '#cbd5e1') + ';white-space:nowrap;">' + s.icon + ' ' + s.name + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="height:7px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:' + (s.done ? 'linear-gradient(90deg,#FFD700,#ffb347)' : 'linear-gradient(90deg,#FF6B9D,#C084FC)') + ';"></div></div>' +
      '<div style="font-size:10px;color:#9ab;margin-top:2px;">' + esc(s.text) + '</div></div>' +
      (s.done ? '<div style="width:62px;text-align:center;font-size:11px;color:' + ACC + ';font-weight:900;">✔ 완료</div>'
        : '<button data-go="' + s.fn + '" style="width:62px;border:none;border-radius:9px;padding:6px 0;font-size:10.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,.14);color:#fff;font-family:inherit;">' + s.go + '</button>') +
      '</div>';
  }

  function card(s) {
    var face = '<div style="width:54px;height:54px;flex:0 0 auto;border-radius:50%;overflow:hidden;border:2px solid ' + (s.world ? ACC : 'rgba(255,255,255,.3)') + ';background:#2a2250;"><img src="face-' + s.cid + '.png" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;object-position:center top;"></div>';
    var tag = s.world ? '<span style="background:linear-gradient(135deg,#FFD700,#ff9f1c);color:#3a2500;border-radius:8px;padding:2px 8px;font-size:11px;font-weight:900;">🌟 월드스타</span>'
      : '<span style="background:rgba(255,255,255,.12);border-radius:8px;padding:2px 8px;font-size:11px;font-weight:800;color:#cbd5e1;">' + s.done + ' / 4 단계</span>';
    var action = '';
    if (s.ready) action = '<button data-declare="' + s.cid + '" style="width:100%;margin-top:11px;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;font-family:inherit;">🌟 월드스타 선언하기!</button>';
    return '<div style="background:rgba(255,255,255,.07);border:1.5px solid ' + (s.world ? ACC : s.ready ? '#FFD700' : 'rgba(255,255,255,.1)') + ';border-radius:16px;padding:13px;margin-bottom:11px;">' +
      '<div style="display:flex;align-items:center;gap:11px;">' + face + '<div style="flex:1;"><div style="font-size:16px;font-weight:900;">' + esc(nameOf(s.cid)) + '</div><div style="margin-top:3px;">' + tag + '</div></div></div>' +
      (s.world ? '<div style="margin-top:9px;font-size:12px;color:#ffe08a;">카드 세상으로 돌아갈 준비를 마쳤어요!</div>' : s.steps.map(function (x) { return stepRow(x, s.cid); }).join('') + action) +
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
      '<div style="font-size:12px;color:#c9b8e8;line-height:1.6;margin-bottom:12px;">기획사를 일으켜 <b style="color:#ffe08a;">전원 월드스타</b>가 되면, 카드 속 세상으로 돌아갈 수 있어요. 멤버마다 4단계를 채우면 월드스타 선언!</div>' +
      '<div style="background:rgba(255,255,255,.07);border-radius:16px;padding:12px 14px;margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;"><span>월드스타</span><span style="color:' + ACC + ';">' + worlds + ' / ' + total + '명</span></div>' +
      '<div style="height:10px;border-radius:6px;background:rgba(255,255,255,.12);margin-top:7px;overflow:hidden;"><div style="width:' + Math.round(worlds / total * 100) + '%;height:100%;background:linear-gradient(90deg,#FFD700,#ff9f1c);"></div></div></div>' +
      recHtml + end + list.map(card).join('') + '</div>';
    $('ws-close').onclick = close;
    ov.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-go')); }; });
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
  window.openWorldStar = open;
  window.__worldstar = { status: statusOf, all: allStatus, declare: declare, GOAL: { fame: GOAL_FAME, skill: GOAL_SKILL, bond: GOAL_BOND } };

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
