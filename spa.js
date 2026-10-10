// ════════════════════════════════
// 💆 뷰티·운동 관리 (spa.js)
// 에스테틱 · 헬스장 · 요가 · 필라테스 — 코인을 내고 아이돌의 컨디션(비주얼·체력·기분)을 크게 올린다.
// - 음식(싸고 자주, 효과 작음)과 달리 비싸고 한 번에 크게 오르는 관리. 아이돌 1명당 하루 DAILY_MAX 번.
// - 들어가는 곳: ① 🏖 뷰티 살롱 장소 화면의 "💆 컨디션 관리" 버튼  ② 📅 스케줄·식사 화면의 "💆 뷰티·운동 관리" 칸
// - 컨디션은 meal.js 의 저장값을 window.__mealTest 로 읽고 쓴다. (촬영/컴백/음악방송 준비 기간·휴식기 보정도 음식과 똑같이 적용)
// - 가격·효과를 바꾸고 싶으면 아래 FACILITIES 만 고치면 됨. 그림: meal-assets/spa/<id>.png (없으면 이모지로 보임)
// 저장: localStorage 'ph_spa' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// ════════════════════════════════
(function () {
  'use strict';

  // ════════ ⚙️ 설정 ════════
  var STORAGE_KEY = 'ph_spa';
  var DAILY_MAX = 2;                       // 아이돌 1명당 하루 관리 횟수 (시설 상관없이 합계)
  var ASSET = 'meal-assets/spa/';
  var Z = 990;
  var FACILITIES = [
    { id: 'aesthetic', name: '에스테틱',  emoji: '💆', price: 1200000, d: { v: 22, s: 0,  m: 4  }, desc: '피부·얼굴 집중 케어. 촬영 전날에 딱!' },
    { id: 'gym',       name: '헬스장',    emoji: '🏋️', price: 600000,  d: { v: 3,  s: 22, m: -5 }, desc: '체력은 확 오르지만 조금 힘들어해요.' },
    { id: 'yoga',      name: '요가',      emoji: '🧘', price: 500000,  d: { v: 2,  s: 10, m: 12 }, desc: '몸도 마음도 편안하게. 기분 회복용!' },
    { id: 'pilates',   name: '필라테스',  emoji: '🤸', price: 900000,  d: { v: 12, s: 12, m: 0  }, desc: '라인 정리 + 체력. 균형형 관리.' }
  ];
  var LINES = {
    aesthetic: ['피부가 반짝반짝해졌어요!', '얼굴이 한결 맑아졌네요.'],
    gym:       ['땀 흘리니까 개운해요! 근데 좀 힘들었어요…', '체력이 쑥쑥 붙는 느낌이에요.'],
    yoga:      ['마음이 차분해졌어요.', '몸이 가벼워지고 기분도 좋아졌어요.'],
    pilates:   ['자세가 바르게 잡힌 것 같아요!', '몸이 탄탄해지는 기분이에요.']
  };
  var LOCK_MSG = '🔒 아이돌이 데뷔한 뒤에 이용할 수 있어요! 기획사에서 먼저 데뷔시켜 주세요';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;

  // ════════ 순수 로직 ════════
  function clamp(x) { return Math.max(0, Math.min(100, x)); }
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (typeof s.day !== 'number') s.day = 0;
    if (!s.used || typeof s.used !== 'object') s.used = {};      // { cid: 오늘 받은 횟수 }
    if (!s.total || typeof s.total !== 'object') s.total = {};   // { cid: 누적 횟수 }
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }
  function syncDay(s, day) { if (s.day !== day) { s.day = day; s.used = {}; } return s; }
  function usedToday(s, cid) { return s.used[cid] || 0; }
  function byId(id) { for (var i = 0; i < FACILITIES.length; i++) if (FACILITIES[i].id === id) return FACILITIES[i]; return null; }
  function canUse(s, cid, f, money) {
    if (!f) return { ok: false, why: 'invalid' };
    if (usedToday(s, cid) >= DAILY_MAX) return { ok: false, why: 'full' };
    if (!(money >= f.price)) return { ok: false, why: 'coin' };
    return { ok: true };
  }
  function pick(arr, rng) { rng = rng || Math.random; return arr[Math.floor(rng() * arr.length)]; }

  // ════════ 게임 연결 ════════
  function M() { return window.__mealTest || null; }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); try { var t = document.getElementById('bag-toast'); if (t) t.style.zIndex = String(Z + 10); } catch (e) {} }   // 관리 화면(Z=990) 위에 보이게
  function snd(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function money() { try { return Math.floor(coins); } catch (e) { return 0; } }
  function spend(n) { try { coins -= n; if (typeof saveAll === 'function') saveAll(); } catch (e) {} }
  function debutedIds() {
    var m = M(), a = null, out = [];
    try { a = JSON.parse(localStorage.getItem('ph_agency') || 'null'); } catch (e) {}
    if (a && m) {
      var done = a.done || {}, deb = a.debut || {};
      Object.keys(m.CH).forEach(function (cid) { if (done[cid] || deb[cid]) out.push(cid); });
    }
    return out;
  }
  function icon(f, px) {
    return '<span style="position:relative;display:inline-block;width:' + px + 'px;height:' + px + 'px;font-size:' + Math.round(px * 0.8) + 'px;line-height:' + px + 'px;text-align:center;vertical-align:middle;">' + f.emoji +
      '<img src="' + ASSET + f.id + '.png" alt="" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;" onload="var p=this.parentNode;if(p&&p.firstChild&&p.firstChild.nodeType===3)p.firstChild.nodeValue=\'\';" onerror="this.remove()"></span>';
  }
  function chip(label, val) {
    var c = val > 0 ? '#7ee8a5' : val < 0 ? '#ff8a8a' : '#777';
    return '<span style="font-size:10.5px;font-weight:900;color:' + c + ';">' + label + (val > 0 ? '+' : '') + val + '</span>';
  }
  function overlay(id, z, bg) {
    var old = document.getElementById(id); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + z + ';background:' + (bg || 'rgba(0,0,0,0.82)') + ';display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    document.body.appendChild(ov);
    return ov;
  }

  // 이번 관리로 실제로 오르는 양 (준비 기간·휴식기 보정은 음식과 같게)
  function deltaFor(cid, f) {
    var m = M(), ms = m.load(), phase = m.phaseOf(ms, cid, ms.day);
    var d = m.mealDelta(cid, { id: 'spa_' + f.id, v: f.d.v, s: f.d.s, m: f.d.m }, phase);
    return { v: d.v, s: d.s, m: d.m, phase: phase };
  }
  function doUse(cid, fid) {
    var m = M(), f = byId(fid); if (!m || !f) return null;
    var ms = m.load(), s = syncDay(load(), ms.day), c = canUse(s, cid, f, money());
    if (!c.ok) { toast(c.why === 'full' ? '오늘은 더 못 받아요 (하루 ' + DAILY_MAX + '번)' : '코인이 모자라요 (🍔 ' + fmt(f.price) + ' 필요)'); return null; }
    var d = deltaFor(cid, f), st = m.statOf(ms, cid), before = { v: st.v, s: st.s, m: st.m };
    spend(f.price);
    st.v = clamp(st.v + d.v); st.s = clamp(st.s + d.s); st.m = clamp(st.m + d.m);
    s.used[cid] = usedToday(s, cid) + 1; s.total[cid] = (s.total[cid] || 0) + 1;
    save(s); m.save(ms);
    try { if (window.__mealRefresh) window.__mealRefresh(before); } catch (e) {}
    return { d: d, before: before, after: { v: st.v, s: st.s, m: st.m } };
  }

  // ════════ 화면 ════════
  var lastCid = null;
  function condBars(cid) {
    var m = M(), st = m.statOf(m.load(), cid);
    function bar(label, k, color) {
      return '<div style="flex:1;min-width:0;"><div style="font-size:10.5px;font-weight:900;color:#cfd3ee;display:flex;justify-content:space-between;"><span>' + label + '</span><span style="color:' + color + ';">' + st[k] + '</span></div>' +
        '<div style="height:6px;border-radius:4px;background:rgba(255,255,255,0.12);margin-top:3px;overflow:hidden;"><div style="height:100%;width:' + st[k] + '%;background:' + color + ';"></div></div></div>';
    }
    return '<div style="display:flex;gap:10px;margin:8px 0 2px;">' + bar('✨ 비주얼', 'v', '#ff9ecb') + bar('💪 체력', 's', '#7ee8a5') + bar('😊 기분', 'm', '#ffe08a') + '</div>';
  }
  function openSpa(cid0) {
    var m = M();
    if (!m) { toast('아직 이용할 수 없어요'); return; }
    var ids = debutedIds();
    if (!ids.length) { toast(LOCK_MSG); return; }
    var cid = (cid0 && ids.indexOf(cid0) !== -1) ? cid0 : (lastCid && ids.indexOf(lastCid) !== -1 ? lastCid : ids[0]);
    var ov = overlay('spa-ov', Z);
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    function draw() {
      lastCid = cid;
      var ms = m.load(), s = syncDay(load(), ms.day), left = Math.max(0, DAILY_MAX - usedToday(s, cid)), c = m.CH[cid], cash = money();
      var chips = ids.map(function (id) {
        var on = id === cid;
        return '<button data-cid="' + id + '" style="' + BTN + 'padding:7px 11px;font-size:12px;border:1.5px solid ' + (on ? '#ff9ecb' : 'rgba(255,255,255,0.18)') + ';background:' + (on ? 'rgba(255,158,203,0.2)' : 'rgba(255,255,255,0.06)') + ';color:#fff;">' + esc(m.CH[id].name) + '</button>';
      }).join('');
      var cards = FACILITIES.map(function (f) {
        var d = deltaFor(cid, f), cu = canUse(s, cid, f, cash), ok = cu.ok;
        var why = ok ? '' : ' <span style="font-size:10.5px;color:#ff8a8a;font-weight:900;">' + (cu.why === 'full' ? '· 오늘은 다 받았어요' : '· 코인이 모자라요') + '</span>';
        return '<button data-f="' + f.id + '" style="' + BTN + 'text-align:left;display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);color:#fff;opacity:' + (ok ? 1 : 0.55) + ';">' +
          '<div style="flex-shrink:0;">' + icon(f, 46) + '</div><div style="flex:1;min-width:0;">' +
          '<div style="font-size:14px;">' + esc(f.name) + ' <span style="font-size:11px;color:#ffe08a;">🍔 ' + fmt(f.price) + '</span>' + why + '</div>' +
          '<div style="font-size:10.5px;color:#aab4d6;font-weight:700;margin:1px 0 3px;">' + esc(f.desc) + '</div>' +
          '<div style="display:flex;gap:8px;">' + chip('✨', d.v) + chip('💪', d.s) + chip('😊', d.m) + '</div></div></button>';
      }).join('');
      ov.innerHTML = '<div style="background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #ff9ecb;border-radius:20px;width:100%;max-width:380px;max-height:90vh;display:flex;flex-direction:column;">' +
        '<div style="padding:14px 16px 4px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;color:#ffd2e6;">💆 컨디션 관리</div>' +
        '<button id="spa-x" style="' + BTN + 'margin-left:auto;background:rgba(255,255,255,0.1);color:#fff;padding:6px 12px;font-size:12px;">닫기</button></div>' +
        '<div style="padding:0 16px;overflow-y:auto;">' +
        '<div style="font-size:11px;color:#cfd3ee;line-height:1.5;margin-bottom:8px;">음식보다 비싸지만 컨디션이 크게 올라요. 아이돌 1명당 하루 ' + DAILY_MAX + '번까지!</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + chips + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;font-weight:900;color:#fff;"><span>' + esc(c.name) + '</span>' +
        '<span style="color:' + (left > 0 ? '#ffe08a' : '#ff8a8a') + ';">오늘 ' + left + '/' + DAILY_MAX + '</span></div>' + condBars(cid) +
        '<div style="display:flex;flex-direction:column;gap:8px;margin:10px 0 14px;">' + cards + '</div>' +
        '<div style="font-size:11px;color:#aab4d6;text-align:right;margin-bottom:14px;">내 코인 🍔 ' + fmt(cash) + '</div></div></div>';
      ov.querySelector('#spa-x').onclick = function () { ov.remove(); };
      Array.prototype.forEach.call(ov.querySelectorAll('[data-cid]'), function (b) { b.onclick = function () { cid = b.getAttribute('data-cid'); draw(); }; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-f]'), function (b) { b.onclick = function () { confirmUse(cid, b.getAttribute('data-f'), draw); }; });
    }
    draw();
  }
  function confirmUse(cid, fid, after) {
    var m = M(), f = byId(fid), ms = m.load(), s = syncDay(load(), ms.day), c = canUse(s, cid, f, money());
    if (!c.ok) { toast(c.why === 'full' ? '오늘은 더 못 받아요 (하루 ' + DAILY_MAX + '번)' : '코인이 모자라요 (🍔 ' + fmt(f.price) + ' 필요)'); return; }
    var d = deltaFor(cid, f), name = m.CH[cid].name;
    var ov = overlay('spa-confirm', Z + 2, 'rgba(0,0,0,0.6)');
    ov.innerHTML = '<div style="width:100%;max-width:320px;background:#241945;border:1.5px solid #ff9ecb;border-radius:18px;padding:18px;text-align:center;">' +
      '<div>' + icon(f, 64) + '</div><div style="font-size:16px;font-weight:900;color:#fff;margin:4px 0;">' + esc(name) + ' · ' + esc(f.name) + '</div>' +
      '<div style="display:flex;justify-content:center;gap:10px;margin:6px 0;">' + chip('✨ 비주얼', d.v) + chip('💪 체력', d.s) + chip('😊 기분', d.m) + '</div>' +
      '<div style="font-size:13px;font-weight:900;color:#ffe08a;margin-bottom:12px;">🍔 ' + fmt(f.price) + ' 코인을 써요</div>' +
      '<div style="display:flex;gap:8px;"><button id="sc-no" style="' + BTN + 'flex:1;padding:12px;background:rgba(255,255,255,0.12);color:#fff;font-size:13px;">취소</button>' +
      '<button id="sc-yes" style="' + BTN + 'flex:2;padding:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:14px;">받기</button></div></div>';
    ov.querySelector('#sc-no').onclick = function () { ov.remove(); };
    ov.querySelector('#sc-yes').onclick = function () {
      var res = doUse(cid, fid); ov.remove();
      if (!res) { if (after) after(); return; }
      snd('stamp'); showResult(cid, f, res); if (after) after(); redrawMeal();
    };
  }
  function showResult(cid, f, res) {
    var m = M(), name = m.CH[cid].name;
    var ov = overlay('spa-result', Z + 3);
    var ph = res.d.phase === 'shoot' ? '🎬 촬영 준비 보너스!' : res.d.phase === 'comeback' ? '💿 컴백 준비 보너스!' : res.d.phase === 'music' ? '🎤 음악방송 준비 보너스!' : res.d.phase === 'rest' ? '🛌 휴식기 보너스!' : '';
    ov.innerHTML = '<div style="width:100%;max-width:330px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #ff9ecb;border-radius:20px;padding:18px;text-align:center;">' +
      '<div style="font-size:13px;font-weight:900;color:#cfd3ee;">' + esc(name) + ' · ' + esc(f.name) + ' 완료!</div>' +
      '<div style="margin:8px auto 2px;">' + icon(f, 80) + '</div>' + (ph ? '<div style="font-size:11px;font-weight:900;color:#ff9ecb;">' + ph + '</div>' : '') +
      '<div style="margin:10px 0 6px;background:#fff;color:#2a2438;border-radius:14px;padding:9px 12px;font-size:12px;font-weight:700;line-height:1.5;">“' + esc(pick(LINES[f.id] || ['개운해졌어요!'])) + '”</div>' +
      '<div style="display:flex;justify-content:center;gap:10px;margin-top:8px;">' + chip('✨ 비주얼', res.after.v - res.before.v) + chip('💪 체력', res.after.s - res.before.s) + chip('😊 기분', res.after.m - res.before.m) + '</div>' +
      '<button id="sr-ok" style="' + BTN + 'width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:14px;">확인</button></div>';
    ov.querySelector('#sr-ok').onclick = function () { ov.remove(); };
  }
  function redrawMeal() { try { drawMealBox(document.getElementById('meal-overlay')); } catch (e) {} }

  // ════════ 📅 스케줄·식사 화면에 칸 붙이기 ════════
  function mealCid(ov) {
    var m = M(); if (!m) return null;
    var img = ov.querySelector('#meal-stage [data-r="sd"]');
    if (img && img.alt) for (var id in m.CH) if (Object.prototype.hasOwnProperty.call(m.CH, id) && m.CH[id].name === img.alt) return id;
    if (lastCid && m.CH[lastCid]) return lastCid;
    var first = ov.querySelector('#meal-chips [data-cid]');
    return first ? first.getAttribute('data-cid') : null;
  }
  function drawMealBox(ov) {
    var box = ov && ov.querySelector('#spa-box');
    if (!box || !M()) return;
    if (!debutedIds().length) {
      var lk = '<div style="margin:14px 0 8px;"><div style="font-size:13px;font-weight:900;color:#ddd;">💆 뷰티·운동 관리 🔒</div>' +
        '<div style="font-size:11px;color:#9aa0c8;margin-top:3px;line-height:1.5;">아이돌이 데뷔한 뒤에 이용할 수 있어요.</div></div>';
      if (box.getAttribute('data-h') !== lk) { box.setAttribute('data-h', lk); box.innerHTML = lk; }
      return;
    }
    var cid = mealCid(ov);
    if (!cid || !M().CH[cid]) { if (box.innerHTML) { box.removeAttribute('data-h'); box.innerHTML = ''; } return; }
    var ms = M().load(), s = syncDay(load(), ms.day), left = Math.max(0, DAILY_MAX - usedToday(s, cid));
    var html = '<div style="margin:14px 0 8px;"><div style="font-size:13px;font-weight:900;color:#ddd;">💆 뷰티·운동 관리</div>' +
      '<div style="font-size:11px;color:#cfd3ee;margin-top:3px;line-height:1.5;">에스테틱 · 헬스장 · 요가 · 필라테스. 비싸지만 컨디션이 크게 올라요.</div></div>' +
      '<button id="spa-go" style="' + BTN + 'width:100%;padding:12px;background:rgba(255,158,203,0.15);border:1px solid rgba(255,158,203,0.45);color:#fff;font-size:13px;">💆 ' + esc(M().CH[cid].name) + ' 관리 받으러 가기 <span style="color:' + (left > 0 ? '#ffe08a' : '#ff8a8a') + ';">(오늘 ' + left + '/' + DAILY_MAX + ')</span></button>';
    if (box.getAttribute('data-h') !== html) { box.setAttribute('data-h', html); box.innerHTML = html; }   // 같으면 다시 안 그림 (무한 갱신 방지)
    box.querySelector('#spa-go').onclick = function () { openSpa(cid); };
  }
  function inject(ov) {
    if (!ov || !M() || ov.querySelector('#spa-box')) return;
    var anchor = ov.querySelector('#sweets-box') || ov.querySelector('#meal-foods');
    if (!anchor) return;
    var box = document.createElement('div');
    box.id = 'spa-box'; box.style.cssText = FONT + 'margin-bottom:10px;';
    anchor.insertAdjacentElement('afterend', box);
    drawMealBox(ov);
  }
  (function watch() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) { setTimeout(watch, 200); return; }
    var watched = null;
    function attach(ov) {
      if (watched === ov) return; watched = ov; inject(ov);
      new MutationObserver(function () { inject(ov); drawMealBox(ov); }).observe(ov, { childList: true, subtree: true });
    }
    var first = document.getElementById('meal-overlay'); if (first) attach(first);
    new MutationObserver(function () { var ov = document.getElementById('meal-overlay'); if (ov) attach(ov); }).observe(document.body, { childList: true });
  })();

  // ════════ 🏖 뷰티 살롱 장소 화면에 버튼 달기 ════════
  (function hookPlace() {
    if (typeof window.openPlace !== 'function') { setTimeout(hookPlace, 150); return; }
    if (window.__spaPlaceHooked) return; window.__spaPlaceHooked = true;
    var orig = window.openPlace;
    window.openPlace = function (id) {
      var r = orig.apply(this, arguments);
      try {
        var b = document.getElementById('btn-spa');
        if (!b) {
          var ref = document.getElementById('btn-explore-beach');
          if (ref && ref.parentNode) {
            b = document.createElement('button'); b.id = 'btn-spa';
            b.style.cssText = 'display:none;width:100%;padding:14px;margin-top:8px;background:rgba(255,158,203,0.2);border:1.5px solid #ff9ecb;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;' + FONT;
            
            b.onclick = function () {
              if (!(M() && debutedIds().length)) { toast(LOCK_MSG); return; }
              try { if (typeof closePlace === 'function') closePlace(); } catch (e) {}
              openSpa();
            };
            ref.insertAdjacentElement('afterend', b);
          }
        }
        if (b) {
          b.style.display = id === 'beach' ? 'block' : 'none';
          var locked = !(M() && debutedIds().length);
          b.textContent = locked ? '🔒 컨디션 관리 (데뷔 후 이용)' : '💆 컨디션 관리 (에스테틱·헬스·요가·필라테스)';
          b.style.opacity = locked ? '0.6' : '1';
        }
      } catch (e) {}
      return r;
    };
  })();

  window.openSpa = openSpa;
  window.__spaTest = { FACILITIES: FACILITIES, CFG: { DAILY_MAX: DAILY_MAX }, load: load, save: save, syncDay: syncDay, canUse: canUse, doUse: doUse, deltaFor: deltaFor, openSpa: openSpa };
})();
