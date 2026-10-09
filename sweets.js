// ════════════════════════════════
// 🍬 디저트 공방 (sweets.js)
// 📅 스케줄 · 식사(meal.js) 화면, 식사 목록 아래에 "🍬 디저트 공방" 칸을 붙인다.
//
// - 탐험에서 모은 재료(별빛모래, 무지개꽃, 구름조각 …)로 판타지 간식(별빛 마카롱, 소원 캔디 …)을 만들어 가방에 쌓는다.
// - 만든 간식은 ① 아이돌에게 먹이거나(공방 화면의 '가진 간식' / 가방에서 간식을 눌러 먹이기) ② 거래소에서 사고판다.
// - 간식은 끼니가 아니다. (하루 보내기 조건인 두 끼와 별개) 아이돌 1명당 하루 2개까지 먹일 수 있다.
// - 효과는 기분 위주 (레슨으로 깎인 기분을 채우는 용도). 아이돌마다 좋아하는 간식이면 기분 +4 더.
// - 재료는 가방(bagItems)의 'material' 을 그대로 쓴다. 새 재료는 만들지 않는다. 간식은 가방에 type 'sweet' 로 담긴다.
// - 거래소: trade.js 가 window.__sweetsItems() 로 품목을 가져간다. (키 'bk_sweet_<id>' → 기존 'bk_.*' 서버 규칙 그대로 적용, 가격 2천~500만)
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
  var TYPE = 'sweet';        // 가방 아이템 종류
  var PER_DAY = 2;           // 아이돌 1명당 하루에 먹일 수 있는 간식 수
  var LIKE_BONUS = 4;        // 좋아하는 간식이면 기분 +
  var TRADE_MIN = 2000, TRADE_MAX = 5000000;   // 거래소 가격 범위 (서버 'bk_.*' 규칙과 같게)
  var Z = 2150;              // 팝업 높이 (가방 상세 화면 위에도 보이게)

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
    { id: 'honey',      name: '황금 꿀빵',     emoji: '🥞', need: [['해바라기', 2], ['맑은샘물', 1]],        d: { v: 0, s: 10, m: 3 } },
    { id: 'aurora',    name: '오로라 사탕',   emoji: '🌈', need: [['무지개수정', 1], ['별의파편', 1]],      d: { v: 3, s: 3, m: 14 } }
  ];
  var BY_ID = {}, BY_NAME = {};
  RECIPES.forEach(function (r) { BY_ID[r.id] = r; BY_NAME[r.name] = r; });

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
    if (!s.cooked) s.cooked = {};      // { 레시피id: 누적 만든 횟수 }  (나중에 요리 레벨용)
    if (!s.fed) s.fed = (s.made && typeof s.made === 'object') ? s.made : {};   // { cid: 오늘 먹인 수 }  (예전 저장값 'made' 도 이어받음)
    delete s.made;
    if (typeof s.day !== 'number') s.day = 0;
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }
  function syncDay(s, day) { if (s.day !== day) { s.day = day; s.fed = {}; } return s; }
  function fedToday(s, cid) { return s.fed[cid] || 0; }

  function isLike(cid, rid) { return (LIKES[cid] || []).indexOf(rid) !== -1; }
  function deltaOf(cid, r) {
    var like = isLike(cid, r.id);
    return { v: r.d.v, s: r.d.s, m: r.d.m + (like ? LIKE_BONUS : 0), like: like };
  }
  function descOf(r) { return r.emoji + ' 아이돌에게 먹이면 기분 +' + r.d.m + (r.d.v ? ' · 비주얼 +' + r.d.v : '') + (r.d.s ? ' · 체력 +' + r.d.s : '') + ' (아이돌 1명당 하루 ' + PER_DAY + '개 · 거래소 등록 가능)'; }

  // haveFn(이름) → 가방에 있는 재료 개수. 부족한 재료 목록을 돌려준다.
  function lacking(r, haveFn) {
    var out = [];
    r.need.forEach(function (n) { if (haveFn(n[0]) < n[1]) out.push(n[0]); });
    return out;
  }
  // 만들기: 재료가 충분하고, 가방에 담을 자리가 있어야 함 (재료가 다 쓰여서 비는 칸도 자리로 침)
  function canCook(r, haveFn, spaceFn) {
    if (!r) return { ok: false, why: 'invalid' };
    if (lacking(r, haveFn).length) return { ok: false, why: 'lack' };
    if (spaceFn && !spaceFn(r)) return { ok: false, why: 'bag' };
    return { ok: true };
  }
  // 먹이기: 오늘 이 아이돌에게 먹인 수가 한도 아래여야 함
  function canFeed(s, cid, haveSweetQty) {
    if (fedToday(s, cid) >= PER_DAY) return { ok: false, why: 'full' };
    if (!(haveSweetQty > 0)) return { ok: false, why: 'none' };
    return { ok: true };
  }
  // 컨디션에 간식 효과 적용 (가방에서 빼는 건 호출하는 쪽)
  function applyFeed(s, cond, cid, r) {
    var d = deltaOf(cid, r), before = { v: cond.v, s: cond.s, m: cond.m };
    cond.v = clamp(cond.v + d.v); cond.s = clamp(cond.s + d.s); cond.m = clamp(cond.m + d.m);
    s.fed[cid] = fedToday(s, cid) + 1;
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
  function have(name) {                                   // 재료 보유량
    var it = bagList().find(function (i) { return i.name === name && i.type === 'material'; });
    return it ? (it.qty || 0) : 0;
  }
  function sweetQty(r) {                                  // 간식 보유량
    var it = bagList().find(function (i) { return i.name === r.name; });
    return it ? (it.qty || 0) : 0;
  }
  function hasSpace(r) {
    var list = bagList();
    if (list.some(function (i) { return i.name === r.name; })) return true;
    var slots = 0; try { slots = bagSlots; } catch (e) {}
    if (list.length < slots) return true;
    return r.need.some(function (n) {                      // 재료를 다 쓰면 그 칸이 비니까 자리가 생김
      var it = list.find(function (i) { return i.name === n[0] && i.type === 'material'; });
      return it && it.qty <= n[1];
    });
  }
  function takeMaterials(r) {
    var list = bagList();
    r.need.forEach(function (n) {
      var i = list.findIndex(function (x) { return x.name === n[0] && x.type === 'material'; });
      if (i < 0) return;
      list[i].qty -= n[1];
      if (list[i].qty <= 0) list.splice(i, 1);
    });
  }
  function afterBagChange() {
    try { if (typeof saveBag === 'function') saveBag(); } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    try { if (typeof renderBag === 'function') renderBag(); } catch (e) {}
  }
  function matIcon(name, px) {
    var fb = (typeof getMaterialEmoji === 'function') ? getMaterialEmoji(name) : '🌿';
    try { if (typeof window.matIcon === 'function') return window.matIcon(name, px, fb) || fb; } catch (e) {}
    return fb;
  }
  function debutedIds() {                                  // 데뷔한 아이돌 (agency.js 의 저장값을 읽기만 함)
    var m = M(), a = null, out = [];
    try { a = JSON.parse(localStorage.getItem('ph_agency') || 'null'); } catch (e) {}
    if (a && m) {
      var done = a.done || {}, deb = a.debut || {};
      Object.keys(m.CH).forEach(function (cid) { if (done[cid] || deb[cid]) out.push(cid); });
    }
    return out;
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
  function chip(label, val) {
    var c = val > 0 ? '#7ee8a5' : val < 0 ? '#ff8a8a' : '#777';
    return '<span style="font-size:10px;font-weight:900;color:' + c + ';">' + label + (val > 0 ? '+' : '') + val + '</span>';
  }
  function overlay(id, z) {
    var old = document.getElementById(id); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + z + ';background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    document.body.appendChild(ov);
    return ov;
  }

  // ════════ 공방 화면 (스케줄 · 식사 안) ════════
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

  function boxHtml(cid) {
    var m = M(), ms = m.load(), s = syncDay(load(), ms.day), left = Math.max(0, PER_DAY - fedToday(s, cid)), c = m.CH[cid];
    var head = '<div style="margin:14px 0 8px;">' +
      '<div style="font-size:13px;font-weight:900;color:#ddd;">🍬 디저트 공방</div>' +
      '<div style="font-size:11px;color:#cfd3ee;margin-top:3px;line-height:1.5;">탐험 재료로 간식을 만들어 🎒가방에 담아요. 아이돌에게 먹이거나 🏪거래소에서 사고팔 수 있어요.</div></div>';
    var cards = RECIPES.map(function (r) {
      var d = deltaOf(cid, r), ok = canCook(r, have, hasSpace).ok, own = sweetQty(r);
      var mats = r.need.map(function (n) {
        var h = have(n[0]), enough = h >= n[1];
        return '<span style="display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:800;color:' + (enough ? '#cfd3ee' : '#ff8a8a') + ';">' + matIcon(n[0], 16) + h + '/' + n[1] + '</span>';
      }).join(' ');
      return '<button data-sweet="' + r.id + '" style="' + BTN + 'position:relative;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#fff;opacity:' + (ok ? 1 : 0.5) + ';">' +
        (d.like ? '<span title="좋아해요" style="position:absolute;top:4px;right:6px;font-size:13px;">❤️</span>' : '') +
        (own > 0 ? '<span style="position:absolute;top:4px;left:6px;font-size:10px;font-weight:900;color:#2a1c00;background:#ffd76a;border-radius:8px;padding:1px 6px;">보유 ' + own + '</span>' : '') +
        '<div style="margin:0 auto 2px;">' + sweetImg(r, 52) + '</div>' +
        '<div style="font-size:11px;font-weight:900;line-height:1.25;min-height:28px;display:flex;align-items:center;justify-content:center;">' + esc(r.name) + '</div>' +
        '<div style="display:flex;justify-content:center;gap:5px;margin-top:2px;">' + chip('✨', d.v) + chip('💪', d.s) + chip('😊', d.m) + '</div>' +
        '<div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;margin-top:4px;">' + mats + '</div></button>';
    }).join('');
    // 가진 간식 (선택한 아이돌에게 바로 먹이기)
    var owned = RECIPES.filter(function (r) { return sweetQty(r) > 0; });
    var feed = '<div style="margin-top:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:10px 12px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:900;color:#fff;margin-bottom:6px;"><span>🧺 가진 간식 · ' + esc(c.name) + '에게 먹이기</span>' +
      '<span style="color:' + (left > 0 ? '#ffe08a' : '#ff8a8a') + ';">오늘 ' + left + '/' + PER_DAY + '</span></div>' +
      (owned.length ? '<div id="sw-own" style="display:flex;flex-wrap:wrap;gap:6px;">' + owned.map(function (r) {
        var d = deltaOf(cid, r);
        return '<button data-feed="' + r.id + '" style="' + BTN + 'display:flex;align-items:center;gap:4px;padding:6px 10px;background:rgba(255,158,203,0.15);border:1px solid rgba(255,158,203,0.45);color:#fff;font-size:12px;opacity:' + (left > 0 ? 1 : 0.45) + ';">' +
          sweetImg(r, 22) + esc(r.name) + ' ×' + sweetQty(r) + (d.like ? ' ❤️' : '') + '</button>';
      }).join('') + '</div>' : '<div style="font-size:11px;color:#9aa0c8;">아직 만든 간식이 없어요. 위에서 만들어보세요!</div>') + '</div>';
    return head + '<div id="sw-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' + cards + '</div>' + feed;
  }

  function drawBox(ov) {
    var box = ov && ov.querySelector('#sweets-box');
    if (!box || !M()) return;
    var cid = currentCid(ov);
    if (!cid || !M().CH[cid]) { box.innerHTML = ''; return; }
    box.innerHTML = boxHtml(cid);
    var grid = box.querySelector('#sw-grid');
    if (grid) grid.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-sweet]') : null;
      if (b) openCookConfirm(cid, b.getAttribute('data-sweet'));
    };
    var own = box.querySelector('#sw-own');
    if (own) own.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-feed]') : null;
      if (b) tryFeed(cid, b.getAttribute('data-feed'));
    };
  }
  function redraw() { drawBox(document.getElementById('meal-overlay')); }

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

  // ════════ 만들기 (재료 → 가방) ════════
  function openCookConfirm(cid, rid) {
    var r = BY_ID[rid]; if (!r) return;
    var c = canCook(r, have, hasSpace);
    if (!c.ok) {
      toast(c.why === 'bag' ? '가방이 꽉 찼어요! 🎒 자리를 비워주세요' : '재료가 모자라요: ' + lacking(r, have).join(', '));
      return;
    }
    var ov = overlay('sweets-confirm', Z);
    var mats = r.need.map(function (n) { return '<div style="font-size:12px;color:#fff;">' + matIcon(n[0], 20) + ' ' + esc(n[0]) + ' <b style="color:#ffe08a;">×' + n[1] + '</b> <span style="color:#9aa0c8;">(보유 ' + have(n[0]) + ')</span></div>'; }).join('');
    ov.innerHTML = '<div style="width:100%;max-width:330px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #ff9ecb;border-radius:20px;padding:18px;text-align:center;">' +
      '<div data-r="art" style="margin:4px auto 6px;">' + sweetImg(r, 84) + '</div>' +
      '<div style="font-size:17px;font-weight:900;color:#fff;">' + esc(r.name) + '</div>' +
      '<div style="font-size:12px;color:#cfd3ee;margin:2px 0 8px;">만들어서 🎒가방에 담을까요?</div>' +
      '<div style="display:flex;justify-content:center;gap:8px;margin-bottom:8px;">' + chip('✨ 비주얼', r.d.v) + chip('💪 체력', r.d.s) + chip('😊 기분', r.d.m) + '</div>' +
      '<div style="background:rgba(255,255,255,0.07);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;align-items:center;">' + mats + '</div>' +
      '<div data-r="btns" style="display:flex;gap:8px;margin-top:12px;"><button id="sw-no" style="' + BTN + 'flex:1;padding:12px;background:rgba(255,255,255,0.12);color:#fff;font-size:13px;">취소</button>' +
      '<button id="sw-yes" style="' + BTN + 'flex:2;padding:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:14px;">🍬 만들기</button></div></div>';
    ov.querySelector('#sw-no').onclick = function () { ov.remove(); };
    ov.querySelector('#sw-yes').onclick = function () { cook(cid, rid, ov); };
  }

  var busy = false;
  function cook(cid, rid, confirmOv) {
    if (busy) return;
    var r = BY_ID[rid]; if (!r) return;
    if (!canCook(r, have, hasSpace).ok) { confirmOv.remove(); toast('지금은 만들 수 없어요'); return; }
    busy = true;
    var art = confirmOv.querySelector('[data-r="art"]');
    if (art) art.firstChild.style.animation = 'swSpin .5s ease-in-out infinite';
    confirmOv.querySelector('[data-r="btns"]').innerHTML = '<div style="flex:1;padding:12px;font-size:13px;font-weight:900;color:#ffe08a;">✨ 반짝반짝 만드는 중…</div>';
    snd('stamp');
    setTimeout(function () {
      takeMaterials(r);                                                     // 재료 차감 → 간식을 가방에 담기
      var ok = false;
      try { ok = !!addToBag(r.emoji, r.name, TYPE, 1, descOf(r)); } catch (e) {}
      if (!ok) { afterBagChange(); confirmOv.remove(); busy = false; redraw(); toast('가방에 담지 못했어요'); return; }
      var s = syncDay(load(), (M() ? M().load().day : 1));
      s.cooked[r.id] = (s.cooked[r.id] || 0) + 1;
      save(s);
      afterBagChange();
      confirmOv.remove();
      showMade(cid, r);
      redraw();
      busy = false;
    }, 1000);
  }

  function showMade(cid, r) {
    var m = M(), c = m && m.CH[cid];
    var ov = overlay('sweets-made', Z);
    var canNow = c && canFeed(syncDay(load(), m.load().day), cid, sweetQty(r)).ok && debutedIds().indexOf(cid) !== -1;
    var d = c ? deltaOf(cid, r) : null;
    ov.innerHTML = '<div style="width:100%;max-width:330px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #ff9ecb;border-radius:20px;padding:18px;text-align:center;">' +
      '<div style="font-size:13px;font-weight:900;color:#cfd3ee;">🎉 완성!</div>' +
      '<div style="margin:8px auto 2px;animation:swPop .5s ease-out;">' + sweetImg(r, 84) + '</div>' +
      '<div style="font-size:16px;font-weight:900;color:#fff;">' + esc(r.name) + '</div>' +
      '<div style="font-size:12px;color:#ffe08a;margin-top:4px;">🎒 가방에 담았어요 (보유 ' + sweetQty(r) + '개)</div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;"><button id="sw-close" style="' + BTN + 'flex:1;padding:12px;background:rgba(255,255,255,0.12);color:#fff;font-size:13px;">닫기</button>' +
      (canNow ? '<button id="sw-now" style="' + BTN + 'flex:2;padding:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:13px;">' + esc(c.name) + '에게 바로 먹이기' + (d.like ? ' ❤️' : '') + '</button>' : '') + '</div></div>';
    ov.querySelector('#sw-close').onclick = function () { ov.remove(); };
    var now = ov.querySelector('#sw-now');
    if (now) now.onclick = function () { ov.remove(); doFeed(cid, r.id); };
  }

  // ════════ 먹이기 (가방 → 아이돌) ════════
  function tryFeed(cid, rid) {                                // 확인 한 번 묻고 먹임
    var m = M(), r = BY_ID[rid]; if (!m || !r) return;
    var s = syncDay(load(), m.load().day), c = canFeed(s, cid, sweetQty(r));
    if (!c.ok) { toast(c.why === 'full' ? m.CH[cid].name + '은(는) 오늘 간식을 다 먹었어요 (하루 ' + PER_DAY + '개)' : '이 간식이 가방에 없어요'); return; }
    var d = deltaOf(cid, r);
    var ov = overlay('sweets-feedq', Z);
    ov.innerHTML = '<div style="width:100%;max-width:320px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #ff9ecb;border-radius:20px;padding:18px;text-align:center;">' +
      '<div style="margin:2px auto 4px;">' + sweetImg(r, 72) + '</div>' +
      '<div style="font-size:15px;font-weight:900;color:#fff;">' + esc(r.name) + '</div>' +
      '<div style="font-size:12px;color:#cfd3ee;margin:3px 0 8px;">' + esc(m.CH[cid].name) + '에게 먹일까요?' + (d.like ? ' <span style="color:#ff9ecb;">❤️ 좋아하는 간식!</span>' : '') + '</div>' +
      '<div style="display:flex;justify-content:center;gap:8px;">' + chip('✨ 비주얼', d.v) + chip('💪 체력', d.s) + chip('😊 기분', d.m) + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;"><button id="sw-fn" style="' + BTN + 'flex:1;padding:12px;background:rgba(255,255,255,0.12);color:#fff;font-size:13px;">취소</button>' +
      '<button id="sw-fy" style="' + BTN + 'flex:2;padding:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:14px;">🍬 먹이기</button></div></div>';
    ov.querySelector('#sw-fn').onclick = function () { ov.remove(); };
    ov.querySelector('#sw-fy').onclick = function () { ov.remove(); doFeed(cid, rid); };
  }

  function doFeed(cid, rid) {                                 // 실제로 먹임 (가방에서 1개 빼고 컨디션 올림)
    var m = M(), r = BY_ID[rid]; if (!m || !r) return false;
    var ms = m.load(), s = syncDay(load(), ms.day), c = canFeed(s, cid, sweetQty(r));
    if (!c.ok) { toast(c.why === 'full' ? '오늘은 더 못 먹어요 (하루 ' + PER_DAY + '개)' : '이 간식이 가방에 없어요'); return false; }
    try { if (typeof useFromBag === 'function') useFromBag(r.name, 1); } catch (e) {}
    var res = applyFeed(s, m.statOf(ms, cid), cid, r);
    save(s); m.save(ms);
    afterBagChange();
    snd('stamp');
    showFed(cid, r, res);
    try { if (window.__mealRefresh) window.__mealRefresh(res.before); } catch (e) {}
    redraw();
    return true;
  }

  function showFed(cid, r, res) {
    var m = M(), c = m.CH[cid], line = pickLine(c.trait, res.d.like);
    var ov = overlay('sweets-result', Z);
    ov.innerHTML = '<div style="width:100%;max-width:330px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #ff9ecb;border-radius:20px;padding:18px;text-align:center;">' +
      '<div style="font-size:13px;font-weight:900;color:#cfd3ee;">' + esc(c.name) + ' · ' + esc(r.name) + '</div>' +
      '<div style="margin:8px auto 2px;animation:swPop .5s ease-out;">' + sweetImg(r, 84) + '</div>' +
      (res.d.like ? '<div style="font-size:12px;font-weight:900;color:#ff9ecb;">❤️ 제일 좋아하는 간식이에요!</div>' : '') +
      '<div style="margin:10px 0 6px;background:#fff;color:#2a2438;border-radius:14px;padding:9px 12px;font-size:12px;font-weight:700;line-height:1.5;">“' + esc(line) + '”</div>' +
      '<div style="display:flex;justify-content:center;gap:10px;margin-top:8px;">' + chip('✨ 비주얼', res.d.v) + chip('💪 체력', res.d.s) + chip('😊 기분', res.d.m) + '</div>' +
      '<button id="sw-ok" style="' + BTN + 'width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:14px;">확인</button></div>';
    ov.querySelector('#sw-ok').onclick = function () { ov.remove(); };
  }

  // ════════ 가방 상세에서 먹이기 ════════
  function pickIdol(r) {
    var m = M();
    if (!m) { toast('아직 먹일 수 없어요'); return; }
    var ids = debutedIds();
    if (!ids.length) { toast('데뷔한 아이돌이 없어요. 기획사에서 먼저 데뷔시켜 주세요!'); return; }
    var ov = overlay('sweets-pick', Z);
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    function draw() {
      var s = syncDay(load(), m.load().day);
      var rows = ids.map(function (cid) {
        var f = fedToday(s, cid), full = f >= PER_DAY, d = deltaOf(cid, r);
        return '<button data-c="' + cid + '" ' + (full ? 'disabled' : '') + ' style="' + BTN + 'width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-bottom:7px;border:1.5px solid rgba(255,255,255,' + (full ? '.08' : '.25') + ');background:rgba(255,255,255,' + (full ? '.03' : '.09') + ');color:' + (full ? '#777' : '#fff') + ';font-size:14px;font-weight:700;cursor:' + (full ? 'default' : 'pointer') + ';">' +
          '<span>' + esc(m.CH[cid].name) + (d.like ? ' ❤️' : '') + '</span><span style="font-size:11px;color:' + (full ? '#7ee8a5' : '#ffd76a') + ';">' + (full ? '오늘 다 먹었어요' : '기분 +' + d.m + ' · 오늘 ' + f + '/' + PER_DAY) + '</span></button>';
      }).join('');
      ov.innerHTML = '<div style="width:100%;max-width:330px;max-height:86vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #ff9ecb;border-radius:20px;padding:20px 16px;text-align:center;">' +
        '<div>' + sweetImg(r, 60) + '</div><div style="font-size:16px;font-weight:900;color:#fff;">' + esc(r.name) + ' <span style="font-size:12px;color:#aaa;">×' + sweetQty(r) + '</span></div>' +
        '<div style="font-size:12px;color:#c9d6ff;margin:4px 0 12px;">누구에게 먹일까요?</div>' + rows +
        '<button id="sw-px" style="' + BTN + 'width:100%;margin-top:4px;padding:10px;background:rgba(255,255,255,.1);color:#ccc;font-size:13px;">닫기</button></div>';
      ov.querySelector('#sw-px').onclick = function () { ov.remove(); };
      Array.prototype.forEach.call(ov.querySelectorAll('[data-c]:not([disabled])'), function (b) {
        b.onclick = function () {
          var cid = b.getAttribute('data-c');
          ov.remove();
          if (doFeed(cid, r.id)) {
            var d = document.getElementById('bag-detail-overlay');
            if (d && sweetQty(r) <= 0) d.remove();
            else if (d) Array.prototype.forEach.call(d.querySelectorAll('div'), function (dv) { if (!dv.children.length && /^보유:/.test(dv.textContent)) dv.textContent = '보유: ' + sweetQty(r) + '개'; });
          }
        };
      });
    }
    draw();
  }

  (function hookBag() {
    if (typeof window.showBagItemDetail !== 'function') { setTimeout(hookBag, 150); return; }
    if (window.__swHooked) return; window.__swHooked = true;
    var orig = window.showBagItemDetail;
    window.showBagItemDetail = function (idx) {
      var r0 = orig.apply(this, arguments);
      try {
        var item = bagItems[idx], ov = document.getElementById('bag-detail-overlay'), r = item && item.type === TYPE ? BY_NAME[item.name] : null;
        if (r && ov && !ov.querySelector('#sw-use')) {
          var b = document.createElement('button'); b.id = 'sw-use'; b.textContent = '🍬 아이돌에게 먹이기';
          b.style.cssText = 'width:100%;padding:12px;margin-bottom:8px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;';
          b.onclick = function () { injectStyle(); pickIdol(r); };
          var close = ov.querySelector('button');
          if (close) close.parentNode.insertBefore(b, close); else ov.firstChild.appendChild(b);
        }
      } catch (e) {}
      return r0;
    };
  })();

  // ════════ 거래소 품목 (trade.js 가 불러감) ════════
  window.__sweetsItems = function () {
    var out = {};
    RECIPES.forEach(function (r) { out['bk_sweet_' + r.id] = { name: r.name, emoji: r.emoji, kind: 'bag', type: TYPE, desc: descOf(r), min: TRADE_MIN, max: TRADE_MAX }; });
    return out;
  };

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
    load: load, save: save, syncDay: syncDay, fedToday: fedToday, deltaOf: deltaOf, lacking: lacking, canCook: canCook, canFeed: canFeed, applyFeed: applyFeed, pickLine: pickLine
  };
})();
