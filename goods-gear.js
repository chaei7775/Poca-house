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
  // 🔶 공방의 원석: 일반 탐험(숲·해변·공원·광장·신비의 섬)에서 재료를 주울 때 가끔 같이 나오는 굿즈 전용 재료
  var STONE_NAME = '공방의 원석', STONE_EMOJI = '🔶';
  var STONE_NEED = 3;                          // 굿즈 1개 제작에 필요한 원석 개수
  var STONE_DROP = { normal: 0.015, rare: 0.05 };   // 재료 1개 주울 때 원석이 같이 나올 확률 (희귀 재료는 더 높음)
    var P_FAIL = 0.15, P_RARE = 0.04, P_GOOD = 0.18;
  var P_EPIC = 0.015, P_UNIQUE = 0.005;                // 제작 성공했을 때 에픽 1.5% / 유니크 0.5% (신등급)
  var EPIC_WISH = [0.5, 0.9];                          // 에픽: 탐험 소원의 조각 확률 +%p (고정 효과)
  var UNIQUE_RECOMB = [1.5, 2.5];                      // 유니크: 카드 재조합 '등급 상승' 확률 +%p (고정 효과)
  var EXTRA = {                                        // 에픽·유니크 전용 굿즈 (그림 파일이 없으면 이모지로 표시)
    hat:  { epic: ['🌠', '소원의 별 왕관', 'goods-epic-hat.png'],   unique: ['💎', '재조합 수정 왕관', 'goods-unique-hat.png'] },
    hand: { epic: ['🪄', '소원의 별빛봉', 'goods-epic-hand.png'],   unique: ['🔮', '재조합 수정봉', 'goods-unique-hand.png'] },
    acc:  { epic: ['📿', '소원의 별 목걸이', 'goods-epic-acc.png'], unique: ['💠', '재조합 수정 목걸이', 'goods-unique-acc.png'] }
  };   // 실패 15% / 레어 4% / 고급 18% / 나머지 일반
  var SLOTS = {
    hat:  { label: '머리', mats: [['고급원목', 8], ['별빛나무', 6], [STONE_NAME, STONE_NEED]], items: [['🎀', '응원 머리띠', 'goods-hat-1.png'], ['🧢', '팬클럽 야구모자', 'goods-hat-2.png'], ['👑', '반짝 왕관', 'goods-hat-3.png']] },
    hand: { label: '손',   mats: [['빛나는돌', 8], ['해바라기', 6], [STONE_NAME, STONE_NEED]], items: [['📣', '응원 메가폰', 'goods-hand-1.png'], ['🪄', '야광봉', 'goods-hand-2.png'], ['💐', '꽃다발', 'goods-hand-3.png']] },
    acc:  { label: '액세서리', mats: [['별빛모래', 8], ['네잎클로버', 6], [STONE_NAME, STONE_NEED]], items: [['📿', '팬클럽 목걸이', 'goods-acc-1.png'], ['🎧', '투어 헤드폰', 'goods-acc-2.png'], ['💍', '기념 반지', 'goods-acc-3.png']] }
  };
  var SLOT_KEYS = ['hat', 'hand', 'acc'];
  // 능력치 종류. scope 'char' = 그 캐릭터 원정에만 / 'all' = 모든 캐릭터 굿즈 합산(탐험·학교처럼 캐릭터와 상관없는 곳)
  //   r = [일반 범위, 고급 범위, 레어 범위],  dec = 소수점 자리,  cap = 합계 상한
  var STATS = {
    coin:   { label: '원정 코인',        icon: '🍔', unit: '%',  dec: 0, scope: 'char', cap: 40,  r: [[2, 6],   [5, 10],  [10, 20]] },
    exp:    { label: '원정 EXP',         icon: '⭐', unit: '%',  dec: 0, scope: 'char', cap: 40,  r: [[2, 6],   [5, 10],  [10, 20]] },
    piece:  { label: '프리미엄 조각 확률', icon: '🖼️', unit: '%',  dec: 1, scope: 'char', cap: 8,   r: [[0.5, 1.5], [1.5, 2.5], [2.5, 4]] },
    ticket: { label: '등교권·조각 드랍',  icon: '🎫', unit: '%',  dec: 0, scope: 'char', cap: 60,  r: [[5, 10],  [10, 20], [20, 40]] },
    wish:   { label: '탐험 소원의 조각 확률(샘 성공도 ×10)', icon: '🧩', unit: '%p', dec: 2, scope: 'all', cap: 1.5, r: [[0.05, 0.12], [0.12, 0.25], [0.25, 0.5]] },
    recomb: { label: '재조합 등급 상승 확률', icon: '🔮', unit: '%p', dec: 1, scope: 'all', cap: 6, r: [[1.5, 2.5], [1.5, 2.5], [1.5, 2.5]] },   // 유니크 전용
    honor:  { label: '우등생조각 획득',   icon: '✨', unit: '%',  dec: 0, scope: 'all',  cap: 60,  r: [[5, 10],  [10, 20], [20, 40]] }
  };
  var STAT_KEYS = ['coin', 'exp', 'piece', 'ticket', 'wish', 'honor', 'recomb'];
  var RAND_KEYS = ['coin', 'exp', 'piece', 'ticket', 'honor'];   // 일반·고급·레어 굿즈에 랜덤으로 붙는 능력치 (🧩소원의 조각은 에픽, 🔮재조합은 유니크 전용)
  var GRADES = {
    normal: { label: '일반', color: '#cbd5e1', n: 1, i: 0 },
    good:   { label: '고급', color: '#4ade80', n: 1, i: 1 },
    rare:   { label: '레어', color: '#FFD700', n: 2, i: 2 },
    epic:   { label: '에픽', color: '#c084fc', n: 2, i: 3 },
    unique: { label: '유니크', color: '#ff9f1c', n: 2, i: 4 }
  };


  // 굿즈 이미지: repo 맨 위 폴더에 goods-hat-1.png 처럼 올리면 자동 적용, 없으면 이모지로 표시
  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  function fileOf(g) {
    var its = SLOTS[g.slot] ? SLOTS[g.slot].items : [];
    for (var i = 0; i < its.length; i++) if (its[i][1] === g.base) return its[i][2];
    var ex = EXTRA[g.slot]; if (ex) { if (ex.epic[1] === g.base) return ex.epic[2]; if (ex.unique[1] === g.base) return ex.unique[2]; }
    return null;
  }
  function icon(g, px) {
    var f = fileOf(g);
    var emo = '<span style="font-size:' + Math.round(px * 0.8) + 'px;line-height:1;">' + g.emoji + '</span>';
    if (!f) return emo;
    return '<img src="' + IMG_BASE + f + '" draggable="false" alt="" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;pointer-events:none;" onerror="this.outerHTML=this.getAttribute(\'data-fb\')" data-fb="' + emo.replace(/"/g, '&quot;') + '">';
  }

  // 퀘스트용 달성 기록 (quest-extra.js / quest-guide.js 가 읽음, 한 번 켜지면 계속 유지)
  function setFlag(n) {
    try {
      var f = JSON.parse(localStorage.getItem('ph_goods_flags') || '{}') || {};
      if (!f[n]) { f[n] = 1; localStorage.setItem('ph_goods_flags', JSON.stringify(f)); }
    } catch (e) {}
  }

  // ── 공통 ──
  function $(id) { return document.getElementById(id); }
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
  function toast(msg) {
    var old = $('gg-toast'); if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'gg-toast';
    el.style.cssText = 'position:fixed;left:50%;top:62px;transform:translateX(-50%);z-index:1300;background:rgba(20,20,40,.96);border:1.5px solid #FFD700;border-radius:14px;padding:9px 16px;color:#fff;font-size:13px;font-weight:900;max-width:86%;text-align:center;font-family:\'Noto Sans KR\',sans-serif;pointer-events:none;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 2600);
  }
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || '{}'); return (d && typeof d === 'object') ? d : {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function rnum(a, b, dec) { var m = Math.pow(10, dec); return Math.round((a + Math.random() * (b - a)) * m) / m; }
  function statText(stats) {
    return STAT_KEYS.filter(function (k) { return stats[k]; }).map(function (k) { return STATS[k].icon + ' ' + STATS[k].label + ' +' + stats[k] + STATS[k].unit + (k === 'wish' ? ' (🌟소원의 샘 성공 +' + (Math.round(stats[k] * 100) / 10) + '%p)' : ''); }).join(' · ');
  }
  function matQty(name) {
    var it = bagItems.find(function (i) { return i.name === name; });
    return it ? it.qty : 0;
  }

  // ── 제작 ──
  function rollGear(slot) {
    var r = Math.random(), g = r < P_UNIQUE ? 'unique' : r < P_UNIQUE + P_EPIC ? 'epic' : r < P_UNIQUE + P_EPIC + P_RARE ? 'rare' : r < P_UNIQUE + P_EPIC + P_RARE + P_GOOD ? 'good' : 'normal';
    if (g === 'epic' || g === 'unique') {      // 신등급: 고정 효과 1개 + 랜덤 능력치 1개(레어 범위)
      var xb = EXTRA[slot][g], fk = g === 'epic' ? 'wish' : 'recomb', fr = g === 'epic' ? EPIC_WISH : UNIQUE_RECOMB, st = {};
      st[fk] = rnum(fr[0], fr[1], STATS[fk].dec);
      var rk = RAND_KEYS.filter(function (x) { return x !== fk; }), k2 = rk[Math.floor(Math.random() * rk.length)], rg2 = STATS[k2].r[2];
      st[k2] = rnum(rg2[0], rg2[1], STATS[k2].dec);
      return { slot: slot, grade: g, emoji: xb[0], base: xb[1], stats: st };
    }
    var G = GRADES[g], base = pick(SLOTS[slot].items);
    var keys = RAND_KEYS.slice(), stats = {};
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
      setFlag('crafted'); if (g.grade === 'rare' || g.grade === 'epic' || g.grade === 'unique') setFlag('rare');
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
    setFlag('equipped');
    if (SLOT_KEYS.every(function (k) { return d[charId][k]; })) setFlag('full');
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


  // ── 일반 탐험에서 🔶 공방의 원석 파밍: 재료를 주울 때 가끔 같이 나옴 ──
  function matPools() {
    var rare = {}, all = {};
    try {
      Object.keys(EXPLORE_MATERIALS).forEach(function (pid) {
        (EXPLORE_MATERIALS[pid].normal || []).forEach(function (n) { all[n] = 1; });
        (EXPLORE_MATERIALS[pid].rare || []).forEach(function (n) { all[n] = 1; rare[n] = 1; });
      });
    } catch (e) {}
    return { all: all, rare: rare };
  }
  // 지도마다 파일이 달라서 addToBag 를 잡는 방식은 일부 지도에서 안 먹혔음 →
  // 가방(bagItems) 수량을 지켜보다가 "스태미나를 쓴 직후 45초 안에 탐험 재료가 늘어나면" 탐험 중 주운 것으로 보고 원석 판정
  var EXPLORE_WINDOW_MS = 45000;
  function startStoneWatch() {
    if (window.__ggStoneWatch) return;
    if (typeof bagItems === 'undefined' || typeof EXPLORE_MATERIALS === 'undefined' || typeof stamina === 'undefined') { setTimeout(startStoneWatch, 500); return; }
    window.__ggStoneWatch = true;
    var pools = matPools(), prev = {}, lastStam = stamina, lastDrop = 0;
    function snap() {
      var m = {};
      bagItems.forEach(function (i) { if (i && pools.all[i.name] && i.name !== '은빛거미줄') m[i.name] = (m[i.name] || 0) + (Number(i.qty) || 0); });
      return m;
    }
    prev = snap();
    setInterval(function () {
      try {
        var now = Date.now();
        if (stamina < lastStam) lastDrop = now;
        lastStam = stamina;
        var cur = snap(), gain = 0, rareGain = 0;
        Object.keys(cur).forEach(function (n) {
          var d = cur[n] - (prev[n] || 0);
          if (d > 0) { if (pools.rare[n]) rareGain += d; else gain += d; }
        });
        prev = cur;
        if (now - lastDrop > EXPLORE_WINDOW_MS) return;
        var got = 0, i;
        for (i = 0; i < gain; i++) if (Math.random() < STONE_DROP.normal) got++;
        for (i = 0; i < rareGain; i++) if (Math.random() < STONE_DROP.rare) got++;
        if (got > 0 && typeof addToBag === 'function') {
          if (addToBag(STONE_EMOJI, STONE_NAME, 'material', got, '굿즈 공방 제작 재료 · 일반 탐험에서 가끔 나와요') !== false) {
            if (typeof exploreCollected !== 'undefined' && exploreCollected.push) exploreCollected.push(STONE_EMOJI + ' ' + STONE_NAME);
            toast(STONE_EMOJI + ' ' + STONE_NAME + (got > 1 ? ' x' + got : '') + ' 획득!');
          }
        }
      } catch (e) {}
    }, 250);
  }
  startStoneWatch();

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
      '<div style="display:flex;gap:8px;margin-bottom:12px;">' + tabBtn('craft', '🔨 제작') + tabBtn('equip', '🎒 장착') + tabBtn('info', '📋 옵션표') + '</div>' +
      '<div id="gg-body"></div></div>';
    $('gg-close').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab'); lastResult = null; equipSlot = null; draw(); }; });
    if (tab === 'craft') drawCraft(); else if (tab === 'info') drawInfo(); else drawEquip();
  }
  // ── 📋 옵션표: 굿즈 공방에서 나오는 등급·능력치·확률을 미리 볼 수 있음 (설정값에서 자동으로 계산) ──
  function drawInfo() {
    var body = $('gg-body'); if (!body) return;
    var ok = 1 - P_FAIL, pN = 1 - P_UNIQUE - P_EPIC - P_RARE - P_GOOD;
    function pc(x) { var v = x * 100; return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + '%'; }
    function rg(k, i) { var r = STATS[k].r[Math.min(i, 2)]; return r[0] + ' ~ ' + r[1] + STATS[k].unit; }
    var box = 'background:rgba(255,255,255,.07);border-radius:14px;padding:12px;margin-bottom:12px;font-size:12px;line-height:1.75;';
    var gradeRows = [
      ['normal', pN, '능력치 1개 (랜덤)'], ['good', P_GOOD, '능력치 1개 (랜덤, 수치↑)'], ['rare', P_RARE, '능력치 2개 (랜덤, 수치↑↑)'],
      ['epic', P_EPIC, '💜 소원의 조각 확률 ' + EPIC_WISH[0] + ' ~ ' + EPIC_WISH[1] + '%p (고정) + 랜덤 1개'],
      ['unique', P_UNIQUE, '👑 재조합 등급 상승 확률 ' + UNIQUE_RECOMB[0] + ' ~ ' + UNIQUE_RECOMB[1] + '%p (고정) + 랜덤 1개']
    ].map(function (r) {
      var G = GRADES[r[0]];
      return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;"><div style="min-width:48px;font-weight:900;color:' + G.color + ';">' + G.label + '</div><div style="flex:1;">' + r[2] + '<div style="color:#9ab;font-size:11px;">제작 성공 중 ' + pc(r[1]) + ' · 제작 1번당 ' + pc(ok * r[1]) + '</div></div></div>';
    }).join('');
    var head = '<tr style="color:#9ab;font-size:11px;"><td style="padding:3px 0;">능력치</td><td>일반</td><td>고급</td><td>레어</td><td>합계 상한</td></tr>';
    var statRows = RAND_KEYS.map(function (k) {
      var S = STATS[k];
      return '<tr style="border-top:1px solid rgba(255,255,255,.08);"><td style="padding:5px 4px 5px 0;white-space:nowrap;">' + S.icon + ' ' + S.label.replace(/\(.*\)/, '') + '</td><td>' + rg(k, 0) + '</td><td>' + rg(k, 1) + '</td><td>' + rg(k, 2) + '</td><td style="color:#FFD700;">' + S.cap + S.unit + '</td></tr>';
    }).join('');
    var scopeNote = RAND_KEYS.concat(['wish', 'recomb']).map(function (k) { return STATS[k].icon + ' ' + STATS[k].label.replace(/\(.*\)/, '') + ': ' + (STATS[k].scope === 'char' ? '장착한 그 아이돌의 원정에만' : '장착한 모든 굿즈 합산 (아이돌 상관없음)'); }).join('<br>');
    body.innerHTML =
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:6px;">🔨 제작하면 이렇게 나와요</div>' +
        '<div style="margin-bottom:6px;">실패 <b>' + pc(P_FAIL) + '</b> (재료만 사라져요) · 성공하면 아래 등급 중 하나!</div>' + gradeRows + '</div>' +
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:6px;">📊 능력치 종류와 수치 범위</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">' + head + statRows + '</table>' +
        '<div style="color:#9ab;font-size:11px;margin-top:6px;">💜에픽·👑유니크의 랜덤 능력치는 레어 범위로 나와요.</div></div>' +
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:6px;">🧭 어디에 적용되나요?</div>' + scopeNote +
        '<div style="color:#9ab;font-size:11px;margin-top:6px;">🧩 소원의 조각 확률은 🌟소원의 샘 성공 확률에도 (×10) 적용돼요. 🔮 재조합 상승은 카드 재조합에서 등급이 오르는 확률에 더해져요 (UR+UR 제외).</div></div>' +
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:8px;">굿즈 종류</div>' +
        ['hat', 'hand', 'acc'].map(function (sl) {
          var S = SLOTS[sl];
          function cell(emo, name, color) { return '<div style="width:72px;text-align:center;">' + icon({ slot: sl, base: name, emoji: emo }, 44) + '<div style="font-size:10px;line-height:1.3;margin-top:2px;color:' + (color || '#dde') + ';">' + name + '</div></div>'; }
          return '<div style="margin-bottom:10px;"><div style="font-weight:900;margin-bottom:4px;">' + S.label + '</div><div style="display:flex;flex-wrap:wrap;gap:6px;">' +
            S.items.map(function (it) { return cell(it[0], it[1]); }).join('') + cell(EXTRA[sl].epic[0], EXTRA[sl].epic[1], GRADES.epic.color) + cell(EXTRA[sl].unique[0], EXTRA[sl].unique[1], GRADES.unique.color) + '</div></div>';
        }).join('') + '</div>';
  }

  function gearCard(g, extra) {
    var G = GRADES[g.grade];
    return '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.07);border:1.5px solid ' + G.color + ';border-radius:14px;padding:10px;margin-bottom:8px;">' +
      '<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + icon(g, 40) + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:' + G.color + ';">[' + G.label + '] ' + g.base + '</div>' +
      '<div style="font-size:11px;color:#cfd;">' + statText(g.stats) + '</div></div>' + (extra || '') + '</div>';
  }

  // 재료가 나오는 맵 이름 (EXPLORE_MATERIALS + 맵 이름표에서 자동 계산 → 맵이 바뀌어도 항상 맞음)
  var EXTRA_POOLS = { housing: ['빛나는돌', '별빛모래', '네잎클로버', '고급원목', '행운의잎', '달의눈물'] };   // 숙소촌은 자체 목록 사용
  function matWhere(name) {
    if (window.matWhere) { var w = window.matWhere(name); if (w) return w; }
    if (name === STONE_NAME) return '탐험 맵 어디서나 재료를 주울 때 가끔 (희귀 재료일수록 잘 나와요)';
    var out = [], titles = (typeof PLACE_TITLES !== 'undefined') ? PLACE_TITLES : {};
    try {
      Object.keys(EXPLORE_MATERIALS).forEach(function (pid) {
        var e = EXPLORE_MATERIALS[pid] || {};
        if ((e.normal || []).indexOf(name) >= 0 || (e.rare || []).indexOf(name) >= 0) out.push(titles[pid] || pid);
      });
      Object.keys(EXTRA_POOLS).forEach(function (pid) {
        if (EXTRA_POOLS[pid].indexOf(name) >= 0 && !(EXPLORE_MATERIALS[pid]) && out.indexOf(titles[pid] || pid) < 0) out.push(titles[pid] || pid);
      });
    } catch (e) {}
    return out.length ? out.join(' · ') : '일반 탐험';
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
        : '<div style="margin-bottom:6px;font-size:12px;font-weight:900;color:#FFD700;">' + (lastResult.gear.grade === 'unique' ? '👑 유니크 굿즈 탄생!!!' : lastResult.gear.grade === 'epic' ? '💜 에픽 굿즈 탄생!!' : lastResult.gear.grade === 'rare' ? '✨ 레어 굿즈 탄생!!' : '🎉 제작 성공!') + '</div>' + gearCard(lastResult.gear);
    }
    body.innerHTML = res +
      '<div style="font-size:12px;color:#9ab;margin-bottom:6px;">만들 부위</div>' +
      '<div style="display:flex;gap:6px;margin-bottom:12px;">' + slotBtns + '</div>' +
      '<div style="background:rgba(255,255,255,.07);border-radius:14px;padding:12px;font-size:12px;line-height:1.8;margin-bottom:12px;">' +
        '필요: 🍔 ' + fmt(CRAFT_COIN) + ' (보유 ' + fmt(coins) + ')<br>' + S.mats.map(function (m) { var h = matQty(m[0]); return '<div style="margin-top:4px;">' + m[0] + ' x' + m[1] + ' (보유 <b style="color:' + (h >= m[1] ? '#4ade80' : '#ff8a8a') + ';">' + h + '</b>)<div style="font-size:10.5px;color:#8fd3ff;line-height:1.5;">📍 ' + matWhere(m[0]) + '</div></div>'; }).join('') +
        '<span style="color:#9ab;">능력치는 만들 때마다 랜덤! · 실패 ' + Math.round(P_FAIL * 100) + '% · 고급 ' + Math.round(P_GOOD * 100) + '% · 레어 ' + Math.round(P_RARE * 100) + '% (능력치 2개) · 아주 가끔 💜에픽(소원의 조각↑) · 👑유니크(재조합 상승↑)</span></div>' +
      '<button id="gg-craft" style="' + BTN + 'width:100%;padding:15px;font-size:16px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#1a1a2e;">🔨 ' + S.label + ' 굿즈 제작</button>' +
      '<div style="font-size:10.5px;color:#789;margin-top:10px;line-height:1.6;">재료는 위 📍 표시된 맵에서 탐험으로 모아요. 🔶 공방의 원석은 탐험 중 재료를 주울 때 가끔 같이 나와요. 만든 굿즈는 가방에 들어가고, 🎒 장착 탭에서 캐릭터에게 달아줘요.</div>';
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
    var ch0 = CHARS[selChar] || {};
    // 카드(가운데) + 오른쪽에 네모 칸 3개. 왼쪽에는 같은 폭의 빈 공간을 둬서 카드가 정확히 가운데 오게 함
    var SQ = 62;
    var boxes = SLOT_KEYS.map(function (sl) {
      var g = d[sl], on = equipSlot === sl;
      var bd = g ? GRADES[g.grade].color : (on ? '#FFD700' : 'rgba(255,255,255,.35)');
      var inner = g
        ? '<div style="line-height:1;">' + icon(g, 40) + '</div><div style="font-size:9px;color:' + GRADES[g.grade].color + ';margin-top:2px;">' + GRADES[g.grade].label + '</div>'
        : '<div style="font-size:20px;color:#889;line-height:1;">＋</div><div style="font-size:10px;color:#9ab;margin-top:2px;">' + SLOTS[sl].label + '</div>';
      return '<button data-slot="' + sl + '" style="' + BTN + 'width:' + SQ + 'px;height:' + SQ + 'px;border-radius:12px;background:' + (on ? 'rgba(255,215,0,.18)' : 'rgba(255,255,255,.07)') + ';border:2px ' + (g ? 'solid' : 'dashed') + ' ' + bd + ';' + (g ? 'box-shadow:0 0 10px ' + bd + ';' : '') + 'color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;">' + inner + '</button>';
    }).join('');
    var preview = '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;">' +
      '<div style="width:' + SQ + 'px;flex-shrink:0;"></div>' +
      '<div style="position:relative;width:180px;height:240px;border-radius:18px;overflow:hidden;border:2px solid ' + (ch0.gradeColor || '#C084FC') + ';background:#111;flex-shrink:0;">' +
      (ch0.img ? '<img src="' + ch0.img + '" draggable="false" style="width:100%;height:100%;object-fit:cover;object-position:50% 15%;pointer-events:none;">' : '<div style="font-size:80px;text-align:center;padding-top:70px;">' + (ch0.emoji || '') + '</div>') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;flex-shrink:0;">' + boxes + '</div></div>';
    var t = totals(selChar), gt = globalTotals();
    var sum = '<div style="background:rgba(255,215,0,.1);border:1px solid #FFD700;border-radius:12px;padding:10px;font-size:12px;margin-bottom:12px;line-height:1.7;">' +
      '<b style="color:#FFD700;">이 캐릭터의 팬덤 원정 보너스</b><br>' +
      STAT_KEYS.filter(function (k) { return STATS[k].scope === 'char'; }).map(function (k) { return STATS[k].icon + ' ' + STATS[k].label + ' +' + t[k] + STATS[k].unit + ' <span style="color:#789;">(상한 ' + STATS[k].cap + ')</span>'; }).join('<br>') +
      '<div style="margin-top:6px;"><b style="color:#7dd3fc;">모든 캐릭터 굿즈 합산 (탐험·학교)</b></div>' +
      STAT_KEYS.filter(function (k) { return STATS[k].scope === 'all'; }).map(function (k) { return STATS[k].icon + ' ' + STATS[k].label + ' +' + gt[k] + STATS[k].unit + ' <span style="color:#789;">(상한 ' + STATS[k].cap + ')</span>'; }).join('<br>') + '</div>';

    var list = '';
    if (equipSlot) {
      var cur = d[equipSlot];
      var mine = bagItems.filter(function (i) { return i.type === 'goods_gear' && i.gear && i.gear.slot === equipSlot; });
      list = '<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,.15);padding-top:10px;">' +
        '<div style="font-size:12px;font-weight:900;margin-bottom:6px;">' + SLOTS[equipSlot].label + ' 칸</div>' +
        (cur ? '<div style="font-size:11px;color:#9ab;margin-bottom:3px;">장착 중</div>' +
          gearCard(cur, '<button data-un="' + equipSlot + '" style="' + BTN + 'padding:7px 10px;font-size:11px;background:rgba(239,68,68,.2);color:#ff8a8a;">해제</button>') : '') +
        '<div style="font-size:11px;color:#9ab;margin:6px 0 3px;">가방 속 굿즈' + (cur ? ' (고르면 교체)' : '') + '</div>' +
        (mine.length ? mine.map(function (it, i) {
          return gearCard(it.gear, '<button data-pick="' + i + '" style="' + BTN + 'padding:8px 12px;font-size:12px;background:linear-gradient(135deg,#60a5fa,#C084FC);color:#fff;">' + (cur ? '교체' : '장착') + '</button>');
        }).join('') : '<div style="color:#aaa;font-size:12px;text-align:center;padding:14px 0;">가방에 맞는 굿즈가 없어요. 🔨 제작 탭에서 만들어봐요</div>') + '</div>';
    } else {
      list = '<div style="text-align:center;color:#9ab;font-size:12px;padding:6px 0;">네모 칸을 눌러서 굿즈를 장착해요</div>';
    }
    body.innerHTML = '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;">' + chips + '</div>' + preview + sum + list;
    body.querySelectorAll('[data-char]').forEach(function (b) { b.onclick = function () { selChar = b.getAttribute('data-char'); equipSlot = null; draw(); }; });
    body.querySelectorAll('[data-slot]').forEach(function (b) { b.onclick = function () { var sl = b.getAttribute('data-slot'); equipSlot = (equipSlot === sl) ? null : sl; draw(); }; });
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
  // ── 🔧 분해: 안 쓰는 굿즈를 가방에서 분해하면 재료를 일부 돌려줌 (만들 때 쓴 재료의 일부) ──
  var DISMANTLE_STONE_CHANCE = 0.5;   // 분해할 때 🔶 공방의 원석이 돌아올 확률 (나머지 재료는 항상 돌려줌)
  var DISMANTLE_RATIO = { normal: 0.25, good: 0.3, rare: 0.4, epic: 0.5, unique: 0.6 };   // 제작 재료 대비 돌려받는 비율
  function dismantleReturn(g) {
    var S = SLOTS[g.slot], ratio = DISMANTLE_RATIO[g.grade] || 0.25;
    return S.mats.map(function (m) { return [m[0], Math.max(1, Math.round(m[1] * ratio))]; });
  }
  function matEmoji(name) {
    if (name === STONE_NAME) return STONE_EMOJI;
    try { if (typeof getMaterialEmoji === 'function') return getMaterialEmoji(name) || '🌿'; } catch (e) {}
    return '🌿';
  }
  var lastDismantle = [];
  function dismantle(item) {
    var g = item && item.gear; if (!g) return '굿즈가 아니에요';
    var idx = bagItems.indexOf(item); if (idx < 0) return '가방에서 찾을 수 없어요';
    var ret = dismantleReturn(g).filter(function (r) { return r[0] !== STONE_NAME || Math.random() < DISMANTLE_STONE_CHANCE; });
    var newSlots = ret.filter(function (r) { return !bagItems.some(function (i) { return i.name === r[0]; }); }).length;
    if (bagItems.length - 1 + newSlots > bagSlots) return '가방이 꽉 찼어요! 슬롯을 비워주세요';
    bagItems.splice(idx, 1);
    lastDismantle = ret;
    ret.forEach(function (r) { addToBag(matEmoji(r[0]), r[0], 'material', r[1], r[0] === STONE_NAME ? '굿즈 공방에서 굿즈를 만들 때 쓰는 원석' : '제작 재료 (굿즈 분해)'); });
    if (typeof saveBag === 'function') saveBag();
    if (typeof saveAll === 'function') saveAll();
    return null;
  }
  (function hookBagDismantle() {
    if (typeof window.showBagItemDetail !== 'function') { setTimeout(hookBagDismantle, 200); return; }
    function install() {
      if (typeof window.showBagItemDetail !== 'function' || window.__ggDisHooked) return;
      window.__ggDisHooked = true;
      var orig = window.showBagItemDetail;
      var w = function (idx) {
        var r = orig.apply(this, arguments);
        try {
          var item = bagItems[idx], ov = document.getElementById('bag-detail-overlay');
          if (item && item.type === 'goods_gear' && item.gear && ov && ov.firstElementChild && !ov.querySelector('#gg-dis-btn')) {
            var b = document.createElement('button'); b.id = 'gg-dis-btn';
            b.textContent = '🔧 분해해서 재료로 돌려받기';
            b.style.cssText = 'width:100%;padding:11px;margin-top:8px;background:linear-gradient(135deg,#38bdf8,#6366f1);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit;';
            b.onclick = function (e) {
              e.stopPropagation();
              var pv = dismantleReturn(item.gear).map(function (x) { return x[0] === STONE_NAME ? x[0] + ' x' + x[1] + ' (' + Math.round(DISMANTLE_STONE_CHANCE * 100) + '% 확률)' : x[0] + ' x' + x[1]; }).join(', ');
              if (!window.confirm('이 굿즈를 분해할까요?\n\n받는 재료: ' + pv + '\n(굿즈는 사라져요)')) return;
              var err = dismantle(item);
              if (err) { toast('❌ ' + err); return; }
              ov.remove();
              try { if (typeof renderBag === 'function') renderBag(); } catch (x) {}
              toast('🔧 분해 완료!' + (lastDismantle.length ? ' ' + lastDismantle.map(function (x) { return x[0] + ' x' + x[1]; }).join(', ') : ''));
            };
            ov.firstElementChild.appendChild(b);
          }
        } catch (e) {}
        return r;
      };
      w.__ggDis = true; window.showBagItemDetail = w;
    }
    install();   // 한 번만 감쌈 (bag-delete.js 처럼 주기적으로 다시 감싸는 파일과 서로 겹겹이 감싸지 않도록)
  })();

  window.__goodsGear = { icon: icon, globalTotals: globalTotals, craft: craft, rollGear: rollGear, totals: totals, bonusOf: bonusOf, equip: equip, unequip: unequip };

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
