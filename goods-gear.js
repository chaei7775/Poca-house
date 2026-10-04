// ════════════════════════════════
// 🎁 굿즈 공방 (goods-gear.js)
//  · 맵 > 🛍️ 상점거리 > 🎁 굿즈 공방: 굿즈 제작(능력치 랜덤 / 낮은 확률 레어 / 약간의 확률 실패)
//  · 캐릭터마다 3칸(머리·손·액세서리)에 장착 → 그 캐릭터로 하는 팬덤 원정에 보너스
//  · 등록: loader.js NEW_CONTENT_FILES 에 'goods-gear.js' (broadcast-expedition.js, photolab.js 뒤)
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var KEY = 'ph_goodsgear';                       // { minjun:{hat:{...}, hand:null, acc:null}, ... }  (ph_ 로 시작 → 자동 클라우드 저장)
  var CRAFT_COIN = 5000;
    var P_FAIL = 0.15, P_RARE = 0.04, P_GOOD = 0.18;   // 실패 15% / 레어 4% / 고급 18% / 나머지 일반
  var SLOTS = {
    hat:  { label: '머리', mats: [['고급원목', 8], ['별빛나무', 6]], items: [['🎀', '응원 머리띠'], ['🧢', '팬클럽 야구모자'], ['👑', '반짝 왕관']] },
    hand: { label: '손',   mats: [['빛나는돌', 8], ['해바라기', 6]], items: [['📣', '응원 메가폰'], ['🪄', '야광봉'],       ['💐', '꽃다발']] },
    acc:  { label: '액세서리', mats: [['별빛모래', 8], ['네잎클로버', 6]], items: [['📿', '팬클럽 목걸이'], ['🎧', '투어 헤드폰'], ['💍', '기념 반지']] }
  };
  var SLOT_KEYS = ['hat', 'hand', 'acc'];
  // 능력치 종류. scope 'char' = 그 캐릭터 원정에만 / 'all' = 모든 캐릭터 굿즈 합산(탐험·학교처럼 캐릭터와 상관없는 곳)
  //   r = [일반 범위, 고급 범위, 레어 범위],  dec = 소수점 자리,  cap = 합계 상한
  var STATS = {
    coin:   { label: '원정 코인',        icon: '🍔', unit: '%',  dec: 0, scope: 'char', cap: 40,  r: [[2, 6],   [5, 10],  [10, 20]] },
    exp:    { label: '원정 EXP',         icon: '⭐', unit: '%',  dec: 0, scope: 'char', cap: 40,  r: [[2, 6],   [5, 10],  [10, 20]] },
    piece:  { label: '프리미엄 조각 확률', icon: '🖼️', unit: '%',  dec: 1, scope: 'char', cap: 8,   r: [[0.5, 1.5], [1.5, 2.5], [2.5, 4]] },
    ticket: { label: '등교권·조각 드랍',  icon: '🎫', unit: '%',  dec: 0, scope: 'char', cap: 60,  r: [[5, 10],  [10, 20], [20, 40]] },
    wish:   { label: '탐험 소원의 조각 확률', icon: '🧩', unit: '%p', dec: 2, scope: 'all', cap: 1.5, r: [[0.05, 0.12], [0.12, 0.25], [0.25, 0.5]] },
    honor:  { label: '우등생조각 획득',   icon: '✨', unit: '%',  dec: 0, scope: 'all',  cap: 60,  r: [[5, 10],  [10, 20], [20, 40]] }
  };
  var STAT_KEYS = ['coin', 'exp', 'piece', 'ticket', 'wish', 'honor'];
  var GRADES = {
    normal: { label: '일반', color: '#cbd5e1', n: 1, i: 0 },
    good:   { label: '고급', color: '#4ade80', n: 1, i: 1 },
    rare:   { label: '레어', color: '#FFD700', n: 2, i: 2 }
  };

  // ── 공통 ──
  function $(id) { return document.getElementById(id); }
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
  function toast(msg) {
    var old = $('gg-toast'); if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'gg-toast';
    el.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:1300;background:rgba(20,20,40,.96);border:1.5px solid #FFD700;border-radius:14px;padding:11px 18px;color:#fff;font-size:13px;font-weight:900;max-width:86%;text-align:center;font-family:\'Noto Sans KR\',sans-serif;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 2600);
  }
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || '{}'); return (d && typeof d === 'object') ? d : {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function rnum(a, b, dec) { var m = Math.pow(10, dec); return Math.round((a + Math.random() * (b - a)) * m) / m; }
  function statText(stats) {
    return STAT_KEYS.filter(function (k) { return stats[k]; }).map(function (k) { return STATS[k].icon + ' ' + STATS[k].label + ' +' + stats[k] + STATS[k].unit; }).join(' · ');
  }
  function matQty(name) {
    var it = bagItems.find(function (i) { return i.name === name; });
    return it ? it.qty : 0;
  }

  // ── 제작 ──
  function rollGear(slot) {
    var r = Math.random(), g = r < P_RARE ? 'rare' : r < P_RARE + P_GOOD ? 'good' : 'normal';
    var G = GRADES[g], base = pick(SLOTS[slot].items);
    var keys = STAT_KEYS.slice(), stats = {};
    for (var i = 0; i < G.n; i++) {
      var k = keys.splice(Math.floor(Math.random() * keys.length), 1)[0], rg = STATS[k].r[G.i];
      stats[k] = rnum(rg[0], rg[1], STATS[k].dec);
    }
    return { slot: slot, grade: g, emoji: base[0], base: base[1], stats: stats };
  }
  function craft(slot) {
    var S = SLOTS[slot];
    if (coins < CRAFT_COIN) return { err: '코인이 부족해요! 🍔 ' + fmt(CRAFT_COIN) + ' 필요' };
    for (var mi = 0; mi < S.mats.length; mi++) {
      if (matQty(S.mats[mi][0]) < S.mats[mi][1]) return { err: S.mats[mi][0] + '이(가) 부족해요! (' + matQty(S.mats[mi][0]) + '/' + S.mats[mi][1] + ')' };
    }
    if (bagItems.length >= bagSlots) return { err: '가방이 꽉 찼어요! 슬롯을 비워주세요' };
    coins -= CRAFT_COIN;
    S.mats.forEach(function (m) { useFromBag(m[0], m[1]); });
    var res;
    if (Math.random() < P_FAIL) {
      res = { fail: true };
    } else {
      var g = rollGear(slot);
      bagItems.push({
        name: '[' + GRADES[g.grade].label + '] ' + g.base, emoji: g.emoji, type: 'goods_gear', qty: 1, affExp: 1,
        desc: '굿즈 · ' + S.label + ' · ' + statText(g.stats), gear: g
      });
      res = { gear: g };
    }
    if (typeof saveBag === 'function') saveBag();
    if (typeof saveAll === 'function') saveAll();
    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    return res;
  }

  // ── 장착 ──
  function equip(charId, slot, bagItem) {
    var d = load(); d[charId] = d[charId] || {};
    var old = d[charId][slot];
    var idx = bagItems.indexOf(bagItem);
    if (idx === -1) return '가방에서 찾을 수 없어요';
    if (old && bagItems.length - 1 >= bagSlots) return '가방이 꽉 차서 기존 굿즈를 뺄 수 없어요';
    bagItems.splice(idx, 1);
    if (old) giveBack(old);
    d[charId][slot] = bagItem.gear;
    save(d);
    if (typeof saveBag === 'function') saveBag();
    if (typeof saveAll === 'function') saveAll();
    return null;
  }
  function giveBack(g) {
    bagItems.push({
      name: '[' + GRADES[g.grade].label + '] ' + g.base, emoji: g.emoji, type: 'goods_gear', qty: 1, affExp: 1,
      desc: '굿즈 · ' + SLOTS[g.slot].label + ' · ' + statText(g.stats), gear: g
    });
  }
  function unequip(charId, slot) {
    var d = load(); var g = d[charId] && d[charId][slot];
    if (!g) return null;
    if (bagItems.length >= bagSlots) return '가방이 꽉 찼어요!';
    giveBack(g);
    d[charId][slot] = null;
    save(d);
    if (typeof saveBag === 'function') saveBag();
    if (typeof saveAll === 'function') saveAll();
    return null;
  }
  function sumStat(k, charIds) {
    var d = load(), t = 0;
    charIds.forEach(function (cid) {
      SLOT_KEYS.forEach(function (sl) { var g = d[cid] && d[cid][sl]; if (g && g.stats) t += Number(g.stats[k]) || 0; });
    });
    var m = Math.pow(10, STATS[k].dec);
    return Math.min(Math.round(t * m) / m, STATS[k].cap);
  }
  function totals(charId) {           // 이 캐릭터 한정 보너스 (원정)
    var t = {};
    STAT_KEYS.forEach(function (k) { if (STATS[k].scope === 'char') t[k] = sumStat(k, [charId]); });
    return t;
  }
  function globalTotals() {           // 모든 캐릭터 굿즈 합산 (탐험·학교)
    var ids = Object.keys(load()), t = {};
    STAT_KEYS.forEach(function (k) { if (STATS[k].scope === 'all') t[k] = sumStat(k, ids); });
    return t;
  }

  // ── 팬덤 원정 보너스 연결: getEngraveBonus(charId) 에 더해줌 ──
  function bonusOf(charId) {
    var t = totals(charId);
    return { coin: t.coin / 100, exp: t.exp / 100, pieceExtra: t.piece / 100, ticket: t.ticket / 100 };
  }
  function hookBonus() {
    var orig = window.getEngraveBonus;
    if (orig && orig.__gg) return true;
    if (typeof orig !== 'function') return false;
    var w = function (charId) {
      var base = {};
      try { base = orig.apply(this, arguments) || {}; } catch (e) {}
      var out = {}; for (var k in base) out[k] = base[k];
      var b = bonusOf(charId);
      Object.keys(b).forEach(function (k) { out[k] = (Number(out[k]) || 0) + b[k]; });
      return out;
    };
    w.__gg = true;
    window.getEngraveBonus = w;
    return true;
  }
  (function t(n) {
    if (hookBonus()) return;
    if (n > 150) {   // photolab.js 가 없는 경우: 우리 보너스만 제공
      window.getEngraveBonus = function (charId) { var o = bonusOf(charId); return o; };
      window.getEngraveBonus.__gg = true;
      return;
    }
    setTimeout(function () { t(n + 1); }, 200);
  })(0);

  // ── 탐험: 소원의 조각 확률 올리기 (모든 캐릭터 굿즈 합산) ──
  function hookExplore() {
    if (typeof window.startExplore !== 'function' || !window.__staminaBalancePatched) return false;
    if (window.startExplore.__gg) return true;
    var orig = window.startExplore;
    var w = function (placeId) {
      var r = orig.apply(this, arguments);
      try {
        var bonus = globalTotals().wish || 0;
        if (bonus > 0 && document.getElementById('explore-overlay') && typeof exploreItems !== 'undefined') {
          exploreItems.forEach(function (item, idx) {
            if (!item || item.isWish) return;
            if (Math.random() * 100 < bonus) {
              item.name = null; item.isWish = true;
              var el = document.getElementById('explore-item-' + idx);
              if (el) el.textContent = '🧩';
            }
          });
        }
      } catch (e) {}
      return r;
    };
    w.__gg = true;
    window.startExplore = w;
    return true;
  }
  // ── 학교: 우등생조각 획득량 늘리기 ──
  function hookHonor() {
    if (typeof window.addHonorFragments !== 'function') return false;
    if (window.addHonorFragments.__gg) return true;
    var orig = window.addHonorFragments;
    var w = function (amount) {
      try {
        var pct = globalTotals().honor || 0;
        if (pct > 0 && amount > 0) {
          var x = amount * (1 + pct / 100), base = Math.floor(x);
          amount = base + (Math.random() < (x - base) ? 1 : 0);   // 소수 부분은 확률로 올림
        }
      } catch (e) {}
      return orig.call(this, amount);
    };
    w.__gg = true;
    window.addHonorFragments = w;
    return true;
  }
  (function t(n) {
    var a = hookExplore(), b = hookHonor();
    if (a && b) return;
    if (n < 300) setTimeout(function () { t(n + 1); }, 200);
  })(0);

  // ── 화면 ──
  var tab = 'craft', selChar = null, craftSlot = 'hat', busy = false, lastResult = null, equipSlot = null;
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;';

  function ownedChars() {
    var ids = [];
    try {
      Object.keys(CHARS).forEach(function (cid) {
        if (CARDS.some(function (c) { return c.charId === cid && owned.indexOf(c.id) !== -1; })) ids.push(cid);
      });
    } catch (e) {}
    return ids.length ? ids : Object.keys(CHARS);
  }
  function open() {
    if ($('gg-ov')) $('gg-ov').remove();
    var ov = document.createElement('div');
    ov.id = 'gg-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:950;background:linear-gradient(160deg,#1a1a2e,#2d1b4e);overflow-y:auto;-webkit-overflow-scrolling:touch;color:#fff;font-family:\'Noto Sans KR\',sans-serif;-webkit-user-select:none;user-select:none;';
    document.body.appendChild(ov);
    var ids = ownedChars(); if (!selChar || ids.indexOf(selChar) === -1) selChar = ids[0];
    draw();
  }
  function tabBtn(id, label) {
    var on = tab === id;
    return '<button data-tab="' + id + '" style="' + BTN + 'flex:1;padding:11px;font-size:14px;background:' + (on ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,.08)') + ';color:#fff;">' + label + '</button>';
  }
  function draw() {
    var ov = $('gg-ov'); if (!ov) return;
    ov.innerHTML =
      '<div style="max-width:430px;margin:0 auto;padding:14px 14px 90px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<div style="font-size:19px;font-weight:900;">🎁 굿즈 공방</div>' +
        '<button id="gg-close" style="' + BTN + 'background:rgba(255,255,255,.12);color:#fff;padding:8px 14px;font-size:13px;">닫기</button></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px;">' + tabBtn('craft', '🔨 제작') + tabBtn('equip', '🎒 장착') + '</div>' +
      '<div id="gg-body"></div></div>';
    $('gg-close').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab'); lastResult = null; equipSlot = null; draw(); }; });
    if (tab === 'craft') drawCraft(); else drawEquip();
  }

  function gearCard(g, extra) {
    var G = GRADES[g.grade];
    return '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.07);border:1.5px solid ' + G.color + ';border-radius:14px;padding:10px;margin-bottom:8px;">' +
      '<div style="font-size:30px;width:40px;text-align:center;">' + g.emoji + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:' + G.color + ';">[' + G.label + '] ' + g.base + '</div>' +
      '<div style="font-size:11px;color:#cfd;">' + statText(g.stats) + '</div></div>' + (extra || '') + '</div>';
  }

  function drawCraft() {
    var body = $('gg-body'); if (!body) return;
    var S = SLOTS[craftSlot];
    var slotBtns = SLOT_KEYS.map(function (k) {
      var on = craftSlot === k;
      return '<button data-slot="' + k + '" style="' + BTN + 'flex:1;padding:10px 4px;font-size:12px;background:' + (on ? 'rgba(255,215,0,.25)' : 'rgba(255,255,255,.07)') + ';border:1.5px solid ' + (on ? '#FFD700' : 'rgba(255,255,255,.2)') + ';color:#fff;">' + SLOTS[k].items[0][0] + ' ' + SLOTS[k].label + '</button>';
    }).join('');
    var res = '';
    if (lastResult) {
      res = lastResult.fail
        ? '<div style="background:rgba(239,68,68,.15);border:1.5px solid #ef4444;border-radius:14px;padding:14px;text-align:center;margin-bottom:12px;font-weight:900;">💥 제작 실패…<div style="font-size:11px;color:#fbb;font-weight:400;margin-top:3px;">재료와 코인이 사라졌어요</div></div>'
        : '<div style="margin-bottom:6px;font-size:12px;font-weight:900;color:#FFD700;">' + (lastResult.gear.grade === 'rare' ? '✨ 레어 굿즈 탄생!!' : '🎉 제작 성공!') + '</div>' + gearCard(lastResult.gear);
    }
    body.innerHTML = res +
      '<div style="font-size:12px;color:#9ab;margin-bottom:6px;">만들 부위</div>' +
      '<div style="display:flex;gap:6px;margin-bottom:12px;">' + slotBtns + '</div>' +
      '<div style="background:rgba(255,255,255,.07);border-radius:14px;padding:12px;font-size:12px;line-height:1.8;margin-bottom:12px;">' +
        '필요: 🍔 ' + fmt(CRAFT_COIN) + ' (보유 ' + fmt(coins) + ')<br>' + S.mats.map(function (m) { var h = matQty(m[0]); return m[0] + ' x' + m[1] + ' (보유 <b style="color:' + (h >= m[1] ? '#4ade80' : '#ff8a8a') + ';">' + h + '</b>)'; }).join(' · ') + '<br>' +
        '<span style="color:#9ab;">능력치는 만들 때마다 랜덤! · 실패 ' + Math.round(P_FAIL * 100) + '% · 고급 ' + Math.round(P_GOOD * 100) + '% · 레어 ' + Math.round(P_RARE * 100) + '% (능력치 2개)</span></div>' +
      '<button id="gg-craft" style="' + BTN + 'width:100%;padding:15px;font-size:16px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#1a1a2e;">🔨 ' + S.label + ' 굿즈 제작</button>' +
      '<div style="font-size:10.5px;color:#789;margin-top:10px;line-height:1.6;">재료는 일반 탐험(숲·공원·광장·해변)으로 모아요. 만든 굿즈는 가방에 들어가고, 🎒 장착 탭에서 캐릭터에게 달아줘요.</div>';
    body.querySelectorAll('[data-slot]').forEach(function (b) { b.onclick = function () { craftSlot = b.getAttribute('data-slot'); lastResult = null; draw(); }; });
    $('gg-craft').onclick = function () {
      if (busy) return; busy = true;
      var r = craft(craftSlot);
      busy = false;
      if (r.err) { toast('❌ ' + r.err); return; }
      lastResult = r; draw();
    };
  }

  function drawEquip() {
    var body = $('gg-body'); if (!body) return;
    var ids = ownedChars();
    var chips = ids.map(function (cid) {
      var on = selChar === cid, ch = CHARS[cid] || {};
      return '<button data-char="' + cid + '" style="' + BTN + 'padding:8px 12px;font-size:12px;white-space:nowrap;background:' + (on ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,.08)') + ';color:#fff;">' + (ch.emoji || '') + ' ' + (ch.name || cid) + '</button>';
    }).join('');
    var d = load()[selChar] || {};
    var slots = SLOT_KEYS.map(function (s) {
      var g = d[s];
      if (g) return '<div style="margin-bottom:8px;"><div style="font-size:11px;color:#9ab;margin-bottom:3px;">' + SLOTS[s].label + '</div>' +
        gearCard(g, '<button data-un="' + s + '" style="' + BTN + 'padding:7px 10px;font-size:11px;background:rgba(239,68,68,.2);color:#ff8a8a;">해제</button>') + '</div>';
      return '<div style="margin-bottom:8px;"><div style="font-size:11px;color:#9ab;margin-bottom:3px;">' + SLOTS[s].label + '</div>' +
        '<button data-eq="' + s + '" style="' + BTN + 'width:100%;padding:16px;font-size:13px;background:rgba(255,255,255,.05);border:1.5px dashed rgba(255,255,255,.3);color:#aaa;">＋ 비어 있음 · 눌러서 장착</button></div>';
    }).join('');
    var t = totals(selChar), gt = globalTotals();
    var sum = '<div style="background:rgba(255,215,0,.1);border:1px solid #FFD700;border-radius:12px;padding:10px;font-size:12px;margin-bottom:12px;line-height:1.7;">' +
      '<b style="color:#FFD700;">이 캐릭터의 팬덤 원정 보너스</b><br>' +
      STAT_KEYS.filter(function (k) { return STATS[k].scope === 'char'; }).map(function (k) { return STATS[k].icon + ' ' + STATS[k].label + ' +' + t[k] + STATS[k].unit + ' <span style="color:#789;">(상한 ' + STATS[k].cap + ')</span>'; }).join('<br>') +
      '<div style="margin-top:6px;"><b style="color:#7dd3fc;">모든 캐릭터 굿즈 합산 (탐험·학교)</b></div>' +
      STAT_KEYS.filter(function (k) { return STATS[k].scope === 'all'; }).map(function (k) { return STATS[k].icon + ' ' + STATS[k].label + ' +' + gt[k] + STATS[k].unit + ' <span style="color:#789;">(상한 ' + STATS[k].cap + ')</span>'; }).join('<br>') + '</div>';

    var list = '';
    if (equipSlot) {
      var mine = bagItems.filter(function (i) { return i.type === 'goods_gear' && i.gear && i.gear.slot === equipSlot; });
      list = '<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,.15);padding-top:10px;"><div style="font-size:12px;font-weight:900;margin-bottom:6px;">' + SLOTS[equipSlot].label + ' 굿즈 고르기</div>' +
        (mine.length ? mine.map(function (it, i) {
          return gearCard(it.gear, '<button data-pick="' + i + '" style="' + BTN + 'padding:8px 12px;font-size:12px;background:linear-gradient(135deg,#60a5fa,#C084FC);color:#fff;">장착</button>');
        }).join('') : '<div style="color:#aaa;font-size:12px;text-align:center;padding:14px 0;">가방에 맞는 굿즈가 없어요. 🔨 제작 탭에서 만들어봐요</div>') + '</div>';
    }
    body.innerHTML = '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;">' + chips + '</div>' + sum + slots + list;
    body.querySelectorAll('[data-char]').forEach(function (b) { b.onclick = function () { selChar = b.getAttribute('data-char'); equipSlot = null; draw(); }; });
    body.querySelectorAll('[data-eq]').forEach(function (b) { b.onclick = function () { equipSlot = b.getAttribute('data-eq'); draw(); }; });
    body.querySelectorAll('[data-un]').forEach(function (b) { b.onclick = function () { var e = unequip(selChar, b.getAttribute('data-un')); if (e) toast('❌ ' + e); draw(); }; });
    body.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () {
        var mine = bagItems.filter(function (i) { return i.type === 'goods_gear' && i.gear && i.gear.slot === equipSlot; });
        var it = mine[Number(b.getAttribute('data-pick'))]; if (!it) return;
        var e = equip(selChar, equipSlot, it);
        if (e) { toast('❌ ' + e); return; }
        equipSlot = null; draw(); toast('✅ 장착했어요!');
      };
    });
  }

  window.openGoodsGear = open;
  window.__goodsGear = { globalTotals: globalTotals, craft: craft, rollGear: rollGear, totals: totals, bonusOf: bonusOf, equip: equip, unequip: unequip };

  // ── 맵: 🛍️ 상점거리 에 "🎁 굿즈 공방" 버튼 ──
  var BTN_ID = 'btn-goods-gear';
  function ensureButton() {
    var panel = document.querySelector('#place-overlay > div:last-child');
    if (!panel) return null;
    var b = $(BTN_ID);
    if (!b) {
      b = document.createElement('button');
      b.id = BTN_ID;
      b.textContent = '🎁 굿즈 공방';
      b.onclick = function () { if (typeof closePlace === 'function') closePlace(); open(); };
      b.style.cssText = "display:none;width:100%;padding:14px;background:rgba(255,107,157,0.22);border:1.5px solid #FF6B9D;border-radius:12px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;";
      panel.insertBefore(b, panel.firstChild);
    }
    return b;
  }
  function whenReady(test, fn) {
    var n = 0;
    (function a() { var ok = false; try { ok = test(); } catch (e) {} if (ok) { fn(); return; } if (++n < 200) setTimeout(a, 100); })();
  }
  whenReady(function () { return typeof window.openPlace === 'function' && typeof PLACE_BUTTONS !== 'undefined'; }, function () {
    var original = window.openPlace;
    if (original.__ggWrapped) return;
    try {
      if (PLACE_BUTTONS.shopping && PLACE_BUTTONS.shopping.indexOf(BTN_ID) === -1) PLACE_BUTTONS.shopping.push(BTN_ID);
      if (typeof ALL_PLACE_BTNS !== 'undefined' && ALL_PLACE_BTNS.indexOf(BTN_ID) === -1) ALL_PLACE_BTNS.push(BTN_ID);
    } catch (e) {}
    var wrapped = function (id) {
      var r = original.apply(this, arguments);
      try {
        var b = ensureButton();
        if (b) b.style.display = (id === 'shopping') ? 'block' : 'none';
      } catch (e) {}
      return r;
    };
    wrapped.__ggWrapped = true;
    window.openPlace = wrapped;
  });
})();
