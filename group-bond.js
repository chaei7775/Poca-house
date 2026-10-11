// ════════════════════════════════
// 💞 멤버 친밀도 (group-bond.js) — 그룹 멤버끼리의 사이. 보이는 숫자이고, 플레이어가 챙겨야 한다
//  · 멤버 둘씩 짝마다 친밀도 0~100 (처음 50). 안 챙기면 하루(실제 24시간)에 3씩 떨어진다
//  · 올리는 법(그룹 화면 "💞 멤버 친밀도"): 🍽️ 단체 식사(전체 +6, 하루 1번) / 💬 둘이서 시간(한 쌍 +12, 하루 2번) / 🕊️ 매니저 중재(40 미만 쌍 +25, 하루 1번)
//  · 활동 중 사고(발목 삐끗 등)가 나면 그 멤버와 나머지의 사이가 떨어지고, NG 면 전원이 조금 떨어진다. 무사히 끝나면 +1
//  · 효과: 평균 친밀도가 높으면 활동 보상 UP, 낮으면 보상 DOWN + NG 확률 UP. 25 미만 쌍이 있으면 결과창에 싸운 대사가 나온다
//  · 멤버가 떠나거나 그룹이 깨지는 일은 없음. 코인으로 항상 회복 가능
// 저장: localStorage 'ph_gbond' (ph_ → 클라우드 저장 자동 포함)
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_gbond', START = 50, DECAY_PER_DAY = 3, GRACE_DAYS = 1, Z = 992;   // 챙긴 뒤 1일은 유지, 그다음부터 하루 DECAY 씩 하락
  var MEAL = { cost: 8000000, add: 6 }, TALK = { cost: 5000000, add: 12, per: 2 }, MEDI = { cost: 20000000, add: 25, below: 40 };
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var NAMES = { minjun: '민준', sion: '시온', doyun: '도윤', harin: '하린', yuna: '윤아', ara: '아라' };
  // 매니저 스킬: 만난 전담 매니저가 많을수록 중재가 강하고 싸진다 (ph_manager: actMet 배우 / topMet 탑스타)
  function mgrTier() { try { var m = JSON.parse(localStorage.getItem('ph_manager') || '{}') || {}; return (m.topMet ? 1 : 0) + (m.actMet ? 1 : 0); } catch (e) { return 0; } }
  function mediCost() { var d = (window.__idolMgr && window.__idolMgr.mediDiscount) ? window.__idolMgr.mediDiscount() : 1; return Math.floor(MEDI.cost * [1, 0.8, 0.6][mgrTier()] * d / 100000) * 100000; }
  function mediAdd() { return MEDI.add + 5 * mgrTier(); }
  function nm(c) { try { return CHARS[c].name; } catch (e) { return NAMES[c] || c; } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.p) s.p = {};
    if (s.day !== today()) { s.day = today(); s.meal = 0; s.talk = 0; s.medi = 0; }
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function key(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function cur(s, a, b) {
    var o = s.p[key(a, b)]; if (!o) return START;
    var days = Math.max(0, (Date.now() - o.t) / 86400000 - GRACE_DAYS), dec = (window.__idolMgr && window.__idolMgr.decay) ? window.__idolMgr.decay() : DECAY_PER_DAY;
    return Math.max(0, Math.min(100, Math.round(o.v - dec * days)));
  }
  function setv(s, a, b, v) { s.p[key(a, b)] = { v: Math.max(0, Math.min(100, v)), t: Date.now() }; }
  function add(s, a, b, d, keepT) {   // keepT=true: 활동 결과(사고/무사)는 값만 바꾸고 '챙긴 시각'은 그대로 → 활동만 해선 하락을 못 막는다
    var k = key(a, b), o = s.p[k];
    if (keepT) {
      var v = cur(s, a, b) + d;
      if (!o) { setv(s, a, b, v); s.p[k].t = Date.now() - GRACE_DAYS * 86400000; }   // 아직 한 번도 안 챙긴 짝: 이미 유예가 끝난 상태로 시작
      else { o.v = Math.max(0, Math.min(100, o.v + d)); }
      return;
    }
    setv(s, a, b, cur(s, a, b) + d);
  }
  // 마지막으로 챙긴 뒤 하락이 시작되기까지 남은 시간(ms). 0 이하면 이미 떨어지는 중
  function graceLeft(s, a, b) { var o = s.p[key(a, b)]; if (!o) return GRACE_DAYS * 86400000; return o.t + GRACE_DAYS * 86400000 - Date.now(); }
  function pairs(ms) { var o = []; for (var i = 0; i < ms.length; i++) for (var j = i + 1; j < ms.length; j++) o.push([ms[i], ms[j]]); return o; }
  function members() { try { var g = (JSON.parse(localStorage.getItem('ph_group') || '{}') || {}).group; return g && Array.isArray(g.members) ? g.members : []; } catch (e) { return []; } }
  function money() { try { return Math.floor(coins); } catch (e) { return 0; } }
  function spend(n) { try { coins = Math.max(0, coins - n); if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {} }
  function toast(m) { if (typeof showBagToast === 'function') { try { showBagToast(m); } catch (e) {} } }
  function fmt(n) { return Number(n).toLocaleString(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function jo(n) { var c = n.charCodeAt(n.length - 1) - 0xAC00; return (c >= 0 && c % 28 !== 0) ? '과' : '와'; }

  // ── 활동에 미치는 효과 ──
  function effect(live) {
    var s = load(), ps = pairs(live), sum = 0, low = [], high = [];
    ps.forEach(function (p) { var v = cur(s, p[0], p[1]); sum += v; if (v < 25) low.push({ p: p, v: v }); if (v >= 85) high.push({ p: p, v: v }); });
    var avg = ps.length ? sum / ps.length : START, mul = 1, ng = 0;
    if (avg >= 75) mul = 1.10; else if (avg >= 60) mul = 1.05; else if (avg < 25) mul = 0.85; else if (avg < 40) mul = 0.92;
    ng = Math.min(0.2, low.length * 0.08 + (avg < 40 ? 0.05 : 0));
    var line = null;
    if (low.length) { var l = low.sort(function (a, b) { return a.v - b.v; })[0].p; line = { c: l[0], tone: 'bad', text: nm(l[0]) + jo(nm(l[0])) + ' ' + nm(l[1]) + ', 두 사람은 말없이 서로 다른 쪽만 봤어요.' }; }
    else if (high.length && Math.random() < 0.6) { var h = high[Math.floor(Math.random() * high.length)].p; line = { c: h[0], tone: 'top', text: nm(h[0]) + jo(nm(h[0])) + ' ' + nm(h[1]) + ', 두 사람은 눈빛만 봐도 호흡이 척척 맞았어요.' }; }
    return { mul: mul, ng: ng, line: line, avg: Math.round(avg) };
  }
  // 활동이 끝난 뒤 친밀도 변화
  function after(live, rl, ngHit) {
    var s = load();
    if (ngHit) pairs(live).forEach(function (p) { add(s, p[0], p[1], -3, true); });
    else {
      var hurt = [], luck = [];
      ((rl && rl.items) || []).forEach(function (it) { (it.type === 'hurt' ? hurt : luck).push(it.c); });
      pairs(live).forEach(function (p) {
        var d = 1;
        if (hurt.indexOf(p[0]) !== -1 || hurt.indexOf(p[1]) !== -1) d = -4;
        else if (luck.indexOf(p[0]) !== -1 || luck.indexOf(p[1]) !== -1) d = 2;
        add(s, p[0], p[1], d, true);
      });
    }
    save(s);
  }

  // ── 화면 ──
  var sel = [];
  function face(c, px) { return '<img src="face-' + c + '.png" width="' + px + '" height="' + px + '" loading="lazy" decoding="async" style="width:' + px + 'px;height:' + px + 'px;border-radius:50%;object-fit:cover;vertical-align:middle;border:2px solid rgba(255,255,255,.5);background:#243357;">'; }
  function heart(v) { return v >= 85 ? '💖' : v >= 60 ? '💗' : v >= 40 ? '💛' : v >= 25 ? '💔' : '🥶'; }
  function barColor(v) { return v >= 60 ? '#7fe8b0' : v >= 40 ? '#ffd76a' : '#ff7a7a'; }
  function render() {
    var ov = document.getElementById('gb-ov'); if (!ov) return;
    var ms = members(), s = load();
    var list = pairs(ms).map(function (p) { return { p: p, v: cur(s, p[0], p[1]) }; }).sort(function (a, b) { return a.v - b.v; });
    var rows = list.map(function (o) {
      var on = sel.length === 2 && key(sel[0], sel[1]) === key(o.p[0], o.p[1]);
      return '<div data-pair="' + o.p[0] + ',' + o.p[1] + '" style="display:flex;align-items:center;gap:8px;padding:7px 9px;margin-bottom:6px;border-radius:12px;cursor:pointer;background:' + (on ? 'rgba(255,215,106,.18)' : 'rgba(255,255,255,.06)') + ';border:1.5px solid ' + (on ? '#ffd76a' : 'rgba(255,255,255,.12)') + ';">' +
        face(o.p[0], 30) + face(o.p[1], 30) + '<div style="flex:1;min-width:0;"><div style="font-size:11.5px;font-weight:900;">' + esc(nm(o.p[0])) + ' ♥ ' + esc(nm(o.p[1])) + '</div>' +
        '<div style="font-size:9.5px;margin-top:1px;color:' + (graceLeft(s, o.p[0], o.p[1]) > 0 ? '#9fb0d0' : '#ff9a9a') + ';">' + (graceLeft(s, o.p[0], o.p[1]) > 0 ? '챙김 유지 중 · ' + Math.ceil(graceLeft(s, o.p[0], o.p[1]) / 3600000) + '시간 뒤부터 하락' : '⚠️ 안 챙겨서 떨어지는 중!') + '</div>' +
        '<div style="height:6px;border-radius:4px;background:rgba(255,255,255,.12);margin-top:4px;overflow:hidden;"><div style="width:' + o.v + '%;height:100%;background:' + barColor(o.v) + ';"></div></div></div>' +
        '<div style="width:46px;text-align:right;font-size:12px;font-weight:900;color:' + barColor(o.v) + ';">' + heart(o.v) + ' ' + o.v + '</div></div>';
    }).join('');
    var haveSel = sel.length === 2, v = haveSel ? cur(s, sel[0], sel[1]) : 0;
    function ab(id, label, ok, sub) { return '<button id="' + id + '" style="width:100%;margin-top:7px;padding:11px;border:none;border-radius:12px;color:#fff;font-size:12.5px;font-weight:900;cursor:pointer;text-align:left;' + FONT + 'background:' + (ok ? 'linear-gradient(135deg,#ff6b9d,#c084fc)' : 'rgba(255,255,255,.1)') + ';">' + label + '<div style="font-size:10.5px;font-weight:500;opacity:.85;margin-top:2px;">' + sub + '</div></button>'; }
    ov.innerHTML = '<div style="background:#14213d;border:1.5px solid #ff9ecb;border-radius:18px;width:100%;max-width:380px;max-height:90vh;display:flex;flex-direction:column;color:#fff;' + FONT + '">' +
      '<div style="padding:14px 16px 8px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;">💞 멤버 친밀도</div><button id="gb-x" style="margin-left:auto;border:none;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="padding:0 14px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch;">' +
      '<div style="font-size:11px;color:#cfd8f0;line-height:1.6;margin-bottom:8px;">친밀도가 높으면 활동 보상이 오르고, 낮으면 NG가 늘어요. <b>단체 식사나 둘이서 시간으로 챙기지 않으면 하루 ' + (window.__idolMgr && window.__idolMgr.decay ? window.__idolMgr.decay() : DECAY_PER_DAY) + '씩 떨어져요.</b> (챙긴 뒤 24시간은 유지) 활동만 해서는 못 막아요. 사고가 나도 떨어져요. 짝을 눌러 고른 뒤 아래에서 챙겨요.<br>내 코인: <b style="color:#ffe08a;">🍔 ' + fmt(money()) + '</b></div>' + rows +
      ab('gb-meal', '🍽️ 단체 식사 (🍔 ' + fmt(MEAL.cost) + ')', !s.meal, '모든 짝 +' + MEAL.add + ' · 하루 1번 ' + (s.meal ? '(완료)' : '')) +
      ab('gb-talk', '💬 둘이서 시간 (🍔 ' + fmt(TALK.cost) + ')', haveSel && s.talk < TALK.per, '고른 짝 +' + TALK.add + ' · 하루 ' + TALK.per + '번 (오늘 ' + s.talk + '/' + TALK.per + ')' + (haveSel ? '' : ' · 짝을 먼저 골라요')) +
      ab('gb-medi', '🕊️ 매니저 중재 (🍔 ' + fmt(mediCost()) + ')', haveSel && v < MEDI.below && !s.medi, '친밀도 ' + MEDI.below + ' 미만 짝 +' + mediAdd() + ' · 하루 1번 (매니저를 더 만날수록 강해지고 싸져요) ' + (s.medi ? '(완료)' : haveSel && v >= MEDI.below ? '· 이 짝은 아직 괜찮아요' : '')) +
      '</div></div>';
    ov.querySelector('#gb-x').onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-pair]'), function (el) { el.onclick = function () { sel = el.getAttribute('data-pair').split(','); render(); }; });
    function pay(cost, fn) { if (money() < cost) { toast('코인이 모자라요 (🍔 ' + fmt(cost) + ' 필요)'); return; } spend(cost); var st = load(); fn(st); save(st); render(); }
    ov.querySelector('#gb-meal').onclick = function () { if (s.meal) return; pay(MEAL.cost, function (st) { st.meal = 1; pairs(ms).forEach(function (p) { add(st, p[0], p[1], MEAL.add); }); toast('🍽️ 다 같이 밥 먹으니 분위기가 풀렸어요!'); }); };
    ov.querySelector('#gb-talk').onclick = function () { if (!haveSel || s.talk >= TALK.per) return; pay(TALK.cost, function (st) { st.talk++; add(st, sel[0], sel[1], TALK.add); toast('💬 ' + nm(sel[0]) + '와(과) ' + nm(sel[1]) + ' 사이가 가까워졌어요'); }); };
    ov.querySelector('#gb-medi').onclick = function () { if (!haveSel || s.medi || v >= MEDI.below) return; pay(mediCost(), function (st) { st.medi = 1; add(st, sel[0], sel[1], mediAdd()); toast('🕊️ 매니저가 두 사람을 화해시켰어요'); }); };
  }
  function open() {
    if (document.getElementById('gb-ov')) return;
    var ov = document.createElement('div'); ov.id = 'gb-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + Z + ';background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:12px;';
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov); sel = []; render();
  }
  function attach() {
    var ed = document.getElementById('grp-edit');
    if (!ed || document.getElementById('gb-btn')) return;
    var row = ed.parentNode, b = document.createElement('button');
    b.id = 'gb-btn';
    b.style.cssText = 'width:100%;margin-top:8px;padding:12px;border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#ff6b9d,#a855f7);' + FONT;
    b.textContent = '💞 멤버 친밀도';
    b.onclick = open;
    row.parentNode.insertBefore(b, row);
  }
  setInterval(attach, 700);
  window.__groupBond = { effect: effect, after: after, cur: function (a, b) { return cur(load(), a, b); }, open: open };
})();
