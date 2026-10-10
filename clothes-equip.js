// ════════════════════════════════
// 👗 의상실 (clothes-equip.js)
//  · 더보기 > 👗 의상실: 캐릭터마다 상의 + 하의 (또는 원피스 1벌) 를 입힌다.
//  · 원피스는 상의·하의 자리를 둘 다 차지한다. 대신 효과가 DRESS_MULT 배.
//  · 효과는 기존 의상 효과 그대로 (알바 코인 / 행운·희귀재료 / 호감도 / 수업점수 / 매력).
//      - 알바 코인·행운·수업·매력 : 모든 캐릭터가 입은 옷의 효과를 합산 (스탯마다 CAP% 까지)
//      - 호감도 : 선물을 주는 그 캐릭터가 입은 옷만 적용
//    플레이어가 직접 입는 기존 의상(가방 > 착용)은 그대로 두고, 그 위에 더해진다.
//  · 입히면 가방에서 1벌 빠지고, 벗기면 가방으로 돌아온다 (가방이 꽉 차면 못 벗음).
//  · 저장: localStorage 'ph_clothesEquip' (ph_ 로 시작 → 자동 클라우드 저장)
//  · 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'clothes-equip.js' 한 줄 추가
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var KEY = 'ph_clothesEquip';
  var DRESS_MULT = 2.5;     // 원피스 효과 배수 (상의+하의를 따로 입는 것보다 조금 더 크게)
  var CAP = 30;             // 캐릭터 의상으로 얻는 스탯 합계 상한(%) — 너무 빨리 세지는 걸 막음 (에픽/레전드 옷이 생겨서 12 → 30)
  var HEART_CAP = 12;       // 두근 합계 상한(%) — 설렘 이벤트에서 '두근 × 5%' 확률로 쓰이므로 따로 낮게 둠
  var ACC = '#C084FC';
  // 종류 분류 (id 기준). 목록에 없는 새 옷은 이름으로 추측.
  var DRESS_IDS = ['cloud-dress', 'star-dress', 'aurora-dress', 'champagne-dress', 'prince-coat', 'animal-bunny', 'animal-kitten', 'animal-bear', 'animal-puppy'];
  var BOTTOM_IDS = ['cherry-skirt', 'crystal-skirt', 'crystal-pants', 'cloud-skirt', 'cloud-shorts', 'moon-jeans', 'aurora-skirt', 'champagne-skirt', 'prince-pants'];
  var TOP_IDS = ['cherry-blouse', 'crystal-jacket', 'crystal-jumper', 'cloud-jacket', 'star-blazer', 'moon-hoodie', 'aurora-jacket', 'aurora-blouse', 'champagne-jacket', 'champagne-cardigan', 'prince-jacket', 'prince-shirt'];
  var STAT_LABEL = { coin: '알바 코인', luck: '행운·희귀재료', affection: '호감도', heart: '두근', study: '수업 점수', charm: '매력' };

  // ── 공통 ──
  function $(id) { return document.getElementById(id); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function toast(msg) {
    try { if (typeof showBagToast === 'function') showBagToast(msg); } catch (e) {}
    var old = $('ce-toast'); if (old) old.remove();
    var t = document.createElement('div');
    t.id = 'ce-toast';
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:990;background:rgba(0,0,0,.88);color:#fff;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:700;font-family:\'Noto Sans KR\',sans-serif;max-width:86%;text-align:center;';
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 1800);
  }
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    return (d && typeof d === 'object') ? d : {};
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function persist() {
    try { if (typeof saveBag === 'function') saveBag(); } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
  }
  function clothDef(id) {
    try { return CLOTH_ITEMS.filter(function (c) { return c.id === id; })[0] || null; } catch (e) { return null; }
  }
  function kindOf(id) {
    if (DRESS_IDS.indexOf(id) !== -1) return 'dress';
    if (BOTTOM_IDS.indexOf(id) !== -1) return 'bottom';
    if (TOP_IDS.indexOf(id) !== -1) return 'top';
    var c = clothDef(id), n = c ? c.name : '';
    if (/원피스/.test(n)) return 'dress';
    if (/스커트|팬츠|청바지|바지|쇼츠/.test(n)) return 'bottom';
    return 'top';
  }
  function bagName(p) { var c = clothDef(p.id); return c ? (p.great ? '✨ ' + c.name : c.name) : p.id; }
  function pieceVal(p) {
    var c = clothDef(p.id); if (!c) return 0;
    var v = c.statVal + (p.great ? 1 : 0);
    return kindOf(p.id) === 'dress' ? r1(v * DRESS_MULT) : v;
  }
  function pieceStat(p) { var c = clothDef(p.id); return c ? c.stat : null; }
  function pieceHeart(p) {          // 💓 두근 (설렘 이벤트용) — 원피스는 배수 적용
    var c = clothDef(p.id); if (!c || c.stat2 !== 'heart') return 0;
    var v2 = c.val2 + (p.great ? 1 : 0);     // 대성공 ✨ = 두근도 +1
    return kindOf(p.id) === 'dress' ? r1(v2 * DRESS_MULT) : v2;
  }
  function piecesOf(d, cid) {      // 그 캐릭터가 입고 있는 옷 조각들 [{slot, p}]
    var e = (d && d[cid]) || {}, out = [];
    ['top', 'bottom', 'dress'].forEach(function (s) { if (e[s]) out.push({ slot: s, p: e[s] }); });
    return out;
  }

  // ── 능력치 합산 ──
  function charTotals(cid, d) {
    var t = {};
    piecesOf(d || load(), cid).forEach(function (x) {
      var s = pieceStat(x.p); if (!s) return;
      t[s] = r1((t[s] || 0) + pieceVal(x.p));
      var h = pieceHeart(x.p); if (h) t.heart = r1((t.heart || 0) + h);
    });
    return t;
  }
  function allTotals() {            // 모든 캐릭터 합산 (상한 전)
    var d = load(), t = {};
    Object.keys(d).forEach(function (cid) {
      var ct = charTotals(cid, d);
      Object.keys(ct).forEach(function (s) { t[s] = r1((t[s] || 0) + ct[s]); });
    });
    return t;
  }
  function bonus(stat, giftChar) {
    if (stat === 'affection') {
      if (!giftChar) return 0;
      return Math.min(CAP, charTotals(giftChar)[stat] || 0);
    }
    return Math.min(CAP, allTotals()[stat] || 0);
  }

  // ── 가방 ──
  function wornByPlayer(item) {
    try {
      var e = equippedCloth;
      if (!e) return false;
      if (typeof e === 'object') return e.name === item.name;
      return e === item.clothId;
    } catch (err) { return false; }
  }
  function availQty(item) { return (item.qty || 0) - (wornByPlayer(item) ? 1 : 0); }
  function clothBagItems() {
    try { return bagItems.filter(function (i) { return i.type === 'cloth' && (i.clothId || clothByName(i.name)) && availQty(i) > 0; }); } catch (e) { return []; }
  }
  function clothByName(n) {
    var clean = String(n || '').replace(/^✨\s*/, '').trim();
    try { var c = CLOTH_ITEMS.filter(function (x) { return x.name === clean; })[0]; return c ? c.id : null; } catch (e) { return null; }
  }
  function slotsNeededFor(pieces, willFree) {     // 돌려받을 옷을 가방에 넣으려면 몇 칸이 더 필요한가
    var names = {}, need = 0;
    pieces.forEach(function (p) {
      var n = bagName(p);
      if (names[n]) return; names[n] = 1;
      if (!bagItems.some(function (i) { return i.name === n; })) need++;
    });
    var free = bagSlots - bagItems.length + (willFree ? 1 : 0);
    return need - free;      // >0 이면 모자람
  }
  function giveBack(p) {
    var c = clothDef(p.id); if (!c) return false;
    return !!addClothToBag(c, !!p.great);
  }

  // ── 입히기 / 벗기기 ──
  // slotKey: 'top' | 'bottom'  (원피스를 고르면 어느 칸을 눌렀든 원피스 칸으로 들어감)
  function equip(cid, slotKey, bagItem) {
    var idx = bagItems.indexOf(bagItem);
    if (idx === -1) return '가방에서 찾을 수 없어요';
    var id = bagItem.clothId || clothByName(bagItem.name);
    var c = clothDef(id); if (!c) return '의상 정보를 찾지 못했어요';
    if (availQty(bagItem) < 1) return '플레이어가 입고 있는 옷이에요. 먼저 벗어주세요';
    var kind = kindOf(id);
    if (kind === 'top' && slotKey !== 'top') return '상의 칸에만 입을 수 있어요';
    if (kind === 'bottom' && slotKey !== 'bottom') return '하의 칸에만 입을 수 있어요';
    var d = load(); d[cid] = d[cid] || {};
    var e = d[cid], back = [];
    if (kind === 'dress') { ['top', 'bottom', 'dress'].forEach(function (s) { if (e[s]) back.push(e[s]); }); }
    else { if (e.dress) back.push(e.dress); if (e[kind]) back.push(e[kind]); }
    if (slotsNeededFor(back, (bagItem.qty || 0) <= 1) > 0) return '가방이 꽉 차서 입고 있던 옷을 뺄 수 없어요';
    var great = !!(bagItem.isGreat || /^✨/.test(bagItem.name));
    if (!useFromBag(bagItem.name, 1)) return '가방에서 꺼내지 못했어요';
    back.forEach(giveBack);
    if (kind === 'dress') { e.top = null; e.bottom = null; e.dress = { id: id, great: great }; }
    else { e.dress = null; e[kind] = { id: id, great: great }; }
    save(d); persist();
    return null;
  }
  function unequip(cid, slotKey) {
    var d = load(), e = d[cid]; if (!e) return null;
    var key = e.dress && (slotKey === 'top' || slotKey === 'bottom' || slotKey === 'dress') ? 'dress' : slotKey;
    var p = e[key]; if (!p) return null;
    if (slotsNeededFor([p], false) > 0) return '가방이 꽉 찼어요!';
    if (!giveBack(p)) return '가방이 꽉 찼어요!';
    e[key] = null;
    save(d); persist();
    return null;
  }

  // ── 화면 ──
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;';
  var selChar = null, selSlot = null;

  function ownedChars() {
    var ids = [];
    try {
      Object.keys(CHARS).forEach(function (cid) {
        if (CARDS.some(function (c) { return c.charId === cid && owned.indexOf(c.id) !== -1; })) ids.push(cid);
      });
    } catch (e) {}
    return ids.length ? ids : (typeof CHARS !== 'undefined' ? Object.keys(CHARS) : []);
  }
  function open() {
    if ($('ce-ov')) $('ce-ov').remove();
    var ov = document.createElement('div');
    ov.id = 'ce-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:950;background:linear-gradient(160deg,#1a1a2e,#2d1b4e);overflow-y:auto;-webkit-overflow-scrolling:touch;color:#fff;font-family:\'Noto Sans KR\',sans-serif;-webkit-user-select:none;user-select:none;';
    document.body.appendChild(ov);
    var ids = ownedChars(); if (!selChar || ids.indexOf(selChar) === -1) selChar = ids[0];
    selSlot = null;
    draw();
  }
  function effText(p) {
    var s = pieceStat(p); if (!s) return '';
    var h = pieceHeart(p);
    return (STAT_LABEL[s] || s) + ' +' + pieceVal(p) + '%' + (h ? ' · 💓두근 +' + h + '%' : '');
  }
  function thumb(p, size) {
    var c = clothDef(p.id);
    return c && c.img
      ? '<img src="' + c.img + '" draggable="false" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;background:#fff;border-radius:8px;" onerror="this.style.display=\'none\'">'
      : '<span style="font-size:' + Math.round(size * 0.6) + 'px;">👗</span>';
  }
  function pieceRow(p, rightHtml) {
    var c = clothDef(p.id);
    return '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.07);border-radius:12px;padding:8px 10px;margin-bottom:6px;">' +
      '<div style="flex-shrink:0;">' + thumb(p, 44) + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;">' + (p.great ? '✨ ' : '') + (c ? c.name : p.id) + '</div>' +
      '<div style="font-size:11px;color:#FFD700;">' + effText(p) + (kindOf(p.id) === 'dress' ? ' <span style="color:#7dd3fc;">(원피스 ×' + DRESS_MULT + ')</span>' : '') + '</div></div>' +
      rightHtml + '</div>';
  }
  function draw() {
    var ov = $('ce-ov'); if (!ov) return;
    var ids = ownedChars();
    var chips = ids.map(function (cid) {
      var on = selChar === cid, ch = CHARS[cid] || {};
      return '<button data-char="' + cid + '" style="' + BTN + 'padding:8px 12px;font-size:12px;white-space:nowrap;background:' + (on ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,.08)') + ';color:#fff;">' + (ch.emoji || '') + ' ' + (ch.name || cid) + '</button>';
    }).join('');
    var d = load(), e = d[selChar] || {}, ch0 = CHARS[selChar] || {};
    var SQ = 62;
    var dress = e.dress;
    var boxes = ['top', 'bottom'].map(function (sl) {
      var p = dress || e[sl], on = selSlot === sl;
      var label = sl === 'top' ? '상의' : '하의';
      var inner = p
        ? '<div style="line-height:1;">' + thumb(p, 40) + '</div><div style="font-size:9px;color:#C084FC;margin-top:2px;">' + (dress ? '원피스' : label) + '</div>'
        : '<div style="font-size:20px;color:#889;line-height:1;">＋</div><div style="font-size:10px;color:#9ab;margin-top:2px;">' + label + '</div>';
      return '<button data-slot="' + sl + '" style="' + BTN + 'width:' + SQ + 'px;height:' + SQ + 'px;border-radius:12px;background:' + (on ? 'rgba(192,132,252,.25)' : 'rgba(255,255,255,.07)') + ';border:2px ' + (p ? 'solid ' + ACC : (on ? 'solid #C084FC' : 'dashed rgba(255,255,255,.35)')) + ';color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;">' + inner + '</button>';
    }).join('');
    var preview = '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;">' +
      '<div style="width:' + SQ + 'px;flex-shrink:0;"></div>' +
      '<div style="position:relative;width:180px;height:240px;border-radius:18px;overflow:hidden;border:2px solid ' + (ch0.gradeColor || '#C084FC') + ';background:#111;flex-shrink:0;">' +
      (ch0.img ? '<img src="' + ch0.img + '" draggable="false" style="width:100%;height:100%;object-fit:cover;object-position:50% 15%;pointer-events:none;">' : '<div style="font-size:80px;text-align:center;padding-top:70px;">' + (ch0.emoji || '👤') + '</div>') +
      '</div><div style="display:flex;flex-direction:column;gap:10px;flex-shrink:0;">' + boxes + '</div></div>';

    // 합산 요약
    var all = allTotals(), mine = charTotals(selChar, d);
    var statKeys = ['coin', 'luck', 'study', 'charm'];
    var sum = '<div style="background:rgba(192,132,252,.12);border:1px solid ' + ACC + ';border-radius:12px;padding:10px;font-size:12px;margin-bottom:12px;line-height:1.75;">' +
      '<b style="color:#C084FC;">모든 캐릭터 의상 합산</b> <span style="color:#789;">(스탯마다 상한 ' + CAP + '%)</span><br>' +
      statKeys.map(function (k) { return (STAT_LABEL[k]) + ' +' + Math.min(CAP, all[k] || 0) + '%'; }).join(' · ') +
      '<div style="margin-top:6px;"><b style="color:#FF6B9D;">' + (ch0.name || '') + ' 전용</b> <span style="color:#789;">(이 캐릭터에게 선물할 때만)</span><br>호감도 +' + Math.min(CAP, mine.affection || 0) + '% · 💓두근 +' + Math.min(HEART_CAP, mine.heart || 0) + '% <span style="color:#789;">(설렘 이벤트)</span></div></div>';

    // 아래 목록
    var list = '';
    if (selSlot) {
      var label = selSlot === 'top' ? '상의' : '하의';
      var cur = dress ? { slot: 'dress', p: dress } : (e[selSlot] ? { slot: selSlot, p: e[selSlot] } : null);
      var mineItems = clothBagItems().filter(function (i) { var k = kindOf(i.clothId || clothByName(i.name)); return k === 'dress' || k === selSlot; });
      list = '<div style="border-top:1px solid rgba(255,255,255,.15);padding-top:10px;">' +
        '<div style="font-size:12px;font-weight:900;margin-bottom:6px;">' + label + ' 칸 <span style="color:#9ab;font-weight:400;">· 원피스를 고르면 상의·하의 칸을 같이 써요</span></div>' +
        (cur ? '<div style="font-size:11px;color:#9ab;margin-bottom:3px;">입고 있는 옷</div>' + pieceRow(cur.p, '<button data-un="1" style="' + BTN + 'padding:7px 10px;font-size:11px;background:rgba(239,68,68,.2);color:#ff8a8a;">벗기기</button>') : '') +
        '<div style="font-size:11px;color:#9ab;margin:6px 0 3px;">가방 속 옷' + (cur ? ' (고르면 교체)' : '') + '</div>' +
        (mineItems.length ? mineItems.map(function (it, i) {
          var id = it.clothId || clothByName(it.name), p = { id: id, great: !!(it.isGreat || /^✨/.test(it.name)) };
          return pieceRow(p, '<span style="font-size:11px;color:#9ab;margin-right:4px;">x' + availQty(it) + '</span><button data-pick="' + i + '" style="' + BTN + 'padding:8px 12px;font-size:12px;background:linear-gradient(135deg,#60a5fa,#C084FC);color:#fff;">' + (cur ? '교체' : '입히기') + '</button>');
        }).join('') : '<div style="color:#aaa;font-size:12px;text-align:center;padding:14px 0;">가방에 맞는 옷이 없어요. 🧵 기술학원에서 재봉으로 만들어봐요</div>') + '</div>';
    } else {
      list = '<div style="text-align:center;color:#9ab;font-size:12px;padding:6px 0;">네모 칸을 눌러서 옷을 입혀요</div>';
    }
    ov.innerHTML = '<div style="max-width:430px;margin:0 auto;padding:14px 14px 90px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
      '<div style="font-size:19px;font-weight:900;">👗 의상실</div>' +
      '<button id="ce-close" style="' + BTN + 'background:rgba(255,255,255,.12);color:#fff;padding:8px 14px;font-size:13px;">닫기</button></div>' +
      '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;">' + chips + '</div>' + preview + sum + list + '</div>';
    $('ce-close').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-char]').forEach(function (b) { b.onclick = function () { selChar = b.getAttribute('data-char'); selSlot = null; draw(); }; });
    ov.querySelectorAll('[data-slot]').forEach(function (b) { b.onclick = function () { var s = b.getAttribute('data-slot'); selSlot = (selSlot === s) ? null : s; draw(); }; });
    ov.querySelectorAll('[data-un]').forEach(function (b) { b.onclick = function () { var er = unequip(selChar, selSlot); if (er) toast('❌ ' + er); else toast('옷을 벗겼어요'); draw(); }; });
    ov.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () {
        var items = clothBagItems().filter(function (i) { var k = kindOf(i.clothId || clothByName(i.name)); return k === 'dress' || k === selSlot; });
        var it = items[Number(b.getAttribute('data-pick'))]; if (!it) return;
        var er = equip(selChar, selSlot, it);
        if (er) { toast('❌ ' + er); return; }
        selSlot = null; draw(); toast('✅ 입혔어요!');
      };
    });
  }

  window.openClothesEquip = open;
  window.__clothesEquip = { effText: effText, heart: function (cid) { return Math.min(HEART_CAP, charTotals(cid).heart || 0); }, equip: equip, unequip: unequip, bonus: bonus, allTotals: allTotals, charTotals: charTotals, kindOf: kindOf, load: load, CAP: CAP, DRESS_MULT: DRESS_MULT };

  // ── 기존 능력치 계산에 끼워 넣기 ──
  function whenReady(test, fn) {
    var tries = 0;
    (function attempt() {
      var ok = false;
      try { ok = test(); } catch (e) {}
      if (ok) { fn(); return; }
      if (++tries < 200) setTimeout(attempt, 100);
    })();
  }
  var giftChar = null;
  whenReady(function () { return typeof window.getEquippedStat === 'function'; }, function () {
    var orig = window.getEquippedStat;
    if (orig.__ceWrapped) return;
    var w = function (stat) {
      var base = orig.apply(this, arguments) || 0;
      var extra = 0;
      try { extra = bonus(stat, giftChar); } catch (e) {}
      return base + extra;
    };
    w.__ceWrapped = true;
    window.getEquippedStat = w;
  });
  whenReady(function () { return typeof window.giveGift === 'function'; }, function () {
    var orig = window.giveGift;
    if (orig.__ceWrapped) return;
    var w = function (charId) {
      giftChar = charId;
      try { return orig.apply(this, arguments); } finally { giftChar = null; }
    };
    w.__ceWrapped = true;
    window.giveGift = w;
  });

  // ── 더보기 메뉴에 👗 의상실 타일 ──
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var original = window.openMoreMenu;
    if (original.__ceWrapped) return;
    var wrapped = function () {
      var r = original.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-clothes-tile')) {
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('👗', '의상실', ACC, 'openClothesEquip()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-clothes-tile';
      }
      return r;
    };
    wrapped.__ceWrapped = true;
    window.openMoreMenu = wrapped;
  });
})();
