// ════════════════════════════════
// 🍬 디저트 공방 (sweets.js)
// 📅 스케줄 · 식사(meal.js) 화면, 식사 목록 아래에 "🍬 디저트 공방" 칸을 붙인다.
//
// - 탐험에서 모은 재료(별빛모래, 무지개꽃, 구름조각 …)로 판타지 간식(별빛 마카롱, 소원 캔디 …)을 만든다.
// - 간식은 끼니가 아니다. (하루 보내기 조건인 두 끼와 별개) 아이돌 1명당 하루 2개까지.
// - 효과는 기분 위주 (레슨으로 깎인 기분을 채우는 용도). 아이돌마다 좋아하는 간식이면 기분 +4 더.
// - 재료는 가방(bagItems)의 'material' 을 그대로 쓴다. 새 재료는 만들지 않는다.
// - 컨디션(비주얼·체력·기분)은 meal.js 의 저장값을 window.__mealTest 로 읽고 쓴다.
// - 그림: meal-assets/sweets/<id>.png (없으면 이모지로 대신 보임)
//
// 저장: localStorage 'ph_sweets' (ph_ 로 시작해서 cloud-extra.js 가 서버에 자동으로 올려줌)
// ════════════════════════════════
(function () {
  'use strict';

  // ════════ 설정 ════════
  var STORAGE_KEY = 'ph_sweets';
  var ASSET = 'meal-assets/sweets/';
  var PER_DAY = 2;           // 아이돌 1명당 하루 간식 수
  var LIKE_BONUS = 4;        // 좋아하는 간식이면 기분 +

  // ════════ 데이터 ════════
  // need: [재료 이름, 개수]   d: 컨디션 변화 (v 비주얼 / s 체력 / m 기분)
  var RECIPES = [
    { id: 'macaron',   name: '별빛 마카롱',   emoji: '🧁', need: [['별빛모래', 2], ['장미꽃', 1]],          d: { v: 2, s: 0, m: 8 } },
    { id: 'cookie',    name: '달무리 쿠키',   emoji: '🍪', need: [['달빛모래', 2], ['해바라기', 1]],        d: { v: 0, s: 2, m: 7 } },
    { id: 'cotton',    name: '무지개 솜사탕', emoji: '🍭', need: [['무지개꽃', 2], ['나비가루', 1]],        d: { v: 1, s: 0, m: 10 } },
    { id: 'candy',     name: '소원 캔디',     emoji: '🍬', need: [['네잎클로버', 2], ['빛나는돌', 1]],      d: { v: 1, s: 1, m: 8 } },
    { id: 'jelly',     name: '요정 젤리',     emoji: '🍡', need: [['맑은샘물', 2], ['신비버섯', 1]],        d: { v: 3, s: 0, m: 7 } },
    { id: 'pudding',   name: '반딧불 푸딩',   emoji: '🍮', need: [['달빛수정', 1], ['맑은샘물', 2]],        d: { v: 0, s: 2, m: 10 } },
    { id: 'meringue',  name: '구름 머랭',     emoji: '☁️', need: [['구름조각', 1], ['별빛모래', 2]],        d: { v: 2, s: 1, m: 12 } },
    { id: 'mochi',     name: '벚꽃 모찌',     emoji: '🌸', need: [['벚꽃결정', 1], ['나비가루', 1]],        d: { v: 4, s: 1, m: 13 } },
    { id: 'aurora',    name: '오로라 사탕',   emoji: '🌈', need: [['무지개수정', 1], ['별의파편', 1]],      d: { v: 3, s: 3, m: 14 } }
  ];
  var BY_ID = {};
  RECIPES.forEach(function (r) { BY_ID[r.id] = r; });

  var LIKES = {   // 아이돌별로 좋아하는 간식
    minjun: ['macaron', 'candy'],
    sion:   ['pudding', 'aurora'],
    doyun:  ['cookie', 'jelly'],
    harin:  ['cotton', 'mochi'],
    yuna:   ['macaron', 'cotton'],
    ara:    ['mochi', 'aurora']
  };

  var LINES = {   // 성격별 반응 (게임 용어 없이 세계관 말투로)
    '수줍음': {
      like: ['와… 예뻐요. 아까워서 못 먹겠어요…', '이거… 제가 제일 좋아하는 거예요. 고마워요!'],
      neutral: ['달콤해요… 힘이 나요.', '조금씩 아껴 먹을게요.']
    },
    '당당함': {
      like: ['오, 센스 있는데? 이건 인정.', '역시 내 취향을 알아.'],
      neutral: ['나쁘지 않네. 한 입 더 줘.', '달달하니 기분 좋아졌어.']
    },
    '감성': {
      like: ['…달빛 맛이 나. 오래 기억할 것 같아.', '마음이 말랑해져.'],
      neutral: ['고마워. 조용히 먹기 좋은 맛이야.', '입안에서 별이 녹는 것 같아.']
    }
  };

  // ════════ 순수 로직 ════════
  function clamp(x) { return Math.max(0, Math.min(100, x)); }

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.cooked) s.cooked = {};      // { 레시피id: 누적 횟수 }  (나중에 요리 레벨용)
    if (!s.made) s.made = {};          // { cid: 오늘 만든 수 }
    if (typeof s.day !== 'number') s.day = 0;
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }
  function syncDay(s, day) { if (s.day !== day) { s.day = day; s.made = {}; } return s; }
  function madeToday(s, cid) { return s.made[cid] || 0; }

  function isLike(cid, rid) { return (LIKES[cid] || []).indexOf(rid) !== -1; }
  function deltaOf(cid, r) {
    var like = isLike(cid, r.id);
    return { v: r.d.v, s: r.d.s, m: r.d.m + (like ? LIKE_BONUS : 0), like: like };
  }

  // haveFn(이름) → 가방에 있는 개수. 부족한 재료 목록을 돌려준다.
  function lacking(r, haveFn) {
    var out = [];
    r.need.forEach(function (n) { if (haveFn(n[0]) < n[1]) out.push(n[0]); });
    return out;
  }
  function canCook(s, cid, r, haveFn) {
    if (!r) return { ok: false, why: 'invalid' };
    if (madeToday(s, cid) >= PER_DAY) return { ok: false, why: 'full' };
    if (lacking(r, haveFn).length) return { ok: false, why: 'lack' };
    return { ok: true };
  }

  // 컨디션에 간식 효과 적용 (재료 차감은 호출하는 쪽)
  function applyCook(s, cond, cid, r) {
    var d = deltaOf(cid, r), before = { v: cond.v, s: cond.s, m: cond.m };
    cond.v = clamp(cond.v + d.v); cond.s = clamp(cond.s + d.s); cond.m = clamp(cond.m + d.m);
    s.made[cid] = madeToday(s, cid) + 1;
    s.cooked[r.id] = (s.cooked[r.id] || 0) + 1;
    return { d: d, before: before };
  }
  function pickLine(trait, like, rng) {
    rng = rng || Math.random;
    var set = LINES[trait] || LINES['수줍음'], pool = like ? set.like : set.neutral;
    return pool[Math.floor(rng() * pool.length)];
  }

  // ════════ 게임 연결 ════════
  function M() { return window.__mealTest || null; }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function snd(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function bagList() { try { return (typeof bagItems !== 'undefined') ? bagItems : []; } catch (e) { return []; } }
  function have(name) {
    var it = bagList().find(function (i) { return i.name === name && i.type === 'material'; });
    return it ? (it.qty || 0) : 0;
  }
  function takeMaterials(r) {
    var list = bagList();
    r.need.forEach(function (n) {
      var i = list.findIndex(function (x) { return x.name === n[0] && x.type === 'material'; });
      if (i < 0) return;
      list[i].qty -= n[1];
      if (list[i].qty <= 0) list.splice(i, 1);
    });
    try { if (typeof saveBag === 'function') saveBag(); } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    try { if (typeof renderBag === 'function') renderBag(); } catch (e) {}
  }
  function matIcon(name, px) {
    var fb = (typeof getMaterialEmoji === 'function') ? getMaterialEmoji(name) : '🌿';
    try { if (typeof window.matIcon === 'function') return window.matIcon(name, px, fb) || fb; } catch (e) {}
    return fb;
  }

  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var lastCid = null;

  function injectStyle() {
    if (document.getElementById('sweets-style')) return;
    var st = document.createElement('style');
    st.id = 'sweets-style';
    st.textContent = '@keyframes swSpin{0%{transform:rotate(-12deg) scale(1)}50%{transform:rotate(12deg) scale(1.18)}100%{transform:rotate(-12deg) scale(1)}}' +
      '@keyframes swPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}';
    document.head.appendChild(st);
  }
  function sweetImg(r, px) {
    return '<span style="position:relative;display:inline-block;width:' + px + 'px;height:' + px + 'px;font-size:' + Math.round(px * 0.8) + 'px;line-height:' + px + 'px;text-align:center;">' + r.emoji +
      '<img src="' + ASSET + r.id + '.png" alt="" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;" onerror="this.remove()"></span>';
  }

  // ════════ 화면 ════════
  function currentCid(ov) {
    var m = M(); if (!m) return null;
    var img = ov.querySelector('#meal-stage [data-r="sd"]');
    if (img && img.alt) {
      for (var id in m.CH) if (Object.prototype.hasOwnProperty.call(m.CH, id) && m.CH[id].name === img.alt) return id;
    }
    if (lastCid && m.CH[lastCid]) return lastCid;
    var first = ov.querySelector('#meal-chips [data-cid]');
    return first ? first.getAttribute('data-cid') : null;
  }

  function chip(label, val) {
    var c = val > 0 ? '#7ee8a5' : val < 0 ? '#ff8a8a' : '#777';
    return '<span style="font-size:10px;font-weight:900;color:' + c + ';">' + label + (val > 0 ? '+' : '') + val + '</span>';
  }

  function boxHtml(cid) {
    var m = M(), ms = m.load(), s = syncDay(load(), ms.day), left = PER_DAY - madeToday(s, cid), c = m.CH[cid];
    var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px;">' +
      '<div style="font-size:13px;font-weight:900;color:#ddd;">🍬 디저트 공방 <span style="color:#aaa;font-weight:700;">(오늘 남은 간식 ' + Math.max(0, left) + '/' + PER_DAY + ')</span></div></div>' +
      '<div style="font-size:11px;color:#cfd3ee;margin:-4px 0 8px;line-height:1.5;">탐험에서 모은 재료로 ' + esc(c.name) + '의 간식을 만들어요. 끼니와는 별개예요.</div>';
    var cards = RECIPES.map(function (r) {
      var d = deltaOf(cid, r), ok = canCook(s, cid, r, have).ok;
      var mats = r.need.map(function (n) {
        var h = have(n[0]), enough = h >= n[1];
        return '<span style="display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:800;color:' + (enough ? '#cfd3ee' : '#ff8a8a') + ';">' + matIcon(n[0], 16) + h + '/' + n[1] + '</span>';
      }).join(' ');
      return '<button data-sweet="' + r.id + '" style="' + BTN + 'position:relative;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#fff;opacity:' + (ok ? 1 : 0.5) + ';">' +
        (d.like ? '<span title="좋아해요" style="position:absolute;top:4px;right:6px;font-size:13px;">❤️</span>' : '') +
        '<div style="margin:0 auto 2px;">' + sweetImg(r, 52) + '</div>' +
        '<div style="font-size:11px;font-weight:900;line-height:1.25;min-height:28px;display:flex;align-items:center;justify-content:center;">' + esc(r.name) + '</div>' +
        '<div style="display:flex;justify-content:center;gap:5px;margin-top:2px;">' + chip('✨', d.v) + chip('💪', d.s) + chip('😊', d.m) + '</div>' +
        '<div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;margin-top:4px;">' + mats + '</div></button>';
    }).join('');
    return head + '<div id="sw-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' + cards + '</div>';
  }

  function drawBox(ov) {
    var box = ov.querySelector('#sweets-box');
    if (!box || !M()) return;
    var cid = currentCid(ov);
    if (!cid || !M().CH[cid]) { box.innerHTML = ''; return; }
    box.innerHTML = boxHtml(cid);
    var grid = box.querySelector('#sw-grid');
    if (grid) grid.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-sweet]') : null;
      if (b) openConfirm(cid, b.getAttribute('data-sweet'));
    };
  }

  function inject(ov) {
    if (!ov || !M() || ov.querySelector('#sweets-box')) return;
    var anchor = ov.querySelector('#meal-foods');
    if (!anchor) return;
    injectStyle();
    var box = document.createElement('div');
    box.id = 'sweets-box';
    box.style.cssText = FONT;
    anchor.insertAdjacentElement('afterend', box);
    drawBox(ov);
  }

  function overlay(id, z) {
    var old = document.getElementById(id); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + z + ';background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    document.body.appendChild(ov);
    return ov;
  }

  function openConfirm(cid, rid) {
    var m = M(), r = BY_ID[rid]; if (!m || !r) return;
    var ms = m.load(), s = syncDay(load(), ms.day), c = canCook(s, cid, r, have);
    if (!c.ok) {
      toast(c.why === 'full' ? '오늘 간식은 다 만들었어요 (하루 ' + PER_DAY + '개)' : '재료가 모자라요: ' + lacking(r, have).join(', '));
      return;
    }
    var d = deltaOf(cid, r), name = m.CH[cid].name;
    var ov = overlay('sweets-confirm', 815);
    var mats = r.need.map(function (n) { return '<div style="font-size:12px;color:#fff;">' + matIcon(n[0], 20) + ' ' + esc(n[0]) + ' <b style="color:#ffe08a;">×' + n[1] + '</b> <span style="color:#9aa0c8;">(보유 ' + have(n[0]) + ')</span></div>'; }).join('');
    ov.innerHTML = '<div style="width:100%;max-width:330px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #ff9ecb;border-radius:20px;padding:18px;text-align:center;">' +
      '<div data-r="art" style="margin:4px auto 6px;">' + sweetImg(r, 84) + '</div>' +
      '<div style="font-size:17px;font-weight:900;color:#fff;">' + esc(r.name) + '</div>' +
      '<div style="font-size:12px;color:#cfd3ee;margin:2px 0 8px;">' + esc(name) + '에게 만들어줄까요?' + (d.like ? ' <span style="color:#ff9ecb;">❤️ 좋아하는 간식!</span>' : '') + '</div>' +
      '<div style="display:flex;justify-content:center;gap:8px;margin-bottom:8px;">' + chip('✨ 비주얼', d.v) + chip('💪 체력', d.s) + chip('😊 기분', d.m) + '</div>' +
      '<div style="background:rgba(255,255,255,0.07);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;align-items:center;">' + mats + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;"><button id="sw-no" style="' + BTN + 'flex:1;padding:12px;background:rgba(255,255,255,0.12);color:#fff;font-size:13px;">취소</button>' +
      '<button id="sw-yes" style="' + BTN + 'flex:2;padding:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:14px;">🍬 만들기</button></div></div>';
    ov.querySelector('#sw-no').onclick = function () { ov.remove(); };
    ov.querySelector('#sw-yes').onclick = function () { cook(cid, rid, ov); };
  }

  var busy = false;
  function cook(cid, rid, confirmOv) {
    if (busy) return;
    var m = M(), r = BY_ID[rid]; if (!m || !r) return;
    var ms = m.load(), s = syncDay(load(), ms.day);
    if (!canCook(s, cid, r, have).ok) { confirmOv.remove(); toast('지금은 만들 수 없어요'); return; }
    busy = true;
    takeMaterials(r);                                              // 재료 먼저 차감
    var res = applyCook(s, m.statOf(ms, cid), cid, r);
    save(s); m.save(ms);
    snd('stamp');
    var art = confirmOv.querySelector('[data-r="art"]');
    if (art) art.firstChild.style.animation = 'swSpin .5s ease-in-out infinite';
    confirmOv.querySelector('#sw-yes').parentNode.innerHTML = '<div style="flex:1;padding:12px;font-size:13px;font-weight:900;color:#ffe08a;">✨ 반짝반짝 만드는 중…</div>';
    setTimeout(function () {
      confirmOv.remove();
      showResult(cid, r, res);
      var ov = document.getElementById('meal-overlay');
      try { if (window.__mealRefresh) window.__mealRefresh(res.before); } catch (e) {}
      if (ov) drawBox(ov);
      busy = false;
    }, 1100);
  }

  function showResult(cid, r, res) {
    var m = M(), c = m.CH[cid], line = pickLine(c.trait, res.d.like);
    var ov = overlay('sweets-result', 820);
    ov.innerHTML = '<div style="width:100%;max-width:330px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #ff9ecb;border-radius:20px;padding:18px;text-align:center;">' +
      '<div style="font-size:13px;font-weight:900;color:#cfd3ee;">' + esc(c.name) + ' · ' + esc(r.name) + '</div>' +
      '<div style="margin:8px auto 2px;animation:swPop .5s ease-out;">' + sweetImg(r, 84) + '</div>' +
      (res.d.like ? '<div style="font-size:12px;font-weight:900;color:#ff9ecb;">❤️ 제일 좋아하는 간식이에요!</div>' : '') +
      '<div style="margin:10px 0 6px;background:#fff;color:#2a2438;border-radius:14px;padding:9px 12px;font-size:12px;font-weight:700;line-height:1.5;">“' + esc(line) + '”</div>' +
      '<div style="display:flex;justify-content:center;gap:10px;margin-top:8px;">' + chip('✨ 비주얼', res.d.v) + chip('💪 체력', res.d.s) + chip('😊 기분', res.d.m) + '</div>' +
      '<button id="sw-ok" style="' + BTN + 'width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:14px;">확인</button></div>';
    ov.querySelector('#sw-ok').onclick = function () { ov.remove(); };
  }

  // ════════ meal 화면에 붙이기 ════════
  function watch() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) return;
    var watched = null;
    function attach(ov) {
      if (watched === ov) return;
      watched = ov;
      inject(ov);
      new MutationObserver(function () { inject(ov); }).observe(ov, { childList: true });
    }
    var first = document.getElementById('meal-overlay');
    if (first) attach(first);
    new MutationObserver(function () {
      var ov = document.getElementById('meal-overlay');
      if (ov) attach(ov); else watched = null;
    }).observe(document.body, { childList: true });
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('#meal-overlay [data-cid]') : null;
      if (b) lastCid = b.getAttribute('data-cid');
    }, true);
  }
  watch();

  window.__sweetsTest = {
    RECIPES: RECIPES, LIKES: LIKES, CFG: { PER_DAY: PER_DAY, LIKE_BONUS: LIKE_BONUS },
    load: load, save: save, syncDay: syncDay, madeToday: madeToday, deltaOf: deltaOf, lacking: lacking, canCook: canCook, applyCook: applyCook, pickLine: pickLine
  };
})();
