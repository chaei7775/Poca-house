// ════════════════════════════════
// 🪤 통발 (trap.js) — 방치해도 물고기가 쌓이는 호수 통발
// game.js / fishing.js / recombine.js 는 건드리지 않음.
//
// - 통발을 만들거나(탐험 재료 + 코인) 사서(코인) 설치. 최대 MAX_TRAPS개.
// - 설치된 통발은 접속 안 해도 INTERVAL_MIN분마다 물고기 1마리씩 쌓임 (최대 CAP_HOURS시간치)
//   → 접속해서 [수거]하면 가방으로 들어오고, 수거해도 통발은 계속 돌아감 (다시 설치할 필요 없음)
// - 물고기는 낚시(fishing.js)와 같은 이름/가격의 재료라서 재료 상점 판매, 반짝이 가루 등 기존 쓰임이 그대로 적용됨
// - 낚시보다 일부러 약하게: 흔한 물고기 위주, 은빛거미줄 확률 낮음. 강화석/방지권/재조합석/소원의 조각은 안 나옴
// - 저장: localStorage 'ph_trap' ('ph_' 라서 cloud-extra.js 가 서버에도 같이 올림)
// - 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'trap.js' → 호수의 "🎣 낚시하기"를 누르면 [낚시하기 / 통발] 선택창이 뜸 (fishing.js 뒤에 로드돼도 상관없음)
//
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ───────── ⚙️ 설정 ─────────
  var MAX_TRAPS = 3;            // 가질 수 있는 통발 수
  var INTERVAL_MIN = 15;        // 통발 하나가 물고기 1마리를 모으는 시간(분)
  var CAP_HOURS = 12;           // 이 시간치까지만 쌓임 (넘으면 멈춤 → 하루 2번쯤 들르게)
  var EXP_PER_FISH = 3;         // 수거한 물고기 1마리당 포카하우스 경험치
  var WEB_DROP = 0.08;          // 물고기 1마리당 은빛거미줄이 같이 올라올 확률 (낚시는 15%)
  var CRAFT_COIN = 3000;        // 제작할 때 내는 코인
  var CRAFT_MATS = { '고급원목': 5, '빛나는돌': 3, '은빛거미줄': 2 };   // 제작 재료 (재료 상점에 있는 이름 그대로)
  var BUY_PRICE = 30000;        // 재료 없이 바로 살 때 코인 (일부러 비싸게 = 코인 싱크)
  // 통발에서 나오는 어획물 (통발 전용 이름. 평균 약 134코인 → 통발 3개가 12시간 가득 차면 약 19,000코인)
  var FISH = [
    { name: '통발 새우',     emoji: '🦐', price: 55,  weight: 45 },
    { name: '통발 가재',     emoji: '🦞', price: 110, weight: 32 },
    { name: '진주조개',      emoji: '🐚', price: 240, weight: 17 },
    { name: '황금 진주조개', emoji: '🦪', price: 550, weight: 6 }
  ];
  var KEY = 'ph_trap';

  var INTERVAL_MS = INTERVAL_MIN * 60 * 1000;
  var CAP = Math.max(1, Math.floor(CAP_HOURS * 60 / INTERVAL_MIN));

  // ───────── 저장 / 계산 ─────────
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!Array.isArray(s.traps)) s.traps = [];
    s.traps = s.traps.filter(function (t) { return t && typeof t.setAt === 'number'; }).slice(0, MAX_TRAPS);
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function pending(trap, now) {
    var el = Math.max(0, (now || Date.now()) - trap.setAt);       // 시계가 거꾸로 가도 음수가 되지 않게
    return Math.min(CAP, Math.floor(el / INTERVAL_MS));
  }
  function nextIn(trap, now) {                                     // 다음 1마리까지 남은 ms (가득 차면 0)
    if (pending(trap, now) >= CAP) return 0;
    var el = Math.max(0, (now || Date.now()) - trap.setAt);
    return INTERVAL_MS - (el % INTERVAL_MS);
  }
  function rollFish(rng) {
    rng = rng || Math.random;
    var total = 0; FISH.forEach(function (f) { total += f.weight; });
    var r = rng() * total;
    for (var i = 0; i < FISH.length; i++) { r -= FISH[i].weight; if (r <= 0) return FISH[i]; }
    return FISH[0];
  }

  // ───────── 게임 연동 도우미 ─────────
  // 통발 화면(z-index 955) 위에 보이도록 자체 알림창을 씀 (게임 기본 토스트는 화면 뒤에 가려짐)
  function toast(m) {
    try {
      var old = document.getElementById('trap-toast'); if (old) old.remove();
      var el = document.createElement('div');
      el.id = 'trap-toast';
      el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(26,26,46,0.97);border:1.5px solid #38BDF8;color:#fff;padding:11px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:1300;max-width:88vw;text-align:center;line-height:1.5;font-family:"Noto Sans KR",sans-serif;';
      el.textContent = m;
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.remove(); }, 3500);
    } catch (e) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e2) {} }
  }
  function fmt(n) { return Number(n).toLocaleString(); }
  function matQty(name) {
    try { var b = bagItems.filter(function (i) { return i.name === name; })[0]; return b ? (b.qty || 0) : 0; } catch (e) { return 0; }
  }
  function freeSlots() { try { return bagSlots - bagItems.length; } catch (e) { return 0; } }
  function hasInBag(name) { try { return bagItems.some(function (i) { return i.name === name; }); } catch (e) { return false; } }
  function persist() {
    try { if (typeof saveAll === 'function') saveAll(); if (typeof saveBag === 'function') saveBag(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
  }
  function registerItems() {                                       // 재료 상점에서 팔 수 있게 (fishing.js 와 같은 값)
    try {
      FISH.forEach(function (f) {
        if (typeof MATERIAL_SELL_PRICES !== 'undefined') MATERIAL_SELL_PRICES[f.name] = f.price;
        if (typeof MATERIAL_EMOJI_MAP !== 'undefined') MATERIAL_EMOJI_MAP[f.name] = f.emoji;
      });
    } catch (e) {}
  }

  // ───────── 동작 ─────────
  function craftReady() {
    var ok = coins >= CRAFT_COIN;
    Object.keys(CRAFT_MATS).forEach(function (n) { if (matQty(n) < CRAFT_MATS[n]) ok = false; });
    return ok;
  }
  // 🎁 첫 통발 무료: 통발이 하나도 없고 아직 무료를 안 받았을 때 1회만
  function canFree(s) { s = s || load(); return !s.freeUsed && s.traps.length === 0; }
  function claimFree() {
    var s = load();
    if (!canFree(s)) { toast('이미 첫 통발을 받았어요'); return false; }
    s.traps.push({ setAt: Date.now() });
    s.freeUsed = 1;
    save(s); persist();
    toast('🎁 첫 통발을 선물로 받았어요! 이제 알아서 물고기가 모여요');
    return true;
  }

  function addTrap(how) {                                          // how: 'craft' | 'buy'
    var s = load();
    if (s.traps.length >= MAX_TRAPS) { toast('통발은 최대 ' + MAX_TRAPS + '개까지 가질 수 있어요'); return false; }
    if (how === 'craft') {
      if (!craftReady()) { toast('재료나 코인이 부족해요!'); return false; }
      Object.keys(CRAFT_MATS).forEach(function (n) { useFromBag(n, CRAFT_MATS[n]); });
      coins -= CRAFT_COIN;
    } else {
      if (coins < BUY_PRICE) { toast('코인이 부족해요! (🍔 ' + fmt(BUY_PRICE) + ' 필요)'); return false; }
      coins -= BUY_PRICE;
    }
    s.traps.push({ setAt: Date.now() });
    save(s); persist();
    toast('🪤 통발을 설치했어요! 이제 알아서 물고기가 모여요');
    return true;
  }

  // 통발 하나 수거. 성공하면 { got: {이름: 수}, webs, exp } / 못하면 null
  function collectOne(i, rng, now) {
    now = now || Date.now();
    var s = load(), t = s.traps[i];
    if (!t) return null;
    var n = pending(t, now);
    if (n <= 0) return null;
    var rolls = [], need = {}, newSlots = 0;
    for (var k = 0; k < n; k++) rolls.push(rollFish(rng));
    rolls.forEach(function (f) { if (!need[f.name]) { need[f.name] = 1; if (!hasInBag(f.name)) newSlots++; } });
    if (newSlots > freeSlots()) { toast('가방이 꽉 찼어요! 🎒 슬롯을 확장하거나 재료를 팔아주세요'); return null; }

    registerItems();
    var got = {}, webs = 0;
    rolls.forEach(function (f) {
      if (addToBag(f.emoji, f.name, 'material', 1, '통발로 잡은 물고기 · 재료 상점에서 팔 수 있어요')) got[f.name] = (got[f.name] || 0) + 1;
      if ((rng || Math.random)() < WEB_DROP && addToBag('🕸️', '은빛거미줄', 'material', 1, '제작 재료 (통발에 걸려 올라왔어요)')) webs++;
    });
    var exp = n * EXP_PER_FISH;
    try { if (exp > 0 && typeof addPlayerExp === 'function') addPlayerExp(exp); } catch (e) {}
    t.setAt = (n >= CAP) ? now : t.setAt + n * INTERVAL_MS;        // 가득 찼으면 지금부터 다시, 아니면 남은 진행도는 유지
    save(s); persist();
    return { got: got, webs: webs, exp: exp, n: n };
  }
  function collectAll() {
    var s = load(), total = 0, sumGot = {}, webs = 0, exp = 0, blocked = false;
    for (var i = 0; i < s.traps.length; i++) {
      if (pending(s.traps[i]) <= 0) continue;
      var r = collectOne(i);
      if (!r) { blocked = true; continue; }
      total += r.n; webs += r.webs; exp += r.exp;
      Object.keys(r.got).forEach(function (k) { sumGot[k] = (sumGot[k] || 0) + r.got[k]; });
    }
    if (total > 0) toast('🪤 물고기 ' + total + '마리 수거! ⭐+' + exp + (webs ? ' · 🕸️ +' + webs : ''));
    else if (!blocked) toast('아직 모인 물고기가 없어요');
    return { total: total, got: sumGot, webs: webs };
  }

  // ───────── 화면 ─────────
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var ACC = '#38BDF8';
  var timer = null;

  function mmss(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
    return (h ? h + ':' : '') + ('0' + m).slice(-2) + ':' + ('0' + sec).slice(-2);
  }

  function openTrap() {
    var old = document.getElementById('trap-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'trap-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:955;background:linear-gradient(180deg,#06202b,#050a10);overflow-y:auto;' + FONT;
    document.body.appendChild(ov);
    draw(ov);
    if (timer) clearInterval(timer);
    timer = setInterval(function () {                              // 1초마다 숫자만 갱신 (화면 전체를 다시 그리지 않음)
      var o = document.getElementById('trap-overlay');
      if (!o) { clearInterval(timer); timer = null; return; }
      tick(o);
    }, 1000);
  }

  function tick(ov) {
    var s = load(), now = Date.now();
    s.traps.forEach(function (t, i) {
      var c = ov.querySelector('[data-cnt="' + i + '"]'), nx = ov.querySelector('[data-next="' + i + '"]'), bar = ov.querySelector('[data-bar="' + i + '"]');
      var p = pending(t, now);
      if (c) c.textContent = p + ' / ' + CAP + '마리';
      if (nx) nx.textContent = p >= CAP ? '가득 찼어요! 수거해주세요' : '다음 1마리까지 ' + mmss(nextIn(t, now));
      if (bar) bar.style.width = Math.round(p / CAP * 100) + '%';
    });
  }

  function draw(ov) {
    ov = ov || document.getElementById('trap-overlay'); if (!ov) return;
    var s = load(), now = Date.now();
    var cards = '';
    for (var i = 0; i < MAX_TRAPS; i++) {
      var t = s.traps[i];
      if (t) {
        var p = pending(t, now);
        cards += '<div style="background:rgba(255,255,255,0.06);border:1px solid ' + (p >= CAP ? '#FFD700' : 'rgba(255,255,255,0.14)') + ';border-radius:14px;padding:12px;margin-bottom:10px;">' +
          '<div style="display:flex;align-items:center;gap:10px;"><div style="font-size:30px;">🪤</div><div style="flex:1;min-width:0;">' +
          '<div style="font-size:14px;font-weight:900;color:#fff;">통발 ' + (i + 1) + ' <span data-cnt="' + i + '" style="color:#FFD700;font-size:13px;">' + p + ' / ' + CAP + '마리</span></div>' +
          '<div data-next="' + i + '" style="font-size:11px;color:#9ab;margin-top:2px;"></div></div>' +
          '<button data-collect="' + i + '" style="' + BTN + 'padding:10px 14px;font-size:13px;background:linear-gradient(135deg,#38BDF8,#34D399);color:#fff;">수거</button></div>' +
          '<div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin-top:10px;"><div data-bar="' + i + '" style="height:100%;width:' + Math.round(p / CAP * 100) + '%;background:linear-gradient(90deg,#38BDF8,#34D399);"></div></div></div>';
      } else {
        cards += '<div style="border:1.5px dashed rgba(255,255,255,0.2);border-radius:14px;padding:16px;margin-bottom:10px;text-align:center;color:#778;font-size:13px;">빈 자리 (통발을 만들거나 살 수 있어요)</div>';
      }
    }

    var canAdd = s.traps.length < MAX_TRAPS;
    var matsHtml = Object.keys(CRAFT_MATS).map(function (n) {
      var have = matQty(n), need = CRAFT_MATS[n];
      return '<div style="margin:2px 0;color:' + (have >= need ? '#4ade80' : '#ff8a8a') + ';">' + n + ' ' + have + '/' + need + (window.matWhereTag ? '<br>' + window.matWhereTag(n) : '') + '</div>';
    }).join('');
    var free = canFree(s) ?
      '<button id="trap-free" style="' + BTN + 'width:100%;padding:15px;margin:2px 0 12px;font-size:15px;background:linear-gradient(135deg,#FF6B9D,#FFD700);color:#1a1a2e;box-shadow:0 0 16px rgba(255,215,0,.5);">🎁 첫 통발 무료로 받기!</button>' : '';
    var make = canAdd ?
      '<div style="background:rgba(255,255,255,0.05);border-radius:14px;padding:12px;margin-top:6px;">' +
      '<div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:6px;">🔧 통발 얻기</div>' +
      '<div style="font-size:12px;line-height:1.7;margin-bottom:8px;">' + matsHtml + '<span style="color:' + (coins >= CRAFT_COIN ? '#4ade80' : '#ff8a8a') + ';">🍔 ' + fmt(coins) + '/' + fmt(CRAFT_COIN) + '</span></div>' +
      '<button id="trap-craft" style="' + BTN + 'width:100%;padding:12px;margin-bottom:8px;font-size:14px;background:' + (craftReady() ? 'linear-gradient(135deg,#34D399,#38BDF8)' : 'rgba(255,255,255,0.1)') + ';color:' + (craftReady() ? '#fff' : '#777') + ';">직접 만들기</button>' +
      '<button id="trap-buy" style="' + BTN + 'width:100%;padding:11px;font-size:13px;background:rgba(255,215,0,0.15);color:#FFD700;">🍔 ' + fmt(BUY_PRICE) + ' 코인으로 바로 사기</button></div>' : '';

    ov.innerHTML = '<div style="position:sticky;top:0;z-index:2;background:rgba(5,10,16,0.95);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="color:#fff;font-size:17px;font-weight:900;">🪤 통발</div>' +
      '<div style="display:flex;gap:8px;align-items:center;"><span style="color:#FFD700;font-size:13px;font-weight:900;">🍔 ' + fmt(coins) + '</span>' +
      '<button id="trap-close" style="' + BTN + 'background:rgba(255,255,255,0.12);color:#fff;padding:7px 12px;">닫기</button></div></div>' +
      '<div style="padding:0 16px 40px;">' +
      '<div style="font-size:11px;color:#8aa;line-height:1.6;margin-bottom:12px;">설치해 두면 접속 안 해도 ' + INTERVAL_MIN + '분마다 물고기가 1마리씩 쌓여요 (최대 ' + CAP_HOURS + '시간치). 수거해도 통발은 계속 돌아가요.</div>' +
      free + cards +
      (s.traps.length ? '<button id="trap-all" style="' + BTN + 'width:100%;padding:13px;margin:2px 0 10px;font-size:14px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#1a1a2e;">🎣 모두 수거</button>' : '') +
      make + '</div>';

    ov.querySelector('#trap-close').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-collect]').forEach(function (b) {
      b.onclick = function () {
        var r = collectOne(parseInt(b.getAttribute('data-collect'), 10));
        if (r) toast('🪤 물고기 ' + r.n + '마리 수거! ⭐+' + r.exp + (r.webs ? ' · 🕸️ +' + r.webs : ''));
        else if (pending(load().traps[parseInt(b.getAttribute('data-collect'), 10)] || { setAt: now }) <= 0) toast('아직 모인 물고기가 없어요');
        draw();
      };
    });
    var all = ov.querySelector('#trap-all'); if (all) all.onclick = function () { collectAll(); draw(); };
    var fr = ov.querySelector('#trap-free'); if (fr) fr.onclick = function () { claimFree(); draw(); };
    var cr = ov.querySelector('#trap-craft'); if (cr) cr.onclick = function () { addTrap('craft'); draw(); };
    var by = ov.querySelector('#trap-buy'); if (by) by.onclick = function () {
      if (confirm('통발을 🍔 ' + fmt(BUY_PRICE) + ' 코인에 살까요?')) { addTrap('buy'); draw(); }
    };
    tick(ov);
  }

  window.openTrap = openTrap;
  window.__trapTest = { claimFree: claimFree, canFree: canFree, load: load, pending: pending, collectOne: collectOne, collectAll: collectAll, addTrap: addTrap, rollFish: rollFish, CAP: CAP, INTERVAL_MS: INTERVAL_MS };

  // ───────── 기존 화면에 연결 ─────────
  function whenReady(test, fn) {
    var tries = 0;
    (function attempt() {
      var ok = false;
      try { ok = test(); } catch (e) {}
      if (ok) { fn(); return; }
      if (++tries < 200) setTimeout(attempt, 100);
    })();
  }

  // 호수의 "🎣 낚시하기"를 누르면 [낚시하기 / 통발] 선택창을 띄움
  // (fishing.js 가 explorePlace('lake')를 먼저 가로채 있어야 하므로, 그게 끝난 뒤에 그 바깥을 한 겹 더 감쌈)
  function lakeChoice(goFishing) {
    var old = document.getElementById('trap-choice'); if (old) old.remove();
    var s = load(), now = Date.now(), ready = 0;
    s.traps.forEach(function (t) { ready += pending(t, now); });
    var ov = document.createElement('div');
    ov.id = 'trap-choice';
    ov.style.cssText = 'position:fixed;inset:0;z-index:960;background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;padding:20px;' + FONT;
    ov.innerHTML = '<div style="width:100%;max-width:300px;background:linear-gradient(135deg,#0b2a3b,#1a1a2e);border:2px solid ' + ACC + ';border-radius:20px;padding:22px 18px;text-align:center;">' +
      '<div style="font-size:34px;margin-bottom:4px;">🌊</div>' +
      '<div style="font-size:17px;font-weight:900;color:#fff;margin-bottom:14px;">🏕️ 워크숍 캠프</div>' +
      '<button id="tc-fish" style="' + BTN + 'width:100%;padding:14px;margin-bottom:8px;font-size:15px;background:linear-gradient(135deg,#38BDF8,#C084FC);color:#fff;">🎣 낚시하기 <span style="font-size:12px;font-weight:400;">(⚡10 · 직접 잡기)</span></button>' +
      '<button id="tc-trap" style="' + BTN + 'width:100%;padding:14px;margin-bottom:8px;font-size:15px;background:linear-gradient(135deg,#34D399,#38BDF8);color:#fff;position:relative;">🪤 통발 ' +
      '<span style="font-size:12px;font-weight:400;">(방치)</span>' +
      (ready > 0 ? '<span style="position:absolute;top:-7px;right:-4px;background:#ef4444;color:#fff;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:900;">' + ready + '</span>' : '') + '</button>' +
      '<button id="tc-close" style="' + BTN + 'width:100%;padding:11px;background:rgba(255,255,255,0.08);color:#aaa;font-size:13px;">닫기</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#tc-fish').onclick = function () { ov.remove(); goFishing(); };
    ov.querySelector('#tc-trap').onclick = function () { ov.remove(); openTrap(); };
    ov.querySelector('#tc-close').onclick = function () { ov.remove(); };
  }

  (function hookLake() {
    var tries = 0;
    (function attempt() {
      if (typeof window.explorePlace === 'function' && window.__fishingHooked) {
        var original = window.explorePlace;
        if (original.__trapWrapped) return;
        var wrapped = function (id) {
          if (id === 'lake') {
            var self = this, args = arguments;
            lakeChoice(function () { original.apply(self, args); });
            return;
          }
          return original.apply(this, arguments);
        };
        wrapped.__trapWrapped = true;
        window.explorePlace = wrapped;
        return;
      }
      if (++tries < 600) setTimeout(attempt, 100);
    })();
  })();

  // 접속했을 때 통발이 절반 넘게 찼으면 한 번 알려줌
  setTimeout(function () {
    try {
      var s = load(), full = s.traps.filter(function (t) { return pending(t) >= CAP / 2; }).length;
      if (full > 0) toast('🪤 통발에 물고기가 모였어요! 호수 → 통발');
    } catch (e) {}
  }, 6000);
})();
